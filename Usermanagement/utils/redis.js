import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => 500, // retry every 500ms
  }
});

redis.on("connect", () => console.log("REDIS CONNECTED"));
redis.on("ready", () => console.log("REDIS READY"));
redis.on("reconnecting", () => console.log("REDIS RECONNECTING..."));
redis.on("end", () => console.log("REDIS CONNECTION CLOSED"));
redis.on("error", (err) => console.log("REDIS ERROR:", err));

await redis.connect();

export default redis;
