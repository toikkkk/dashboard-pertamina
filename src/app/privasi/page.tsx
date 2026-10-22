import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Kebijakan Privasi | PSIOneVision" };

export default function PrivasiPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updated="22 Oktober 2026">
      <p>
        PSIOneVision adalah aplikasi internal untuk menyimpan dokumen Process Safety Information (PSI) dan mengelola pengajuan
        Management of Change (MOC) di lingkungan Regional Jatimbalinus. Halaman ini menjelaskan data apa yang kami simpan dan untuk apa.
      </p>

      <Section heading="Data yang kami simpan">
        <p><b>Data akun:</b> nama, alamat email, username, kata sandi (disimpan hanya dalam bentuk hash, tidak dapat dibaca kembali), peran, dan terminal tempat Anda bertugas.</p>
        <p><b>Bila Anda masuk dengan Google:</b> kami menerima nama dan alamat email dari akun Google Anda, dan hanya itu. Foto profil dan data Google lainnya tidak kami simpan. Kami tidak membaca email, kontak, atau berkas Google Anda.</p>
        <p><b>Dokumen dan pengajuan:</b> berkas dan isian yang Anda unggah atau buat di aplikasi, termasuk dokumen PSI, formulir MOC, dan riwayat perubahannya.</p>
        <p><b>Catatan aktivitas:</b> waktu masuk dan keluar, tindakan penting (mis. mengubah, memindahkan, atau menghapus dokumen), serta alamat jaringan (IP) dan jenis peramban, untuk keamanan dan penelusuran.</p>
      </Section>

      <Section heading="Untuk apa data dipakai">
        <p>Data dipakai untuk mengelola akun dan hak akses, menjalankan proses dokumen dan MOC, mengirim email yang berkaitan dengan akun (verifikasi email dan atur ulang kata sandi), serta menjaga keamanan dan mencatat jejak audit. Data tidak dipakai untuk iklan dan tidak dijual.</p>
      </Section>

      <Section heading="Siapa yang dapat melihat">
        <p>Pengguna aktif dapat melihat dokumen terminal lain, tetapi hanya dapat mengubah dokumen terminalnya sendiri. Admin Regional dapat mengelola akun dan melihat catatan aktivitas. Dokumen tidak dibuka untuk umum; berkas hanya dapat diunduh oleh pengguna yang sudah masuk dan berhak.</p>
      </Section>

      <Section heading="Layanan pihak ketiga">
        <p>Aplikasi memakai penyedia layanan untuk penyimpanan berkas dan basis data, pengiriman email, dan login Google. Penyedia tersebut memproses data sebatas yang diperlukan untuk menjalankan layanan itu.</p>
      </Section>

      <Section heading="Penyimpanan dan penghapusan">
        <p>Data disimpan selama akun dan dokumen masih diperlukan untuk kegiatan kerja. Dokumen yang dipindahkan ke Sampah dihapus permanen setelah 30 hari. Untuk meminta perbaikan atau penghapusan data akun, hubungi Admin Regional.</p>
      </Section>

      <Section heading="Keamanan">
        <p>Koneksi memakai HTTPS, sesi login disimpan dengan cookie yang tidak dapat dibaca skrip halaman, dan tersedia autentikasi dua faktor (MFA) di Pengaturan. Tidak ada sistem yang sepenuhnya bebas risiko; jaga kerahasiaan kata sandi Anda dan keluar bila memakai komputer bersama.</p>
      </Section>

      <Section heading="Perubahan kebijakan">
        <p>Kebijakan ini dapat diperbarui. Tanggal pembaruan terakhir tercantum di bagian atas halaman.</p>
      </Section>
    </LegalPage>
  );
}
