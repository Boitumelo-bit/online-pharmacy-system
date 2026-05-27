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
        settingsMap[setting.key] = setting.value;
      } catch (e) {
        settingsMap[setting.key] = setting.value;
      }
    });

    // ROLE: ADMIN - Full system access
    if (userRole === 'ADMIN') {
      const totalMedicines = await prisma.medicine.count({
        where: { isActive: true }
      });

      const totalCategories = await prisma.category.count({
        where: { isActive: true }
      });

      const totalCustomers = await prisma.user.count({
        where: { role: 'CUSTOMER' }
      });
      const totalPharmacists = await prisma.user.count({
        where: { role: 'PHARMACIST' }
      });
      const totalDeliveryStaff = await prisma.user.count({
        where: { role: 'DELIVERY_STAFF' }
      });

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

      const recentOrders = await prisma.order.findMany({
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

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

      const totalOrders = await prisma.order.count({ where: { userId } });
      const deliveredOrders = await prisma.order.count({
        where: { userId, status: 'DELIVERED' }
      });
      const pendingOrders = await prisma.order.count({
        where: { userId, status: { in: ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } }
      });

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

      const lowStockMedicines = await prisma.medicine.findMany({
        where: {
          stock: { lt: 10 },
          isActive: true
        },
        select: { id: true, name: true, stock: true },
        take: 10
      });

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
    
    // Default values
    const defaults = {
      pharmacy_name: 'Pharmacy POS System',
      phone: '+266 1234 5678',
      email: 'info@pharmacy.com',
      address: 'Maseru, Lesotho',
      currency: 'M',
      vat_percentage: 15,
      delivery_fee: 5,
      free_delivery_min_amount: 100,
      business_hours: 'Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: Closed',
      facebook: '',
      twitter: '',
      instagram: '',
      website: '',
    };
    
    // Start with defaults
    Object.assign(settingsMap, defaults);
    
    // Override with database values
    settings.forEach(setting => {
      let value = setting.value;
      
      // Map database keys to frontend keys
      if (setting.key === 'free_delivery_min_amount') {
        settingsMap.free_delivery_min = value;
      } else {
        settingsMap[setting.key] = value;
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
    
    console.log('=== UPDATE SYSTEM SETTING ===');
    console.log('Received key:', key);
    console.log('Received value:', value);
    
    if (!key) {
      return res.status(400).json({ success: false, message: 'Setting key is required' });
    }
    
    // Handle special key mapping from frontend to database
    let dbKey = key;
    if (key === 'free_delivery_min') {
      dbKey = 'free_delivery_min_amount';
      console.log('Mapped key to:', dbKey);
    }
    
    // Parse the value based on type
    let parsedValue = value;
    let type = 'STRING';
    
    // Check if it's a number
    if (!isNaN(parseFloat(value)) && isFinite(value)) {
      type = 'NUMBER';
      parsedValue = parseFloat(value);
    } 
    // Check if it's a boolean
    else if (value === 'true' || value === 'false') {
      type = 'BOOLEAN';
      parsedValue = value === 'true';
    }
    
    // Determine group based on key
    let group = 'GENERAL';
    if (dbKey.includes('facebook') || dbKey.includes('twitter') || dbKey.includes('instagram') || dbKey.includes('website')) {
      group = 'SOCIAL';
    } else if (dbKey.includes('delivery') || dbKey.includes('free_delivery')) {
      group = 'DELIVERY';
    } else if (dbKey.includes('vat') || dbKey.includes('currency') || dbKey.includes('tax')) {
      group = 'FINANCIAL';
    } else if (dbKey.includes('hours') || dbKey.includes('schedule')) {
      group = 'OPERATIONS';
    }
    
    // Upsert the setting
    const setting = await prisma.setting.upsert({
      where: { key: dbKey },
      update: { 
        value: parsedValue,
        type,
        group
      },
      create: { 
        key: dbKey, 
        value: parsedValue,
        type,
        group
      }
    });
    
    console.log(`✅ Setting ${dbKey} saved successfully:`, parsedValue);
    
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