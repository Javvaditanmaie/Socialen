import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptField,decryptField,generateBlindIndex } from '../utils/cryptoUtils.js';
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    //encrypted email field
    emailEnc:{
      iv:{type:String,required:true},
      authTag:{type:String,required:true},
      encrypted:{type:String,required:true},
    },
    //searchable blind index
    emailBlindIndex:{
      type:String,
      required:true,
      index:true,
      unique:true,
    },
    // email: {
    //   type: String,
    //   required: true,
    //   unique: true,
    //   index: true, 
    //   lowercase: true,
    //   trim: true,
    //   match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    // },

    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
      select: false, 
    },

    role: {
      type: String,
      enum: [
        'super_admin',
        'site_admin',
        'operator',
        'client_admin',
        'client_user',
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
    mfaMethod: {
    type: String,
    enum: ["totp","otp"],
    required:true,
  },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    isVerified: { type: Boolean, default: false },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecret:{
        type:String
    },

    totpSecretHashed: {
      type: String,
      select: false,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      select: false,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});
UserSchema.pre("save",function(next){
  if(!this.isModified("emailEnc")&& this.emailEnc) return next();
  if(!this.email) return next();
  const encrypted= encryptField(this.email);
  this.emailEnc=encrypted;
  this.emailBlindIndex=generateBlindIndex(this.email);
  next();
})
UserSchema.virtual("email").get(function(){
  if(!this.emailEnc) return null;
  try{
    return decryptField(this.emailEnc);
  }catch(err){
    return null;
  }
})
.set(function(value){
  const encrypted=encryptField(value);
  this.emailEnc=encrypted;
  this.emailBlindIndex=generateBlindIndex(value);
})

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.methods.compareTotpSecret = async function (secret) {
  return await bcrypt.compare(secret, this.totpSecretHashed);
};

UserSchema.methods.getDecryptedEmail=function(){
  return decryptField(this.emailEnc);
}
const User = mongoose.model("User", UserSchema);
export default User;
