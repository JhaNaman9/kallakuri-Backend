const mongoose = require('mongoose');

const SizeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a size name'],
      trim: true
    }
  },
  { _id: false }
);

const VariantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a variant name'],
      trim: true
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Please provide a brand ID']
    },
    sizes: [SizeSchema],
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
VariantSchema.index({ name: 1, brand: 1 });
VariantSchema.index({ brand: 1 });

const Variant = mongoose.model('Variant', VariantSchema);

module.exports = Variant; 