const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken, checkSupervisorRole } = require('../middlewares/auth');

/**
 * GET /api/stats/dashboard
 * Estadísticas del dashboard
 * ✅ Requiere: verifyToken + checkSupervisorRole
 * ✅ S3-B02
 */
router.get(
  '/dashboard',
  verifyToken,
  checkSupervisorRole,
  statsController.getDashboardStats
);

module.exports = router;