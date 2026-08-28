const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

/**
 * GET /api/contactos
 * Listado paginado de contactos con búsqueda
 * ✅ Requiere: verifyToken + checkSupervisorRole (solo supervisor)
 */
router.get('/', verifyToken, checkSupervisorRole, contactController.getContacts);

/**
 * POST /api/contactos
 * Crear contacto manualmente
 * ✅ Requiere: verifyToken + checkSupervisorRole (solo supervisor)
 */
router.post('/', verifyToken, checkSupervisorRole, contactController.createContact);

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

/**
 * DELETE /api/contactos/:numero
 * Eliminar un contacto
 * ✅ Requiere: verifyToken + checkSupervisorRole (solo supervisor)
 */
router.delete('/:numero', verifyToken, checkSupervisorRole, contactController.deleteContact);

module.exports = router;
