const mongoose = require('mongoose');

// Size Supply Estimate Schema 
const SizeSupplyEstimateSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  name: {
    type: String,
    required: [true, 'Size name is required'],
    trim: true
  },
  openingStock: {
    type: Number,
    default: 0
  },
  proposedMarketRate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Variant Supply Estimate Schema
const VariantSupplyEstimateSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  name: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  sizes: [SizeSupplyEstimateSchema]
}, { _id: false });

// Brand Supply Estimate Schema
const BrandSupplyEstimateSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true
  },
  variants: [VariantSupplyEstimateSchema]
}, { _id: false });

// Sales Order Schema
const SalesOrderSchema = new mongoose.Schema({
  brandName: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true
  },
  variant: {
    type: String,
    required: [true, 'Variant is required'],
    trim: true
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  isDisplayedInCounter: {
    type: Boolean,
    default: false
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  }
}, { _id: true });

const MarketingStaffActivitySchema = new mongoose.Schema(
  {
    marketingStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Marketing staff ID is required']
    },
    retailShop: {
      type: String,
      required: [true, 'Retail shop name is required'],
      trim: true
    },
    distributor: {
      type: String,
      required: [true, 'Distributor name is required'],
      trim: true
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor'
    },
    areaName: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true
    },
    tripCompanion: {
      category: {
        type: String,
        enum: ['Distributor Staff', 'Marketing Staff', 'Other'],
        required: [true, 'Trip companion category is required']
      },
      name: {
        type: String,
        required: [true, 'Trip companion name is required'],
        trim: true
      }
    },
    modeOfTransport: {
      type: String,
      required: [true, 'Mode of transport is required'],
      trim: true
    },
    meetingStartTime: {
      type: Date,
      default: Date.now
    },
    meetingEndTime: {
      type: Date
    },
    initialSupplyEstimate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplyEstimate'
    },
    proposedMarketRate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketRate'
    },
    brandSupplyEstimates: [BrandSupplyEstimateSchema],
    salesOrders: [SalesOrderSchema],
    selfieImage: {
      type: String,
      required: [true, 'Selfie image is required']
    },
    shopTypes: {
      type: [{
        type: String,
        enum: ['Retailer', 'Whole Seller']
      }],
      required: [true, 'At least one shop type is required']
    },
    shops: [{
      name: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true
      },
      type: {
        type: String,
        enum: ['Retailer', 'Whole Seller'],
        required: [true, 'Shop type is required']
      }
    }],
    status: {
      type: String,
      enum: ['Punched In', 'Punched Out', 'Completed'],
      default: 'Punched In'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
MarketingStaffActivitySchema.index({ marketingStaffId: 1, createdAt: -1 });

const MarketingStaffActivity = mongoose.model('MarketingStaffActivity', MarketingStaffActivitySchema);

module.exports = MarketingStaffActivity;