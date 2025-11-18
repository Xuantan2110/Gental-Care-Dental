const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.get('/appointment-stats', verifyToken, verifyRole(['Admin', 'Staff']), dashboardController.getAppointmentStats);
router.get('/service-usage-stats', verifyToken, verifyRole(['Admin', 'Staff']), dashboardController.getServiceUsageStats);
router.get('/revenue-stats', verifyToken, verifyRole(['Admin', 'Staff']), dashboardController.getRevenueStats);
router.get('/quick-metrics', verifyToken, verifyRole(['Admin', 'Staff']), dashboardController.getQuickMetrics);

module.exports = router;

