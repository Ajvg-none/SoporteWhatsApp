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
        nombre: n.nombre,
        numeroFormateado: formatearNumeroVisual(n.numero),
        motivo: n.motivo,
        tipo: n.tipo,
        tipoLabel: n.tipo === 'chat_privado' ? 'Chat Privado' : 'Excluido',
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
 * Body: { numero, nombre?, motivo?, tipo? }
 */
exports.addExcludedNumber = async (req, res) => {
  try {
    const { numero, nombre, motivo, tipo = 'excluido' } = req.body;
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
        nombre: nombre?.trim() || null,
        motivo: motivo?.trim() || null,
        tipo: tipo,
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
      message: 'Número agregado exitosamente',
      data: {
        id: nuevo.id,
        numero: nuevo.numero,
        nombre: nuevo.nombre,
        numeroFormateado: formatearNumeroVisual(nuevo.numero),
        motivo: nuevo.motivo,
        tipo: nuevo.tipo,
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
 * PUT /api/excluidos/:id
 * Actualizar un número excluido (nombre, motivo, tipo)
 */
exports.updateExcludedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, motivo, tipo } = req.body;

    const existente = await prisma.numeroExcluido.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existente) {
      return res.status(404).json({
        success: false,
        error: 'Número excluido no encontrado'
      });
    }

    const dataToUpdate = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre?.trim() || null;
    if (motivo !== undefined) dataToUpdate.motivo = motivo?.trim() || null;
    if (tipo !== undefined) dataToUpdate.tipo = tipo;

    const actualizado = await prisma.numeroExcluido.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        creadoPorUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Número actualizado exitosamente',
      data: {
        id: actualizado.id,
        numero: actualizado.numero,
        nombre: actualizado.nombre,
        numeroFormateado: formatearNumeroVisual(actualizado.numero),
        motivo: actualizado.motivo,
        tipo: actualizado.tipo,
        creadoPor: actualizado.creadoPorUsuario?.nombre || 'Desconocido',
        creadoEn: actualizado.creadoEn
      }
    });
  } catch (error) {
    console.error('❌ Error en updateExcludedNumber:', error);
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

/**
 * Obtiene el alias (nombre) de un número excluido
 * @param {string} numero - Número a verificar
 * @returns {Promise<string|null>} - Alias del número o null
 */
exports.obtenerAliasNumero = async (numero) => {
  const numeroNormalizado = normalizarNumero(numero);
  const registro = await prisma.numeroExcluido.findUnique({
    where: { numero: numeroNormalizado }
  });
  return registro ? registro.nombre : null;
};