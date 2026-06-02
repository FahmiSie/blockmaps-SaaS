// src/lib/mailer.ts
import { env } from "@/env";
import nodemailer from "nodemailer";

export const APP_NAME = "Indonesian Platform";
export const defaultSender = `"${APP_NAME}" <${env.SMTP_USER}>`;

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// Verifikasi koneksi saat server start (opsional, bagus untuk debugging)
transporter.verify((err) => {
  if (err) {
    console.error("[mailer] SMTP connection failed:", err.message);
  } else {
    console.log("[mailer] SMTP ready via", env.SMTP_HOST);
  }
});