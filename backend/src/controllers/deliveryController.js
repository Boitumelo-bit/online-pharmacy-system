const prisma = require('../config/prisma');
const { sendNotification } = require('../sockets/socketHandler');

// Get deliveries for delivery staff
const getMyDeliveries = async (req, res) => {
  try {
    const deliveryStaffId = req.user.id;
    
    const deliveries = await prisma.delivery.findMany({
      where: { deliveryStaffId },
      include: {
        order: {
          include: {
            user: {
              select: { fullName: true, phone: true, email: true }
            },
            address: true,
            orderItems: {
              include: {
                medicine: {
                  select: { name: true }
                }
              },
              take: 5
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: deliveries || [] });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.json({ success: true, data: [] });
  }
};

// Get available orders for delivery (READY status, no delivery assigned)
const getAvailableOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'READY',
        delivery: null
      },
      include: {
        user: {
          select: { fullName: true, phone: true }
        },
        address: true,
        orderItems: {
          include: {
            medicine: {
              select: { name: true }
            }
          },
          take: 3
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    });
    
    res.json({ success: true, data: orders || [] });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.json({ success: true, data: [] });
  }
};

// Assign delivery to delivery staff (Admin/Pharmacist only)
const assignDelivery = async (req, res) => {
  try {
    const { orderId, deliveryStaffId, estimatedTime } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({ success: false, message: 'Order must be READY before assigning delivery' });
    }
    
    const existingDelivery = await prisma.delivery.findUnique({
      where: { orderId }
    });
    
    let delivery;
    if (existingDelivery) {
      delivery = await prisma.delivery.update({
        where: { orderId },
        data: {
          deliveryStaffId,
          estimatedTime: estimatedTime ? new Date(estimatedTime) : null,
          trackingHistory: {
            push: {
              status: 'ASSIGNED',
              timestamp: new Date(),
              location: 'Pharmacy'
            }
          }
        },
        include: {
          deliveryStaff: {
            select: { fullName: true, phone: true }
          }
        }
      });
    } else {
      delivery = await prisma.delivery.create({
        data: {
          orderId,
          deliveryStaffId,
          estimatedTime: estimatedTime ? new Date(estimatedTime) : null,
          trackingHistory: [
            { status: 'ASSIGNED', timestamp: new Date(), location: 'Pharmacy' }
          ]
        },
        include: {
          deliveryStaff: {
            select: { fullName: true, phone: true }
          }
        }
      });
    }
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'OUT_FOR_DELIVERY' }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${deliveryStaffId}`).emit('new-delivery-assigned', {
        orderId: order.orderNumber,
        message: `New delivery assigned: Order #${order.orderNumber}`
      });
      
      sendNotification(io, order.userId, 'Delivery Assigned', `Your order #${order.orderNumber} has been assigned to a delivery partner`, 'DELIVERY');
    }
    
    res.json({ success: true, data: delivery, message: 'Delivery assigned successfully' });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delivery staff self-assign an available order
const selfAssignDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const deliveryStaffId = req.user.id;
    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        status: 'READY',
        delivery: null
      },
      include: { user: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not available for delivery' });
    }
    
    const activeDeliveries = await prisma.delivery.count({
      where: {
        deliveryStaffId,
        deliveredAt: null
      }
    });
    
    const MAX_ACTIVE_DELIVERIES = 5;
    if (activeDeliveries >= MAX_ACTIVE_DELIVERIES) {
      return res.status(400).json({ 
        success: false, 
        message: `You already have ${activeDeliveries} active deliveries. Please complete some first.` 
      });
    }
    
    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        deliveryStaffId,
        trackingHistory: [
          { status: 'ASSIGNED', timestamp: new Date(), location: 'Pharmacy' }
        ]
      },
      include: {
        deliveryStaff: {
          select: { fullName: true, phone: true }
        }
      }
    });
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'OUT_FOR_DELIVERY' }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${deliveryStaffId}`).emit('delivery-accepted', {
        orderId: order.orderNumber,
        message: `You accepted delivery for Order #${order.orderNumber}`
      });
      
      io.to('admin_room').emit('delivery-accepted', {
        orderId: order.orderNumber,
        deliveryStaff: req.user.fullName,
        message: `Delivery for Order #${order.orderNumber} accepted by ${req.user.fullName}`
      });
      io.to('pharmacist_room').emit('delivery-accepted', {
        orderId: order.orderNumber,
        deliveryStaff: req.user.fullName,
        message: `Delivery for Order #${order.orderNumber} accepted by ${req.user.fullName}`
      });
      
      sendNotification(io, order.userId, 'Delivery Assigned', `Your order #${order.orderNumber} has been accepted for delivery`, 'DELIVERY');
    }
    
    res.json({ 
      success: true, 
      data: delivery, 
      message: 'Delivery accepted successfully! Please pick up the order from the pharmacy.' 
    });
  } catch (error) {
    console.error('Error in self-assign delivery:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update delivery status (Delivery staff)
const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, notes } = req.body;
    const deliveryStaffId = req.user.id;
    
    const validStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { order: true }
    });
    
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
    
    if (delivery.deliveryStaffId !== deliveryStaffId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const trackingHistory = delivery.trackingHistory || [];
    trackingHistory.push({
      status,
      timestamp: new Date(),
      location: location || (status === 'PICKED_UP' ? 'Pharmacy' : 'En Route'),
      notes
    });
    
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        trackingHistory,
        currentLocation: location,
        deliveredAt: status === 'DELIVERED' ? new Date() : null
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } }
          }
        }
      }
    });
    
    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'DELIVERED' }
      });
      
      const io = req.app.get('io');
      if (io) {
        sendNotification(io, updatedDelivery.order.userId, 'Order Delivered', `Your order #${updatedDelivery.order.orderNumber} has been delivered successfully!`, 'DELIVERY');
      }
    } else {
      const io = req.app.get('io');
      if (io) {
        sendNotification(io, updatedDelivery.order.userId, 'Delivery Update', `Your order #${updatedDelivery.order.orderNumber} is now ${status.replace('_', ' ')}`, 'DELIVERY');
      }
    }
    
    res.json({ success: true, data: updatedDelivery, message: 'Delivery status updated' });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get delivery tracking info for customer
const trackDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    
    const delivery = await prisma.delivery.findFirst({
      where: {
        orderId,
        order: { userId }
      },
      include: {
        deliveryStaff: {
          select: { fullName: true, phone: true }
        },
        order: {
          select: { orderNumber: true, status: true }
        }
      }
    });
    
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
    
    res.json({ success: true, data: delivery });
  } catch (error) {
    console.error('Error tracking delivery:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get delivery statistics (Admin only)
const getDeliveryStats = async (req, res) => {
  try {
    const totalDeliveries = await prisma.delivery.count();
    const completedDeliveries = await prisma.delivery.count({
      where: { deliveredAt: { not: null } }
    });
    const pendingDeliveries = totalDeliveries - completedDeliveries;
    
    const deliveriesByStaff = await prisma.delivery.groupBy({
      by: ['deliveryStaffId'],
      _count: { id: true },
      where: { deliveredAt: { not: null } }
    });
    
    const staffIds = deliveriesByStaff.map(d => d.deliveryStaffId);
    const staff = await prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, fullName: true }
    });
    
    const staffPerformance = deliveriesByStaff.map(d => ({
      staffId: d.deliveryStaffId,
      staffName: staff.find(s => s.id === d.deliveryStaffId)?.fullName || 'Unknown',
      deliveriesCompleted: d._count.id
    }));
    
    res.json({
      success: true,
      data: {
        totalDeliveries,
        completedDeliveries,
        pendingDeliveries,
        completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries * 100).toFixed(1) : 0,
        staffPerformance
      }
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.json({ success: true, data: { totalDeliveries: 0, completedDeliveries: 0, pendingDeliveries: 0, completionRate: 0, staffPerformance: [] } });
  }
};

module.exports = {
  getMyDeliveries,
  getAvailableOrders,
  assignDelivery,
  selfAssignDelivery,
  updateDeliveryStatus,
  trackDelivery,
  getDeliveryStats
};