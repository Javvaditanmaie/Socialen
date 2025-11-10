import { getChannel } from "./connection.js";

export async function publishEvent(routingKey, message) {
  try {
    const channel = await getChannel();
    const exchange = process.env.RABBITMQ_EXCHANGE || "events";

    const payload = Buffer.from(JSON.stringify(message));
    const ok = channel.publish(exchange, routingKey, payload, { persistent: true });

    if (!ok) {
      console.warn(" [Publisher] publishEvent returned false (buffer full)");
    }

    console.log("[Publisher] Event sent:", { routingKey, message });
    return true;
  } catch (err) {
    console.error(" [Publisher] Failed to publish event:", err.message);
    return false;
  }
}

// for sending messages to queue
//publishes events using that connection