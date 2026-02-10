import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    if (stack) {
        return `${ts} [${level}]: ${message}\n${stack}${metaStr}`;
    }
    return `${ts} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
    ),
    defaultMeta: { service: "atomic-payment-gateway" },
    transports: [
        // Console — colorized in development, JSON in production
        new winston.transports.Console({
            format:
                env.NODE_ENV === "production"
                    ? combine(winston.format.json())
                    : combine(colorize(), logFormat),
        }),
        // File — always JSON for machine parsing
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            format: combine(winston.format.json()),
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            format: combine(winston.format.json()),
        }),
    ],
});
