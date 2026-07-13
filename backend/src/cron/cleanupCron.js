const cron = require('node-cron');
const cleanupService = require('../services/cleanupService');

/**
 * Programa la limpieza automática de archivos
 * Se ejecuta todos los días a las 2:00 AM
 */
function iniciarCronLimpieza() {
  // Cron: todos los días a las 2:00 AM
  const tarea = cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Ejecutando limpieza programada de archivos...');
    try {
      await cleanupService.ejecutarLimpieza();
    } catch (error) {
      console.error('❌ Error en limpieza programada:', error);
    }
  });

  console.log('🕐 Cron de limpieza programado para las 2:00 AM diarias');
  
  return tarea;
}

module.exports = { iniciarCronLimpieza };