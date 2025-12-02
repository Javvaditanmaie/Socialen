import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  encryptField,
  decryptField,
  generateBlindIndex,
} from "../utils/cryptoUtils.js";

const UserSchema = new mongoose.Schema(
  {
    /* --------------------------------
       1. NAME (ENCRYPT + BLIND INDEX)
       + validation on plaintext
    ---------------------------------- */
    name_enc: {
      iv: String,
      authTag: String,
      encrypted: String,
    },
    name_idx: {
      type: String,
      index: true,
    },

    /* --------------------------------
       2. EMAIL (ENCRYPT + BLIND INDEX)
       + validation on plaintext
    ---------------------------------- */
    email_enc: {
      iv: String,
      authTag: String,
      encrypted: String,
    },
    email_idx: {
      type: String,
      index: true,
      unique: true,
    },

    /* --------------------------------
       3. ORGANIZATION NAME (ENCRYPT + BLIND INDEX)
    ---------------------------------- */
    organizationName_enc: {
      iv: String,
      authTag: String,
      encrypted: String,
    },
    organizationName_idx: {
      type: String,
      index: true,
    },

    /* --------------------------------
       4. MFA METHOD (ENCRYPT ONLY)
       + validation on plaintext
    ---------------------------------- */
    mfaMethod_enc: {
      iv: String,
      authTag: String,
      encrypted: String,
    },

    /* --------------------------------
       5. NORMAL FIELDS
    ---------------------------------- */
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "super_admin",
        "site_admin",
        "operator",
        "client_admin",
        "client_user",
      ],
      required: true,
      index: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },

    refreshToken: { type: String, select: false, default: null },
    isVerified: { type: Boolean, default: false },
    totpEnabled: { type: Boolean, default: false },
    totpSecret: { type: String },
    totpSecretHashed: { type: String, select: false, default: null },

    lastLogin: { type: Date, default: null },
    isActive: { type: Boolean, default: true },

    otp: { type: String, select: false, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ======================================================
   PLAINTEXT VALIDATIONS (NAME + EMAIL + MFA)
====================================================== */

// Temp storage virtuals
UserSchema.virtual("name_plain");
UserSchema.virtual("email_plain");
UserSchema.virtual("mfaMethod_plain");

UserSchema.pre("validate", function (next) {
  
  // NAME VALIDATION
  if (this._namePlain !== undefined) {
    if (this._namePlain.length < 2) {
      return next(new Error("Name must be at least 2 characters"));
    }
    if (this._namePlain.length > 100) {
      return next(new Error("Name cannot exceed 100 characters"));
    }
  }

  // EMAIL VALIDATION
  if (this._emailPlain !== undefined) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(this._emailPlain)) {
      return next(new Error("Invalid email format"));
    }
  }

  // MFA VALIDATION
  if (this._mfaMethodPlain !== undefined) {
    const allowed = ["otp", "totp"];
    if (!allowed.includes(this._mfaMethodPlain)) {
      return next(new Error("Invalid MFA method. Allowed: otp, totp"));
    }
  }

  next();
});
/* ======================================================
   PASSWORD HASHING
====================================================== */
UserSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash")) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  next();
});

/* ======================================================
   PRE-SAVE ENCRYPTION
====================================================== */
UserSchema.pre("save", function (next) {
  /* NAME */
  if (this._namePlain!==undefined) {
    this.name_enc = encryptField(this._namePlain);
    this.name_idx = generateBlindIndex(this._namePlain);
  }

  /* EMAIL */
  if (this._emailPlain!==undefined) {
    this.email_enc = encryptField(this._emailPlain);
    this.email_idx = generateBlindIndex(this._emailPlain);
  }

  /* ORGANIZATION NAME */
  if (this._orgNamePlain!==undefined) {
    this.organizationName_enc = encryptField(this._orgNamePlain);
    this.organizationName_idx = generateBlindIndex(this._orgNamePlain);
  }

  /* MFA METHOD */
  if (this._mfaMethodPlain!==undefined) {
    this.mfaMethod_enc = encryptField(this._mfaMethodPlain);
  }

  next();
});

/* ======================================================
   VIRTUALS — GET & SET 
====================================================== */

// NAME
UserSchema.virtual("name")
  .get(function () {
    return this.name_enc ? decryptField(this.name_enc) : null;
  })
  .set(function (value) {
    this._namePlain = value;
  });

// EMAIL
UserSchema.virtual("email")
  .get(function () {
    return this.email_enc ? decryptField(this.email_enc) : null;
  })
  .set(function (value) {
    this._emailPlain = value;
  });

// // ORGANIZATION NAME
// UserSchema.virtual("organizationName")
//   .get(function () {
//     return this.organizationName_enc
//       ? decryptField(this.organizationName_enc)
//       : null;
//   })
//   .set(function (value) {
//     this._orgNamePlain = value;
//   });

// MFA METHOD
UserSchema.virtual("mfaMethod")
  .get(function () {
    return this.mfaMethod_enc ? decryptField(this.mfaMethod_enc) : null;
  })
  .set(function (value) {
    this._mfaMethodPlain = value;
  });

/* ======================================================
   METHODS
====================================================== */

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.methods.compareTotpSecret = async function (secret) {
  return bcrypt.compare(secret, this.totpSecretHashed);
};

UserSchema.methods.getDecryptedProfile = function () {
  return {
    name: this.name,
    email: this.email,
    organizationName: this.organizationName,
    mfaMethod: this.mfaMethod,
    role: this.role,
  };
};

const User = mongoose.model("User", UserSchema);
export default User;
