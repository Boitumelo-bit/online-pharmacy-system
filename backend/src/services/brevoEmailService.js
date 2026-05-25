// backend/services/brevoApiService.js
require('dotenv').config();

const sendEmailViaApi = async (to, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('❌ BREVO_API_KEY not found in .env');
    return false;
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
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent to:', to);
      return true;
    } else {
      console.error('❌ Email API error:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

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
        .total { font-size: 20px; font-weight: bold; color: #4F46E5; }
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
            <p><strong>Total Amount:</strong> <span class="total">M${order.grandTotal}</span></p>
          </div>
          <p>You can track your order status in your dashboard.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailViaApi(user.email, `Order Confirmation #${order.orderNumber}`, html);
};

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
          <p>Login to your dashboard to track your order.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailViaApi(user.email, `Order Update #${order.orderNumber}`, html);
};

module.exports = { sendEmailViaApi, sendOrderConfirmation, sendOrderStatusUpdate };