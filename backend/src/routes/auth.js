const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * POST /api/auth/login
 * Iniciar sesión con credenciales
 */
router.post('/login', authController.login);


/**
 * POST /api/auth/logout
 * Cerrar sesión (solo invalida en frontend)
 */
router.post('/logout', authController.logout);

module.exports = router;