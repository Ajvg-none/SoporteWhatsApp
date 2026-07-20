const express = require('express');
const router = express.Router();
const excludedNumberController = require('../controllers/excludedNumberController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

// GET /api/excluidos - Listar números excluidos
router.get('/', verifyToken, checkSupervisorRole, excludedNumberController.getExcludedNumbers);

// POST /api/excluidos - Agregar número excluido
router.post('/', verifyToken, checkSupervisorRole, excludedNumberController.addExcludedNumber);

// PUT /api/excluidos/:id - Actualizar número excluido
router.put('/:id', verifyToken, checkSupervisorRole, excludedNumberController.updateExcludedNumber);

// DELETE /api/excluidos/:id - Eliminar número excluido
router.delete('/:id', verifyToken, checkSupervisorRole, excludedNumberController.removeExcludedNumber);

module.exports = router;