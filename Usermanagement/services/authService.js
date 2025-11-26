import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dbAdapter from "../db/dbAdapter.js";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRY || "30d";


// --------------------------------------------------
// TOKEN HELPERS
// --------------------------------------------------
export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES });
}


// --------------------------------------------------
// REGISTER USER
// --------------------------------------------------
export async function registerUser({
  name,
  email,
  password,
  role,
  organizationId,
  mfaMethod,
  createdBy,
}) {
  email = email.toLowerCase().trim();

  // Check if user exists
  const existing = await dbAdapter.findOne(User, { email });
  if (existing) throw { status: 400, message: "Email already registered" };

  if (!mfaMethod || !["otp", "totp"].includes(mfaMethod)) {
    throw { status: 400, message: "mfaMethod must be 'otp' or 'totp'" };
  }

  // Create user
  const userObj = {
    name,
    email,
    passwordHash: password,
    role: role || "client_user",
    organizationId: organizationId || null,
    mfaMethod,
    createdBy: createdBy || null,
    isVerified: false,
  };

  const userDoc = await dbAdapter.create(User, userObj);

  const safeUser = {
    ...userDoc.toObject(),
  };

  delete safeUser.passwordHash;
  delete safeUser.refreshToken;
  delete safeUser.totpSecretHashed;

  return safeUser;
}


// --------------------------------------------------
// LOGIN USER
// --------------------------------------------------
export async function loginUser({ email, password }) {
  email = email.toLowerCase().trim();

  const user = await dbAdapter.findOne(
    User,
    { email },
    "+passwordHash +refreshToken +totpSecretHashed"
  );

  if (!user) throw { status: 400, message: "Invalid credentials" };
  if (!user.isVerified) throw { status: 403, message: "Verify account first." };

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw { status: 400, message: "Invalid credentials" };

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId?.toString() || null,
    email: user.email,
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenPlain = signRefreshToken({ sub: user._id.toString() });

  const refreshHash = await bcrypt.hash(refreshTokenPlain, 12);

  // Update user refresh token using adapter
  await dbAdapter.findByIdAndUpdate(
    User,
    user._id,
    {
      refreshToken: refreshHash,
      lastLogin: new Date(),
    },
    { new: true }
  );

  const safeUser = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    totpEnabled: user.totpEnabled || false,
  };

  return { accessToken, refreshToken: refreshTokenPlain, user: safeUser };
}


// --------------------------------------------------
// REFRESH ACCESS TOKEN
// --------------------------------------------------
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken)
    throw { status: 401, message: "Refresh token required" };

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw { status: 401, message: "Invalid or expired refresh token" };
  }

  const userId = decoded.sub;

  const user = await dbAdapter.findById(
    User,
    userId,
    "+refreshToken"
  );

  if (!user || !user.refreshToken)
    throw { status: 401, message: "Invalid refresh token" };

  const valid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!valid) throw { status: 401, message: "Refresh token mismatch" };

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId?.toString() || null,
    email: user.email,
  };

  const newAccessToken = signAccessToken(payload);
  const newRefreshPlain = signRefreshToken({ sub: user._id.toString() });

  const newRefreshHash = await bcrypt.hash(newRefreshPlain, 12);

  await dbAdapter.findByIdAndUpdate(
    User,
    user._id,
    { refreshToken: newRefreshHash },
    { new: true }
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshPlain };
}


// --------------------------------------------------
// LOGOUT
// --------------------------------------------------
export async function logout(userId) {
  await dbAdapter.findByIdAndUpdate(User, userId, {
    refreshToken: null,
  });
}


export default {
  signAccessToken,
  signRefreshToken,
  registerUser,
  loginUser,
  refreshAccessToken,
  logout,
};
