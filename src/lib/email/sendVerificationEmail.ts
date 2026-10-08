import { getResendClient, RESEND_FROM_EMAIL } from "./client";

interface Args {
  to: string;
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Gaya sama dengan email atur-ulang sandi (inline, palet aplikasi) supaya terlihat satu merek.
function buildHtml({ name, verifyUrl, expiresInHours }: Args): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#CAD4DA;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #C5CED3;border-radius:4px;overflow:hidden;">
    <div style="background:#0F3B59;padding:20px 28px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Portal PSI &amp; MOC</p>
      <p style="margin:2px 0 0;color:#BAE0F5;font-size:11px;">Regional Jatimbalinus</p>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;color:#0F172A;font-size:18px;">Verifikasi Email Anda</h1>
      <p style="margin:0 0 16px;color:#3a3d40;font-size:13.5px;line-height:1.6;">
        Halo ${esc(name)}, terima kasih sudah mendaftar. Klik tombol di bawah untuk memastikan alamat email ini milik Anda.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#0F3B59;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:4px;">Verifikasi Email</a>
      </div>
      <p style="margin:0 0 8px;color:#6b6e72;font-size:12px;line-height:1.6;">
        Tautan berlaku ${expiresInHours} jam dan hanya bisa dipakai sekali. Kalau Anda tidak merasa mendaftar, abaikan email ini.
      </p>
      <p style="margin:16px 0 0;color:#9a9da0;font-size:11px;line-height:1.5;word-break:break-all;">Atau salin tautan ini ke browser Anda:<br/>${verifyUrl}</p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #eceded;">
      <p style="margin:0;color:#9a9da0;font-size:10.5px;">© PT Pertamina (Persero) — Direktorat Logistik &amp; Infrastruktur.</p>
    </div>
  </div>
</div>`.trim();
}

export async function sendVerificationEmail(args: Args): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({ from: RESEND_FROM_EMAIL, to: args.to, subject: "Verifikasi email Portal PSI & MOC", html: buildHtml(args) });
  if (error) throw new Error(error.message);
}
