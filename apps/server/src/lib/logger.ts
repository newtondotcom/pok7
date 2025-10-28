import winston from 'winston';


const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "pok7-server" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: process.env.NODE_ENV === "dev"
      ? "debug" : "error"
    }),
    ...(process.env.NODE_ENV !== "dev"
      ? [new winston.transports.File({ filename: "logs/error.log", level: "error" })]
      : []),
  ],
});

export default logger; 