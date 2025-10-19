
require("dotenv").config();
const { startConsumer } = require("./rabbitmq/consumer");

(async () => {
  try {
    await startConsumer();
    console.log("Notification service started");
  } catch (err) {
    console.error("Failed to start notification service:", err);
    process.exit(1);
  }
})();
