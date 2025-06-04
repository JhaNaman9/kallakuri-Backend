const mongoose = require('mongoose');

const TaskItemSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    trim: true
  },
  variant: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
});

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending'
    },
    taskType: {
      type: String,
      enum: ['internal', 'external', 'regular'],
      default: 'regular',
      index: true // Add index for better query performance
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    externalAssignee: {
      name: {
        type: String,
        trim: true
      },
      isExternalUser: {
        type: Boolean,
        default: false
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID']
    },
    staffRole: {
      type: String,
      enum: ['Marketing Staff', 'Godown Incharge', 'Mid-Level Manager'],
      required: [true, 'Please provide the staff role']
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor'
    },
    brand: {
      type: String,
      trim: true
    },
    variant: {
      type: String,
      trim: true
    },
    size: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      min: [0, 'Quantity cannot be negative']
    },
    items: [TaskItemSchema],
    deadline: {
      type: Date
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    report: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ staffRole: 1 });
TaskSchema.index({ distributorId: 1 });
TaskSchema.index({ taskType: 1, createdBy: 1 }); // Compound index for internal tasks queries

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;