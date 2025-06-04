const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide a quantity'],
      min: [1, 'Quantity must be at least 1']
    },
    unit: {
      type: String,
      required: [true, 'Please provide a unit'],
      trim: true
    }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: [true, 'Please provide a distributor ID']
    },
    items: {
      type: [OrderItemSchema],
      required: [true, 'Please provide at least one item'],
      validate: {
        validator: function(items) {
          return items.length > 0;
        },
        message: 'Please provide at least one item'
      }
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Dispatched'],
      default: 'Requested'
    },
    comments: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
OrderSchema.index({ distributorId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdBy: 1 });

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order; 