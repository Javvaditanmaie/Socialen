import User from "../models/User.js";
import Organization from "../models/Organization.js";
import dbAdapter from "../db/dbAdapter.js";

export async function listUsers({ page = 1, limit = 20, filter = {} }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    dbAdapter
      .find(User, filter)
      .select("-passwordHash -refreshToken -totpSecretHashed")
      .skip(skip)
      .limit(limit)
      .lean(),
    dbAdapter.count(User, filter),
  ]);
  return { items, total, page, limit };
}

export async function getUserById(id) {
  const user = await dbAdapter
    .findById(User, id)
    .select("-passwordHash -refreshToken -totpSecretHashed")
    .lean();
  return user;
}

export async function createUser(payload, actor = null) {
  if (payload.organizationId) {
    const org = await dbAdapter.findById(Organization, payload.organizationId);
    if (!org) throw { status: 400, message: "Organization not found" };
  }
  const exists = await dbAdapter.findOne(User, { email: payload.email.toLowerCase().trim() });
  if (exists) throw { status: 400, message: "Email already exists" };

  const user = await dbAdapter.create(User, {
    name: payload.name,
    email: payload.email.toLowerCase().trim(),
    passwordHash: payload.password, 
    role: payload.role || "client_user",
    organizationId: payload.organizationId || null,
    createdBy: actor ? actor.sub : null,
    totpEnabled: payload.totpEnabled || false,
  });

  const safe = user.toObject();
  delete safe.passwordHash;
  delete safe.refreshToken;
  delete safe.totpSecretHashed;
  return safe;
}

export async function updateUser(id, payload, actor = null) {
  const user = await dbAdapter.findById(User, id);
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
  delete safe.passwordHash;
  delete safe.refreshToken;
  delete safe.totpSecretHashed;
  return safe;
}

export async function deleteUser(id) {
  const deleted = await dbAdapter.deleteById(User, id);
  if (!deleted) throw { status: 404, message: "User not found" };
  return true;
}
export default {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
