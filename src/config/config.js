require('dotenv').config();
const dbConfig = require('./dbConfig');

module.exports = {
  port: process.env.PORT || 5050,
  // Prioritize MongoDB Atlas connection string
  mongoURI: dbConfig.getMongoURI(),
  jwtSecret: process.env.JWT_SECRET || 'sdkfjhs234kj23h4k2jh34kjh2fdsjkfds87238472384sdjfh',
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION, 10) || 7 * 24 * 60 * 60, // 7 days in seconds
  nodeEnv: process.env.NODE_ENV || 'development'
};