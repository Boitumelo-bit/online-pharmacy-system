const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
});

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Get single category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        medicines: {
          where: { isActive: true },
          include: {
            images: true,
          },
          take: 20,
        },
      },
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

// Create category (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    let imageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'pharmacy/categories',
      });
      imageUrl = result.secure_url;
    }
    
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image: imageUrl,
      },
    });
    
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    
    const updateData = {};
    
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive === 'true';
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'pharmacy/categories',
      });
      updateData.image = result.secure_url;
    }
    
    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });
    
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const medicineCount = await prisma.medicine.count({
      where: { categoryId: id },
    });
    
    if (medicineCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category with ${medicineCount} medicines. Move or delete medicines first.` 
      });
    }
    
    await prisma.category.delete({
      where: { id },
    });
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};