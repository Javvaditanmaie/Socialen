import authService from "../services/authService.js";
import invitationService from "../services/invitationService.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import bcrypt from "bcryptjs";
import Organization from "../models/Organization.js";
import crypto from "crypto";
import amqp from "amqplib";
import {
  signupSchema,
  signinSchema,
  sendOTPSchema,
  verifyOTPSchema,
  totpSetupSchema,
  validateInvitationSchema,
} from "../validators/authValidator.js";

async function signup(req, res) {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.errors });
    }

    const {
      name,
      email,
      password,
      role,
      organizationName,
      mfaMethod,
      invitationId,
      code,
    } = parsed.data;

    if (invitationId && code) {
      const inv = await invitationService.validateInvitation(invitationId, code);
      const orgId = inv.organizationId || null;
      const user = await authService.registerUser({
        name,
        email: inv.email,
        password,
        role: inv.role,
        organizationId: orgId,
        mfaMethod: inv.method || mfaMethod || 'otp',
        createdBy: inv.createdBy || null, 
      });

      inv.status = "used";
      inv.acceptedAt = new Date();
      inv.acceptedUserId = user.id || user._id;
      await inv.save();

      const requiresMfaSetup = user.mfaMethod === 'totp' || user.mfaMethod === 'otp';
      return res.status(201).json({
        message: `User registered successfully via invitation. Please set up ${inv.method.toUpperCase()}.`,
        requiresMfaSetup: true,
      });
    }
    if (!name || !email || !password || !role || !mfaMethod) {
      return res.status(400).json({ error: "Name, email, password, role, and mfaMethod are required" });
    }
    let organizationId = null;
    if (organizationName) {
      const normalized = String(organizationName).trim();
      let org = await Organization.findOne({ name: normalized });
      if (!org) {
        const slug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        org = await Organization.create({ name: normalized, slug });
      }
      organizationId = org._id;
    }
    
    const user = await authService.registerUser({
      name,
      email,
      password,
      role,
      organizationId: organizationId || null,
      mfaMethod: mfaMethod || 'otp', 
      createdBy: req.user ? req.user.sub : null,
    });
    if (mfaMethod === "totp") {
      return res.status(201).json({
        message: "User registered successfully. Please set up TOTP.",
        requiresMfaSetup: true,
      });
    } else if (mfaMethod === "otp") {
      return res.status(201).json({
        message: "User registered successfully. OTP will be sent.",
        requiresVerification: true,
      });
    }
    
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
async function signin(req, res) {

  try {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });
    const { email, password, otp } = parsed.data;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email }).select("+passwordHash +totpSecret");

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    if (user.totpEnabled) {
      if (!otp) return res.status(400).json({ error: "TOTP required" });

      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: "base32",
        token: otp,
      });

      if (!verified) return res.status(400).json({ error: "Invalid TOTP code" });
    }

    const result = await authService.loginUser({ email, password });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.json({ token: result.accessToken, user: result.user });
  } catch (err) {
    console.error("Signin Error:", err);
    res.status(500).json({ error: err.message });
  }
}


