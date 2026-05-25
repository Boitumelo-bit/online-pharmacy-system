const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken, authorize } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

const upload = multer({ dest: 'uploads/' });

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Admin only
router.post('/', verifyToken, authorize('ADMIN'), upload.single('image'), categoryController.createCategory);
router.put('/:id', verifyToken, authorize('ADMIN'), upload.single('image'), categoryController.updateCategory);
router.delete('/:id', verifyToken, authorize('ADMIN'), categoryController.deleteCategory);

module.exports = router;