const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthenticated" });
    if (user.role === "super_admin") return next();
    if (allowedRoles.length === 0) return next();
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    if (req.params.orgId && user.organizationId?.toString() !== req.params.orgId) {
      return res.status(403).json({ error: "Forbidden: organization mismatch" });
    }

    return next();
  };
};

module.exports = roleMiddleware;
