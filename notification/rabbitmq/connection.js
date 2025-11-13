import amqp from "amqplib";

const url = process.env.RABBITMQ_URL;

let connection;
let channel;

export async function connect() {
  if (connection) return { connection, channel };

  connection = await amqp.connect(url);

  connection.on("error", (err) => {
    console.error(" [RabbitMQ] Connection error:", err);
  });

  connection.on("close", () => {
    console.warn("[RabbitMQ] Connection closed — retrying...");
    connection = null;
    channel = null;

    setTimeout(() => connect().catch(console.error), 3000);
  });

  channel = await connection.createChannel();
  await channel.assertExchange(process.env.RABBITMQ_EXCHANGE || "events", "topic", {
    durable: true,
  });

  console.log("[Notifications] RabbitMQ connection established");
  return { connection, channel };
}
