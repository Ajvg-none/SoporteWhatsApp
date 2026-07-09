const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middlewares/auth');

/**
 * GET /api/contactos/:numero
 * Obtener información de un contacto
 * ✅ Requiere: verifyToken
 */
router.get('/:numero', verifyToken, contactController.getContact);

/**
 * PUT /api/contactos/:numero
 * Actualizar nombre y/o sucursal de un contacto
 * ✅ Requiere: verifyToken
 */
router.put('/:numero', verifyToken, contactController.updateContact);

module.exports = router;