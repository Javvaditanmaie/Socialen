const amqp = require("amqplib");
const url = process.env.RABBITMQ_URL;

let connection;
let channel;

async function connect() {
  if (connection) return { connection, channel };
  connection = await amqp.connect(url);
  connection.on("error", err => console.error("RabbitMQ conn error:", err));
  connection.on("close", () => {
    console.warn("RabbitMQ connection closed");
    connection = null;
    channel = null;
    setTimeout(() => connect().catch(console.error), 3000);
  });
  channel = await connection.createChannel();
  await channel.assertExchange(process.env.RABBITMQ_EXCHANGE || "events", "topic", { durable: true });
  return { connection, channel };
}

module.exports = { connect };
