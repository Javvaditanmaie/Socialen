import winston from "winston";
import "winston-mongodb";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),

  transports: [
    // 1. Console logs (always visible)
    new winston.transports.Console({
      level: "info",
    }),

    // 2. File logs
    new winston.transports.File({
      filename: "logs/app.log",
      level: "info",  // must be info or lower
    }),

    // 3. Error logs in a separate file (optional)
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  ],
});

export default logger;
