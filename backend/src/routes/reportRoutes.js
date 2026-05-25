const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getSalesReport,
  getTopProducts,
  getOrdersByStatus,
  getDailySales,
  getInventoryAlerts,
  getUserStatistics
} = require('../controllers/reportController');

// All report routes require authentication and admin access
router.use(verifyToken, authorize('ADMIN'));

// Report endpoints
router.get('/sales', getSalesReport);
router.get('/top-products', getTopProducts);
router.get('/orders-by-status', getOrdersByStatus);
router.get('/daily-sales', getDailySales);
router.get('/inventory-alerts', getInventoryAlerts);
router.get('/user-statistics', getUserStatistics);

module.exports = router;