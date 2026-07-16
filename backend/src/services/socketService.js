// backend/src/services/socketService.js
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  /**
   * Inicializa Socket.IO con el servidor HTTP
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io' // Ruta por defecto, puedes cambiarla
    });

    // Middleware de autenticación
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Autenticación requerida'));
      }

      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_por_defecto');
        socket.userId = decoded.id;
        socket.userRol = decoded.rol;
        socket.userName = decoded.nombre;
        next();
      } catch (error) {
        return next(new Error('Token inválido'));
      }
    });

    // Manejar conexiones
    this.io.on('connection', (socket) => {
      console.log(`🔌 Usuario conectado: ${socket.userId} (${socket.userName})`);
      
      // Registrar usuario conectado
      this.connectedUsers.set(socket.userId, socket.id);

      // Unirse a su sala personal para notificaciones privadas
      socket.join(`user_${socket.userId}`);

      // Enviar confirmación de conexión
      socket.emit('connected', {
        userId: socket.userId,
        message: 'Conectado al servidor de notificaciones'
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`🔌 Usuario desconectado: ${socket.userId}`);
        this.connectedUsers.delete(socket.userId);
      });

      // Manejar ping para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    console.log('✅ Servicio de WebSockets inicializado');
    return this.io;
  }

  /**
   * Notificar a un técnico específico
   */
  notifyUser(userId, event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO no inicializado');
      return;
    }

    // Verificar si el usuario está conectado
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) {
      console.log(`⚠️ Usuario ${userId} no está conectado`);
      return;
    }

    // Emitir a la sala personal del usuario
    this.io.to(`user_${userId}`).emit(event, data);
    console.log(`📨 Notificación enviada a usuario ${userId}: ${event}`);
  }

  /**
   * Notificar a todos los técnicos (broadcast)
   */
  notifyAllTechs(event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO no inicializado');
      return;
    }

    // Obtener todos los técnicos conectados
    const techs = Array.from(this.connectedUsers.keys());
    techs.forEach(userId => {
      this.io.to(`user_${userId}`).emit(event, data);
    });
    
    console.log(`📨 Notificación broadcast a ${techs.length} técnicos: ${event}`);
  }

  /**
   * Obtener el socket de un usuario
   */
  getUserSocket(userId) {
    return this.connectedUsers.get(userId);
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService();