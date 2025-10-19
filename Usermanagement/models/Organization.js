const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // already creates an index
    trim: true,
    minlength: 2,
    maxlength: 150,
  },
  industry: {
    type: String,
    trim: true,
  },
  domain: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // user who created the organization
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// ✅ Only keep this unique index for performance
organizationSchema.index({ domain: 1 });

const Organization = mongoose.model("Organization", organizationSchema);
module.exports = Organization;
