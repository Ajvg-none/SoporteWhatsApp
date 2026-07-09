// backend/src/routes/webhook.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

/**
 * POST /api/webhooks/whatsapp
 * Endpoint público para recibir webhooks de OpenWA
 * No requiere autenticación
 */
router.post('/whatsapp', webhookController.receiveWebhook);

module.exports = router;