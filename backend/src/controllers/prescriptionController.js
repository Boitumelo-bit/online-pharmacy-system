const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const { sendPrescriptionUpdate, sendNotification } = require('../sockets/socketHandler');
const { sendPrescriptionUpdateEmail } = require('../services/emailService'); // FIXED: changed from brevoEmailService to emailService

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/prescriptions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Get user's prescriptions
const getUserPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { userId: req.user.id },
      include: {
        user: {
          select: { fullName: true, email: true }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all prescriptions (Pharmacist/Admin only)
const getAllPrescriptions = async (req, res) => {
  try {
    // ✅ SECURITY: Only pharmacists and admins can view all prescriptions
    if (req.user.role !== 'PHARMACIST' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only pharmacists and admins can view all prescriptions.' 
      });
    }
    
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    
    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        items: {
          include: {
            medicine: {
              select: { name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${prescriptions.length} prescriptions`);
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload prescription with medicine items
const uploadPrescription = async (req, res) => {
  try {
    // ✅ SECURITY: Only customers can upload prescriptions
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only customers can upload prescriptions' 
      });
    }
    
    const { notes, items } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    let prescriptionItems = [];
    if (items) {
      try {
        prescriptionItems = typeof items === 'string' ? JSON.parse(items) : items;
      } catch (e) {
        console.error('Error parsing items:', e);
      }
    }
    
    const fileUrl = `/uploads/prescriptions/${file.filename}`;
    
    const prescription = await prisma.prescription.create({
      data: {
        userId: req.user.id,
        imageUrl: fileUrl,
        notes: notes || '',
        status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });
    
    if (prescriptionItems.length > 0) {
      for (const item of prescriptionItems) {
        await prisma.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            quantity: item.quantity || 1,
            dosage: item.dosage || '',
            status: 'PENDING'
          }
        });
      }
      console.log(`Created ${prescriptionItems.length} prescription items`);
    }
    
    const io = req.app.get('io');
    sendNotification(io, req.user.id, 'Prescription Uploaded', 'Your prescription has been uploaded and is pending review', 'PRESCRIPTION');
    
    io.to('pharmacist_room').emit('new-prescription', {
      id: prescription.id,
      patientName: prescription.user.fullName,
      status: 'PENDING',
      itemsCount: prescriptionItems.length,
      timestamp: new Date(),
    });
    io.to('admin_room').emit('new-prescription', {
      id: prescription.id,
      patientName: prescription.user.fullName,
      status: 'PENDING',
      itemsCount: prescriptionItems.length,
      timestamp: new Date(),
    });
    
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error uploading prescription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update prescription status (Pharmacist only)
const updatePrescriptionStatus = async (req, res) => {
  try {
    // ✅ SECURITY: Only licensed pharmacists can approve/reject prescriptions
    if (req.user.role !== 'PHARMACIST') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only licensed pharmacists can approve or reject prescriptions' 
      });
    }
    
    const { id } = req.params;
    const { status, rejectionReason, approvedItemIds } = req.body;
    
    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        status,
        rejectionReason: rejectionReason || null,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        items: true
      }
    });
    
    if (status === 'APPROVED' && approvedItemIds && approvedItemIds.length > 0) {
      await prisma.prescriptionItem.updateMany({
        where: { id: { in: approvedItemIds } },
        data: { status: 'APPROVED' }
      });
      
      const allItemIds = prescription.items.map(i => i.id);
      const rejectedIds = allItemIds.filter(id => !approvedItemIds.includes(id));
      if (rejectedIds.length > 0) {
        await prisma.prescriptionItem.updateMany({
          where: { id: { in: rejectedIds } },
          data: { status: 'REJECTED' }
        });
      }
      
      console.log(`Approved ${approvedItemIds.length} items, rejected ${rejectedIds.length} items`);
    }
    
    if (status === 'REJECTED') {
      await prisma.prescriptionItem.updateMany({
        where: { prescriptionId: id },
        data: { status: 'REJECTED' }
      });
    }
    
    const io = req.app.get('io');
    sendPrescriptionUpdate(io, prescription.userId, prescription);
    sendNotification(io, prescription.userId, 'Prescription Update', `Your prescription has been ${status.toLowerCase()}`, 'PRESCRIPTION');
    
    if (status === 'REJECTED' && rejectionReason) {
      sendNotification(io, prescription.userId, 'Prescription Rejected', `Your prescription was rejected. Reason: ${rejectionReason}`, 'PRESCRIPTION');
    }
    
    if (status === 'APPROVED') {
      sendNotification(io, prescription.userId, 'Prescription Approved', 'Your prescription has been approved. You can now order the medicine.', 'PRESCRIPTION');
    }
    
    sendPrescriptionUpdateEmail(prescription, prescription.user).catch(console.error);
    
    const updatedPrescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        items: {
          include: {
            medicine: {
              select: { name: true, price: true }
            }
          }
        }
      }
    });
    
    res.json({ success: true, data: updatedPrescription });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single prescription with items
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        user: {
          select: { fullName: true, email: true, phone: true }
        },
        items: {
          include: {
            medicine: {
              select: { name: true, price: true }
            }
          }
        }
      }
    });
    
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }
    
    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserPrescriptions,
  getAllPrescriptions,
  uploadPrescription,
  updatePrescriptionStatus,
  getPrescriptionById
};