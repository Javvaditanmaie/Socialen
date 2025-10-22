
import userService from "../services/userService.js";

async function listUsers(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await userService.listUsers({ page: Number(page), limit: Number(limit) });
    return res.json(result);
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}


async function getUser(req, res) {
  try {
    const id = req.params.id;
    const actor = req.user; 
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (actor.role !== "super_admin" && actor.role !== "site_admin") {
     
      if (actor.sub === user._id.toString()) return res.json(user);
      
      if (actor.organizationId && user.organizationId && actor.organizationId === user.organizationId.toString()) {
        return res.json(user);
      }
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(user);
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


async function createUser(req, res) {
  try {
    const actor = req.user;
    const payload = req.body;
    if (actor.role === "client_admin" || actor.role === "operator") {
      payload.organizationId = actor.organizationId;
    }

    const created = await userService.createUser(payload, actor);
    return res.status(201).json(created);
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}


async function updateUser(req, res) {
  try {
    const actor = req.user;
    const id = req.params.id;
    const payload = req.body;

    const updated = await userService.updateUser(id, payload, actor);
    return res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}

async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    await userService.deleteUser(id);
    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}

export { listUsers, getUser, createUser, updateUser, deleteUser };
