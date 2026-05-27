const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
});

// Get all medicines with filters
const getMedicines = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      minPrice,
      maxPrice,
      prescriptionRequired,
      isFeatured,
    } = req.query;

    const skip = (page - 1) * limit;
    const where = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (categoryId) where.categoryId = categoryId;
    if (prescriptionRequired !== undefined) where.prescriptionRequired = prescriptionRequired === 'true';
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
    
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    
    const medicines = await prisma.medicine.findMany({
      where,
      include: {
        category: true,
        images: true,
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });
    
    const total = await prisma.medicine.count({ where });
    
    res.json({
      success: true,
      data: medicines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching medicines', error: error.message });
  }
};

// Get single medicine
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        reviews: true,
      },
    });
    
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    
    res.json(medicine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching medicine', error: error.message });
  }
};

// Get medicine images - OPTIMIZED VERSION
const getMedicineImages = async (req, res) => {
  try {
    const { id } = req.params;
    
    const images = await prisma.medicineImage.findMany({
      where: { 
        medicineId: id 
      },
      select: {
        id: true,
        url: true,
        isPrimary: true,
      },
      orderBy: {
        isPrimary: 'desc'
      }
    });
    
    res.json({
      success: true,
      images: images
    });
    
  } catch (error) {
    console.error('Error fetching medicine images:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching images',
      images: []
    });
  }
};

// Check if customer can order a prescription medicine
const canOrderPrescriptionMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const userId = req.user.id;
    
    console.log(`Checking prescription for user ${userId}, medicine ${medicineId}`);
    
    // Get medicine details
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      select: { prescriptionRequired: true, name: true }
    });
    
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    
    console.log(`Medicine ${medicine.name} requires prescription: ${medicine.prescriptionRequired}`);
    
    // If prescription not required, always allowed
    if (!medicine.prescriptionRequired) {
      return res.json({ 
        success: true, 
        canOrder: true, 
        prescriptionRequired: false,
        message: 'No prescription needed'
      });
    }
    
    // Check if user has an APPROVED prescription item for THIS SPECIFIC medicine
    const approvedPrescriptionItem = await prisma.prescriptionItem.findFirst({
      where: {
        medicineId: medicineId,
        status: 'APPROVED',
        prescription: {
          userId: userId,
        }
      },
      include: {
        prescription: true
      }
    });
    
    console.log(`User has approved prescription for ${medicine.name}: ${!!approvedPrescriptionItem}`);
    
    if (approvedPrescriptionItem) {
      return res.json({
        success: true,
        canOrder: true,
        prescriptionRequired: true,
        prescriptionApproved: true,
        message: `You have an approved prescription for ${medicine.name}`,
        quantity: approvedPrescriptionItem.quantity,
        prescriptionId: approvedPrescriptionItem.prescriptionId
      });
    } else {
      // Check if user has any pending prescription for this medicine
      const pendingPrescriptionItem = await prisma.prescriptionItem.findFirst({
        where: {
          medicineId: medicineId,
          status: 'PENDING',
          prescription: {
            userId: userId,
          }
        }
      });
      
      if (pendingPrescriptionItem) {
        return res.json({
          success: true,
          canOrder: false,
          prescriptionRequired: true,
          prescriptionApproved: false,
          message: `Your prescription for ${medicine.name} is pending pharmacist approval.`
        });
      } else {
        return res.json({
          success: true,
          canOrder: false,
          prescriptionRequired: true,
          prescriptionApproved: false,
          message: `This medicine requires a prescription. Please upload a prescription for ${medicine.name}.`
        });
      }
    }
  } catch (error) {
    console.error('Error checking prescription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create medicine
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      description,
      dosage,
      sideEffects,
      categoryId,
      price,
      discount,
      stock,
      batchNumber,
      expiryDate,
      barcode,
      prescriptionRequired,
      isFeatured,
    } = req.body;
    
    // ========== VALIDATION ==========
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Medicine name is required' });
    }
    
    if (!categoryId || categoryId === '') {
      return res.status(400).json({ message: 'Category is required' });
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }
    
    if (!stock || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      return res.status(400).json({ message: 'Valid stock quantity is required' });
    }
    
    if (!batchNumber || batchNumber.trim() === '') {
      return res.status(400).json({ message: 'Batch number is required' });
    }
    
    if (!expiryDate) {
      return res.status(400).json({ message: 'Expiry date is required' });
    }
    
    // Validate and parse expiry date
    const parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid expiry date format. Please use YYYY-MM-DD' });
    }
    
    if (!barcode || barcode.trim() === '') {
      return res.status(400).json({ message: 'Barcode is required' });
    }
    
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return res.status(400).json({ message: 'Invalid category selected' });
    }
    
    // Check for existing barcode
    const existingBarcode = await prisma.medicine.findUnique({
      where: { barcode }
    });
    
    if (existingBarcode) {
      return res.status(400).json({ message: 'Medicine with this barcode already exists' });
    }
    
    // ========== END OF VALIDATION ==========
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check for existing slug
    const existingSlug = await prisma.medicine.findUnique({
      where: { slug }
    });
    
    if (existingSlug) {
      return res.status(400).json({ message: 'Medicine with similar name already exists' });
    }
    
    const medicine = await prisma.medicine.create({
      data: {
        name: name.trim(),
        slug,
        description: description || '',
        dosage: dosage || '',
        sideEffects: sideEffects || '',
        categoryId,
        price: parseFloat(price),
        discount: discount ? parseFloat(discount) : 0,
        stock: parseInt(stock),
        batchNumber: batchNumber.trim(),
        expiryDate: parsedExpiryDate,
        barcode: barcode.trim(),
        prescriptionRequired: prescriptionRequired === 'true' || prescriptionRequired === true,
        isFeatured: isFeatured === 'true' || isFeatured === true,
      },
      include: {
        category: true,
      },
    });
    
    await prisma.inventoryMovement.create({
      data: {
        medicineId: medicine.id,
        quantity: parseInt(stock),
        type: 'PURCHASE',
        notes: 'Initial stock',
        performedBy: req.user.id,
      },
    });
    
    res.status(201).json(medicine);
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ message: 'Error creating medicine', error: error.message });
  }
};

