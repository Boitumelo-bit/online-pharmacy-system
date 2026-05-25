const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  try {
    console.log('🌱 Starting database seeding...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pharmacy.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          fullName: 'Super Admin',
          phone: '0000000000',
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
        }
      });
      
      console.log('✅ Admin user created successfully');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    // Seed default settings
    console.log('📝 Seeding default settings...');
    
    const defaultSettings = [
      { key: 'pharmacy_name', value: 'Pharmacy POS System', type: 'STRING', group: 'GENERAL' },
      { key: 'phone', value: '+880123456789', type: 'STRING', group: 'GENERAL' },
      { key: 'email', value: 'info@pharmacy.com', type: 'STRING', group: 'GENERAL' },
      { key: 'address', value: 'Dhaka, Bangladesh', type: 'STRING', group: 'GENERAL' },
      { key: 'vat_percentage', value: '15', type: 'NUMBER', group: 'GENERAL' },
      { key: 'currency', value: 'BDT', type: 'STRING', group: 'GENERAL' },
      { key: 'delivery_fee', value: '60', type: 'NUMBER', group: 'DELIVERY' },
      { key: 'free_delivery_min_amount', value: '1000', type: 'NUMBER', group: 'DELIVERY' },
    ];
    
    for (const setting of defaultSettings) {
      const existing = await prisma.setting.findUnique({
        where: { key: setting.key }
      });
      
      if (!existing) {
        await prisma.setting.create({
          data: setting
        });
        console.log(`✅ Created setting: ${setting.key}`);
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();