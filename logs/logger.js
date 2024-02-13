const winston = require("winston");

module.exports = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.printf((info) => {
      let { timestamp, level, message, ...args } = info;

      // If message is an object, convert it to pretty JSON
      if (typeof message === "object") {
        message = JSON.stringify(message, null, 2);
      }

      return `${timestamp} [${level}]: ${message} ${
        Object.keys(args).length ? JSON.stringify(args, null, 2) : ""
      }`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/admission.log" }),
  ],
});
