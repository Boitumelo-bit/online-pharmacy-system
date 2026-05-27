// backend/src/services/otpService.js
require('dotenv').config();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email via Brevo
const sendOTPEmail = async (email, otp, fullName) => {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.log(`⚠️ BREVO_API_KEY not set, OTP would be sent to ${email}: ${otp}`);
    return true;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; }
        .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; }
        .otp-box { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>Thank you for registering! Please use the verification code below to complete your registration:</p>
          <div class="otp-box">
            <p class="otp-code">${otp}</p>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Thank you!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Pharmacy POS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const data = {
    sender: {
      name: process.env.PHARMACY_NAME || 'Pharmacy POS',
      email: process.env.SMTP_FROM || 'noreply@pharmacy.com'
    },
    to: [{ email: email }],
    subject: 'Verify Your Email - OTP Code',
    htmlContent: html
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
      console.log(`✅ OTP email sent to ${email}`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ OTP email failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ OTP email error:', error.message);
    return false;
  }
};

module.exports = { generateOTP, sendOTPEmail };