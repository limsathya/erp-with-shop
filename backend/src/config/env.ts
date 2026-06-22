import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  PUBLIC_URL: z.string().default("http://localhost:4000"),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().default(5),

  KHQR_BAKONG_ID: z.string().default("your_name@aclb"),
  KHQR_MERCHANT_NAME: z.string().default("My ERP Store"),
  KHQR_MERCHANT_CITY: z.string().default("PHNOM PENH"),
  KHQR_MCC: z.string().default("5999"),
  BAKONG_API_URL: z.string().default("https://api-bakong.nbc.gov.kh"),
  BAKONG_API_TOKEN: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
