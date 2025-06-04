// Database configuration with fallback options
require('dotenv').config();

const MONGODB_CONNECTION_STRING = process.env.MONGODB_URI || 'mongodb+srv://jhas69259:Namanjha%409934@cluster0.mqex9dg.mongodb.net/sports-academy?retryWrites=true&w=majority&appName=Cluster0';

module.exports = {
  getMongoURI: () => MONGODB_CONNECTION_STRING,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
  }
};