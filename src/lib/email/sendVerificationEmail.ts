import { getResendClient, RESEND_FROM_EMAIL } from "./client";

interface Args {
  to: string;
  name: string;
  verifyUrl: string;
  expiresInHours: number;
  /** "change" = konfirmasi email baru (bukan pendaftaran). */
  purpose?: "signup" | "change";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Gaya sama dengan email atur-ulang sandi (inline, palet aplikasi) supaya terlihat satu merek.
function buildHtml({ name, verifyUrl, expiresInHours, purpose }: Args): string {
  const change = purpose === "change";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#CAD4DA;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #C5CED3;border-radius:4px;overflow:hidden;">
    <div style="background:#0F3B59;padding:20px 28px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">PSIOneVision</p>
      <p style="margin:2px 0 0;color:#BAE0F5;font-size:11px;">Regional Jatimbalinus</p>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;color:#0F172A;font-size:18px;">${change ? "Konfirmasi Email Baru Anda" : "Verifikasi Email Anda"}</h1>
      <p style="margin:0 0 16px;color:#3a3d40;font-size:13.5px;line-height:1.6;">
        Halo ${esc(name)}, ${change ? "Anda meminta menjadikan alamat email ini sebagai email akun. Klik tombol di bawah untuk mengonfirmasi; email akun baru berganti setelah tautan dibuka." : "terima kasih sudah mendaftar. Klik tombol di bawah untuk memastikan alamat email ini milik Anda."}
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#0F3B59;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:4px;">${change ? "Konfirmasi Email" : "Verifikasi Email"}</a>
      </div>
      <p style="margin:0 0 8px;color:#6b6e72;font-size:12px;line-height:1.6;">
        Tautan berlaku ${expiresInHours} jam dan hanya bisa dipakai sekali. Kalau Anda tidak merasa ${change ? "memintanya" : "mendaftar"}, abaikan email ini.
      </p>
      <p style="margin:16px 0 0;color:#9a9da0;font-size:11px;line-height:1.5;word-break:break-all;">Atau salin tautan ini ke browser Anda:<br/>${verifyUrl}</p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #eceded;">
      <p style="margin:0;color:#9a9da0;font-size:10.5px;">© 2026 PT Pertamina Patra Niaga - Direktorat Optimasi Hilir &amp; Distribusi</p>
    </div>
  </div>
</div>`.trim();
}

export async function sendVerificationEmail(args: Args): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({ from: RESEND_FROM_EMAIL, to: args.to, subject: args.purpose === "change" ? "Konfirmasi email baru PSIOneVision" : "Verifikasi email PSIOneVision", html: buildHtml(args) });
  if (error) throw new Error(error.message);
}

// Pemberitahuan ke email LAMA saat ada permintaan ganti email (peringatan dini bila bukan pemilik akun).
export async function sendEmailChangeNotice(args: { to: string; name: string; newEmailMasked: string }): Promise<void> {
  const resend = getResendClient();
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#CAD4DA;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #C5CED3;border-radius:4px;overflow:hidden;">
    <div style="background:#0F3B59;padding:20px 28px;"><p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">PSIOneVision</p></div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;color:#0F172A;font-size:18px;">Permintaan Ganti Email Akun</h1>
      <p style="margin:0 0 12px;color:#3a3d40;font-size:13.5px;line-height:1.6;">Halo ${esc(args.name)}, ada permintaan mengganti email akun Anda menjadi <b>${esc(args.newEmailMasked)}</b>. Email akun baru berganti setelah tautan konfirmasi di alamat baru itu dibuka.</p>
      <p style="margin:0;color:#6b6e72;font-size:12px;line-height:1.6;">Kalau ini bukan Anda, segera hubungi Admin Regional dan ganti kata sandi Anda.</p>
    </div>
  </div>
</div>`.trim();
  const { error } = await resend.emails.send({ from: RESEND_FROM_EMAIL, to: args.to, subject: "Permintaan ganti email akun PSIOneVision", html });
  if (error) throw new Error(error.message);
}
