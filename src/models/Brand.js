const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a brand name'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
BrandSchema.index({ name: 1 });

const Brand = mongoose.model('Brand', BrandSchema);

module.exports = Brand; 