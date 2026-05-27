const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, authorize } = require('../middleware/auth');
const { 
  register, 
  login, 
  getMe, 
  createUserByAdmin,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  updateUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  deleteAvatar,
  verifyOTP,
  resendOTP
} = require('../controllers/authController');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: fileFilter
});

// ==================== PUBLIC ROUTES ====================
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// ==================== PROTECTED ROUTES ====================
router.get('/me', verifyToken, getMe);
router.put('/update-profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.post('/upload-avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.delete('/delete-avatar', verifyToken, deleteAvatar);

// ==================== ADMIN ONLY ROUTES ====================
router.get('/admin/users', verifyToken, authorize('ADMIN'), getAllUsers);
router.post('/admin/create-user', verifyToken, authorize('ADMIN'), createUserByAdmin);
router.put('/admin/update-role/:id', verifyToken, authorize('ADMIN'), updateUserRole);
router.put('/admin/toggle-status/:id', verifyToken, authorize('ADMIN'), toggleUserStatus);
router.put('/admin/update-user/:id', verifyToken, authorize('ADMIN'), updateUser);

module.exports = router;