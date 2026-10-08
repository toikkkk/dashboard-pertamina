// Batas domain email untuk pembuatan akun BARU lewat login Google (akun yang sudah ada tidak terpengaruh).
// SIGNUP_ALLOWED_EMAIL_DOMAINS = daftar domain dipisah koma, mis. "pertamina.com,pertaminapatraniaga.com".
// Kosong = tidak dibatasi. Akun baru tetap "menunggu aktivasi" Admin Regional, jadi ini lapisan tambahan.
export function emailDomainAllowed(email: string): boolean {
  const list = (process.env.SIGNUP_ALLOWED_EMAIL_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return list.includes(domain);
}
