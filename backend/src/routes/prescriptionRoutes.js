const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getUserPrescriptions,
  getAllPrescriptions,
  uploadPrescription,
  updatePrescriptionStatus,
  getPrescriptionById
} = require('../controllers/prescriptionController');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/prescriptions/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Customer routes (ONLY customers can upload and view their own prescriptions)
router.get('/my', verifyToken, getUserPrescriptions);
router.post('/upload', verifyToken, upload.single('image'), uploadPrescription);
router.get('/:id', verifyToken, getPrescriptionById);

// Pharmacist routes (Pharmacist can view all AND approve prescriptions)
router.get('/', verifyToken, authorize('PHARMACIST', 'ADMIN'), getAllPrescriptions);

// ONLY PHARMACIST can approve prescriptions - ADMIN can only view, NOT approve
router.put('/:id/status', verifyToken, authorize('PHARMACIST'), updatePrescriptionStatus);

module.exports = router;