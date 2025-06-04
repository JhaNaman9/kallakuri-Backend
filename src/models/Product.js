const mongoose = require('mongoose');

// Size schema
const SizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Size name is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

// Variant schema
const VariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  sizes: [SizeSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

// Product schema
const ProductSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true
    },
    variants: [VariantSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
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
ProductSchema.index({ brandName: 1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product; 