import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_NAME = "Blockmaps";

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  const url = `${process.env.BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: "Blockmaps <noreply@moklet.org>",
    to: email,
    subject: `Verifikasi Email Kamu — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Halo, ${name}!</h2>
        <p>Terima kasih sudah mendaftar. Klik tombol di bawah untuk verifikasi email kamu (berlaku 24 jam).</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:white;border-radius:8px;text-decoration:none;font-weight:600">
          Verifikasi Email
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">
          Jika kamu tidak merasa mendaftar, abaikan email ini.
        </p>
      </div>
    `,
  });
}