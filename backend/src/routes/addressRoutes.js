const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

// All address routes require authentication
router.use(verifyToken);

// Get all addresses
router.get('/', getAddresses);

// Get single address
router.get('/:id', getAddressById);

// Create address
router.post('/', createAddress);

// Update address
router.put('/:id', updateAddress);

// Delete address
router.delete('/:id', deleteAddress);

// Set default address
router.put('/:id/default', setDefaultAddress);

module.exports = router;