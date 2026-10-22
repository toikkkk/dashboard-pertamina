import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Ketentuan Layanan | PSIOneVision" };

export default function KetentuanPage() {
  return (
    <LegalPage title="Ketentuan Layanan" updated="22 Oktober 2026">
      <p>
        Dengan memakai PSIOneVision, Anda menyetujui ketentuan berikut. Aplikasi ini disediakan untuk keperluan kerja di lingkungan
        Regional Jatimbalinus dan bukan untuk umum.
      </p>

      <Section heading="Akun dan akses">
        <p>Akun diaktifkan dan diberi peran serta terminal oleh Admin Regional. Anda bertanggung jawab atas kerahasiaan kata sandi dan atas semua tindakan yang dilakukan dengan akun Anda. Jangan membagikan akun kepada orang lain.</p>
      </Section>

      <Section heading="Penggunaan yang wajar">
        <p>Gunakan aplikasi hanya untuk kegiatan yang berkaitan dengan dokumen PSI dan pengajuan MOC. Jangan mengunggah berkas yang berbahaya, melanggar hukum, atau bukan bagian dari pekerjaan, dan jangan mencoba mengakses data atau akun yang bukan hak Anda.</p>
      </Section>

      <Section heading="Dokumen dan data">
        <p>Isi dokumen dan formulir menjadi tanggung jawab pengunggah. Setiap perubahan tercatat di Riwayat Proses dan Log Aktivitas. Dokumen yang dihapus tersimpan di Sampah selama 30 hari sebelum dihapus permanen.</p>
      </Section>

      <Section heading="Tanda tangan dan persetujuan">
        <p>Aplikasi tidak menampung tanda tangan. Formulir yang memerlukan tanda tangan dicetak, ditandatangani di luar aplikasi, lalu berkas bertanda tangan diunggah sebagai bukti.</p>
      </Section>

      <Section heading="Ketersediaan layanan">
        <p>Kami berupaya menjaga aplikasi tetap tersedia, tetapi tidak menjamin layanan bebas gangguan. Layanan dapat diubah atau dihentikan sementara untuk pemeliharaan.</p>
      </Section>

      <Section heading="Penangguhan akun">
        <p>Admin Regional dapat menangguhkan atau menghapus akun yang melanggar ketentuan ini atau yang sudah tidak diperlukan.</p>
      </Section>

      <Section heading="Privasi dan perubahan">
        <p>Penanganan data pribadi dijelaskan di Kebijakan Privasi. Ketentuan ini dapat diperbarui; tanggal pembaruan terakhir tercantum di bagian atas halaman.</p>
      </Section>
    </LegalPage>
  );
}
