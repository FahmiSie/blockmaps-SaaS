import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_NAME = "Blockmaps";

export async function sendInvitationEmail(
  email: string,
  role: string,
  invitedBy: string,
) {
  const url = `${process.env.BASE_URL}/register`;

  await resend.emails.send({
    from: "Blockmaps <noreply@noreply.moklet.org>",
    to: email,
    subject: `Kamu diundang ke ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Kamu diundang!</h2>
        <p><strong>${invitedBy}</strong> mengundang kamu untuk bergabung ke ${APP_NAME} sebagai <strong>${role}</strong>.</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#f59e0b;color:white;border-radius:8px;text-decoration:none;font-weight:600">
          Buat Akun
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">
          Jika kamu tidak merasa diundang, abaikan email ini.
        </p>
      </div>
    `,
  });
}