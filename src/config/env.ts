import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    CORS_ORIGIN: string;
    LOG_LEVEL: string;
}

function getEnv(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const env: EnvConfig = {
    NODE_ENV: getEnv("NODE_ENV", "development"),
    PORT: parseInt(getEnv("PORT", "3000"), 10),
    DATABASE_URL: getEnv("DATABASE_URL"),
    REDIS_URL: getEnv("REDIS_URL", "redis://localhost:6379"),
    CORS_ORIGIN: getEnv("CORS_ORIGIN", "*"),
    LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
