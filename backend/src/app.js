// Cargar variables de entorno desde el archivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

// Inicializar Express y Prisma
const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================================================================
// ENDPOINT DE HEALTH CHECK (S0-B03)
// ===================================================================
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexión con la base de datos
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

// Ruta raíz (opcional)
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API SoporteWhatsApp',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      webhook: '/api/webhooks/whatsapp'
    }
  });
});

// ===================================================================
// RUTAS DE WEBHOOKS
// ===================================================================
const webhookRoutes = require('./routes/webhook');
app.use('/api/webhooks', webhookRoutes);

// ===================================================================
// INICIAR SERVIDOR (SOLO UNA VEZ)
// ===================================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(` Base de datos: ${process.env.DATABASE_URL?.split('@')[1] || 'No configurada'}`);
});

// Cerrar conexión con Prisma al terminar
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});