const mongoose = require('mongoose');

const StaffActivitySchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a staff ID']
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date'],
      default: Date.now
    },
    activityType: {
      type: String,
      required: [true, 'Please provide an activity type'],
      enum: ['Task', 'Task Creation', 'Order', 'Damage Claim', 'Supply Estimate', 'Inquiry', 'Dispatch', 'Other', 'Damage Claim Replacement'],
      trim: true
    },
    details: {
      type: String,
      required: [true, 'Please provide activity details'],
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Please provide a status'],
      enum: ['Completed', 'Pending', 'In Progress', 'Cancelled'],
      default: 'Completed'
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'onModel'
    },
    onModel: {
      type: String,
      enum: ['Task', 'Order', 'DamageClaim', 'SupplyEstimate', 'SalesInquiry']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
StaffActivitySchema.index({ staffId: 1, date: 1 });
StaffActivitySchema.index({ activityType: 1 });
StaffActivitySchema.index({ date: 1 });

const StaffActivity = mongoose.model('StaffActivity', StaffActivitySchema);

module.exports = StaffActivity;