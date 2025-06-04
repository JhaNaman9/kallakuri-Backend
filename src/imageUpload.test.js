const fs = require('fs');
const path = require('path');
const { uploadImage, deleteImage } = require('./utils/imageUpload');

// Test file data
const testImagePath = path.join(__dirname, 'test-image.jpg');
const testImage = {
  originalname: 'test-image.jpg',
  buffer: fs.readFileSync(testImagePath)
};

// Test upload function
async function testUpload() {
  try {
    console.log('Testing image upload...');
    const imagePath = await uploadImage(testImage, 'test-uploads');
    console.log('Image uploaded successfully:', imagePath);
    return imagePath;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// Test delete function
async function testDelete(imagePath) {
  try {
    console.log('Testing image deletion...');
    const result = await deleteImage(imagePath);
    console.log('Image deleted successfully:', result);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

// Run tests
async function runTests() {
  const uploadedPath = await testUpload();
  if (uploadedPath) {
    await testDelete(uploadedPath);
  }
}

runTests(); 