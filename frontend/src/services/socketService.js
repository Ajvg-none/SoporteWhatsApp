// frontend/src/services/socketService.js
import { io } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Conectar al servidor de WebSockets
   */
  connect() {
    const authStore = useAuthStore();
    
    if (!authStore.token) {
      console.warn('⚠️ No hay token disponible para conectar WebSocket');
      return;
    }

    if (this.socket?.connected) {
      console.log('ℹ️ WebSocket ya está conectado');
      return;
    }

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socketURL = baseURL.replace('/api', '');

    this.socket = io(socketURL, {
      path: '/socket.io',
      auth: {
        token: authStore.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    // Evento de conexión exitosa
    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor de WebSockets');
      this.socket.emit('ping'); // Ping inicial
    });

    // Evento de desconexión
    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Desconectado del WebSocket:', reason);
    });

    // Evento de reconexión
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado al WebSocket (intento ${attemptNumber})`);
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
    });

    // Pong para mantener conexión
    this.socket.on('pong', () => {
      // console.log('🏓 Pong recibido');
    });

    return this.socket;
  }

  /**
   * Desconectar del servidor
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket desconectado manualmente');
    }
  }

  /**
   * Registrar un listener para un evento
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn(`⚠️ WebSocket no conectado para registrar evento: ${event}`);
      return;
    }

    // Guardar referencia para poder eliminar después
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    this.socket.on(event, callback);
    console.log(`👂 Listener registrado para evento: ${event}`);
  }

  /**
   * Eliminar un listener específico
   */
  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Eliminar todos los listeners
   */
  clearAllListeners() {
    if (!this.socket) return;
    
    for (const [event, callbacks] of this.listeners) {
      for (const callback of callbacks) {
        this.socket.off(event, callback);
      }
    }
    this.listeners.clear();
    console.log('🧹 Todos los listeners eliminados');
  }

  /**
   * Verificar si el socket está conectado
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Enviar un evento personalizado (si es necesario)
   */
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn(`⚠️ No se puede emitir ${event}: WebSocket no conectado`);
      return;
    }
    this.socket.emit(event, data);
  }
}

// Singleton
export default new SocketService();