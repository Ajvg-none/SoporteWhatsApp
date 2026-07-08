const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middlewares/auth');
const { checkTicketOwnership } = require('../middlewares/ownership');
const upload = require('../middlewares/upload'); // ← NUEVO

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

module.exports = router;