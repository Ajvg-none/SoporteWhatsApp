const express = require('express');
const router = express.Router();
const excludedNumberController = require('../controllers/excludedNumberController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

// GET /api/excluidos - Listar números excluidos (solo supervisores)
router.get('/', verifyToken, checkSupervisorRole, excludedNumberController.getExcludedNumbers);

// POST /api/excluidos - Agregar número excluido (solo supervisores)
router.post('/', verifyToken, checkSupervisorRole, excludedNumberController.addExcludedNumber);

// DELETE /api/excluidos/:id - Eliminar número excluido (solo supervisores)
router.delete('/:id', verifyToken, checkSupervisorRole, excludedNumberController.removeExcludedNumber);

module.exports = router;