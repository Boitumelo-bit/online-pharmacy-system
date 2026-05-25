const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary with your REAL credentials
cloudinary.config({
  cloud_name: 'drfadxrym',
  api_key: '827751783715247',
  api_secret: 'BRC69Y01a2ADhW-lDoqObqKItZo',
});

async function testCloudinary() {
  console.log('🔧 Testing Cloudinary connection...');
  console.log(`Cloud Name: ${cloudinary.config().cloud_name}`);
  
  try {
    // Test upload a simple base64 image
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await cloudinary.uploader.upload(testImage, {
      folder: 'pharmacy/test',
    });
    
    console.log('✅ Cloudinary upload successful!');
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Public ID: ${result.public_id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    return false;
  }
}

testCloudinary();