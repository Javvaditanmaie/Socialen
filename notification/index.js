// notification/index.js
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { connect } from "./rabbitmq/connection.js";
import { startConsumer } from "./rabbitmq/consumer.js";
import { initSocket, getIO } from "./socket/socketServer.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(express.json());

app.post("/test-notif", (req, res) => {
  try {
    const io = getIO();
    const payload = req.body || { message: "Test notification", email: "test@example.com" };

    io.emit("notification", payload);
    console.log(" Test notification emitted:", payload);

    res.json({ ok: true, payload });
  } catch (err) {
    console.error(" Error in test-notif route:", err);
    res.status(500).json({ error: "Failed to emit test notification" });
  }
});

const startServer = async () => {
  try {
    await connect(); // RabbitMQ connection
    await startConsumer(); // Start consumers

    const PORT = process.env.NOTIFICATION_PORT || 6001;
    server.listen(PORT, () => {
      console.log(` Notifications service running on port ${PORT}`);
    });
  } catch (err) {
    console.error(" Failed to start Notifications service:", err);
  }
};

startServer();
