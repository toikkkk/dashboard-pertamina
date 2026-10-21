import { getResendClient, RESEND_FROM_EMAIL } from "./client";

interface SendPasswordResetEmailArgs {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

// Plain inline-styled HTML (no external stylesheet — email clients strip <style>
// blocks unpredictably) matching the app's established palette from CLAUDE.md:
// brand blue #0F3B59, navy ink #0F172A, sharp 2-4px radii, Public Sans-adjacent
// system font stack since custom fonts aren't reliably supported in email clients.
function buildHtml({ name, resetUrl, expiresInMinutes }: SendPasswordResetEmailArgs): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#CAD4DA;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #C5CED3;border-radius:4px;overflow:hidden;">
    <div style="background:#0F3B59;padding:20px 28px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">PSIOneVision</p>
      <p style="margin:2px 0 0;color:#BAE0F5;font-size:11px;">Regional Jatimbalinus</p>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;color:#0F172A;font-size:18px;">Atur Ulang Kata Sandi</h1>
      <p style="margin:0 0 16px;color:#3a3d40;font-size:13.5px;line-height:1.6;">
        Halo ${name}, kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Klik tombol di bawah untuk membuat kata sandi baru.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#0F3B59;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:2px;">
          Atur Ulang Kata Sandi
        </a>
      </div>
      <p style="margin:0 0 8px;color:#6b6e72;font-size:12px;line-height:1.6;">
        Tautan ini berlaku selama ${expiresInMinutes} menit dan hanya bisa digunakan sekali. Kalau Anda tidak meminta ini, abaikan saja email ini — kata sandi Anda tidak akan berubah.
      </p>
      <p style="margin:16px 0 0;color:#9a9da0;font-size:11px;line-height:1.5;word-break:break-all;">
        Atau salin tautan ini ke browser Anda:<br/>${resetUrl}
      </p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #eceded;">
      <p style="margin:0;color:#9a9da0;font-size:10.5px;">© 2026 PT Pertamina Patra Niaga - Direktorat Optimasi Hilir &amp; Distribusi</p>
    </div>
  </div>
</div>`.trim();
}

export async function sendPasswordResetEmail(args: SendPasswordResetEmailArgs): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: args.to,
    subject: "Atur ulang kata sandi PSIOneVision",
    html: buildHtml(args),
  });
}