// Update medicine
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.slug;
    
    // Validate medicine exists
    const existingMedicine = await prisma.medicine.findUnique({
      where: { id }
    });
    
    if (!existingMedicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    
    // Validate and parse data if provided
    if (updateData.price !== undefined) {
      if (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0) {
        return res.status(400).json({ message: 'Invalid price value' });
      }
      updateData.price = parseFloat(updateData.price);
    }
    
    if (updateData.discount !== undefined) {
      if (isNaN(parseFloat(updateData.discount)) || parseFloat(updateData.discount) < 0) {
        return res.status(400).json({ message: 'Invalid discount value' });
      }
      updateData.discount = parseFloat(updateData.discount);
    }
    
    if (updateData.stock !== undefined) {
      if (isNaN(parseInt(updateData.stock))) {
        return res.status(400).json({ message: 'Invalid stock value' });
      }
      updateData.stock = parseInt(updateData.stock);
    }
    
    if (updateData.expiryDate !== undefined) {
      const parsedDate = new Date(updateData.expiryDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format' });
      }
      updateData.expiryDate = parsedDate;
    }
    
    // Validate category if being updated
    if (updateData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updateData.categoryId }
      });
      if (!category) {
        return res.status(400).json({ message: 'Invalid category selected' });
      }
    }
    
    // Check barcode uniqueness if being updated
    if (updateData.barcode && updateData.barcode !== existingMedicine.barcode) {
      const existingBarcode = await prisma.medicine.findUnique({
        where: { barcode: updateData.barcode }
      });
      if (existingBarcode) {
        return res.status(400).json({ message: 'Barcode already exists' });
      }
    }
    
    const medicine = await prisma.medicine.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: true,
      },
    });
    
    // Record stock change if stock was updated
    if (updateData.stock !== undefined && updateData.stock !== existingMedicine.stock) {
      await prisma.inventoryMovement.create({
        data: {
          medicineId: medicine.id,
          quantity: updateData.stock - existingMedicine.stock,
          type: 'ADJUSTMENT',
          notes: 'Stock adjustment via update',
          performedBy: req.user.id,
        },
      });
    }
    
    res.json(medicine);
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ message: 'Error updating medicine', error: error.message });
  }
};

