const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getMyDeliveries,
  getAvailableOrders,
  assignDelivery,
  selfAssignDelivery,
  updateDeliveryStatus,
  trackDelivery,
  getDeliveryStats
} = require('../controllers/deliveryController');

// Delivery staff routes
router.get('/my', verifyToken, authorize('DELIVERY_STAFF'), getMyDeliveries);
router.get('/available', verifyToken, authorize('DELIVERY_STAFF'), getAvailableOrders);
router.put('/:id/status', verifyToken, authorize('DELIVERY_STAFF'), updateDeliveryStatus);
router.post('/accept/:orderId', verifyToken, authorize('DELIVERY_STAFF'), selfAssignDelivery);

// Customer routes
router.get('/track/:orderId', verifyToken, trackDelivery);

// Admin/Pharmacist routes
router.post('/assign', verifyToken, authorize('ADMIN', 'PHARMACIST'), assignDelivery);
router.get('/stats', verifyToken, authorize('ADMIN'), getDeliveryStats);

module.exports = router;