const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');
const { checkTicketOwnership } = require('../middlewares/ownership');
const upload = require('../middlewares/upload');

/**
 * GET /api/tickets
 * Listado paginado de tickets con filtros
 * Requiere autenticación
 */
router.get('/', verifyToken, ticketController.getTickets);

/**
 * GET /api/tickets/:id
 * Detalle completo de un ticket
 * Requiere autenticación
 */
router.get('/:id', verifyToken, ticketController.getTicketById);

/**
 * POST /api/tickets/:id/assign
 * Asignar ticket a un técnico ("Tomar caso")
 * Requiere autenticación
 */
router.post('/:id/assign', verifyToken, ticketController.assignTicket);

/**
 * POST /api/tickets/:id/messages
 * Enviar mensaje al cliente (soporta archivos adjuntos)
 * ✅ Requiere: verifyToken + checkTicketOwnership + upload.single('archivo')
 */
router.post(
  '/:id/messages',
  verifyToken,
  checkTicketOwnership,  // ← AHORA SÍ ESTÁ PRESENTE
  upload.single('archivo'), // ← NUEVO: procesa el archivo
  ticketController.sendMessage
);


/**
 * PUT /api/tickets/:id/status
 * Cambiar estado del ticket
 * ✅ Requiere: verifyToken + checkTicketOwnership
 */
router.put(
  '/:id/status',
  verifyToken,
  checkTicketOwnership,
  ticketController.changeStatus
);

/**
 * POST /api/tickets/:id/close
 * Cerrar ticket
 * ✅ Requiere: verifyToken + checkTicketOwnership
 */
router.post(
  '/:id/close',
  verifyToken,
  checkTicketOwnership,
  ticketController.closeTicket
);

/**
 * POST /api/tickets/:id/transfer-request
 * Solicitar transferencia a otro técnico
 * ✅ Requiere: verifyToken + checkTicketOwnership
 * ✅ Verifica transferido=false
 */
router.post(
  '/:id/transfer-request',
  verifyToken,
  checkTicketOwnership,
  ticketController.requestTransfer
);

/**
 * POST /api/tickets/:id/transfer-accept
 * Aceptar transferencia (solo el técnico destino)
 * ✅ NO usa checkTicketOwnership (validación específica)
 * ✅ Usa transacción para atomicidad
 */
router.post(
  '/:id/transfer-accept',
  verifyToken,
  ticketController.acceptTransfer
);

/**
 * POST /api/tickets/:id/transfer-reject
 * Rechazar transferencia (solo el técnico destino)
 * ✅ NO usa checkTicketOwnership (validación específica)
 * ✅ NO modifica transferido
 */
router.post(
  '/:id/transfer-reject',
  verifyToken,
  ticketController.rejectTransfer
);

/**
 * POST /api/tickets/:id/force-assign
 * Reasignación forzada por supervisor
 * ✅ Solo supervisores (checkSupervisorRole)
 * ✅ NO usa checkTicketOwnership
 * ✅ NO modifica transferido
 */
router.post(
  '/:id/force-assign',
  verifyToken,
  checkSupervisorRole,  // ← Solo supervisores
  ticketController.forceAssign
);

module.exports = router;