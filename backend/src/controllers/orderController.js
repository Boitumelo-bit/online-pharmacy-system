const prisma = require('../config/prisma');
const { sendOrderUpdate, sendNotification } = require('../sockets/socketHandler');

const fetch = globalThis.fetch;

// Try to load email services, fallback gracefully
let sendOrderConfirmation, sendOrderStatusUpdate;

try {
  const brevoService = require('../services/brevoEmailService');
  sendOrderConfirmation = brevoService.sendOrderConfirmation;
  sendOrderStatusUpdate = brevoService.sendOrderStatusUpdate;
  console.log('✅ Using Brevo email service');
} catch (error) {
  try {
    const emailService = require('../services/emailService');
    sendOrderConfirmation = emailService.sendOrderConfirmation;
    sendOrderStatusUpdate = emailService.sendOrderStatusUpdate;
    console.log('✅ Using fallback email service');
  } catch (err) {
    console.log('⚠️ No email service available, emails disabled');
    sendOrderConfirmation = async () => {};
    sendOrderStatusUpdate = async () => {};
  }
}

// Helper function to send delivery email via Brevo
const sendDeliveryEmail = async (order, customer, status, location, deliveryStaff) => {
  try {
    const statusMessages = {
      'ASSIGNED': {
        title: '📦 Delivery Assigned',
        message: `A delivery staff has been assigned to your order ${order.orderNumber}. They will contact you soon.`,
        color: '#8b5cf6'
      },
      'PICKED_UP': {
        title: '📦 Order Picked Up',
        message: `Your order ${order.orderNumber} has been picked up by our delivery staff and is on its way!`,
        color: '#3b82f6'
      },
      'IN_TRANSIT': {
        title: '🚚 Order In Transit',
        message: `Your order ${order.orderNumber} is currently in transit to your delivery address.`,
        color: '#f59e0b'
      },
      'DELIVERED': {
        title: '✅ Order Delivered',
        message: `Your order ${order.orderNumber} has been delivered successfully! Thank you for shopping with us.`,
        color: '#10b981'
      },
      'FAILED': {
        title: '❌ Delivery Failed',
        message: `We couldn't deliver your order ${order.orderNumber}. Please contact support for assistance.`,
        color: '#ef4444'
      }
    };
    
    const info = statusMessages[status] || statusMessages['IN_TRANSIT'];
    
    const deliveryStaffInfo = deliveryStaff ? `
      <div style="background-color: #f0fdf4; padding: 15px; margin: 15px 0; border-radius: 8px;">
        <p><strong>Delivery Staff:</strong> ${deliveryStaff.fullName || 'N/A'}</p>
        <p><strong>Contact:</strong> ${deliveryStaff.phone || 'N/A'}</p>
      </div>
    ` : '';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; }
          .header { background: ${info.color}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .delivery-box { background-color: #f0fdf4; border-left: 4px solid ${info.color}; padding: 15px; margin: 20px 0; border-radius: 8px; }
          .order-details { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${info.title}</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${customer.fullName}</strong>,</p>
            <p>${info.message}</p>
            
            <div class="delivery-box">
              <p><strong>Delivery Status:</strong> ${status.replace('_', ' ')}</p>
              ${location ? `<p><strong>Current Location:</strong> ${location}</p>` : ''}
            </div>
            
            ${deliveryStaffInfo}
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Total Amount:</strong> M${parseFloat(order.grandTotal).toFixed(2)}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            
            <p>You can track your delivery status in your account dashboard.</p>
            <p>Thank you for shopping with ${process.env.PHARMACY_NAME || 'Pharmacy POS'}!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.PHARMACY_NAME || 'Pharmacy POS'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ BREVO_API_KEY not set, email not sent');
      return false;
    }
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: {
          name: process.env.PHARMACY_NAME || 'Pharmacy POS',
          email: process.env.SMTP_FROM || 'noreply@pharmacy.com'
        },
        to: [{ email: customer.email }],
        subject: `${info.title} - Order ${order.orderNumber}`,
        htmlContent: html
      })
    });
    
    if (response.ok) {
      console.log(`✅ Delivery email sent to ${customer.email}: ${status}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Delivery email failed:`, error);
      return false;
    }
  } catch (error) {
    console.error('❌ Delivery email error:', error.message);
    return false;
  }
};

