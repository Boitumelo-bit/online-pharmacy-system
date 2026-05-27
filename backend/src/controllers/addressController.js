const prisma = require('../config/prisma');

// Get all addresses for the authenticated user
const getAddresses = async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single address by ID
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await prisma.address.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    res.json(address);
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new address
const createAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, zipCode, country, isDefault } = req.body;
    
    // If this address is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        country: country || 'Lesotho',
        isDefault: isDefault || false,
      },
    });
    
    res.status(201).json(address);
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, addressLine1, addressLine2, city, state, zipCode, country, isDefault } = req.body;
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // If this address is being set as default, unset other defaults
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const address = await prisma.address.update({
      where: { id },
      data: {
        fullName: fullName || existingAddress.fullName,
        phone: phone || existingAddress.phone,
        addressLine1: addressLine1 || existingAddress.addressLine1,
        addressLine2: addressLine2 !== undefined ? addressLine2 : existingAddress.addressLine2,
        city: city || existingAddress.city,
        state: state || existingAddress.state,
        zipCode: zipCode || existingAddress.zipCode,
        country: country || existingAddress.country,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault,
      },
    });
    
    res.json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete address - FIXED VERSION WITH MESSAGE
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: { id, userId: req.user.id },
      include: {
        orders: true
      }
    });
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Check if address has orders
    if (address.orders && address.orders.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete address with orders. This address is linked to existing orders.'
      });
    }
    
    // If deleting default address, set another as default if exists
    if (address.isDefault) {
      const anotherAddress = await prisma.address.findFirst({
        where: { userId: req.user.id, id: { not: id } }
      });
      if (anotherAddress) {
        await prisma.address.update({
          where: { id: anotherAddress.id },
          data: { isDefault: true }
        });
      }
    }
    
    await prisma.address.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    
    // Handle foreign key constraint
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete address with orders. This address is linked to existing orders.'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Set address as default
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Unset all other defaults
    await prisma.address.updateMany({
      where: { userId: req.user.id, isDefault: true },
      data: { isDefault: false }
    });
    
    // Set this as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });
    
    res.json(updatedAddress);
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};