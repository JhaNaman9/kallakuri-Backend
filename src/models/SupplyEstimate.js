const mongoose = require('mongoose');

// Individual product item with size and quantity
const ProductSizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true
  },
  openingStock: {
    type: Number,
    default: 0
  },
  rate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Product variant with sizes
const ProductVariantSchema = new mongoose.Schema({
  variant: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  sizes: [ProductSizeSchema]
}, { _id: true });

// Brand with variants
const BrandEstimateSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true
  },
  variants: [ProductVariantSchema]
}, { _id: true });

const SupplyEstimateSchema = new mongoose.Schema(
  {
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: [true, 'Distributor ID is required']
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff ID is required']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    brands: [BrandEstimateSchema],
    totalItems: {
      type: Number,
      required: true,
      default: 0
    },
    notes: {
      type: String,
      trim: true
    },
    estimateType: {
      type: String,
      enum: ['Initial', 'Regular', 'Special'],
      default: 'Regular'
    },
    revisionHistory: [{
      revisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      revisionDate: {
        type: Date,
        default: Date.now
      },
      revisionNotes: {
        type: String,
        trim: true
      }
    }]
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
SupplyEstimateSchema.index({ distributorId: 1 });
SupplyEstimateSchema.index({ submittedBy: 1 });
SupplyEstimateSchema.index({ status: 1 });
SupplyEstimateSchema.index({ createdAt: -1 });

const SupplyEstimate = mongoose.model('SupplyEstimate', SupplyEstimateSchema);

module.exports = SupplyEstimate; 