// backend/src/routes/directChat.js

const express = require('express');
const router = express.Router();
const directChatController = require('../controllers/directChatController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

// ============================================================
// IMPORTANTE: Las rutas estáticas (con palabras fijas) 
// SIEMPRE van antes que las rutas dinámicas (con :param)
// ============================================================

// GET /api/chat-directo/numbers - Lista de números para el sidebar
router.get('/numbers', verifyToken, checkSupervisorRole, directChatController.getDirectChatNumbers);

// GET /api/chat-directo/no-leidos - Contador de mensajes no leídos
router.get('/no-leidos', verifyToken, checkSupervisorRole, directChatController.getUnreadCount);

// GET /api/chat-directo - Todos los mensajes (fallback / vista general)
router.get('/', verifyToken, checkSupervisorRole, directChatController.getDirectMessages);

// GET /api/chat-directo/:numero - Mensajes de un número específico
// ⚠️ Esta ruta debe ir después de todas las rutas estáticas
router.get('/:numero', verifyToken, checkSupervisorRole, directChatController.getMessagesByNumber);

// POST /api/chat-directo - Enviar mensaje
router.post('/', verifyToken, checkSupervisorRole, directChatController.sendDirectMessage);

module.exports = router;