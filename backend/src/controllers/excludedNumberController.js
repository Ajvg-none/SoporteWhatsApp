const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Normaliza un número de teléfono para comparación
 * Quita @c.us, @g.us, espacios, guiones, paréntesis
 */
function normalizarNumero(numero) {
  if (!numero) return '';
  return numero
    .replace(/@c\.us|@g\.us/gi, '')
    .replace(/[\s\-\(\)]/g, '')
    .trim();
}

/**
 * Formatea un número para visualización amigable
 */
function formatearNumeroVisual(numero) {
  if (!numero) return '';
  const limpio = numero.replace(/@c\.us|@g\.us/gi, '');
  if (limpio.length >= 10) {
    return `+${limpio.slice(0, -10)} ${limpio.slice(-10, -7)} ${limpio.slice(-7, -4)} ${limpio.slice(-4)}`;
  }
  return `+${limpio}`;
}

/**
 * GET /api/excluidos
 * Listar todos los números excluidos (solo supervisores)
 */
exports.getExcludedNumbers = async (req, res) => {
  try {
    const numeros = await prisma.numeroExcluido.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        creadoPorUsuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: numeros.map(n => ({
        id: n.id,
        numero: n.numero,
        numeroFormateado: formatearNumeroVisual(n.numero),
        motivo: n.motivo,
        creadoPor: n.creadoPorUsuario?.nombre || 'Desconocido',
        creadoEn: n.creadoEn
      }))
    });
  } catch (error) {
    console.error('❌ Error en getExcludedNumbers:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/excluidos
 * Agregar un número a la lista de excluidos
 * Body: { numero, motivo? }
 */
exports.addExcludedNumber = async (req, res) => {
  try {
    const { numero, motivo } = req.body;
    const userId = req.user.id;

    if (!numero || numero.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El número de teléfono es obligatorio'
      });
    }

    const numeroNormalizado = normalizarNumero(numero);

    // Verificar si ya existe
    const existente = await prisma.numeroExcluido.findUnique({
      where: { numero: numeroNormalizado }
    });

    if (existente) {
      return res.status(409).json({
        success: false,
        error: 'Este número ya está en la lista de excluidos'
      });
    }

    const nuevo = await prisma.numeroExcluido.create({
      data: {
        numero: numeroNormalizado,
        motivo: motivo?.trim() || null,
        tipo: req.body.tipo || 'excluido', // ← NUEVO: aceptar tipo
        creadoPor: userId
        },
      include: {
        creadoPorUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Número agregado a la lista de excluidos',
      data: {
        id: nuevo.id,
        numero: nuevo.numero,
        numeroFormateado: formatearNumeroVisual(nuevo.numero),
        motivo: nuevo.motivo,
        creadoPor: nuevo.creadoPorUsuario?.nombre || 'Desconocido',
        creadoEn: nuevo.creadoEn
      }
    });
  } catch (error) {
    console.error('❌ Error en addExcludedNumber:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/excluidos/:id
 * Eliminar un número de la lista de excluidos
 */
exports.removeExcludedNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await prisma.numeroExcluido.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existente) {
      return res.status(404).json({
        success: false,
        error: 'Número excluido no encontrado'
      });
    }

    await prisma.numeroExcluido.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Número eliminado de la lista de excluidos'
    });
  } catch (error) {
    console.error('❌ Error en removeExcludedNumber:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * Verifica si un número está excluido (uso interno del webhook)
 * @param {string} numero - Número a verificar
 * @returns {Promise<boolean>}
 */
exports.esNumeroExcluido = async (numero) => {
  const numeroNormalizado = normalizarNumero(numero);
  const excluido = await prisma.numeroExcluido.findUnique({
    where: { numero: numeroNormalizado }
  });
  return !!excluido;
};

/**
 * Obtiene el tipo de exclusión de un número
 * @param {string} numero - Número a verificar
 * @returns {Promise<string|null>} - "excluido", "chat_privado" o null
 */
exports.obtenerTipoExclusion = async (numero) => {
  const numeroNormalizado = normalizarNumero(numero);
  const registro = await prisma.numeroExcluido.findUnique({
    where: { numero: numeroNormalizado }
  });
  return registro ? registro.tipo : null;
};