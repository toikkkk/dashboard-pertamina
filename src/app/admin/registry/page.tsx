import { redirect } from "next/navigation";

// Alamat lama: Arsip Registry sekarang ada untuk semua terminal di /registry (Admin Regional: semua + saring terminal).
export default function AdminRegistryRedirect() {
  redirect("/registry");
}
