const mongoose = require('mongoose');

// Retail shop schema
const RetailShopSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true
  },
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  }
}, { _id: true });

const DistributorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a distributor name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    shopName: {
      type: String,
      trim: true,
      maxlength: [100, 'Shop name cannot be more than 100 characters']
    },
    contact: {
      type: String,
      required: [true, 'Please provide a contact number'],
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      required: [true, 'Please provide an address'],
      trim: true
    },
    retailShops: [RetailShopSchema],
    wholesaleShops: [RetailShopSchema],
    // For statistics
    retailShopCount: {
      type: Number,
      default: 0
    },
    wholesaleShopCount: {
      type: Number,
      default: 0
    },
    orderCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
DistributorSchema.index({ name: 1 });

const Distributor = mongoose.model('Distributor', DistributorSchema);

module.exports = Distributor; 