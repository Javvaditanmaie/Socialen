import http from "http";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import connectDB from "./db/connect.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import {initSocket} from "./socket/socketServer.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import { connectRabbitMQ } from "./utils/rabbitmq.js";
const app = express();
const server=http.createServer(app);
initSocket(server);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.resolve("public"))); 


if (process.env.NODE_ENV !== "test") {
  connectRabbitMQ();
}

// routes
app.use("/api/invitations", invitationRoutes);
app.use("/api/otp", authRoutes);
app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// connect to database
if (process.env.NODE_ENV !== "test") {
  connectDB(process.env.MONGO_URI).catch((err) => {
    console.error("DB failed to connect:", err);
    process.exit(1);
  });
}

app.get("/", (req, res) => res.send("User Management Service Running "));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Server error" });
});
const PORT=process.env.PORT||5000;
server.listen(PORT,()=>console.log(`server running on port${PORT}`))

export default app;
