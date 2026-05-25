const { verifyEmailConfig, sendWelcomeEmail } = require('../services/emailService');

async function testEmail() {
  console.log('📧 Testing email configuration...');
  
  const isConfigured = await verifyEmailConfig();
  if (!isConfigured) {
    console.log('❌ Email not configured properly. Check your .env settings.');
    return;
  }
  
  // Test send email (replace with your email)
  const testUser = {
    email: 'your_email@example.com', // CHANGE THIS TO YOUR EMAIL
    fullName: 'Test User',
    phone: '1234567890',
    role: 'CUSTOMER',
  };
  
  console.log('📧 Sending test email to:', testUser.email);
  const result = await sendWelcomeEmail(testUser);
  
  if (result.success) {
    console.log('✅ Test email sent successfully! Check your inbox.');
  } else {
    console.log('❌ Failed to send test email:', result.error);
  }
}

testEmail();