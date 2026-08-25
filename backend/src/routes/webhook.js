// backend/src/routes/webhook.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const verificarFirmaOpenWA = require('../middlewares/verificarFirmaOpenWA');

/**
 * POST /api/webhooks/whatsapp
 * Endpoint público para recibir webhooks de OpenWA
 * No requiere autenticación (la seguridad la da la firma HMAC)
 *
 * express.raw: el body llega como Buffer para poder verificar la firma sobre
 * los bytes EXACTOS que envía OpenWA (el JSON global lo re-serializaría).
 * En app.js se registra un parser raw previo al express.json() global.
 */
router.post(
  '/whatsapp',
  express.raw({ type: 'application/json' }),
  verificarFirmaOpenWA,
  webhookController.receiveWebhook
);

module.exports = router;
