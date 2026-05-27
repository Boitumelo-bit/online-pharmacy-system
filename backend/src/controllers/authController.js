const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendWelcomeEmail } = require('../services/emailService');
const { generateOTP, sendOTPEmail } = require('../services/otpService');

// Helper function to send emails via Brevo API
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
      console.error('❌ Email failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate random reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Public registration - ONLY for CUSTOMER role with OTP verification
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user with OTP (not verified yet)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: false,
        otpCode,
        otpExpiry,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        emailVerified: true,
      }
    });
    
    // Send OTP email
    await sendOTPEmail(email, otpCode, fullName);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email with the OTP sent to your inbox.',
      requiresOtp: true,
      email: user.email,
      userId: user.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify OTP and activate account
const verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    
    const user = await prisma.user.findFirst({
      where: {
        email,
        otpCode,
        otpExpiry: { gt: new Date() }
      }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP code. Please request a new one.' 
      });
    }
    
    // Update user as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        emailVerified: true,
      }
    });
    
    // Generate token for auto-login
    const token = generateToken(updatedUser);
    
    res.json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      user: updatedUser,
      token,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Resend OTP code
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }
    
    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiry,
      }
    });
    
    await sendOTPEmail(email, otpCode, user.fullName);
    
    res.json({
      success: true,
      message: 'New OTP code sent to your email.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login - FIXED with debug logs (email check temporarily disabled)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    
    // Find user with all needed fields including emailVerified
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        password: true,
        avatar: true,
        createdAt: true,
      }
    });
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found:', user.email);
    console.log('Email verified value:', user.emailVerified);
    console.log('Email verified type:', typeof user.emailVerified);
    console.log('User role:', user.role);
    
    // TEMPORARILY DISABLED EMAIL CHECK FOR TESTING
    // if (user.role === 'CUSTOMER' && user.emailVerified !== true) {
    //   console.log('Email verification failed - blocking login');
    //   return res.status(403).json({ 
    //     message: 'Please verify your email first. Check your inbox for OTP code.',
    //     requiresOtp: true,
    //     email: user.email,
    //   });
    // }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('Login successful for:', email);
    console.log('=====================');
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        address: true,
      }
    });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN ONLY - Create user with any role (Pharmacist, Delivery Staff, etc.)
const createUserByAdmin = async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;
    
    // Verify admin权限
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can create staff accounts' });
    }
    
    // Validate role
    const allowedRoles = ['PHARMACIST', 'DELIVERY_STAFF', 'CUSTOMER'];
    const userRole = role && allowedRoles.includes(role) ? role : 'CUSTOMER';
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with specified role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: userRole,
        isActive: true,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      }
    });
    
    // Send welcome email with password (non-blocking)
    sendWelcomeEmail(user, password).catch(console.error);
    
    res.status(201).json({
      message: `${userRole} created successfully`,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN ONLY - Get all users
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can view all users' });
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN ONLY - Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can update user roles' });
    }
    
    const allowedRoles = ['ADMIN', 'PHARMACIST', 'CUSTOMER', 'DELIVERY_STAFF'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      }
    });
    
    res.json({
      message: `User role updated to ${role}`,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN ONLY - Toggle user active status
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can toggle user status' });
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      }
    });
    
    res.json({
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN ONLY - Update user details (fullName, email, phone, role)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role } = req.body;
    
    // Verify admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can update users' });
    }
    
    // Find user to update
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow changing Admin role
    if (existingUser.role === 'ADMIN' && role !== 'ADMIN') {
      return res.status(400).json({ message: 'Cannot change Admin role' });
    }
    
    // Check if email is taken by another user
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName || existingUser.fullName,
        email: email || existingUser.email,
        phone: phone || existingUser.phone,
        role: role || existingUser.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      }
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ==================== PROFILE FUNCTIONS ====================

// Update user profile (for authenticated users) - FIXED VERSION
const updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const userId = req.user.id;
    
    // Build update data - only include fields that are provided
    const updateData = {};
    if (fullName !== undefined && fullName !== '') updateData.fullName = fullName;
    if (email !== undefined && email !== '') updateData.email = email;
    if (phone !== undefined && phone !== '') updateData.phone = phone;
    
    // Check if email is taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({ 
        where: { email } 
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already in use' 
        });
      }
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { 
        id: true, 
        email: true, 
        fullName: true, 
        phone: true, 
        role: true, 
        isActive: true,
        avatar: true
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Change password (for authenticated users)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==================== FORGOT PASSWORD FUNCTIONS ====================

// Forgot password - send reset email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ success: true, message: 'If an account exists, a reset link will be sent' });
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });
    
    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Dear ${user.fullName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">Pharmacy POS System</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmailViaApi(email, 'Reset Your Password', html);
    
    res.json({ success: true, message: 'Reset link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== AVATAR FUNCTIONS ====================

// Upload avatar (for authenticated users)
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // For local storage - construct URL
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { 
        id: true, 
        email: true, 
        fullName: true, 
        phone: true, 
        role: true, 
        isActive: true,
        avatar: true
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Avatar updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete avatar (for authenticated users)
const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: { 
        id: true, 
        email: true, 
        fullName: true, 
        phone: true, 
        role: true, 
        isActive: true,
        avatar: true
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Avatar removed successfully', 
      user: updatedUser 
    });
    
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
};

module.exports = { 
  register, 
  login, 
  getMe, 
  createUserByAdmin,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  updateUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  deleteAvatar,
  verifyOTP,
  resendOTP,
};