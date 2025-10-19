const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRY || "30d";
function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES });
}

async function registerUser({ name, email, password, role, organizationId, createdBy }) {
  email = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email }).lean();
  if (existing) throw { status: 400, message: "Email already registered" };

  const userDoc = new User({
    name,
    email,
    passwordHash: password, 
    role: role || "client_user",
    organizationId: organizationId || null,
    createdBy: createdBy || null,
  });

  await userDoc.save();

  const user = userDoc.toObject();
  delete user.passwordHash;
  delete user.refreshToken;
  delete user.totpSecretHashed;
  return user;
}

async function loginUser({ email, password }) {
  email = String(email).toLowerCase().trim();

  const user = await User.findOne({ email }).select("+passwordHash +refreshToken +totpSecretHashed");
  if (!user) throw { status: 400, message: "Invalid credentials" };

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw { status: 400, message: "Invalid credentials" };

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
    email: user.email,
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenPlain = signRefreshToken({ sub: user._id.toString() });

  const refreshHash = await bcrypt.hash(refreshTokenPlain, 12);
  user.refreshToken = refreshHash;
  user.lastLogin = new Date();
  await user.save();

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


async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw { status: 401, message: "Refresh token required" };

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw { status: 401, message: "Invalid or expired refresh token" };
  }

  const userId = decoded.sub;
  const user = await User.findById(userId).select("+refreshToken");
  if (!user || !user.refreshToken) throw { status: 401, message: "Invalid refresh token" };

  const valid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!valid) throw { status: 401, message: "Refresh token mismatch" };

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
    email: user.email,
  };

  const newAccessToken = signAccessToken(payload);
  const newRefreshPlain = signRefreshToken({ sub: user._id.toString() });

  user.refreshToken = await bcrypt.hash(newRefreshPlain, 12);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshPlain };
}


async function logout(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  user.refreshToken = null;
  await user.save();
}

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logout,
  signAccessToken,
  signRefreshToken,
};
