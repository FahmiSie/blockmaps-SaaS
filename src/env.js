import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** @type {Readonly<{
 *   AUTH_SECRET: string | undefined;
 *   DATABASE_URL: string;
 *   NODE_ENV: "development" | "test" | "production";
 *   GOOGLE_CLIENT_ID: string;
 *   GOOGLE_CLIENT_SECRET: string;
 *   BASE_URL: string;
 *   NEXTAUTH_URL: string;
 *   SMTP_HOST: string | undefined;
 *   SMTP_PORT: string | undefined;
 *   SMTP_USER: string | undefined;
 *   SMTP_PASS: string | undefined;
 * }>} */
export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    BASE_URL: z.string(),
    NEXTAUTH_URL: z.string(),
    MIDTRANS_SERVER_KEY: z.string(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    BASE_URL: process.env.BASE_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});