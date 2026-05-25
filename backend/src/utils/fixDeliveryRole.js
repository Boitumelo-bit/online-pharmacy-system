const prisma = require('../config/prisma');

async function fixDeliveryRole() {
  try {
    // Check if delivery user exists
    const deliveryUser = await prisma.user.findUnique({
      where: { email: 'delivery@pharmacy.com' }
    });
    
    if (!deliveryUser) {
      console.log('❌ Delivery user not found. Creating one...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('delivery123', 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'delivery@pharmacy.com',
          password: hashedPassword,
          fullName: 'Delivery Staff',
          phone: '01788888888',
          role: 'DELIVERY_STAFF',
          isActive: true,
          emailVerified: true,
        },
      });
      
      console.log('✅ Delivery staff created!');
      console.log('📧 Email:', newUser.email);
      console.log('🔑 Password: delivery123');
      console.log('👤 Role:', newUser.role);
    } else {
      // Update existing user to DELIVERY_STAFF
      const updated = await prisma.user.update({
        where: { email: 'delivery@pharmacy.com' },
        data: { role: 'DELIVERY_STAFF' },
      });
      
      console.log('✅ Updated user role to DELIVERY_STAFF');
      console.log('📧 Email:', updated.email);
      console.log('👤 New Role:', updated.role);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeliveryRole();