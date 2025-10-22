import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./db/connect.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import { connectRabbitMQ } from './utils/rabbitmq.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  connectRabbitMQ();
}

app.use("/api/invitations", invitationRoutes);
app.use("/api/otp", authRoutes);
app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

if (process.env.NODE_ENV !== "test") {
  connectDB(process.env.MONGO_URI).catch(err => {
    console.error("DB failed to connect:", err);
    process.exit(1);
  });
}

app.get("/", (req, res) => res.send("Usermanagement service running"));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Server error" });
});

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
