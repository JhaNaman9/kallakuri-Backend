const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['Admin', 'Sub Admin', 'Marketing Staff', 'Mid-Level Manager', 'Godown Incharge', 'App Developer'],
      default: 'Marketing Staff'
    },
    isSubAdmin: {
      type: Boolean,
      default: false
    },
    permissions: {
      type: [String],
      default: [],
      // Possible values: 'dashboard', 'staff', 'marketing', 'orders', 'damage', 'tasks', 'distributors', 'godown', 'sales', 'reports'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    passwordChangedAt: {
      type: Date,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    lastLogin: {
      type: Date
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    accountLocked: {
      type: Boolean,
      default: false,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // Increased to 12 rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update passwordChangedAt field if password is changed (not on first creation)
    if (this.isModified('password') && !this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to handle small processing delays
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Filter out inactive users
UserSchema.pre(/^find/, function(next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Method to check if password matches
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set token expiry (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  // Return unhashed token (to be sent via email)
  return resetToken;
};

// Method to handle failed login attempts
UserSchema.methods.handleFailedLogin = async function() {
  // Increment login attempts
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts >= 5) {
    this.accountLocked = true;
    this.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
  }
  
  await this.save();
};

// Method to reset login attempts on successful login
UserSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.accountLocked = false;
  this.lockUntil = undefined;
  this.lastLogin = Date.now();
  
  await this.save();
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 