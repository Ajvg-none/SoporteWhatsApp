// ============================================================
// 1. CARGA DE VARIABLES DE ENTORNO
// ============================================================
require('dotenv').config();

// ============================================================
// 2. IMPORTS
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http'); // 🛠️ NUEVO: Necesario para integrar Express y Socket.IO
const { PrismaClient } = require('@prisma/client');

// Middlewares de autenticación (S1-B04)
const { verifyToken, checkSupervisorRole } = require('./middlewares/auth');

// Rutas
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');

// ============================================================
// 3. INICIALIZACIÓN
// ============================================================
const app = express();
const server = http.createServer(app); // 🛠️ NUEVO: Crear servidor HTTP nativo acoplado a Express
const prisma = new PrismaClient();

// ============================================================
// 4. MIDDLEWARES GLOBALES
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

// ============================================================
// 5. RUTAS PÚBLICAS
// ============================================================

// 5.1. Health Check (S0-B03)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'OK',
      mensaje: 'El servidor y la base de datos están funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    res.status(500).json({
      status: 'ERROR',
      mensaje: 'No se pudo conectar a la base de datos',
      error: error.message
    });
  }
});

// 5.2. Ruta raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API SoporteWhatsApp',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      webhook: '/api/webhooks/whatsapp',
      auth: '/api/auth/login',
      protegida: '/api/protegida',
      'supervisor-only': '/api/supervisor-only'
    }
  });
});

// ============================================================
// 6. RUTAS DE PRUEBA (S1-B04) - ELIMINAR EN PRODUCCIÓN
// ============================================================

// 6.1. Ruta protegida (cualquier usuario autenticado)
app.get('/api/protegida', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Acceso autorizado',
    user: req.user
  });
});

// 6.2. Ruta solo para supervisores
app.get('/api/supervisor-only', verifyToken, checkSupervisorRole, (req, res) => {
  res.json({
    success: true,
    message: 'Acceso autorizado como supervisor',
    user: req.user
  });
});

// ============================================================
// 7. RUTAS DE LA API
// ============================================================

// 7.1. Autenticación (S1-B02, S1-B03)
app.use('/api/auth', authRoutes);

// 7.2. Webhooks (S1-B05)
app.use('/api/webhooks', webhookRoutes);

// 7.3. Tickets (S1-B09, S1-B10, S1-B11, S1-B12)
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

// 7.4. Contactos (S1-B13)
const contactRoutes = require('./routes/contacts');
app.use('/api/contactos', contactRoutes);

// 7.5. Usuarios (S3-B06, S3-B07)
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// 7.6. Estadísticas (S3-B02)
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);


const excludedNumberRoutes = require('./routes/excludedNumbers');
app.use('/api/excluidos', excludedNumberRoutes);

// 7.8. Chat Privado (solo supervisores)
const directChatRoutes = require('./routes/directChat');
app.use('/api/chat-directo', directChatRoutes);

// ============================================================
// 8. MANEJO DE ERRORES 404 (SIEMPRE AL FINAL)
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// ============================================================
// 9. MANEJO DE ERRORES GLOBAL (OPCIONAL)
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// ============================================================
// 10. INICIO DEL SERVIDOR Y WEBSOCKETS
// ============================================================
const PORT = process.env.PORT || 3000;

// Importar e inicializar el servicio de Socket con el servidor HTTP
const socketService = require('./services/socketService');
socketService.initialize(server); // 🛠️ NUEVO: Asociar Socket.IO al servidor HTTP

// ============================================================
// 11. CRONJOBS Y SERVICIOS PROGRAMADOS
// ============================================================

// Iniciar cron de limpieza (S3-B05)
const { iniciarCronLimpieza } = require('./cron/cleanupCron');
iniciarCronLimpieza();

// 🛠️ IMPORTANTE: Escuchamos el puerto con "server", NO con "app"
server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 SOPORTEWHATSAPP - BACKEND');
  console.log('========================================');
  console.log(`📡 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`📨 Webhook: http://localhost:${PORT}/api/webhooks/whatsapp`);
  console.log(`🔒 Ruta protegida: http://localhost:${PORT}/api/protegida`);
  console.log(`👑 Ruta supervisor: http://localhost:${PORT}/api/supervisor-only`);
  console.log(`💾 Base de datos: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'No configurada'}`);
  console.log('========================================\n');
});

// ============================================================
// 12. CIERRE GRACIOSO
// ============================================================
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});