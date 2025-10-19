const User = require("../models/User");
const Organization = require("../models/Organization");
const db = require("../db/dbAdapter");
const bcrypt = require("bcryptjs");


async function listUsers({ page = 1, limit = 20, filter = {} }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).select("-passwordHash -refreshToken -totpSecretHashed").skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  return { items, total, page, limit };
}

async function getUserById(id) {
  const user = await User.findById(id).select("-passwordHash -refreshToken -totpSecretHashed").lean();
  return user;
}

async function createUser(payload, actor = null) {
  if (payload.organizationId) {
    const org = await Organization.findById(payload.organizationId);
    if (!org) throw { status: 400, message: "Organization not found" };
  }
  const exists = await User.findOne({ email: payload.email.toLowerCase().trim() });
  if (exists) throw { status: 400, message: "Email already exists" };
  const user = new User({
    name: payload.name,
    email: payload.email.toLowerCase().trim(),
    passwordHash: payload.password, 
    role: payload.role || "client_user",
    organizationId: payload.organizationId || null,
    createdBy: actor ? actor.sub : null,
    totpEnabled: payload.totpEnabled || false,
  });

  await user.save();

  const safe = user.toObject();
  delete safe.passwordHash; delete safe.refreshToken; delete safe.totpSecretHashed;
  return safe;
}

async function updateUser(id, payload, actor = null) {
  const user = await User.findById(id);
  if (!user) throw { status: 404, message: "User not found" };

  
  if (actor.role === "client_admin" || actor.role === "operator") {
    if (!actor.organizationId || actor.organizationId !== (user.organizationId ? user.organizationId.toString() : null)) {
      throw { status: 403, message: "Forbidden" };
    }
  }
  if (payload.name) user.name = payload.name;
  if (payload.email) user.email = payload.email.toLowerCase().trim();
  if (payload.password) user.passwordHash = payload.password; 
  if (payload.role && actor.role === "super_admin") user.role = payload.role; 
  if (typeof payload.totpEnabled === "boolean") user.totpEnabled = payload.totpEnabled;

  await user.save();
  const safe = user.toObject();
  delete safe.passwordHash; delete safe.refreshToken; delete safe.totpSecretHashed;
  return safe;
}


async function deleteUser(id) {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) throw { status: 404, message: "User not found" };
  return true;
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
