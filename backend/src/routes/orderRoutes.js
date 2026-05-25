const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const prisma = require('../config/prisma');

// All order routes require authentication
router.use(verifyToken);

// ==================== BASIC ROUTES (Static first) ====================
// Get all orders (role-based)
router.get('/', getUserOrders);

// ==================== DELIVERY STAFF ROUTES ====================

// Get all delivery staff for assignment dropdown (MUST be BEFORE /:id)
router.get('/users/delivery-staff', authorize('ADMIN', 'PHARMACIST'), async (req, res) => {
  try {
    console.log('=== Fetching delivery staff ===');
    const deliveryStaff = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_STAFF',
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true
      },
      orderBy: { fullName: 'asc' }
    });
    
    console.log(`Found ${deliveryStaff.length} delivery staff`);
    res.json({
      success: true,
      data: deliveryStaff
    });
  } catch (error) {
    console.error('Error fetching delivery staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery staff'
    });
  }
});

// Get available orders for delivery staff
router.get('/delivery/available', authorize('DELIVERY_STAFF', 'ADMIN'), async (req, res) => {
  try {
    const availableOrders = await prisma.order.findMany({
      where: {
        status: 'READY',
        delivery: null
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        address: true,
        orderItems: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                price: true,
                images: {
                  where: { isPrimary: true },
                  take: 1
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({
      success: true,
      count: availableOrders.length,
      data: availableOrders
    });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available orders'
    });
  }
});

// Get delivery staff's assigned orders
router.get('/delivery/my-orders', authorize('DELIVERY_STAFF'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryStaffId: userId
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            address: true,
            orderItems: {
              include: {
                medicine: {
                  select: {
                    id: true,
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const orders = deliveries.map(d => ({
      ...d.order,
      deliveryStatus: d.deliveredAt ? 'DELIVERED' : 'ASSIGNED',
      trackingHistory: d.trackingHistory,
      estimatedTime: d.estimatedTime,
      deliveredAt: d.deliveredAt
    }));
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned orders'
    });
  }
});

// ==================== POST ROUTES ====================
// Create new order
router.post('/', createOrder);

// Cancel order (customer can cancel PENDING orders)
router.post('/:id/cancel', cancelOrder);

// Self-assign delivery for delivery staff
router.post('/delivery/:orderId/self-assign', authorize('DELIVERY_STAFF'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true, user: true }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({
        success: false,
        message: `Cannot assign: Order status is ${order.status}, must be READY`
      });
    }
    
    if (order.delivery) {
      return res.status(400).json({
        success: false,
        message: 'Order already assigned to a delivery staff'
      });
    }
    
    const delivery = await prisma.delivery.create({
      data: {
        orderId: order.id,
        deliveryStaffId: userId,
        estimatedTime: new Date(Date.now() + 60 * 60 * 1000),
        trackingHistory: [{
          status: 'ASSIGNED',
          timestamp: new Date().toISOString(),
          location: null,
          notes: 'Self-assigned by delivery staff'
        }]
      }
    });
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'OUT_FOR_DELIVERY' }
    });
    
    res.json({
      success: true,
      data: {
        order: updatedOrder,
        delivery: delivery
      },
      message: 'Order self-assigned successfully'
    });
  } catch (error) {
    console.error('Error self-assigning delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning delivery',
      error: error.message
    });
  }
});

// Assign delivery to specific staff (Admin/Pharmacist)
router.post('/:id/assign-delivery', authorize('ADMIN', 'PHARMACIST'), async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStaffId } = req.body;
    
    if (!deliveryStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery staff ID is required'
      });
    }
    
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: { delivery: true }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({
        success: false,
        message: 'Order must be READY before assigning delivery'
      });
    }
    
    const deliveryStaff = await prisma.user.findUnique({
      where: { id: deliveryStaffId }
    });
    
    if (!deliveryStaff || deliveryStaff.role !== 'DELIVERY_STAFF') {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery staff selected'
      });
    }
    
    let delivery;
    if (order.delivery) {
      delivery = await prisma.delivery.update({
        where: { orderId: id },
        data: {
          deliveryStaffId: deliveryStaffId,
          trackingHistory: [
            ...(order.delivery.trackingHistory || []),
            {
              status: 'REASSIGNED',
              timestamp: new Date().toISOString(),
              notes: `Reassigned by ${req.user.role} to ${deliveryStaff.fullName}`
            }
          ]
        }
      });
    } else {
      delivery = await prisma.delivery.create({
        data: {
          orderId: id,
          deliveryStaffId: deliveryStaffId,
          estimatedTime: new Date(Date.now() + 60 * 60 * 1000),
          trackingHistory: [{
            status: 'ASSIGNED',
            timestamp: new Date().toISOString(),
            notes: `Assigned by ${req.user.role}`
          }]
        }
      });
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: id },
      data: { status: 'OUT_FOR_DELIVERY' }
    });
    
    res.json({
      success: true,
      data: {
        order: updatedOrder,
        delivery: delivery
      },
      message: 'Delivery assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning delivery',
      error: error.message
    });
  }
});

// ==================== PUT ROUTES ====================
// Update order status (Admin/Pharmacist only)
router.put('/:id/status', authorize('ADMIN', 'PHARMACIST'), updateOrderStatus);

// Update delivery status (PICKED_UP, IN_TRANSIT, DELIVERED)
router.put('/delivery/:orderId/status', authorize('DELIVERY_STAFF'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, notes } = req.body;
    const userId = req.user.id;
    
    const validStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery status. Valid: PICKED_UP, IN_TRANSIT, DELIVERED, FAILED'
      });
    }
    
    const delivery = await prisma.delivery.findFirst({
      where: {
        orderId: orderId,
        deliveryStaffId: userId
      },
      include: { order: true }
    });
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found or not assigned to you'
      });
    }
    
    const currentHistory = delivery.trackingHistory || [];
    const newHistory = [...currentHistory, {
      status: status,
      timestamp: new Date().toISOString(),
      location: location || delivery.currentLocation,
      notes: notes || null
    }];
    
    const updateData = {
      trackingHistory: newHistory,
      currentLocation: location || delivery.currentLocation
    };
    
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }
    
    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: updateData
    });
    
    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          paymentConfirmedAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      data: updatedDelivery,
      message: `Delivery status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating delivery status',
      error: error.message
    });
  }
});

// ==================== DYNAMIC ROUTES (MUST BE LAST) ====================
// Get single order by ID - MUST be last
router.get('/:id', getOrderById);

// ==================== ADMIN ONLY ROUTES ====================
// Get order statistics (Admin only)
router.get('/admin/statistics', authorize('ADMIN'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const [totalOrders, pendingOrders, preparingOrders, readyOrders, outForDelivery, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.order.count({ where: { ...whereClause, status: 'PREPARING' } }),
      prisma.order.count({ where: { ...whereClause, status: 'READY' } }),
      prisma.order.count({ where: { ...whereClause, status: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { ...whereClause, status: 'DELIVERED' } }),
      prisma.order.count({ where: { ...whereClause, status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { ...whereClause, status: 'DELIVERED' },
        _sum: { grandTotal: true }
      })
    ]);
    
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    });
    
    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        outForDelivery,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
        ordersByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

module.exports = router;