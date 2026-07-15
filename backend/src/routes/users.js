const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

/**
 * GET /api/users/tecnicos
 * Listar todos los técnicos (cualquier usuario autenticado)
 * ✅ Requiere: verifyToken (NO requiere supervisor)
 */
router.get('/tecnicos', verifyToken, userController.getTechnicians);

/**
 * GET /api/users
 * Listar todos los usuarios
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
router.get('/', verifyToken, checkSupervisorRole, userController.getUsers);

/**
 * POST /api/users
 * Crear un nuevo técnico
 * ✅ Requiere: verifyToken + checkSupervisorRole
 * ✅ S3-B07
 */
router.post('/', verifyToken, checkSupervisorRole, userController.createUser);

/**
 * PATCH /api/users/:id/desactivar
 * Desactivar un usuario sin eliminarlo físicamente
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
router.patch('/:id/desactivar', verifyToken, checkSupervisorRole, userController.desactivarUsuario);

/**
 * DELETE /api/users/:id
 * Eliminar un usuario
 * ✅ Requiere: verifyToken + checkSupervisorRole
 * ✅ S3-B06
 */
router.delete('/:id', verifyToken, checkSupervisorRole, userController.deleteUser);

module.exports = router;