// Helper function to get system settings
const getSystemSettings = async () => {
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
    return settingsMap;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
};

// Get all orders for authenticated user
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let orders;
    
    if (userRole === 'ADMIN' || userRole === 'PHARMACIST') {
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
      // FIXED: Only return assigned orders, not available orders
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
      
      // Return only assigned orders as an array, not an object with available
      orders = assignedOrders;
    } else {
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
    
    if (userRole !== 'ADMIN' && userRole !== 'PHARMACIST' && userRole !== 'DELIVERY_STAFF' && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
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

// Create new order - UPDATED with dynamic settings
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
    
    // Fetch system settings for calculations
    const settings = await getSystemSettings();
    const vatPercentage = parseFloat(settings.vat_percentage) || 15;
    const deliveryFeeAmount = parseFloat(settings.delivery_fee) || 5;
    const freeDeliveryMin = parseFloat(settings.free_delivery_min_amount) || 100;
    
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
      
      await prisma.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } }
      });
    }
    
    // Use dynamic values from settings
    const tax = subtotal * (vatPercentage / 100);
    const deliveryFee = subtotal > freeDeliveryMin ? 0 : deliveryFeeAmount;
    const grandTotal = subtotal + tax + deliveryFee;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
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
    
    const io = req.app.get('io');
    
    console.log('📢 === SENDING NOTIFICATIONS FOR ORDER ===');
    console.log('📢 Order Number:', orderNumber);
    console.log('📢 Customer:', order.user.fullName);
    console.log('📢 Subtotal:', subtotal);
    console.log('📢 Tax Rate:', vatPercentage, '%');
    console.log('📢 Tax:', tax);
    console.log('📢 Delivery Fee:', deliveryFee);
    console.log('📢 Total:', grandTotal);
    
    // Send to customer
    sendNotification(io, userId, 'Order Placed', `Your order ${orderNumber} has been placed successfully!`, 'ORDER');
    sendOrderUpdate(io, userId, order);
    console.log('✅ Customer notification sent to user:', userId);
    
    // Check room sizes
    const adminRoom = io.sockets.adapter.rooms.get('admin_room');
    const pharmacistRoom = io.sockets.adapter.rooms.get('pharmacist_room');
    console.log('📢 Admin room has:', adminRoom?.size || 0, 'connected clients');
    console.log('📢 Pharmacist room has:', pharmacistRoom?.size || 0, 'connected clients');
    
    // Prepare alert data
    const alertData = {
      orderId: order.id,
      orderNumber: orderNumber,
      customerName: order.user.fullName,
      total: grandTotal,
      timestamp: new Date(),
    };
    
    // Emit to admin and pharmacist rooms
    io.to('admin_room').emit('new-order', alertData);
    io.to('pharmacist_room').emit('new-order', alertData);
    console.log('📦 New order alert sent to admin and pharmacist rooms');
    console.log('📢 === NOTIFICATIONS SENT ===');
    
    // Send order confirmation email
    Promise.all([
      sendOrderConfirmation(order, order.user).catch(console.error),
    ]);
    
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

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    
    const validStatuses = ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'PHARMACIST') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Admin and Pharmacist can update order status' 
      });
    }
    
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
    
    const pharmacistAllowedTransitions = {
      'PENDING': ['APPROVED', 'CANCELLED'],
      'APPROVED': ['PREPARING'],
      'PREPARING': ['READY'],
      'READY': []
    };
    
    if (user.role === 'PHARMACIST') {
      const allowed = pharmacistAllowedTransitions[oldStatus] || [];
      if (!allowed.includes(status) && oldStatus !== status) {
        return res.status(403).json({
          success: false,
          message: `Pharmacist cannot change order from ${oldStatus} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
        });
      }
    }
    
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
      }
    });
    
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${order.user.id}`).emit('order_status_updated', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus: status,
          updatedBy: user.role
        });
        console.log(`📋 Order status update sent to customer: ${order.orderNumber} -> ${status}`);
      }
    } catch (socketError) {
      console.log('Socket notification skipped:', socketError.message);
    }
    
    if (oldStatus !== status) {
      sendOrderStatusUpdate(order, order.user, oldStatus, status).catch(console.error);
    }
    
    res.json({
      success: true,
      data: order,
      message: `Order status updated from ${oldStatus} to ${status}`
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating order status', 
      error: error.message 
    });
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
    
    if (userRole !== 'ADMIN' && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });
    }
    
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
    
    const io = req.app.get('io');
    sendNotification(io, order.user.id, 'Order Cancelled', `Your order ${order.orderNumber} has been cancelled.`, 'ORDER');
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

