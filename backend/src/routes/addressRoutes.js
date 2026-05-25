const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/prisma');

// Get user addresses
router.get('/', verifyToken, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create address
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, zipCode, country, isDefault } = req.body;
    
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
        country,
        isDefault: isDefault || false,
      },
    });
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;