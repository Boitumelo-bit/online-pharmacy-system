const prisma = require('../config/prisma');
const { sendOrderUpdate, sendNotification } = require('../sockets/socketHandler');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/brevoEmailService');

// Get all orders for authenticated user
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let orders;
    
    if (userRole === 'ADMIN' || userRole === 'PHARMACIST') {
      // Admin/Pharmacist can see all orders
      orders = await prisma.order.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
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
                    take: 1,
                  }
                }
              }
            }
          },
          prescription: true,
          delivery: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'DELIVERY_STAFF') {
      // Delivery staff sees orders assigned to them + available orders
      const assignedOrders = await prisma.order.findMany({
        where: { 
          delivery: { deliveryStaffId: userId }
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true }
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
                    take: 1,
                  }
                }
              }
            }
          },
          prescription: true,
          delivery: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      const availableOrders = await prisma.order.findMany({
        where: { 
          status: 'READY',
          delivery: null
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true }
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
                    take: 1,
                  }
                }
              }
            }
          },
          prescription: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      
      orders = { assigned: assignedOrders, available: availableOrders };
    } else {
      // Customer only sees their own orders
      orders = await prisma.order.findMany({
        where: { userId },
        include: {
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
                    take: 1,
                  }
                }
              }
            }
          },
          prescription: true,
          delivery: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
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
                description: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                }
              }
            }
          }
        },
        prescription: true,
        delivery: true,
      },
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if user has permission to view this order
    if (userRole !== 'ADMIN' && userRole !== 'PHARMACIST' && userRole !== 'DELIVERY_STAFF' && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Delivery staff can only view assigned orders
    if (userRole === 'DELIVERY_STAFF' && order.delivery?.deliveryStaffId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not assigned to this delivery' });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      addressId,
      paymentMethod,
      notes,
      prescriptionId,
      items,
    } = req.body;
    
    const userId = req.user.id;
    
    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const medicine = await prisma.medicine.findUnique({
        where: { id: item.medicineId }
      });
      
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine ${item.medicineId} not found` });
      }
      
      const discountedPrice = medicine.price * (1 - (medicine.discount || 0) / 100);
      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        medicineId: item.medicineId,
        quantity: item.quantity,
        price: medicine.price,
        discount: medicine.discount || 0,
        total: itemTotal,
      });
      
      // Update stock
      await prisma.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } }
      });
    }
    
    const tax = subtotal * 0.15;
    const deliveryFee = subtotal > 100 ? 0 : 5;
    const grandTotal = subtotal + tax + deliveryFee;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        addressId,
        totalAmount: subtotal,
        discount: 0,
        tax,
        deliveryFee,
        grandTotal,
        status: 'PENDING',
        paymentMethod,
        paymentStatus: 'PENDING',
        prescriptionId,
        notes,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: {
          include: {
            medicine: true,
          },
        },
        address: true,
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        }
      },
    });
    
    // Send real-time notification to customer
    const io = req.app.get('io');
    sendNotification(io, userId, 'Order Placed', `Your order ${orderNumber} has been placed successfully!`, 'ORDER');
    sendOrderUpdate(io, userId, order);
    
    // Notify admin and pharmacist
    io.to('admin_room').emit('new-order', {
      orderId: order.id,
      orderNumber: orderNumber,
      customerName: order.user.fullName,
      total: grandTotal,
      timestamp: new Date(),
    });
    io.to('pharmacist_room').emit('new-order', {
      orderId: order.id,
      orderNumber: orderNumber,
      customerName: order.user.fullName,
      total: grandTotal,
      timestamp: new Date(),
    });
    
    // Send order confirmation email (non-blocking)
    sendOrderConfirmation(order, order.user).catch(console.error);
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  }
};

// FIXED: Update order status - Working for Pharmacist
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    
    console.log('=== UPDATE ORDER STATUS ===');
    console.log('Order ID:', id);
    console.log('New Status:', status);
    console.log('User Role:', user?.role);
    
    const validStatuses = ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    // Check if user has permission (simplified and reliable)
    if (user.role !== 'ADMIN' && user.role !== 'PHARMACIST') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Admin and Pharmacist can update order status' 
      });
    }
    
    // Get current order
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        orderItems: {
          include: { medicine: true }
        }
      }
    });
    
    if (!currentOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const oldStatus = currentOrder.status;
    
    // Define allowed transitions for Pharmacist
    const pharmacistAllowedTransitions = {
      'PENDING': ['APPROVED', 'CANCELLED'],
      'APPROVED': ['PREPARING'],
      'PREPARING': ['READY'],
      'READY': []
    };
    
    // Check if transition is allowed for Pharmacist
    if (user.role === 'PHARMACIST') {
      const allowed = pharmacistAllowedTransitions[oldStatus] || [];
      if (!allowed.includes(status) && oldStatus !== status) {
        return res.status(403).json({
          success: false,
          message: `Pharmacist cannot change order from ${oldStatus} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
          allowedTransitions: allowed
        });
      }
    }
    
    // Update order status
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        orderItems: {
          include: { medicine: true }
        }
      },
    });
    
    console.log(`✅ Order ${id} updated from ${oldStatus} to ${status} by ${user.role}`);
    
    // Send real-time notification to customer
    const io = req.app.get('io');
    if (io) {
      sendOrderUpdate(io, order.user.id, order);
      sendNotification(io, order.user.id, 'Order Update', `Your order ${order.orderNumber} is now ${status}`, 'ORDER');
    }
    
    // If order is delivered, update inventory
    if (status === 'DELIVERED' && oldStatus !== 'DELIVERED') {
      for (const item of order.orderItems) {
        await prisma.inventoryMovement.create({
          data: {
            medicineId: item.medicineId,
            quantity: -item.quantity,
            type: 'SALE',
            referenceId: order.id,
            notes: `Order ${order.orderNumber}`,
            performedBy: user.id,
          },
        });
      }
      
      if (io) {
        sendNotification(io, order.user.id, 'Order Delivered', `Your order ${order.orderNumber} has been delivered. Thank you for shopping with us!`, 'DELIVERY');
      }
    }
    
    // If order is out for delivery, notify customer
    if (status === 'OUT_FOR_DELIVERY' && oldStatus !== 'OUT_FOR_DELIVERY') {
      if (io) {
        sendNotification(io, order.user.id, 'Out for Delivery', `Your order ${order.orderNumber} is out for delivery!`, 'DELIVERY');
      }
    }
    
    // If order is cancelled, restore stock
    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      for (const item of order.orderItems) {
        await prisma.medicine.update({
          where: { id: item.medicineId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }
    
    // Send email notification for status change (non-blocking)
    if (oldStatus !== status) {
      sendOrderStatusUpdate(order, order.user, oldStatus, status).catch(console.error);
    }
    
    res.json({
      success: true,
      data: order,
      message: `Order status updated from ${oldStatus} to ${status}`,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true, user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check permission
    if (userRole !== 'ADMIN' && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Only pending orders can be cancelled
    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });
    }
    
    // Restore stock
    for (const item of order.orderItems) {
      await prisma.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } }
      });
    }
    
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    
    // Send notification to customer
    const io = req.app.get('io');
    sendNotification(io, order.user.id, 'Order Cancelled', `Your order ${order.orderNumber} has been cancelled.`, 'ORDER');
    
    // Send email notification for cancellation (non-blocking)
    sendOrderStatusUpdate(cancelledOrder, order.user, order.status, 'CANCELLED').catch(console.error);
    
    res.json({
      success: true,
      data: cancelledOrder,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Error cancelling order', error: error.message });
  }
};

