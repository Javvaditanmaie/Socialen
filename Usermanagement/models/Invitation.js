const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  invitationId: { type: String, required: true, unique: true }, // uuid
  code: { type: String, required: true, unique: true },        // short code
  email: { type: String, lowercase: true, trim: true },        // optional targeted email
  role: { 
    type: String, 
    required: true,
    enum: ['super_admin', 'site_admin', 'operator', 'client_admin', 'client_user']
  }, 
  method: { 
    type: String, 
    enum: ['TOTP','EMAIL_OTP'], 
    default: 'TOTP' 
  },
  otpHash: { type: String, select: false, default: null },
  otpExpiresAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending','used','expired'],
    default: 'pending'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});


module.exports = mongoose.model('Invitation', invitationSchema);