// Delete medicine
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    
    const medicine = await prisma.medicine.findUnique({
      where: { id }
    });
    
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    
    await prisma.medicine.update({
      where: { id },
      data: { isActive: false },
    });
    
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting medicine', error: error.message });
  }
};

// Upload medicine images - FIXED VERSION
const uploadImages = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;
    
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        images: true
      }
    });
    
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const uploadedImages = [];
    const currentImageCount = medicine.images?.length || 0;
    
    for (let i = 0; i < files.length; i++) {
      const result = await cloudinary.uploader.upload(files[i].path, {
        folder: `pharmacy/medicines/${id}`,
      });
      
      const image = await prisma.medicineImage.create({
        data: {
          medicineId: id,
          url: result.secure_url,
          isPrimary: (i === 0 && currentImageCount === 0),
        },
      });
      
      uploadedImages.push(image);
    }
    
    res.json({ 
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ 
      message: 'Error uploading images', 
      error: error.message 
    });
  }
};

// Set primary image
const setPrimaryImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const image = await prisma.medicineImage.findUnique({
      where: { id: imageId }
    });
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    await prisma.medicineImage.updateMany({
      where: { medicineId: image.medicineId },
      data: { isPrimary: false },
    });
    
    await prisma.medicineImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
    
    res.json({ message: 'Primary image updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error setting primary image', error: error.message });
  }
};

// Delete medicine image - FIXED VERSION
const deleteMedicineImage = async (req, res) => {
  try {
    const imageId = req.params.imageId;
    
    console.log('Deleting image with ID:', imageId);
    
    if (!imageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image ID is required' 
      });
    }
    
    const image = await prisma.medicineImage.findUnique({
      where: { id: imageId }
    });
    
    if (!image) {
      console.log('Image not found:', imageId);
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Delete from Cloudinary (optional)
    try {
      if (image.url && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'demo') {
        const urlParts = image.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = `pharmacy/medicines/${image.medicineId}/${filename.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (cloudinaryError) {
      console.warn('Cloudinary deletion failed:', cloudinaryError.message);
    }
    
    await prisma.medicineImage.delete({
      where: { id: imageId }
    });
    
    if (image.isPrimary) {
      const anotherImage = await prisma.medicineImage.findFirst({
        where: { medicineId: image.medicineId }
      });
      
      if (anotherImage) {
        await prisma.medicineImage.update({
          where: { id: anotherImage.id },
          data: { isPrimary: true }
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting image',
      error: error.message 
    });
  }
};

// Get trending medicines
const getTrendingMedicines = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const trending = await prisma.orderItem.groupBy({
      by: ['medicineId'],
      _sum: {
        quantity: true,
      },
      where: {
        order: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
          status: 'DELIVERED',
        },
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });
    
    const medicineIds = trending.map(t => t.medicineId);
    
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, isActive: true },
      include: {
        images: true,
        category: true,
      },
    });
    
    const sortedMedicines = medicineIds.map(id => 
      medicines.find(m => m.id === id)
    ).filter(m => m);
    
    res.json(sortedMedicines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching trending medicines', error: error.message });
  }
};

// Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const suggestions = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        prescriptionRequired: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: 10,
    });
    
    res.json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching suggestions', error: error.message });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getMedicineImages,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  uploadImages,
  setPrimaryImage,
  deleteMedicineImage,
  getTrendingMedicines,
  getSearchSuggestions,
  canOrderPrescriptionMedicine,
};