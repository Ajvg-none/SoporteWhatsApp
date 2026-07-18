const express = require('express');
const router = express.Router();
const directChatController = require('../controllers/directChatController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

// GET /api/chat-directo - Obtener mensajes directos (solo supervisores)
router.get('/', verifyToken, checkSupervisorRole, directChatController.getDirectMessages);

// POST /api/chat-directo - Enviar mensaje directo (solo supervisores)
router.post('/', verifyToken, checkSupervisorRole, directChatController.sendDirectMessage);

// GET /api/chat-directo/no-leidos - Contar mensajes no leídos
router.get('/no-leidos', verifyToken, checkSupervisorRole, directChatController.getUnreadCount);

module.exports = router;