// Get available orders for delivery staff
const getAvailableOrders = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (!['DELIVERY_STAFF', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const availableOrders = await prisma.order.findMany({
      where: {
        status: 'READY',
        delivery: null
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        address: true,
        orderItems: {
          include: {
            medicine: {
              select: { id: true, name: true, price: true }
            }
          }
        },
        prescription: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    res.json({
      success: true,
      count: availableOrders.length,
      data: availableOrders,
    });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching available orders' });
  }
};

// Self-assign delivery
const selfAssignDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;
    
    if (user.role !== 'DELIVERY_STAFF') {
      return res.status(403).json({ success: false, message: 'Only delivery staff can self-assign orders' });
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true, user: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
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
        deliveryStaffId: user.id,
        estimatedTime: new Date(Date.now() + 60 * 60 * 1000),
        trackingHistory: [{
          status: 'ASSIGNED',
          timestamp: new Date(),
          location: null
        }]
      }
    });
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'OUT_FOR_DELIVERY' },
      include: { user: true }
    });
    
    const io = req.app.get('io');
    sendNotification(io, order.userId, 'Delivery Assigned', `Your order ${order.orderNumber} has been assigned to a delivery staff!`, 'DELIVERY');
    sendNotification(io, user.id, 'Order Assigned', `You have been assigned to deliver order ${order.orderNumber}`, 'DELIVERY');
    
    res.json({
      success: true,
      data: { order: updatedOrder, delivery },
      message: 'Order self-assigned successfully'
    });
  } catch (error) {
    console.error('Error self-assigning delivery:', error);
    res.status(500).json({ success: false, message: 'Error assigning delivery', error: error.message });
  }
};

// Update delivery status
const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, notes } = req.body;
    const user = req.user;
    
    const validDeliveryStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
    
    if (!validDeliveryStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status' });
    }
    
    const delivery = await prisma.delivery.findFirst({
      where: { 
        orderId,
        deliveryStaffId: user.id
      },
      include: { order: { include: { user: true } } }
    });
    
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found or not assigned to you' });
    }
    
    const currentHistory = delivery.trackingHistory || [];
    const newHistory = [...currentHistory, {
      status,
      timestamp: new Date(),
      location: location || delivery.currentLocation,
      notes: notes || null
    }];
    
    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        trackingHistory: newHistory,
        currentLocation: location || delivery.currentLocation,
        ...(status === 'DELIVERED' && { deliveredAt: new Date() })
      }
    });
    
    let orderStatus = delivery.order.status;
    if (status === 'PICKED_UP') orderStatus = 'OUT_FOR_DELIVERY';
    if (status === 'DELIVERED') orderStatus = 'DELIVERED';
    
    if (orderStatus !== delivery.order.status) {
      const io = req.app.get('io');
      await prisma.order.update({
        where: { id: orderId },
        data: { status: orderStatus }
      });
      
      sendNotification(io, delivery.order.userId, 'Delivery Update', `Your order ${delivery.order.orderNumber}: ${status}`, 'DELIVERY');
    }
    
    res.json({
      success: true,
      data: updatedDelivery,
      message: `Delivery status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, message: 'Error updating delivery status' });
  }
};

module.exports = {
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getAvailableOrders,
  selfAssignDelivery,
  updateDeliveryStatus,
};