import amqp from "amqplib";

const url = process.env.RABBITMQ_URL;

let connection = null;
let channel = null;
//connect to rabbitmq onces and reuses it
export async function getConnection() {
  if (connection) return connection;
  connection = await amqp.connect(url);
  connection.on("error", (err) => {
    console.error("RabbitMQ connection error:", err.message);
    connection = null;
  });
  connection.on("close", () => {
    console.warn("RabbitMQ connection closed");
    connection = null;
  });
  return connection;
}
// creates or reuses a channel from the connection
export async function getChannel() {
  if (channel) return channel;
  const conn = await getConnection();
  channel = await conn.createChannel();
  //exchange exists before using it
  await channel.assertExchange(
    process.env.RABBITMQ_EXCHANGE || "events",
    "topic",
    { durable: true }
  );
  return channel;
}
//handles connecting and managing rabbitmq