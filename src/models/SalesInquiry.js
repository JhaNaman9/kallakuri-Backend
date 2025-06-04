const mongoose = require('mongoose');

const SalesInquirySchema = new mongoose.Schema(
  {
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: [true, 'Distributor is required']
    },
    distributorName: {
      type: String,
      required: [true, 'Distributor name is required'],
      trim: true
    },
    shopName: {
      type: String,
      trim: true
    },
    products: [
      {
        brand: {
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
        }
      }
    ],
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Rejected', 'Commented', 'Dispatched'],
      default: 'Pending'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    managerComment: {
      type: String,
      trim: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerCommentDate: {
      type: Date
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedDate: {
      type: Date
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dispatchDate: {
      type: Date
    },
    dispatchedAt: {
      type: Date
    },
    vehicleId: {
      type: String,
      trim: true
    },
    referenceNumber: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesInquiry', SalesInquirySchema); 