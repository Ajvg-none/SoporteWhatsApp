const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Servicio de limpieza de archivos multimedia
 * Elimina archivos de tickets cerrados con más de 6 meses
 */
class CleanupService {
  
  /**
   * Ejecuta la limpieza de archivos
   * @returns {Promise<{ eliminados: number, errores: number, detalles: Array }>}
   */
  async ejecutarLimpieza() {
    console.log('🧹 Iniciando limpieza de archivos antiguos...');
    
    const resultados = {
      eliminados: 0,
      errores: 0,
      detalles: []
    };

    try {
      // 1. Calcular fecha límite (6 meses atrás)
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() - 6);

      console.log(`📅 Eliminando archivos anteriores a: ${fechaLimite.toISOString()}`);

      // 2. Buscar mensajes de tickets cerrados con archivos adjuntos
      const mensajes = await prisma.mensaje.findMany({
        where: {
          urlAdjunto: {
            not: null
          },
          enviadoEn: {
            lt: fechaLimite
          },
          ticket: {
            estado: 'cerrado'
          }
        },
        include: {
          ticket: {
            select: {
              id: true,
              numeroCliente: true
            }
          }
        }
      });

      console.log(`📎 Encontrados ${mensajes.length} mensajes con archivos para limpiar`);

      // 3. Procesar cada archivo
      const uploadsDir = path.join(__dirname, '../../uploads');

      for (const mensaje of mensajes) {
        try {
          const nombreArchivo = path.basename(mensaje.urlAdjunto);
          const rutaArchivo = path.join(uploadsDir, nombreArchivo);
          
          // Verificar si el archivo existe
          if (fs.existsSync(rutaArchivo)) {
            // Eliminar archivo
            fs.unlinkSync(rutaArchivo);
            
            resultados.eliminados++;
            resultados.detalles.push({
              archivo: mensaje.urlAdjunto,
              ticketId: mensaje.ticketId,
              mensajeId: mensaje.id,
              estado: 'eliminado'
            });
            
            console.log(`🗑️ Archivo eliminado: ${mensaje.urlAdjunto}`);
          } else {
            console.log(`⚠️ Archivo no encontrado: ${mensaje.urlAdjunto}`);
            resultados.detalles.push({
              archivo: mensaje.urlAdjunto,
              ticketId: mensaje.ticketId,
              mensajeId: mensaje.id,
              estado: 'no_encontrado'
            });
          }

        } catch (error) {
          console.error(`❌ Error eliminando archivo ${mensaje.urlAdjunto}:`, error.message);
          resultados.errores++;
          resultados.detalles.push({
            archivo: mensaje.urlAdjunto,
            ticketId: mensaje.ticketId,
            mensajeId: mensaje.id,
            estado: 'error',
            error: error.message
          });
        }
      }

      console.log(`✅ Limpieza completada: ${resultados.eliminados} archivos eliminados, ${resultados.errores} errores`);

      // 4. Registrar en un log
      this.registrarLog(resultados);

      return resultados;

    } catch (error) {
      console.error('❌ Error en ejecutarLimpieza:', error);
      throw error;
    }
  }

  /**
   * Registra el resultado de la limpieza en un archivo de log
   */
  registrarLog(resultados) {
    const logDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `cleanup-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = {
      fecha: new Date().toISOString(),
      ...resultados
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry, null, 2) + '\n');
    console.log(`📝 Log guardado en: ${logFile}`);
  }
}

module.exports = new CleanupService();