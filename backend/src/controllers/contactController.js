const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PUT /api/contactos/:numero
 * Actualizar nombre y/o sucursal de un contacto
 * ✅ Requiere: verifyToken
 */
exports.updateContact = async (req, res) => {
  try {
    const { numero } = req.params;
    const { nombre, sucursal } = req.body;
    const usuarioId = req.user.id;

    // 1. Validar que se envíe al menos un campo para actualizar
    if (!nombre && !sucursal) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar al menos un campo para actualizar (nombre o sucursal)'
      });
    }

    // 2. Validar que el contacto existe
    const contactoExistente = await prisma.contacto.findUnique({
      where: { numero_telefono: numero }
    });

    if (!contactoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    // 3. Preparar los datos para actualizar (solo los campos enviados)
    const dataToUpdate = {};
    if (nombre) dataToUpdate.nombre = nombre.trim();
    if (sucursal) dataToUpdate.sucursal = sucursal.trim();

    // 4. Actualizar el contacto
    const contactoActualizado = await prisma.contacto.update({
      where: { numero_telefono: numero },
      data: {
        ...dataToUpdate,
        actualizadoEn: new Date()
      }
    });

    // 5. Respuesta exitosa
    res.json({
      success: true,
      message: 'Contacto actualizado correctamente',
      data: {
        contacto: {
          numero_telefono: contactoActualizado.numero_telefono,
          nombre: contactoActualizado.nombre,
          sucursal: contactoActualizado.sucursal,
          actualizadoEn: contactoActualizado.actualizadoEn
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en updateContact:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/contactos/:numero
 * Obtener información de un contacto
 * ✅ Requiere: verifyToken
 */
exports.getContact = async (req, res) => {
  try {
    const { numero } = req.params;

    const contacto = await prisma.contacto.findUnique({
      where: { numero_telefono: numero }
    });

    if (!contacto) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        contacto: {
          numero_telefono: contacto.numero_telefono,
          nombre: contacto.nombre,
          sucursal: contacto.sucursal,
          creadoEn: contacto.creadoEn,
          actualizadoEn: contacto.actualizadoEn
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en getContact:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};