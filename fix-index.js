const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sports-academy')
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Drop the problematic index
    return mongoose.connection.db.collection('damageclaims').dropIndex('trackingId_1');
  })
  .then(() => {
    console.log('Index dropped successfully');
  })
  .catch(err => {
    console.error('Error:', err);
  })
  .finally(() => {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }); 