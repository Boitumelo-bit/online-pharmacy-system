const prisma = require('../config/prisma');
const { sendNotification } = require('../sockets/socketHandler');
const fetch = globalThis.fetch;

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
      'OUT_FOR_DELIVERY': {
        title: '🚚 Order Out for Delivery',
        message: `Your order ${order.orderNumber} is out for delivery! Please be available to receive it.`,
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
      <div class="staff-info" style="background-color: #f0fdf4; padding: 15px; margin: 15px 0; border-radius: 8px;">
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
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
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
          select: { fullName: true, phone: true, email: true }
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
      include: { user: true, address: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({ success: false, message: 'Order must be READY before assigning delivery' });
    }
    
    const deliveryStaff = await prisma.user.findUnique({
      where: { id: deliveryStaffId },
      select: { fullName: true, phone: true }
    });
    
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
    
    // Send email notification to customer
    await sendDeliveryEmail(order, order.user, 'ASSIGNED', 'Pharmacy', deliveryStaff);
    
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
      include: { user: true, address: true }
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
    
    const deliveryStaff = await prisma.user.findUnique({
      where: { id: deliveryStaffId },
      select: { fullName: true, phone: true }
    });
    
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
    
    // Send email notification to customer
    await sendDeliveryEmail(order, order.user, 'ASSIGNED', 'Pharmacy', deliveryStaff);
    
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

// Update delivery status (Delivery staff) - WITH EMAIL
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
            user: { select: { id: true, fullName: true, phone: true, email: true } }
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
    } else if (status === 'FAILED') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'CANCELLED' }
      });
    } else {
      const io = req.app.get('io');
      if (io) {
        sendNotification(io, updatedDelivery.order.userId, 'Delivery Update', `Your order #${updatedDelivery.order.orderNumber} is now ${status.replace('_', ' ')}`, 'DELIVERY');
      }
    }
    
    // Send email notification to customer on status change (except ASSIGNED which already sent)
    if (status !== 'ASSIGNED') {
      await sendDeliveryEmail(delivery.order, delivery.order.user, status, location, delivery.deliveryStaff);
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