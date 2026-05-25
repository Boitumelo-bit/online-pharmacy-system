const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, authorize } = require('../middleware/auth');
const medicineController = require('../controllers/medicineController');

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ==================== PUBLIC ROUTES (No authentication required) ====================
router.get('/', medicineController.getMedicines);
router.get('/trending', medicineController.getTrendingMedicines);
router.get('/search-suggestions', medicineController.getSearchSuggestions);
router.get('/:id', medicineController.getMedicineById);

// ==================== PROTECTED ROUTES (Authentication required) ====================
// Check if customer can order a prescription medicine
router.get('/:medicineId/can-order', verifyToken, medicineController.canOrderPrescriptionMedicine);

// ==================== ADMIN ONLY ROUTES ====================
router.post('/', verifyToken, authorize('ADMIN'), medicineController.createMedicine);
router.put('/:id', verifyToken, authorize('ADMIN'), medicineController.updateMedicine);
router.delete('/:id', verifyToken, authorize('ADMIN'), medicineController.deleteMedicine);
router.post('/:id/images', verifyToken, authorize('ADMIN'), upload.array('images', 5), medicineController.uploadImages);
router.put('/images/:imageId/primary', verifyToken, authorize('ADMIN'), medicineController.setPrimaryImage);
router.delete('/images/:imageId', verifyToken, authorize('ADMIN'), medicineController.deleteMedicineImage);

module.exports = router;