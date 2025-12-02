import winston from "winston";
import "winston-mongodb";

const logger = winston.createLogger({
  level: "info", 
  format: winston.format.json(),
  transports: [
    // 1. Console logs
    new winston.transports.Console(),

    // 2. File logs
    new winston.transports.File({ filename: "logs/app.log" }),

    // 3. DB logs
    new winston.transports.MongoDB({
      level: "error",
      db: process.env.MONGO_URI,
      options: { useUnifiedTopology: true },
      collection: "system_logs"
    })
  ]
});

export default logger;
