const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Upload image to server storage
 * @param {Object} file - The file object from multer
 * @param {String} folder - The folder to store the image in (e.g. 'damage-claims')
 * @returns {Promise<String>} - The path to the uploaded image
 */
exports.uploadImage = async (file, folder = 'uploads') => {
  try {
    // Create folder if it doesn't exist
    const uploadDir = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const randomName = crypto.randomBytes(16).toString('hex');
    const fileName = `${randomName}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);
    
    // Return the relative path that will be stored in the database
    return `/uploads/${folder}/${fileName}`;
  } catch (error) {
    logger.error(`Error uploading image: ${error.message}`);
    throw new Error('Error uploading image');
  }
};

/**
 * Delete image from server storage
 * @param {String} imagePath - The path to the image
 * @returns {Promise<Boolean>} - Whether the image was deleted successfully
 */
exports.deleteImage = async (imagePath) => {
  try {
    // Get absolute path to image
    const fullPath = path.join(__dirname, '../..', imagePath);
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      // Delete file
      fs.unlinkSync(fullPath);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Error deleting image: ${error.message}`);
    return false;
  }
}; 