const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 150,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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
    ref: "User", 
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

organizationSchema.index({ domain: 1 });

organizationSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") 
      .replace(/^-|-$/g, ""); 
  }
  next();
});

const Organization = mongoose.model("Organization", organizationSchema);
module.exports = Organization;
