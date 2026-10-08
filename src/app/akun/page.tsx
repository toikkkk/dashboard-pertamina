import { redirect } from "next/navigation";

// Alamat lama: Keamanan Akun sekarang menjadi tab di Pengaturan.
export default function AkunRedirect() {
  redirect("/pengaturan?tab=keamanan");
}
