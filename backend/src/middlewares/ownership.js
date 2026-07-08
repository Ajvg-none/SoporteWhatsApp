const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware para verificar que el usuario sea el técnico asignado al ticket
 * Solo el técnico asignado puede modificar el ticket (enviar mensajes, cambiar estado, etc.)
 * Excepción: Si el ticket está en estado NUEVO, cualquier usuario autenticado puede tomar el caso
 */
const checkTicketOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.rol;

    // 1. Obtener el ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    // 2. Validar que el ticket existe
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 3. Si el ticket está en estado NUEVO, permitir acceso (cualquiera puede tomar el caso)
    if (ticket.estado === 'nuevo') {
      return next();
    }

    // 4. Si el ticket está CERRADO, no permitir modificaciones
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede modificar un ticket cerrado'
      });
    }

    // 5. Verificar que el usuario sea el técnico asignado
    if (ticket.tecnicoAsignadoId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo el técnico asignado puede realizar esta acción.'
      });
    }

    // 6. Si todo está bien, continuar
    next();
  } catch (error) {
    console.error('❌ Error en checkTicketOwnership:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = { checkTicketOwnership };