require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./db/connect");

const authRoutes = require("./routes/authRoutes"); 
const userRoutes = require("./routes/userRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const { connectRabbitMQ } = require('./utils/rabbitmq');

const app = express();
app.use(express.json());
app.use(cookieParser());
connectRabbitMQ();
app.use("/api/invitations", invitationRoutes);
app.use("/api/otp", authRoutes);
connectDB(process.env.MONGO_URI).catch(err => {
  console.error("DB failed to connect:", err);
  process.exit(1);
});

app.get("/", (req, res) => res.send("Usermanagement service running"));

app.use("/api",authRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
