const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

const createDefaultAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'Admin' });
    
    if (adminExists) {
      logger.info('Default admin already exists');
      console.log('Default admin already exists');
      return;
    }

    // Create default admin user
    const defaultAdmin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: 'Admin',
      active: true
    });

    console.log('Default admin user created:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    logger.info('Default admin user created successfully');
    
  } catch (error) {
    logger.error(`Error creating default admin: ${error.message}`);
    console.error('Error creating default admin:', error.message);
  } finally {
    // Close the connection
    mongoose.connection.close();
    process.exit();
  }
};

// Run the function
createDefaultAdmin(); 