const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeliveryStaff() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'DELIVERY_STAFF' },
      select: { id: true, email: true, fullName: true, role: true, isActive: true }
    });
    
    console.log('========================================');
    console.log('Delivery Staff in Database:');
    console.log('========================================');
    console.log(`Found: ${users.length} delivery staff members`);
    console.log('');
    
    if (users.length === 0) {
      console.log('❌ No delivery staff found!');
      console.log('You need to create delivery staff users.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.fullName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('---');
      });
    }
    
    console.log('');
    console.log('All users by role:');
    console.log('========================================');
    
    const allUsers = await prisma.user.findMany({
      select: { fullName: true, email: true, role: true }
    });
    
    const grouped = {};
    allUsers.forEach(u => {
      if (!grouped[u.role]) grouped[u.role] = [];
      grouped[u.role].push(u.fullName);
    });
    
    Object.keys(grouped).forEach(role => {
      console.log(`${role}: ${grouped[role].length} users`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeliveryStaff();