const prisma = require('../config/prisma');

// Get reviews for a medicine
const getMedicineReviews = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { 
        medicineId,
        isApproved: true 
      },
      include: {
        user: {
          select: { fullName: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const averageRating = await prisma.review.aggregate({
      where: { medicineId, isApproved: true },
      _avg: { rating: true }
    });
    
    res.json({
      success: true,
      data: reviews,
      averageRating: averageRating._avg.rating || 0,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create review (Customer only, must have purchased)
const createReview = async (req, res) => {
  try {
    const { medicineId, rating, comment } = req.body;
    const userId = req.user.id;
    
    // Check if user has purchased this medicine
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        medicineId,
        order: {
          userId,
          status: 'DELIVERED'
        }
      }
    });
    
    if (!hasPurchased && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only review medicines you have purchased' 
      });
    }
    
    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: { userId, medicineId }
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this medicine' 
      });
    }
    
    const review = await prisma.review.create({
      data: {
        userId,
        medicineId,
        rating: parseInt(rating),
        comment,
        isVerified: true,
        isApproved: req.user.role === 'ADMIN' ? true : false
      }
    });
    
    // Update medicine average rating
    const avgRating = await prisma.review.aggregate({
      where: { medicineId, isApproved: true },
      _avg: { rating: true }
    });
    
    await prisma.medicine.update({
      where: { id: medicineId },
      data: {
        averageRating: avgRating._avg.rating || 0,
        totalReviews: await prisma.review.count({ where: { medicineId, isApproved: true } })
      }
    });
    
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve review (Admin only)
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.update({
      where: { id },
      data: { isApproved: true }
    });
    
    // Update medicine average rating
    const avgRating = await prisma.review.aggregate({
      where: { medicineId: review.medicineId, isApproved: true },
      _avg: { rating: true }
    });
    
    await prisma.medicine.update({
      where: { id: review.medicineId },
      data: {
        averageRating: avgRating._avg.rating || 0,
        totalReviews: await prisma.review.count({ 
          where: { medicineId: review.medicineId, isApproved: true } 
        })
      }
    });
    
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete review (Admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.review.delete({ where: { id } });
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMedicineReviews,
  createReview,
  approveReview,
  deleteReview
};