// Get available orders for delivery staff - KEPT but frontend doesn't call it anymore
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

// Self-assign delivery for delivery staff - DISABLED for delivery staff (only Admin/Pharmacist can assign)
const selfAssignDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;
    
    // DISABLED: Delivery staff cannot self-assign orders
    if (user.role === 'DELIVERY_STAFF') {
      return res.status(403).json({ 
        success: false, 
        message: 'Delivery staff cannot self-assign orders. Orders must be assigned by Admin or Pharmacist.' 
      });
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'PHARMACIST') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true, user: true, address: true }
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
    
    // Send email notification
    const deliveryStaff = { fullName: user.fullName, phone: user.phone };
    await sendDeliveryEmail(order, order.user, 'ASSIGNED', 'Pharmacy', deliveryStaff);
    
    res.json({
      success: true,
      data: { order: updatedOrder, delivery },
      message: 'Order assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ success: false, message: 'Error assigning delivery', error: error.message });
  }
};

// Update delivery status - WITH EMAIL
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
      include: { 
        order: { 
          include: { 
            user: true,
            address: true 
          } 
        },
        deliveryStaff: {
          select: { fullName: true, phone: true }
        }
      }
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
    
    // Send email notification for delivery status updates
    await sendDeliveryEmail(delivery.order, delivery.order.user, status, location, delivery.deliveryStaff);
    
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

// Assign delivery staff to order (Admin/Pharmacist) - WITH EMAIL
const assignDeliveryStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStaffId } = req.body;
    const user = req.user;
    
    if (user.role !== 'ADMIN' && user.role !== 'PHARMACIST') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Admin and Pharmacist can assign delivery staff' 
      });
    }
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: { delivery: true, user: true, address: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({ 
        success: false, 
        message: `Order must be READY before assigning delivery. Current status: ${order.status}` 
      });
    }
    
    const deliveryStaff = await prisma.user.findUnique({
      where: { id: deliveryStaffId }
    });
    
    if (!deliveryStaff) {
      return res.status(404).json({ success: false, message: 'Delivery staff not found' });
    }
    
    if (deliveryStaff.role !== 'DELIVERY_STAFF') {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected user is not a delivery staff member' 
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
        deliveryStaffId: deliveryStaffId,
        estimatedTime: new Date(Date.now() + 60 * 60 * 1000),
        trackingHistory: [{
          status: 'ASSIGNED',
          timestamp: new Date(),
          notes: `Assigned by ${user.role}`
        }]
      }
    });
    
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'OUT_FOR_DELIVERY' }
    });
    
    const io = req.app.get('io');
    
    sendNotification(io, order.userId, 'Delivery Assigned', 
      `Your order ${order.orderNumber} has been assigned to a delivery staff!`, 'DELIVERY');
    
    sendNotification(io, deliveryStaffId, 'New Delivery Assignment', 
      `You have been assigned to deliver order ${order.orderNumber}`, 'DELIVERY');
    
    // Send email notification
    const staffInfo = { fullName: deliveryStaff.fullName, phone: deliveryStaff.phone };
    await sendDeliveryEmail(order, order.user, 'ASSIGNED', 'Pharmacy', staffInfo);
    
    res.json({
      success: true,
      data: {
        order: updatedOrder,
        delivery: delivery
      },
      message: `Delivery staff assigned successfully`
    });
    
  } catch (error) {
    console.error('Error assigning delivery staff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error assigning delivery staff', 
      error: error.message 
    });
  }
};

// Get all delivery staff for assignment dropdown
const getDeliveryStaffList = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'ADMIN' && userRole !== 'PHARMACIST') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
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
    
    res.json({
      success: true,
      data: deliveryStaff,
      count: deliveryStaff.length
    });
    
  } catch (error) {
    console.error('Error fetching delivery staff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching delivery staff' 
    });
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
  assignDeliveryStaff,
  getDeliveryStaffList,
};