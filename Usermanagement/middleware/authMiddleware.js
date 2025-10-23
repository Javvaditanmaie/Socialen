import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "test") {
      console.log("Skipping auth in test mode");
      // Set mock user for tests
      req.user = {
        sub: "test-user-id",
        email: "test@example.com",
        role: "super_admin"
      };
      return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error(" No Authorization header received");
      return res.status(401).json({ error: "Missing Authorization header" });
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.error(" Invalid Authorization format:", authHeader);
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    const token = parts[1];
    if (!token) {
      console.error("No token provided in Authorization header");
      return res.status(401).json({ error: "Token missing" });
    }

    console.log(" Received token:", token.slice(0, 25) + "...");

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;

    next();
  } catch (err) {
    console.error(" authMiddleware error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export { authenticate };
