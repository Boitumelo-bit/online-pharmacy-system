const prisma = require('../config/prisma');

// Get sales report
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const orders = await prisma.order.findMany({
      where: {
        ...whereClause,
        status: 'DELIVERED'
      },
      select: {
        grandTotal: true,
        orderItems: {
          select: { quantity: true }
        }
      }
    });
    
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0);
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, order) => 
      sum + order.orderItems.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalItems,
      revenueChange: 0,
      ordersChange: 0
    });
  } catch (error) {
    console.error('Error getting sales report:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get top products report
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    const orderWhereClause = {};
    if (startDate && endDate) {
      orderWhereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: orderWhereClause
      },
      include: {
        medicine: {
          select: { name: true }
        }
      }
    });
    
    // Aggregate by medicine
    const productMap = new Map();
    orderItems.forEach(item => {
      const name = item.medicine?.name || 'Unknown';
      if (!productMap.has(name)) {
        productMap.set(name, { quantity: 0, revenue: 0 });
      }
      const data = productMap.get(name);
      data.quantity += item.quantity;
      data.revenue += Number(item.total);
    });
    
    const products = Array.from(productMap.entries()).map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: data.revenue,
      percentage: 0
    }));
    
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    products.forEach(p => {
      p.percentage = totalQuantity > 0 ? parseFloat(((p.quantity / totalQuantity) * 100).toFixed(1)) : 0;
    });
    
    products.sort((a, b) => b.quantity - a.quantity);
    
    res.json(products.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error getting top products:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get orders by status
const getOrdersByStatus = async (req, res) => {
  try {
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    });
    
    const statusColors = {
      PENDING: '#F59E0B',
      APPROVED: '#3B82F6',
      PREPARING: '#8B5CF6',
      READY: '#06B6D4',
      OUT_FOR_DELIVERY: '#EC4899',
      DELIVERED: '#10B981',
      CANCELLED: '#EF4444'
    };
    
    const result = ordersByStatus.map(item => ({
      status: item.status,
      count: item._count,
      color: statusColors[item.status] || '#6B7280'
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error getting orders by status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily sales for chart
const getDailySales = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'DELIVERED'
      },
      select: {
        createdAt: true,
        grandTotal: true
      }
    });
    
    // Group by date
    const dailyData = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { sales: 0, orders: 0 };
      }
      dailyData[date].sales += Number(order.grandTotal);
      dailyData[date].orders += 1;
    });
    
    // Convert to array and sort by date
    const result = Object.entries(dailyData).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(result);
  } catch (error) {
    console.error('Error getting daily sales:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        stock: true
      }
    });
    
    const alerts = medicines
      .filter(medicine => medicine.stock <= 50)
      .map(medicine => ({
        name: medicine.name,
        stock: medicine.stock,
        reorderLevel: 50,
        status: medicine.stock <= 10 ? 'critical' : 'low'
      }));
    
    res.json(alerts);
  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user statistics
const getUserStatistics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [totalCustomers, newCustomers, activePharmacists, activeDeliveryStaff] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { role: 'PHARMACIST', isActive: true } }),
      prisma.user.count({ where: { role: 'DELIVERY_STAFF', isActive: true } })
    ]);
    
    res.json({
      totalCustomers,
      newCustomers,
      activePharmacists,
      activeDeliveryStaff,
      customerRetention: 0
    });
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSalesReport,
  getTopProducts,
  getOrdersByStatus,
  getDailySales,
  getInventoryAlerts,
  getUserStatistics
};