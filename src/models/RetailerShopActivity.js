const mongoose = require('mongoose');

// Schema for sales order items
const SalesOrderItemSchema = new mongoose.Schema({
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
  }
}, { _id: true });

// Schema for alternate providers
const AlternateProviderSchema = new mongoose.Schema({
  for: {
    type: String,
    required: [true, 'For product is required'],
    trim: true
  },
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
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  stockDate: {
    type: String,
    required: [true, 'Stock date is required'],
    trim: true
  },
  mlmComment: {
    type: String,
    trim: true
  },
  mlmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentDate: {
    type: Date
  }
}, { _id: true });

const RetailerShopActivitySchema = new mongoose.Schema(
  {
    marketingStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Marketing staff ID is required']
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: [true, 'Distributor ID is required']
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required']
    },
    punchInTime: {
      type: Date,
      default: Date.now
    },
    punchOutTime: {
      type: Date
    },
    isPunchedIn: {
      type: Boolean,
      default: true
    },
    salesOrders: [SalesOrderItemSchema],
    alternateProviders: [AlternateProviderSchema],
    complaint: {
      type: String,
      trim: true
    },
    marketInsight: {
      type: String,
      trim: true
    },
    voiceNote: {
      type: String,
      trim: true
    },
    mobileNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['In Progress', 'Completed'],
      default: 'In Progress'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
RetailerShopActivitySchema.index({ marketingStaffId: 1, createdAt: -1 });
RetailerShopActivitySchema.index({ distributorId: 1 });
RetailerShopActivitySchema.index({ shopId: 1 });

const RetailerShopActivity = mongoose.model('RetailerShopActivity', RetailerShopActivitySchema);

module.exports = RetailerShopActivity;