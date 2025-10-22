import { getChannel } from "./connection.js";

export async function publishEvent(routingKey, message) {
  const channel = await getChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE || "events";
  const payload = Buffer.from(JSON.stringify(message));
  const ok = channel.publish(exchange, routingKey, payload, { persistent: true });
  if (!ok) {
    console.warn("publishEvent returned false (write buffer full)");
  }
  return true;
}
