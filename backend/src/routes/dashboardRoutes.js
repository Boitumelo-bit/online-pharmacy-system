
const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { getDashboardStats, getSystemSettings, updateSystemSetting } = require('../controllers/dashboardController');

// Protected routes - All authenticated users can access stats (role-based filtering inside controller)
router.get('/stats', verifyToken, authorize('ADMIN', 'PHARMACIST', 'CUSTOMER', 'DELIVERY_STAFF'), getDashboardStats);

// System settings - All authenticated users can view
router.get('/settings', verifyToken, getSystemSettings);

// Admin only - Update system settings (support both PUT and POST)
router.put('/settings', verifyToken, authorize('ADMIN'), updateSystemSetting);
router.post('/settings', verifyToken, authorize('ADMIN'), updateSystemSetting);

module.exports = router;