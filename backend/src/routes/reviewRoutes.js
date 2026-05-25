const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getMedicineReviews,
  createReview,
  approveReview,
  deleteReview
} = require('../controllers/reviewController');

// Public routes - anyone can view reviews
router.get('/medicine/:medicineId', getMedicineReviews);

// Protected routes - ONLY authenticated users (customers) can write reviews
router.post('/', verifyToken, createReview);

// Admin only - ONLY admin can approve or delete reviews
router.put('/:id/approve', verifyToken, authorize('ADMIN'), approveReview);
router.delete('/:id', verifyToken, authorize('ADMIN'), deleteReview);

module.exports = router;