async function loginTOTP(req, res) {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email }).select("+refreshToken +totpSecret");
    if (!user || !user.totpSecret)
      return res.status(400).json({ error: "TOTP not set up for this user" });

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified)
      return res.status(400).json({ error: "Invalid or expired TOTP code" });

    
    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
        organizationId: user.organizationId || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    
    const refreshToken = jwt.sign(
      { sub: user._id.toString() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

  
    user.refreshToken = await bcrypt.hash(refreshToken, 12);
    await user.save();

    res.json({
      message: "TOTP verified successfully",
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("TOTP Login Error:", err);
    res.status(500).json({ error: err.message });
  }
}


async function totpSetup(req, res) {
  try {
    const parsed = totpSetupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { email } = parsed.data;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.mfaMethod !== "totp")
      return res.status(400).json({ error: "TOTP is not enabled for this user." });

    let secret;
    // Only generate a new secret if one doesn't already exist
    if (!user.totpSecret) {
      secret = speakeasy.generateSecret({ name: `MyApp (${email})` });
      user.totpSecret = secret.base32;
      await user.save();
    } else {
      // Use existing secret
      secret = { base32: user.totpSecret };
    }

    const otpauthUrl = `otpauth://totp/MyApp:${email}?secret=${secret.base32}&issuer=MyApp`;
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

    res.status(200).json({
      message: "TOTP setup generated successfully.",
      qrCodeUrl,
      secretKey: secret.base32,
    });
  } catch (err) {
    console.error("TOTP Setup Error:", err);
    res.status(500).json({ error: err.message });
  }
}

//  Verify TOTP
async function verifyTotp(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.totpSecret) {
      return res.status(404).json({ error: "User or TOTP secret not found" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: code,
      window: 1, 
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid or expired TOTP code" });
    }
    user.totpEnabled = true;
    await user.save();

    return res.status(200).json({ message: "TOTP verified successfully", verified: true });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


//  Refresh Token
async function refresh(req, res) {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ error: "Refresh token required" });

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.json({ token: tokens.accessToken });
  } catch (err) {
    console.error("Refresh Error:", err);
    res.status(500).json({ error: err.message });
  }
}


//  Logout
async function logout(req, res) {
  try {
    const userId = req.user?.sub || null;
    if (userId) await authService.logout(userId);

    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ error: err.message });
  }
}

//  Get Current User Info
async function getProfile(req, res) {
  try {
    const userId = req.user.sub || req.user._id;
    const user = await User.findById(userId)
      .populate("role", "name")
      .populate("organizationId", "name");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("GetProfile Error:", err);
    res.status(500).json({ error: err.message });
  }
}

//  Update Current User Info
async function updateProfile(req, res) {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("UpdateProfile Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Assign Role (Admin Only)
async function assignRole(req, res) {
  try {
    const { userId, roleId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.roleId = roleId;
    await user.save();

    res.json({ message: "Role assigned successfully", user });
  } catch (err) {
    console.error("AssignRole Error:", err);
    res.status(500).json({ error: err.message });
  }
}
async function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // valid 5 min
  return { otp, expiry, email };
}

async function sendOTP(req, res) {
  try {
    const parsed = sendOTPSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { email } = parsed.data;
    if (!email) return res.status(400).json({ message: "Email required" });

    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(process.env.RABBITMQ_EXCHANGE, "topic", { durable: true });

    const { otp, expiry } = await generateOTP(email);

    const message = {
      type: "otp",
      email,
      otp,
      expiry,
      subject: "Your OTP Code",
    };

    channel.publish(
      process.env.RABBITMQ_EXCHANGE,
      process.env.RABBITMQ_ROUTE_OTP,
      Buffer.from(JSON.stringify(message))
    );

    console.log("OTP published to RabbitMQ:", message);
    await channel.close();
    await connection.close();

    global.otpStore = global.otpStore || {};
    global.otpStore[email] = { otp, expiry };

    return res.status(200).json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
}

async function verifyOTP(req, res) {
  try {
    const parsed = verifyOTPSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ errors: parsed.error.errors });

    const { email, otp } = parsed.data;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });


    const record = global.otpStore?.[email];
    if (!record)
      return res.status(400).json({ message: "No OTP found for this email" });
    if (Date.now() > record.expiry)
      return res.status(400).json({ message: "OTP expired" });
    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    await User.findByIdAndUpdate(user._id, {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    });
    delete global.otpStore[email];

    return res.status(200).json({ message: "OTP verified successfully!" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
async function validateInvitation(req, res) {
  try {
    const parsed = validateInvitationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { invitationId, code } = parsed.data;
    const inv = await invitationService.validateInvitation(invitationId, code);

    return res.json({
      message: "Invitation is valid",
      email: inv.email,
      role: inv.role,
      status: inv.status,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}


export {
  signup,
  signin,
  loginTOTP,
  verifyTotp,
  refresh,
  logout,
  getProfile,
  updateProfile,
  assignRole,
  totpSetup,
  sendOTP,
  verifyOTP,
  validateInvitation,
};
