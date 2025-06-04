const fs = require('fs');
const path = require('path');
const { uploadImage } = require('./utils/imageUpload');

// Test creating a damage claim with image
async function testDamageClaimWithImage() {
  try {
    // Create a test image
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    const testImage = {
      originalname: 'test-image.jpg',
      buffer: fs.readFileSync(testImagePath)
    };

    // Upload the image
    console.log('Uploading test image...');
    const imagePath = await uploadImage(testImage, 'damage-claims');
    console.log('Image uploaded successfully:', imagePath);

    // Create damage claim data
    const damageClaimData = {
      distributorId: '68271f50e82cd9672f9a328f', // Use an existing distributor ID
      distributorName: 'NAMAN JHA',
      brand: 'FoodTest',
      variant: 'Spicy',
      size: '250g',
      pieces: 10,
      manufacturingDate: new Date('2024-05-15'),
      batchDetails: 'B12345',
      damageType: 'Box Damage',
      reason: 'Boxes were crushed during delivery',
      images: [imagePath],
      createdBy: '68287dac192c912b0ecf2ee1', // Use an existing user ID
      status: 'Pending',
      trackingId: `DMG-TEST-${Date.now()}` // Generate a unique tracking ID
    };

    console.log('Damage claim data prepared:', damageClaimData);
    console.log('Test completed successfully');
    
    return damageClaimData;
  } catch (error) {
    console.error('Error in test:', error);
    return null;
  }
}

// Run the test
testDamageClaimWithImage(); 