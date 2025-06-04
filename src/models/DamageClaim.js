const mongoose = require('mongoose');

const ReplacementDetailsSchema = new mongoose.Schema({
  dispatchDate: {
    type: Date,
    required: [true, 'Dispatch date is required']
  },
  approvedBy: {
    type: String,
    required: [true, 'Approved by is required'],
    trim: true
  },
  channelledTo: {
    type: String,
    required: [true, 'Channelled to is required'],
    trim: true
  },
  referenceNumber: {
    type: String,
    required: [true, 'Reference number is required'],
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const DamageClaimSchema = new mongoose.Schema(
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
    pieces: {
      type: Number,
      required: [true, 'Number of pieces is required'],
      min: [1, 'Number of pieces must be at least 1']
    },
    manufacturingDate: {
      type: Date,
      required: [true, 'Manufacturing date is required']
    },
    batchDetails: {
      type: String,
      required: [true, 'Batch details are required'],
      trim: true
    },
    damageType: {
      type: String,
      required: [true, 'Damage type is required'],
      enum: ['Box Damage', 'Product Damage', 'Seal Broken', 'Expiry Date Issue', 'Quality Issue', 'Other'],
      trim: true
    },
    reason: {
      type: String,
      required: [true, 'Reason for damage is required'],
      trim: true
    },
    images: [{
      type: String, // URL or path to the image
      trim: true
    }],
    status: {
      type: String,
      enum: ['Pending', 'Commented', 'Approved', 'Partially Approved', 'Rejected'],
      default: 'Pending'
    },
    replacementStatus: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending'
    },
    trackingId: String,
    approvedPieces: {
      type: Number,
      default: 0
    },
    comment: {
      type: String,
      trim: true
    },
    mlmComment: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mlmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedDate: {
      type: Date
    },
    replacementDetails: ReplacementDetailsSchema
  },
  {
    timestamps: true
  }
);

// Generate tracking ID when status changes
DamageClaimSchema.pre('save', function(next) {
  if (this.isModified('status') && (this.status === 'Approved' || this.status === 'Partially Approved') && !this.trackingId) {
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.trackingId = `DMG${datePrefix}${randomSuffix}`;
    this.approvedDate = new Date();
  }
  next();
});

// Indexes for faster queries
DamageClaimSchema.index({ status: 1 });
DamageClaimSchema.index({ createdBy: 1 });
DamageClaimSchema.index({ distributorId: 1 });
// Removed trackingId index to prevent duplicate key errors
DamageClaimSchema.index({ manufacturingDate: 1 });

const DamageClaim = mongoose.model('DamageClaim', DamageClaimSchema);

module.exports = DamageClaim;