const prisma = require('../config/prisma');

// Get dashboard statistics based on user role
const getDashboardStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let dashboardData = {};

    // Common data for all users
    const systemSettings = await prisma.setting.findMany();
    const settingsMap = {};
    systemSettings.forEach(setting => {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        settingsMap[setting.key] = setting.value;
      }
    });

    // ROLE: ADMIN - Full system access
    if (userRole === 'ADMIN') {
      // Get total medicines
      const totalMedicines = await prisma.medicine.count({
        where: { isActive: true }
      });

      // Get total categories
      const totalCategories = await prisma.category.count({
        where: { isActive: true }
      });

      // Get user statistics
      const totalCustomers = await prisma.user.count({
        where: { role: 'CUSTOMER' }
      });
      const totalPharmacists = await prisma.user.count({
        where: { role: 'PHARMACIST' }
      });
      const totalDeliveryStaff = await prisma.user.count({
        where: { role: 'DELIVERY_STAFF' }
      });

      // Get low stock medicines (stock < 10)
      const lowStockMedicines = await prisma.medicine.findMany({
        where: {
          stock: { lt: 10 },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          stock: true,
          batchNumber: true,
          expiryDate: true
        },
        orderBy: { stock: 'asc' },
        take: 10
      });

      // Get expiring medicines (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringMedicines = await prisma.medicine.findMany({
        where: {
          expiryDate: { lte: thirtyDaysFromNow },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          batchNumber: true,
          expiryDate: true,
          stock: true
        },
        orderBy: { expiryDate: 'asc' },
        take: 10
      });

      // Get recent orders
      const recentOrders = await prisma.order.findMany({
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get revenue stats
      const totalRevenue = await prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { grandTotal: true }
      });

      const pendingOrders = await prisma.order.count({
        where: { status: 'PENDING' }
      });

      const completedOrders = await prisma.order.count({
        where: { status: 'DELIVERED' }
      });

      dashboardData = {
        role: 'ADMIN',
        stats: {
          totalMedicines,
          totalCategories,
          totalCustomers,
          totalPharmacists,
          totalDeliveryStaff,
          totalRevenue: totalRevenue._sum?.grandTotal || 0,
          pendingOrders,
          completedOrders,
        },
        alerts: {
          lowStock: lowStockMedicines,
          expiring: expiringMedicines,
          lowStockCount: lowStockMedicines.length,
          expiringCount: expiringMedicines.length,
        },
        recentOrders: recentOrders || [],
        settings: settingsMap,
      };
    }
    
    // ROLE: CUSTOMER - Personal dashboard
    else if (userRole === 'CUSTOMER') {
      // Get customer's recent orders
      const recentOrders = await prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              medicine: {
                select: { name: true }
              }
            },
            take: 2
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Get order statistics
      const totalOrders = await prisma.order.count({ where: { userId } });
      const deliveredOrders = await prisma.order.count({
        where: { userId, status: 'DELIVERED' }
      });
      const pendingOrders = await prisma.order.count({
        where: { userId, status: { in: ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } }
      });

      // Get total spent
      const totalSpent = await prisma.order.aggregate({
        where: { userId, status: 'DELIVERED' },
        _sum: { grandTotal: true }
      });

      dashboardData = {
        role: 'CUSTOMER',
        stats: {
          totalOrders,
          deliveredOrders,
          pendingOrders,
          totalSpent: totalSpent._sum?.grandTotal || 0,
        },
        recentOrders: recentOrders || [],
        settings: settingsMap,
      };
    }
    
    // ROLE: PHARMACIST - Pharmacy operations
    else if (userRole === 'PHARMACIST') {
      // Get pending prescriptions
      const pendingPrescriptions = await prisma.prescription.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: { fullName: true, email: true, phone: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 10
      });

      // Get today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          }
        },
        include: {
          user: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      // Get low stock medicines
      const lowStockMedicines = await prisma.medicine.findMany({
        where: {
          stock: { lt: 10 },
          isActive: true
        },
        select: { id: true, name: true, stock: true },
        take: 10
      });

      // Get orders ready for pickup
      const readyOrders = await prisma.order.count({
        where: { status: 'READY' }
      });

      dashboardData = {
        role: 'PHARMACIST',
        stats: {
          pendingPrescriptions: pendingPrescriptions.length,
          todaysOrders: todaysOrders.length,
          readyOrders,
          lowStockCount: lowStockMedicines.length,
        },
        prescriptions: pendingPrescriptions || [],
        todaysOrders: todaysOrders || [],
        lowStockMedicines: lowStockMedicines || [],
        settings: settingsMap,
      };
    }
    
    // ROLE: DELIVERY_STAFF - Delivery management
    else if (userRole === 'DELIVERY_STAFF') {
      try {
        // Get orders assigned to this delivery person
        const assignedOrders = await prisma.order.findMany({
          where: {
            delivery: {
              deliveryStaffId: userId
            },
            status: { in: ['OUT_FOR_DELIVERY', 'READY'] }
          },
          include: {
            user: { select: { fullName: true, phone: true } },
            address: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        // Get delivery statistics
        const completedDeliveries = await prisma.delivery.count({
          where: {
            deliveryStaffId: userId,
            deliveredAt: { not: null }
          }
        });

        const availableOrders = await prisma.order.count({
          where: {
            status: 'READY',
            delivery: null
          }
        });

        dashboardData = {
          role: 'DELIVERY_STAFF',
          stats: {
            assignedOrders: assignedOrders.length,
            completedDeliveries,
            availableOrders,
          },
          assignedOrders: assignedOrders || [],
          settings: settingsMap,
        };
      } catch (error) {
        console.error('Delivery staff dashboard error:', error);
        dashboardData = {
          role: 'DELIVERY_STAFF',
          stats: {
            assignedOrders: 0,
            completedDeliveries: 0,
            availableOrders: 0,
          },
          assignedOrders: [],
          settings: settingsMap,
        };
      }
    }

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard stats', 
      error: error.message 
    });
  }
};

// Get system settings (accessible by all authenticated users)
const getSystemSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(setting => {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        settingsMap[setting.key] = setting.value;
      }
    });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
};

// UPDATE system setting (Admin only)
const updateSystemSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, message: 'Setting key is required' });
    }
    
    let type = 'STRING';
    let parsedValue = value;
    
    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
      type = 'NUMBER';
      parsedValue = parseFloat(value);
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN';
    }
    
    let group = 'GENERAL';
    if (key.includes('facebook') || key.includes('twitter') || key.includes('instagram') || key.includes('website') || key.includes('social')) {
      group = 'SOCIAL';
    } else if (key.includes('delivery') || key.includes('free_delivery')) {
      group = 'DELIVERY';
    } else if (key.includes('vat') || key.includes('currency') || key.includes('tax')) {
      group = 'FINANCIAL';
    } else if (key.includes('hours') || key.includes('schedule')) {
      group = 'OPERATIONS';
    }
    
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { 
        value: JSON.stringify(parsedValue),
        type,
        group
      },
      create: { 
        key, 
        value: JSON.stringify(parsedValue), 
        type,
        group
      }
    });
    
    console.log(`Setting ${key} updated to:`, parsedValue);
    
    res.json({ 
      success: true, 
      data: setting,
      message: 'Setting saved successfully'
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving setting', 
      error: error.message 
    });
  }
};

module.exports = { getDashboardStats, getSystemSettings, updateSystemSetting };