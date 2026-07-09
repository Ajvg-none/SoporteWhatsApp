// backend/src/services/contactService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene o crea un contacto por número de teléfono
 * @param {string} numeroTelefono - Número del cliente
 * @param {Object} datosOpcionales - { nombre, sucursal } (opcional)
 * @returns {Promise<Object>} - Contacto
 */
async function findOrCreateContact(numeroTelefono, datosOpcionales = {}) {
  try {
    // Limpiar el número de teléfono (eliminar espacios, etc.)
    const numeroLimpio = numeroTelefono.trim();
    
    // Buscar contacto existente
    let contacto = await prisma.contacto.findUnique({
      where: { numero_telefono: numeroLimpio }
    });
    
    // Si no existe, crearlo
    if (!contacto) {
      contacto = await prisma.contacto.create({
        data: {
          numero_telefono: numeroLimpio,
          nombre: datosOpcionales.nombre || null,
          sucursal: datosOpcionales.sucursal || null
        }
      });
      console.log(`✅ Contacto creado: ${numeroLimpio}`);
    } else {
      console.log(`✅ Contacto existente: ${numeroLimpio} (${contacto.nombre || 'Sin nombre'})`);
    }
    
    return contacto;
    
  } catch (error) {
    console.error('❌ Error en findOrCreateContact:', error);
    throw error;
  }
}

module.exports = { findOrCreateContact };