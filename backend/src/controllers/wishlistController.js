const prisma = require('../config/prisma');

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        medicine: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ success: true, data: wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { medicineId } = req.body;
    const userId = req.user.id;
    
    // Check if already in wishlist
    const existing = await prisma.wishlist.findFirst({
      where: { userId, medicineId },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Item already in wishlist' });
    }
    
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        medicineId,
      },
      include: {
        medicine: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });
    
    res.status(201).json({ success: true, data: wishlistItem });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.wishlist.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check if item is in wishlist
const checkWishlist = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const userId = req.user.id;
    
    const exists = await prisma.wishlist.findFirst({
      where: { userId, medicineId },
    });
    
    res.json({ success: true, inWishlist: !!exists });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
};