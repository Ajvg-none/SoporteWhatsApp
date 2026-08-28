const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { limpiarNumero } = require('../services/contactService');

/**
 * Normaliza un número para guardarlo como contacto visible (@c.us).
 * Quita espacios/guiones/sufijos y añade @c.us si no viene con @lid (los manuales
 * no son @lid, así que siempre se guardan como número real).
 * @param {string} numero
 * @returns {string}
 */
function normalizarNumeroContacto(numero) {
  const limpio = limpiarNumero(numero);
  if (!limpio) return '';
  // Si vino con @lid lo conservamos con su sufijo (caso límite); si no, @c.us.
  if (/@lid/i.test(String(numero))) {
    return limpiarNumero(numero).replace(/(@lid)$/i, '@lid') ;
  }
  return `${limpio}@c.us`;
}

/**
 * GET /api/contactos
 * Listado paginado de contactos con búsqueda (solo supervisor)
 * Query params: buscar, page, limit
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.getContacts = async (req, res) => {
  try {
    const { buscar, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (buscar && buscar.trim() !== '') {
      const term = buscar.trim();
      where.OR = [
        { numero_telefono: { contains: term, mode: 'insensitive' } },
        { nombre: { contains: term, mode: 'insensitive' } },
        { sucursal: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [contactos, total] = await Promise.all([
      prisma.contacto.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { creadoEn: 'desc' }
      }),
      prisma.contacto.count({ where })
    ]);

    // No exponer el @lid en el listado; formatear el número visible.
    const data = contactos.map(c => ({
      numero_telefono: c.numero_telefono,
      nombre: c.nombre,
      sucursal: c.sucursal,
      creadoEn: c.creadoEn,
      actualizadoEn: c.actualizadoEn
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error en getContacts:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/contactos
 * Crear contacto manualmente (solo supervisor)
 * Body: { numero, nombre?, sucursal? }
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.createContact = async (req, res) => {
  try {
    const { numero, nombre, sucursal } = req.body || {};

    if (!numero) {
      return res.status(400).json({
        success: false,
        error: 'El número de teléfono es obligatorio'
      });
    }

    const numeroVisible = normalizarNumeroContacto(numero);
    if (!numeroVisible) {
      return res.status(400).json({
        success: false,
        error: 'El número de teléfono no es válido'
      });
    }

    const existente = await prisma.contacto.findUnique({
      where: { numero_telefono: numeroVisible }
    });
    if (existente) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un contacto con ese número'
      });
    }

    const contacto = await prisma.contacto.create({
      data: {
        numero_telefono: numeroVisible,
        nombre: nombre ? String(nombre).trim() : null,
        sucursal: sucursal ? String(sucursal).trim() : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Contacto creado correctamente',
      data: {
        contacto: {
          numero_telefono: contacto.numero_telefono,
          nombre: contacto.nombre,
          sucursal: contacto.sucursal,
          creadoEn: contacto.creadoEn
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en createContact:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

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

/**
 * DELETE /api/contactos/:numero
 * Eliminar un contacto (solo supervisor)
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.deleteContact = async (req, res) => {
  try {
    const { numero } = req.params;

    const existente = await prisma.contacto.findUnique({
      where: { numero_telefono: numero }
    });

    if (!existente) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    await prisma.contacto.delete({
      where: { numero_telefono: numero }
    });

    res.json({
      success: true,
      message: 'Contacto eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error en deleteContact:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};