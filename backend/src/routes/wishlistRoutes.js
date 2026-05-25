const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} = require('../controllers/wishlistController');

// All routes require authentication
router.use(verifyToken);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.delete('/:id', removeFromWishlist);
router.get('/check/:medicineId', checkWishlist);

module.exports = router;