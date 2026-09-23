const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    post: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    groupIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    mustResetPassword: {
      type: Boolean,
      default: true,
    },
    // Backward compatibility alias for mustResetPassword
    mustChangePassword: {
      type: Boolean,
      default: function () {
        return this.mustResetPassword !== undefined ? this.mustResetPassword : true;
      },
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    notificationPreferences: {
      email: {
        newMessage: { type: Boolean, default: false },
        newMeeting: { type: Boolean, default: true },
        taskAssigned: { type: Boolean, default: true },
        announcement: { type: Boolean, default: true },
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (this.isModified('mustResetPassword')) {
    this.mustChangePassword = this.mustResetPassword;
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
