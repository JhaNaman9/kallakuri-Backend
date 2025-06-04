const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true
    },
    ownerName: {
      type: String,
      required: [true, 'Shop owner name is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Shop address is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Retailer', 'Whole Seller'],
      required: [true, 'Shop type is required']
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: [true, 'Distributor ID is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
ShopSchema.index({ distributorId: 1 });
ShopSchema.index({ type: 1 });
ShopSchema.index({ name: 'text', ownerName: 'text', address: 'text' });

const Shop = mongoose.model('Shop', ShopSchema);

module.exports = Shop; 