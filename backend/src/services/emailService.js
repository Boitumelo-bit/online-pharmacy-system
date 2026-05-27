// backend/src/services/emailService.js
require('dotenv').config();

// Simple email sending function using Brevo API
const sendEmailViaApi = async (to, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.log(`📧 Email would be sent to ${to}: ${subject}`);
    return true;
  }
  
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const data = {
    sender: {
      name: process.env.PHARMACY_NAME || 'Pharmacy POS',
      email: process.env.SMTP_FROM || 'noreply@pharmacy.com'
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent,
    textContent: htmlContent.replace(/<[^>]*>/g, '')
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      console.log('✅ Email sent to:', to);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Email failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

// Send welcome email to new users
const sendWelcomeEmail = async (user, plainPassword) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .credentials { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .password { font-size: 18px; font-weight: bold; color: #4F46E5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${process.env.PHARMACY_NAME || 'Pharmacy POS'}</h1>
        </div>
        <div class="content">
          <p>Dear ${user.fullName},</p>
          <p>Welcome to our pharmacy! Your account has been successfully created.</p>
          <div class="credentials">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Password:</strong> <span class="password">${plainPassword}</span></p>
            <p><em>Please change your password after first login.</em></p>
          </div>
          <p>You can now:</p>
          <ul>
            <li>Browse our medicine catalog</li>
            <li>Place orders online</li>
            <li>Upload prescriptions</li>
            <li>Track your orders</li>
          </ul>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Login to Your Account
          </a>
          <p>Thank you for choosing us!</p>
        </div>
      </div>
    </html>
  `;
  
  return sendEmailViaApi(user.email, 'Welcome to Our Pharmacy', html);
};

// Send order confirmation email
const sendOrderConfirmation = async (order, user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background: #f3f4f6; padding: 15px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${user.fullName},</p>
          <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
          <div class="order-details">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> M${order.grandTotal}</p>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders" 
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Track Your Order
          </a>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </html>
  `;
  
  return sendEmailViaApi(user.email, `Order Confirmation #${order.orderNumber}`, html);
};

// Send order status update email
const sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status-old { background: #f3f4f6; color: #6B7280; }
        .status-new { background: #10B981; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Status Update</h1>
        </div>
        <div class="content">
          <p>Dear ${user.fullName},</p>
          <p>Your order status has been updated:</p>
          <div class="order-details" style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Status Changed:</strong> 
              <span class="status status-old">${oldStatus}</span> → 
              <span class="status status-new">${newStatus}</span>
            </p>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders" 
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Track Your Order
          </a>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </html>
  `;
  
  return sendEmailViaApi(user.email, `Order Update #${order.orderNumber}`, html);
};

// Send prescription update email
const sendPrescriptionUpdateEmail = async (prescription, user) => {
  const statusMessages = {
    'APPROVED': {
      title: '✅ Prescription Approved',
      message: 'Great news! Your prescription has been approved. You can now order the prescribed medicines.',
      color: '#10b981'
    },
    'REJECTED': {
      title: '❌ Prescription Rejected',
      message: `Your prescription has been rejected. ${prescription.rejectionReason ? `Reason: ${prescription.rejectionReason}` : 'Please contact us for more information.'}`,
      color: '#ef4444'
    },
    'PENDING': {
      title: '📋 Prescription Received',
      message: 'Your prescription has been received and is pending review by our pharmacist.',
      color: '#f59e0b'
    }
  };
  
  const info = statusMessages[prescription.status] || statusMessages['PENDING'];
  
  const itemsHtml = prescription.items && prescription.items.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #1f2937;">Prescribed Medicines:</h3>
      <ul style="list-style: none; padding: 0;">
        ${prescription.items.map(item => `
          <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.medicineName}</strong><br/>
            <span style="color: #6b7280; font-size: 14px;">Quantity: ${item.quantity} | Dosage: ${item.dosage || 'As prescribed'}</span>
          </li>
        `).join('')}
      </ul>
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
        .info-box { background-color: #f0fdf4; border-left: 4px solid ${info.color}; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${info.title}</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${user.fullName}</strong>,</p>
          <p>${info.message}</p>
          
          <div class="info-box">
            <p><strong>Prescription ID:</strong> ${prescription.id}</p>
            <p><strong>Status:</strong> ${prescription.status}</p>
            <p><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</p>
          </div>
          
          ${itemsHtml}
          
          <p>You can check the status of your prescription in your account dashboard.</p>
          <p>Thank you for choosing ${process.env.PHARMACY_NAME || 'Pharmacy POS'}!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${process.env.PHARMACY_NAME || 'Pharmacy POS'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailViaApi(user.email, `${info.title} - Prescription Update`, html);
};

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPrescriptionUpdateEmail,  // ADDED
};