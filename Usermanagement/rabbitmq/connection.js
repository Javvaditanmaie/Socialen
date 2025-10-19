const amqp = require("amqplib");
const url = process.env.RABBITMQ_URL;

let connection = null;
let channel = null;

async function getConnection() {
  if (connection) return connection;
  connection = await amqp.connect(url);
  connection.on("error", err => {
    console.error("RabbitMQ connection error:", err);
    connection = null;
  });
  connection.on("close", () => {
    console.warn("RabbitMQ connection closed");
    connection = null;
  });
  return connection;
}

async function getChannel() {
  if (channel) return channel;
  const conn = await getConnection();
  channel = await conn.createChannel();
  await channel.assertExchange(process.env.RABBITMQ_EXCHANGE || "events", "topic", { durable: true });
  return channel;
}

module.exports = { getConnection, getChannel };
