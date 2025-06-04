const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');
const dbConfig = require('./dbConfig');

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

const connectDB = async () => {
  try {
    // Force use of the MongoDB Atlas connection string
    const mongoURI = dbConfig.getMongoURI();
    console.log('Connecting to MongoDB Atlas...');
    
    // Attempt connection with retry logic
    const maxRetries = 3;
    let retries = 0;
    let conn;

    while (retries < maxRetries) {
      try {
        conn = await mongoose.connect(mongoURI, mongoOptions);
        break; // If successful, break out of retry loop
      } catch (error) {
        retries++;
        logger.warn(`MongoDB connection attempt ${retries} failed: ${error.message}`);
        
        if (retries >= maxRetries) {
          throw error; // Throw error after max retries
        }
        
        // Wait before next retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add listeners for connection events
    mongoose.connection.on('error', err => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle app termination - close MongoDB connection
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    
    // More specific error messages based on error type
    if (error.name === 'MongoServerSelectionError') {
      logger.error('Could not connect to any MongoDB servers. Please check that MongoDB is running.');
    } else if (error.name === 'MongoParseError') {
      logger.error('Invalid MongoDB connection string. Please check your MONGO_URI.');
    } else if (error.message.includes('Authentication failed')) {
      logger.error('MongoDB authentication failed. Please check your username and password.');
    }
    
    // Exit with error
    process.exit(1);
  }
};

module.exports = connectDB; 