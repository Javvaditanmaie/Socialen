const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect('amqp://localhost'); // or your RabbitMQ URL
    channel = await connection.createChannel();
    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("RabbitMQ connection failed:", error);
  }
}

function getChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
