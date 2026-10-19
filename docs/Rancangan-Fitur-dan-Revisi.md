# Rancangan Fitur Tambahan & Revisi — Portal PSI & MOC Regional Jatimbalinus

Diperbarui: 13 Oktober 2026 · Status: **seluruh isi dokumen ini belum dikerjakan** kecuali disebut lain. Sumber: jawaban dan catatan client (chat), TKO B13.3-07 (MOC), Excel Form MoC 2025, Excel List KBO, serta backlog internal.

Legenda status: **[Pasti]** sudah jelas dan siap dikerjakan · **[Tunggu client]** menunggu jawaban · **[Usulan]** usulan kami, belum disetujui.

---

## 1. Revisi formulir MOC (catatan client)

| # | Revisi | Status | Catatan |
|---|---|---|---|
| 1.1 | Kolom **Anggaran** bisa diisi manual (selain pilihan) | [Pasti] | Tambah opsi "Lainnya" dengan isian bebas |
| 1.2 | Sifat **Permanen**: tanggal akhir tidak otomatis "selamanya" | [Pasti] | TKO: perubahan tetap tidak dibatasi waktu implementasi → kolom tanggal akhir kosong/opsional |
| 1.3 | Di langkah pemilihan Reviewer ada **toggle info** berisi Tabel 3 Kewenangan Validasi | [Pasti] | Dibuat ulang sebagai tabel teks (gambar kiriman client membawa watermark cetak atas nama seseorang, jangan dipasang) |
| 1.4 | **Reviewer dan Approver bisa diketik manual** (nama, jabatan, fungsi) bila tidak ada di daftar | [Tunggu client] | Orang manual tidak punya akun. Usulan: ditandai "tanpa akun"; review/keputusannya dicatat Initiator/Controller dengan unggahan lembar bertanda tangan |
| 1.5 | Nama Reviewer/Approver **bisa diedit** setelah diisi | [Tunggu client] | Usulan: bebas saat draf/dikembalikan; setelah masuk review hanya Controller |
| 1.6 | Semua isian **nama dan jabatan** punya pilihan daftar **dan** isian manual | [Tunggu client] | Kalimat client "selain yang opsi" agak ambigu, perlu dikonfirmasi |
| 1.7 | Jabatan **Vacant** di List KBO tetap dianggap jabatan; nama diisi manual | [Pasti] | Kode KBO tetap dipakai untuk nomor MOC |

## 2. Nomor MOC

Format: **`AAA/MOC/PPNXXXXXXX/BB/TAHUN`**

- **AAA**: nomor urut 001–999, **reset per KBO per tahun** mulai 001. [Pasti]
- **PPNXXXXXXX**: kode KBO unit penerbit, dari Excel List KBO. Contoh FT Malang `PPNLL0207` → `001/MOC/PPNLL0207/X/2026`. [Pasti]
- **BB**: bulan Romawi, diambil dari **bulan pengajuan oleh Initiator**. [Pasti]
- Larantuka memakai KBO FT Maumere. Semua area IT Surabaya (yang dipecah di sistem) memakai satu KBO IT Surabaya. Lokasi lain mengikuti List KBO. [Pasti]
- Fungsi regional memakai KBO jabatannya sendiri (mis. HSSE Regional, Distribution Reliability & Engineering), jadi KBO bergantung pada **fungsi Initiator**. [Tunggu client: fungsi regional mana yang boleh mengajukan dan KBO tiap fungsi]
- **Kapan nomor urut dialokasikan** (saat pengajuan atau saat registrasi Controller)? Bulan harus disimpan saat pengajuan, sedangkan nomor kini diberikan Controller saat registrasi. Usulan kami: nomor diberikan saat registrasi dengan bulan dari tanggal pengajuan, agar MOC yang ditolak/dibatalkan tidak menghabiskan nomor. [Tunggu client]
- Menggantikan usulan lama `MOC-REG-tahun-urut`.

## 3. Tingkat risiko

Risiko = severity (1–5) × likelihood (1–5). Warna mengikuti nilai perkalian:

| Nilai | Warna | Tingkat |
|---|---|---|
| 1–3 | Hijau tua | Sangat rendah |
| 4 | Hijau muda | Rendah |
| 5–9 | Kuning | Sedang |
| 10–12 | Oranye | Tinggi |
| 15–25 | Merah | Sangat tinggi |

- User memilih severity dan likelihood, sistem menghitung nilai dan tingkatnya. [Pasti]
- **Pemetaan ke 3 tingkat** (Formulir Lampiran 5 dan SLA review TKO memakai L/M/H; SLA 5/10/15 hari kerja). Usulan: hijau tua+muda = Low, kuning = Medium, oranye+merah = High. [Tunggu client]

## 4. Tahap MOC setelah Validasi

### 4.1 Komunikasi
- Kolom **tanggal pelaksanaan komunikasi** dan **unggah evidence oleh Initiator**. [Pasti]
- **Performer tidak punya akun** dan tidak ada persetujuan Performer di tahap ini. Nama Performer diinput manual; tahap berikutnya **terkunci sampai Initiator mengunggah evidence**. [Pasti]
- Sebelumnya client menyebut validasi oleh Initiator dan Performer; jawaban terbaru (Performer tanpa akun) menggantikannya.

### 4.2 Pemantauan  *(dibangun, Tahap 3, 18 Okt 2026)*
- Semua MOC (permanen/sementara) minimal **1× per 3 bulan**; hasilnya perpanjangan atau penutupan. [Pasti, sesuai TKO]
- Perpanjangan **maksimal 2 × 6 bulan**, lebih dari itu risiko harus direview ulang (ada notice). Catatan: TKO menyebut perpanjangan hanya untuk **perubahan sementara** dan "tidak diperbolehkan kecuali keadaan luar biasa", sedangkan client menyebut semua MOC. [Tunggu client]
- Penutupan pemantauan → lanjut Tinjauan Akhir.
- Bentuk formulir mengikuti Excel Form Pemantauan (Lampiran 6): Pemantauan Ke-N, tanggal, tabel kegiatan (Kegiatan, Keterangan, Tahapan, PIC, Target Date, Status), tabel aksi tindak lanjut.

### 4.3 Tinjauan Akhir  *(dibangun, Tahap 3)*
- Batas waktu: **Permanen** ≤ 3 bulan setelah terimplementasi; **Sementara** ≤ 1 bulan setelah dikembalikan (notice harian); **Darurat** ≤ 1 bulan setelah dikembalikan, atau ≤ 3 bulan bila ditetapkan permanen. [Pasti]
- Notice untuk Permanen: H-2 bulan dan H-1 bulan (boleh hitungan hari). [Pasti]
- Formulir mengikuti Excel Form Tinjauan Akhir & Penutupan (Lampiran 7): empat pertanyaan ya/tidak ditambah tabel aksi tindak lanjut.

### 4.4 Penutupan  *(dibangun, Tahap 3)*
- Wewenang penutupan ada pada MoC Approver (Controller mencatat atas nama bila Approver tanpa akun); syaratnya Tinjauan Akhir sudah dicatat. Lembar cetak Lampiran 6 dan 7 belum dibuat. Tahap D–H lainnya tetap berupa penanda kemajuan sementara sampai alurnya ditetapkan. [Tunggu client]

## 5. Pengingat otomatis (email/notifikasi)

- **PSI:** pengingat sesuai tenggat tiap jenis dokumen. [Pasti]
- **MOC:** pengingat untuk dua tahap, Pemantauan dan Tinjauan Akhir, sesuai aturan 4.2 dan 4.3. [Pasti]
- Perlu layanan pengirim email dan penjadwal harian (cron). Domain pengirim email harus diverifikasi lebih dulu. [Usulan: sekaligus dengan laporan bulanan regional]

## 6. Hubungan MOC ↔ PSI  *(sebagian dibangun, Tahap 4, 18 Okt 2026: PSI terdampak per MOC, status diperbarui, kartu Terkait MOC; belum: menahan penutupan, acknowledge notice, jadikan dokumen PSI dari lampiran, deteksi unggahan ganda)*

- PSI terdampak **dipilih user sendiri** (tidak otomatis). Input awal MOC bisa **ambil dari Direktori atau unggah baru**. [Pasti]
- Saat MOC selesai, PSI terdampak **ditandai untuk diperbarui**. Bila dokumen belum teridentifikasi di database, diberi notice di akhir; progres MOC belum selesai sampai PSI terdampak diunggah. [Pasti]
- Di detail PSI tercatat riwayat otomatis **"Diperbarui karena MOC [nomor]"** beserta tautan ke MOC-nya. [Pasti]
- **Dua MOC bersamaan di lokasi yang sama** memakai PSI yang sama: saat MOC A selesai dan PSI menjadi A1, MOC B yang masih berjalan otomatis berpindah ke A1, mendapat notice, lalu hasil akhir MOC B (A2) dibangun di atas versi terbaru. [Pasti; rincian di bawah]
  - PSI terdampak disimpan sebagai **tautan ke dokumen Direktori**, bukan salinan.
  - Notice wajib diakui (acknowledge) Initiator MOC B, dan riwayatnya mencatat "berubah dari A ke A1". [Tunggu client]
  - Peringatan saat unggah pembaruan PSI bila dokumen dasar sudah punya versi lebih baru. [Tunggu client]
- **Deteksi unggahan ganda** (dokumen sebenarnya sudah di Direktori tapi diunggah lagi di MOC, nama beda): berkas identik terdeteksi lewat checksum isi; berkas yang diedit atau dipindai ulang hanya bisa diberi saran berdasarkan kemiripan nama. Sifatnya pengingat, bukan jaminan. [Pasti]
- Tombol **"Jadikan dokumen PSI"** dari lampiran MOC (tanpa unggah ulang, pilih sub-dokumen tujuan). [Tunggu client]
- List dokumen terkait MOC cukup dilihat di **detail tiap MOC**; tampilan "Dokumen MOC" terpisah **tidak perlu**. [Pasti, jawaban client]

## 7. Register MOC dan dashboard MOC

- **Ekspor Register** ke Excel dengan 11 kolom persis Lampiran 8 (No., No MOC, Lokasi, Region/AP, Type Anggaran, Sifat Perubahan, Judul, Alasan, Deskripsi, Tgl. Disetujui, Status), mengikuti filter lokasi dan status. Acuan: lembar "Form Register MOC" pada Excel Form MoC 2025. [Usulan]
- Empat kolom yang datanya ada tetapi belum tampil di tabel layar: Region/AP, Type Anggaran, Alasan, Deskripsi. [Usulan]
- **Ringkasan di atas Register MOC** (sketsa client, tiga kotak): total MOC, jumlah per tahap (Inisiasi & Validasi, Implementasi, Pemantauan, Tinjauan Akhir, Closed), dan lokasi yang mendekati jatuh tempo (perlu perpanjang pemantauan / PSI belum diperbarui sebelum closing). Dua kotak pertama memakai data yang sudah ada; kotak jatuh tempo menunggu fitur 4.2, 4.3, dan 6. [Pasti, bertahap]
- **Drill-down:** setiap angka/batang bisa diklik dan membuka daftar `/moc` yang sudah terfilter, dengan jumlah baris sama dengan angka yang diklik. Filter status/lokasi/perlu-tindakan dipindah ke alamat URL. [Pasti]

## 8. Akun sungguhan

Rencana (user): akun dibuat oleh kami, **174 akun**.

| Peran | Jumlah |
|---|---|
| Initiator, untuk semua KBO | 47 |
| Controller, hanya HSSE (1 Region + 25 lokasi) | 26 |
| Reviewer Region (DRE, HSSE, IT; IT hanya bila ruang lingkup no. 13) | 3 |
| Reviewer Lokasi (25 DRE + 25 HSSE) | 50 |
| Approver, untuk semua KBO | 47 |
| Admin Regional | 1 |
| **Total** | **174** |

- **Performer tidak punya akun** (lihat 4.1).
- Kata sandi seragam; username singkat dari nama depan/tengah. [Pasti]
- Terbuka: [Tunggu keputusan]
  - Username Initiator dan Approver untuk orang yang sama (usulan: akhiran peran, mis. `.ini` / `.apv`; Vacant memakai kode KBO).
  - Username Reviewer/Controller yang tidak punya nama di List KBO (usulan: fungsi + lokasi, mis. `hsse.malang`).
  - Email unik: Initiator memakai email Pertamina dari List KBO, peran lain memakai email penanda.
  - **Wajib ganti kata sandi saat login pertama** (disarankan; belum ada di aplikasi), karena kata sandi seragam mudah ditebak.
  - **Hapus akun demo** (14 lama + 182 baru) lebih dulu supaya tidak tercampur.
- Langkah awal: simulasi (dry-run) tanpa menulis database, daftar username dan peran ditinjau dulu.
- Fitur **impor akun massal** belum ada; perlu dibuat bila dipilih. Pastikan apakah termasuk RAB.
- Jalur alternatif yang kami sarankan semula: pegawai mendaftar sendiri dan Admin Regional menetapkan peran di Kelola User (sudah ada).

## 9. Fitur tambahan lain (backlog)

Dari daftar "Fitur Tambahan yang Diperlukan" (usulan, belum dikerjakan):
1. Pengingat otomatis email/WhatsApp (lihat bagian 5).
2. MOC terhubung ke PSI terdampak (lihat bagian 6).
3. Impor massal arsip → dokumen PSI (menunggu daftar jenis dokumen PSI dari client).
4. Formulir Pemantauan dan Tinjauan Akhir di web (lihat 4.2 dan 4.3).
5. Laporan bulanan otomatis untuk regional (PDF/Excel).
6. Alur perpanjangan MOC sementara (lihat 4.2).
7. QR per dokumen/peralatan.
8. Paket audit per terminal (zip dokumen + riwayat) untuk audit seperti PSAIMS.
9. Catatan/diskusi per bagian di MOC.
10. Log aktivitas admin (sebagian sudah ada).
11. Peringkat/peta panas kepatuhan antar terminal.

## 10. Keamanan dan teknis yang masih terbuka

1. Akun demo dan data uji masih berada di database produksi yang sama; pisahkan lingkungan uji dan produksi.
2. **Repo GitHub:** riwayat git memuat 11 berkas asli client (`public/sample-docs/`, ±61 MB) dan kata sandi demo. Jangan publikkan repo sebelum riwayat dibersihkan; bila sudah terlanjur publik, kembalikan ke private.
3. **Alur kerja kolaborasi di Vercel Hobby:** deploy dari commit milik penulis lain diblokir. Alur yang dipakai: teman bekerja di branch sendiri; pemilik repo menggabungkan lewat `git merge --squash` atas nama sendiri (dengan `Co-authored-by`), lalu push ke `master`. Jangan memakai tombol Merge di GitHub. Terapkan migrasi database baru (mis. `0013`) ke Neon **sebelum** push ke `master`.
4. MFA wajib untuk siapa, domain pengirim email, kunci enkripsi MFA di server produksi.
5. Backup otomatis (penyedia bucket cadangan dan lama simpan berkas terhapus), pemindai malware, pemantauan galat, CORS R2 untuk unggahan berkas besar, pengujian penetrasi.
6. Tampilan belum seragam di beberapa halaman, kode mati/dokumentasi usang, tes otomatis belum ada.

Rincian lengkap bagian ini ada pada `Keamanan-dan-Kebutuhan-Tambahan.md`.

## 11. Pertanyaan yang masih menunggu client (urut urgensi)

1. **Reviewer/Approver manual** (1.4–1.6): pencatatan orang tanpa akun, batas edit, dan makna "selain yang opsi".
2. **Kapan nomor urut dialokasikan** (bagian 2).
3. **Pemetaan 5 warna risiko ke 3 tingkat** (bagian 3).
4. **Pembuatan akun** (bagian 8): jalur dan keputusan username/email/kata sandi.
5. **Perpanjangan**: TKO hanya mengizinkan untuk perubahan sementara (4.2).
6. **Fungsi regional** yang boleh mengajukan MOC dan KBO-nya (bagian 2).
7. **Notice wajib diakui** pada MOC bersamaan dan tombol "Jadikan dokumen PSI" (bagian 6).

Pertanyaan untuk tim sendiri: apakah semua permintaan baru ini (ekspor register, ringkasan dan drill-down, tautan MOC–PSI, tahap Komunikasi–Penutupan, pengingat, akun) termasuk RAB atau perlu penawaran tambahan, dan urutan prioritas pengerjaannya.

## 12. Hal yang sengaja tidak dikerjakan

- Tanda tangan digital di dalam aplikasi (tanda tangan dilakukan di luar: cetak, tanda tangan, unggah bukti).
- SSO (Pertamina tidak memberi akses).
- Tahap MOC D–H sebagai alur final sebelum client menetapkannya.
- Menempelkan gambar kiriman client yang memuat watermark cetak atas nama seseorang (dibuat ulang sebagai tabel teks).

---

## 13. Backlog lama yang masih terbuka (dari sesi-sesi sebelumnya)

**MOC level regional (dibangun 12 Okt 2026 dengan asumsi TKO)**
- Belum dikonfirmasi client: (a) fungsi regional mana yang boleh mengajukan, (b) siapa Approver dan Controller regional, (c) **apakah MOC regional boleh menyangkut terminal tertentu**. Saat ini model MOC hanya punya satu lokasi, jadi MOC regional murni level regional; bila client butuh yang menyangkut terminal, itu perubahan model dan perlu keputusan. [Tunggu client]
- Tahap setelah Registrasi masih penanda kemajuan sementara; Controller memajukan semua tahap, Performer belum punya tugas (akan berubah dengan aturan Performer tanpa akun, bagian 4.1).
- Akun peran Reviewer/Approver/Performer di database berperan dasar Initiator sehingga secara hak bisa membuat MOC; label sudah diperbaiki, hak akses belum. [Usulan: rapikan saat akun sungguhan dibuat]

**Direktori dan data**
- **Target kepatuhan** (`location_targets`) untuk 24 lokasi baru belum diisi karena client belum memberi angka target; widget kepatuhan menampilkan 0/0 untuk lokasi itu. [Tunggu client]
- Baris lama **"IT Surabaya"** masih ada dengan 4 dokumen yang belum bisa dipastikan masuk ke area mana (Fuel/LPG/Bandaran/Perak). [Tunggu client]
- **Sortir ±4.802 berkas Arsip Registry** ke kartu Direktori: tidak otomatis dan tidak perlu satu per satu; cukup ±1 dokumen resmi per kategori per lokasi. Rekomendasi alur: mulai dari kartu kosong (❌), kategori wajib TKO dulu (SDS, PFD, Operation & Control Philosophy, Incident/Fire Risk Card, Pre-Fire Planning, Emergency Response Plan), lima lokasi yang sudah punya sejarah dulu. Menunggu konfirmasi client. [Tunggu client]
- Tombol dari kartu ❌ di Direktori langsung ke Arsip Registry yang sudah terfilter lokasi. User belum menjawab mau atau tidak. [Usulan]
- Kategori kustom (mis. HAZID/HAZOP) tampil di "Dokumen Lainnya" atau cluster B.3; item Excel ber-"N/A" ikut dihitung di kepatuhan. Belum ada keputusan client apakah N/A dikecualikan. [Tunggu client]
- Meeting 18 Sep: rekaman rusak setelah menit 23, jadi ±74 menit pembahasan tidak terbaca. Perlu file utuh dari sumber asli bila detailnya masih dibutuhkan. [Tunggu file]

**Aturan dan hak**
- **Hak PSI Admin Regional:** rapat menyebut regional hanya melihat PSI dan MOC lokasi, tetapi kode PSI masih memberi Admin Regional hak menyetujui dokumen PSI. MOC sudah hanya-lihat. [Perlu keputusan]
- SLA review MOC belum menghitung hari libur nasional.
- "Belum diperbarui > 12 bulan" hanyalah pendekatan evaluasi tahunan (belum ada catatan evaluasi PSI). [Usulan: catatan evaluasi tahunan]
- Bukti tanda tangan MOC masih opsional (`MOC_REQUIRE_SIGNED_EVIDENCE = false`).

**Kebersihan data dan keamanan**
- 14 akun demo lama (sandi `Demo12345!`, termasuk 3 admin) dan 182 akun demo baru (sandi `Demo123`) masih ada di database produksi; semuanya akan dihapus sebelum dipakai sungguhan.
- Entri uji di Log Aktivitas ("ZZ UJI", "Contoh Dokumen Panduan", pembuatan akun demo) belum dibersihkan.
- Dua tampilan kecil: sapaan Admin di dashboard ("Selamat pagi, Ir..") dan label oranye "MODE SIMULASI" masih tampil.
- Throttle login per-IP dan perbaikan login opsional lain belum dikerjakan.
- Backup otomatis: butuh penyedia bucket cadangan (mis. Backblaze B2) dan keputusan lama simpan berkas terhapus (30 hari). Belum dibuat.
- Berkas Excel daftar akun lama (v2 dan yang tanpa sufiks) sudah usang dan sebaiknya dihapus; yang berlaku v3.

## 14. Pekerjaan teknis yang menunggu

- **Tinjau dan gabungkan branch `feat/moc`** milik teman (15 berkas, termasuk tahap Komunikasi/rencana implementasi dan migrasi `0013`). Alur penggabungan ada pada bagian 10. Migrasi harus diterapkan ke Neon sebelum push ke `master`.
- Buat **tabel pencocokan 29 lokasi ↔ KBO** untuk dikirim ke client agar mereka mengoreksi yang tidak cocok (Larantuka mengikuti FT Maumere; area IT Surabaya satu KBO).
- Ganti `suggestMocNumber` dengan format nomor baru (bagian 2) dan sesuaikan `MOC_FUNCTION_SUGGESTIONS_REGIONAL` dengan jawaban client tentang fungsi regional.
- Panduan Pengguna (PDF) harus **direvisi setiap UI berubah**; setelah revisi formulir MOC, nomor MOC, dan akun sungguhan perlu dibuat ulang.
- `CLAUDE.md` perlu diperbarui untuk keputusan di dokumen ini (aturan Performer tanpa akun, nomor MOC, matriks risiko, MOC–PSI).

## 15. Catatan administratif proyek (bukan fitur)

- Proposal penawaran sedang disusun dari RAB: total pekerjaan Rp 18.000.000, deposit Rp 4.000.000 sudah diterima, sisa Rp 14.000.000, **permintaan Termin 1 = 70% dari sisa = Rp 9.800.000**, pelunasan Rp 4.200.000. Termin sisa pembayaran, nomor rekening, dan tanggal jatuh tempo perlu diisi. Prompt untuk Gemini sudah disiapkan.
- **Apakah permintaan baru dalam dokumen ini masuk RAB atau perlu penawaran tambahan** belum diputuskan; ini risiko terbesar bila dibiarkan menggantung.
- Biaya infrastruktur berulang (Neon, Cloudflare R2, Vercel, layanan email) dipisah dari biaya pengerjaan di proposal.

---

## 16. Permintaan client tentang masa berlaku, siklus tinjau, dan Direktori (14 Okt 2026)

Semua butir di bagian ini **belum dikerjakan**.

**16.1 Masa berlaku dan siklus tinjau**
- Sekarang "Berlaku sampai" dihitung otomatis dari tanggal terbit + siklus tinjau sub-dokumen (bawaan 5 tahun) dan **tidak bisa diedit**. Siklus per sub-dokumen tersimpan di database tanpa menu pengaturan; kategori kustom selalu 60 bulan.
- Client minta **"Berlaku sampai" bisa diubah manual**, untuk kasus seperti sertifikat yang tanggal berlakunya tercetak sendiri; perubahan tercatat di riwayat. Jawaban client: **hanya Admin Regional yang boleh mengubah**. [Pasti]
- Client menegaskan **Admin Regional yang menentukan/mengubah lama berlaku tiap dokumen** karena lama berlaku tiap dokumen berbeda-beda dan bisa berubah. Artinya perlu menu **"Atur siklus tinjau"** untuk Admin Regional (daftar sub-dokumen dan lama siklusnya, bulan atau tahun), dan tiap perubahan tercatat di Log Aktivitas. Cakupan usulan: berlaku ke semua lokasi, dokumen yang sudah ada dihitung ulang dengan konfirmasi sebelum disimpan. [Usulan; cakupan menunggu client]
- **Siklus berbeda per sub-dokumen/per dokumen:** beberapa dokumen rutin diperbarui dengan siklus sendiri, mis. **Grounding 6 bulan**. Usulan: siklus per sub-dokumen, dengan pengecualian per dokumen bila perlu; notifikasi mengikuti siklus itu. Client diminta mengirim **daftar dokumen/sub-dokumen yang siklusnya bukan 5 tahun beserta lamanya**. [Tunggu client]
- Pengingat/notifikasi dibuat **per dokumen tertentu** sesuai siklusnya (terhubung ke bagian 5).
- Data: dokumen Grounding (mis. "Grounding TW III IT Bima 2025") tercatat di sub-dokumen Lightning & Surge Protection Study; kemungkinan salah kategori dan perlu dipindahkan. [Keputusan data]

**16.2 Versi berurutan dan status "Digantikan"**
- Dua kondisi berbeda: (1) **versi berurutan dari dokumen yang sama** (P&ID A → B → C): hanya yang terbaru berlaku, dan bila C berlaku maka kartu P&ID tetap comply; (2) **dokumen berbeda dalam satu sub-dokumen** (mis. laporan area di Lightning & Surge): semua tetap aktif.
- Sekarang kartu sub-dokumen hanya melihat dokumen terbaru, tetapi chip dan dashboard (Kedaluwarsa, Berakhir ≤ 90 hari, Belum diperbarui) menghitung **tiap dokumen satu per satu**, jadi versi lama yang sudah lewat tetap tampak kedaluwarsa walau penggantinya ada. Angka bisa tidak sinkron dengan kartu.
- Usulan: status **"Digantikan"**, ditandai **manual** pada dokumen yang di-update (pilih dokumen yang digantikan); dokumen lama tetap tersimpan sebagai riwayat versi tetapi tidak dihitung di kedaluwarsa/berakhir/belum diperbarui. Tidak otomatis untuk seluruh sub-dokumen karena bisa menimpa dokumen yang memang berbeda. **[Pasti: client memilih "Digantikan" dan menandainya sendiri secara manual, 14 Okt 2026]**

**16.3 Pencarian dan pemilih terminal di Direktori**
- Pemilih terminal hanya mengatur empat chip (Kedaluwarsa, Berakhir ≤ 90 hari, Belum diperbarui, Belum ada dokumen), bukan pencarian; pencarian tetap lintas lokasi. Client mengira filternya memengaruhi seluruh halaman.
- Opsi: (a) pencarian ikut pemilih terminal, dengan "Semua terminal" untuk lintas lokasi; atau (b) pencarian tetap lintas lokasi dan label pemilih diperjelas khusus untuk chip. Rekomendasi kami (b). [Tunggu client]

**16.4 Folder di dalam sub-dokumen (client, 14 Okt 2026)**
- Client menanyakan apakah bisa menambah **folder di dalam sub-dokumen** karena satu sub-dokumen (mis. Lightning & Surge Protection) berisi dua jenis dokumen berbeda. Client **akan menyusun daftar** sub-dokumen yang perlu dipisah. [Tunggu client]
- Cara 1 (sudah ada): tambah sub-dokumen baru lewat kartu "+" dan pindahkan dokumennya; mis. Grounding sudah punya sub-dokumen sendiri ("Studi Sistem Pentanahan (Grounding)").
- Cara 2 (perlu dibuat, ukuran sedang): tingkat folder di bawah sub-dokumen, tiap folder bisa punya siklus sendiri. Perlu keputusan: status kartu sub-dokumen mengikuti folder terburuk, dan siapa yang boleh membuat folder (Admin Regional saja atau user lokasi). Hanya layak bila banyak sub-dokumen berisi beberapa jenis.

**16.5 Notifikasi Admin Regional dan hak unggah PSI (client, 14 Okt 2026)**
- Pertanyaan client: apakah Admin Regional mendapat notice bila user lain mengunggah dokumen PSI atau MOC? **Belum.** Lonceng hanya memuat MOC yang menunggu tindakan sendiri, dokumen kedaluwarsa, dan pengingat 30/90 hari. Admin melihat unggahan lewat "Pembaruan Terbaru"/"Aktivitas Terbaru" dan Log Aktivitas. Usulan: notifikasi aktif (lonceng/email) untuk unggahan PSI dan MOC baru, digabung dengan pengingat otomatis (bagian 5). [Tunggu client]
- Pertanyaan client: apakah semua dari enam jenis akun bisa mengunggah PSI? **Ya, saat ini semua akun yang punya lokasi bisa mengunggah/mengubah PSI di lokasinya sendiri**; peran MOC tidak memengaruhi, dan Admin Regional bisa di semua lokasi. Bila client ingin membatasi (mis. hanya Initiator dan Controller), perlu aturan baru. [Tunggu client]

**16.6 Konflik: satu akun Initiator untuk semua lokasi? (client, 14 Okt 2026)**
- Client menyebut maksud awalnya adalah **satu akun Initiator** (mis. `InitiatorJatimbalinus`) yang dipakai untuk 25 lokasi. Ini bertentangan dengan daftar akun sebelumnya (Initiator per KBO, 47 akun).
- Akun bersama lintas lokasi mengubah model hak: akun terikat satu lokasi dan hak tulis hanya di lokasi itu; nomor MOC mengikuti KBO lokasi; jejak audit melemah. Rekomendasi: tetap satu Initiator per lokasi (rencana 174 akun). **[SELESAI 14 Okt 2026: client mengonfirmasi memakai daftar 173 akun (Initiator per KBO); satu akun bersama untuk 25 lokasi tidak jadi]** Pembuatan akun tinggal menunggu keputusan username, email, wajib ganti sandi, dan penghapusan akun demo (bagian 8).

**16.4 (pembaruan 14 Okt 2026): kebutuhan folder ternyata hanya untuk HAZID & HAZOP**
- Client memeriksa: yang perlu dipisah **hanya HAZID & HAZOP Study** (±48 dokumen per lokasi dengan isi bercampur) menjadi **"Report PHA"** dan **"Evidence PHA"**. Client membantu memindahkan dokumennya.
- Lightning & Surge Protection dan Grounding sebenarnya sudah sub-dokumen terpisah; dokumen Grounding IT Bima yang salah masuk sudah dipindahkan client.
- **Keputusan:** fitur folder di dalam sub-dokumen (cara 2) **tidak dibuat**. Cukup cara 1: pecah menjadi dua sub-dokumen kustom ("Report PHA", "Evidence PHA") di 29 lokasi lewat skrip sekali jalan, lalu dokumen dipindahkan memakai menu pindah yang sudah ada. [Pasti]
- Menunggu client: apakah kartu "HAZID & HAZOP Study" lama diganti dua kartu itu atau tetap ada, dan apakah Evidence PHA punya masa berlaku.

**16.7 Teks footer (client, 14 Okt 2026) — SELESAI**
- Footer aplikasi dan footer email (atur ulang sandi, verifikasi) diganti menjadi "© 2026 PT Pertamina Patra Niaga - Direktorat Optimasi Hilir & Distribusi". Commit `3dd40c8`, sudah di-push ke `master`.

**16.8 Dashboard PSI: infografik (client, 16 Okt 2026) — SELESAI, belum di-push**
- Keluhan client: dashboard baru terasa monoton dan hanya angka, tidak jelas data apa terkait apa; butuh infografik/chart; bingung urgensi "Belum diperbarui".
- Dibuat tiga kartu grafik dari data nyata di bawah kartu KPI: **Status dokumen** (donat, tiap baris bisa diklik), **Umur pembaruan** (lima batang; dua batang terakhir = angka "Belum diperbarui > 12 bln", bisa diklik ke daftar), **Jadwal kedaluwarsa** (kolom per tahun, termasuk "Lewat"). Angka konsisten dengan kartu KPI (mis. 794 + 459 = 1.253). Commit lokal dengan pesan "Dashboard PSI: tambah infografik…".
- Penjelasan urgensi "Belum diperbarui" dan opsi nama lain untuk label itu masih menunggu keputusan client/user. [Tunggu client]

**16.9 Dashboard PSI: infografik diganti (client, 16 Okt 2026) — SELESAI, belum di-push**
- Kartu "Status dokumen" (donat) dan "Umur pembaruan" dibuang karena tidak menambah informasi (angkanya sama dengan kartu KPI, dan umur pembaruan hanya perkiraan dari tanggal terbit).
- Diganti **Kelengkapan per sub chapter** (batang bertumpuk terpenuhi/perlu ditinjau/kosong; baris diklik ke daftar sub-dokumen kosong di sub chapter itu) dan **Terminal yang perlu perhatian** (peringkat kelengkapan terendah dulu; diklik ke terminalnya; hanya pada tampilan semua terminal). **Jadwal kedaluwarsa** dipertahankan dan kolom tahunnya bisa diklik ke daftar dokumen.
- Temuan yang kini terlihat: 139 dari 1.537 sub-dokumen terpenuhi, 1.396 belum ada dokumen.

**16.10 "Belum diperbarui" menjadi "Perlu evaluasi tahunan" (client, 16 Okt 2026) — SELESAI, belum di-push**
- Client bingung: daftar "Belum diperbarui > 12 bulan" tidak punya opsi "sudah dicek, masih valid", baik di daftar maupun di detail dokumen.
- Dibuat tombol **"Tandai ditinjau"** (dua langkah, di daftar dashboard, daftar Direktori, dan detail dokumen) yang mencatat evaluasi tahunan tanpa unggah ulang. Tanggal terbit dan masa berlaku tidak berubah; riwayat bernada "Ditinjau:" (aksi Revised, tanpa migrasi database) sehingga tidak dihitung sebagai pembaruan isi di "Pembaruan terbaru". Hak: user terminal dokumen itu dan Admin Regional; tercatat di Log Aktivitas (`dokumen.ditinjau`).
- Label diganti menjadi **"Perlu evaluasi tahunan"** (kartu KPI, daftar, chip Direktori). Lencana umur diwarnai: 12–23 bln kuning, 24–47 bln oranye, ≥ 48 bln merah.
- Belum ada isian catatan saat menandai (catatan bawaan "dokumen dicek, masih valid dan tidak ada perubahan"); API sudah menerima catatan opsional bila client ingin kolomnya.

**16.11 Dashboard PSI: kartu mendesak dan popup (client/user, 16 Okt 2026) — SELESAI, belum di-push**
- Daftar "Perlu evaluasi tahunan" di dashboard dinilai tetap tidak jelas urgensinya (sebagian besar dokumen hanya tua dari hasil migrasi, bukan darurat). Diganti kartu **"Terminal paling mendesak"**: per terminal jumlah dokumen kedaluwarsa (merah) dan berakhir ≤ 90 hari (kuning), terparah di atas, dengan keterangan "tertua lewat N bln"; saat satu terminal dipilih menjadi **"Sub-dokumen paling mendesak"**. Klik membuka daftar yang sama jumlahnya. Angka evaluasi tahunan tetap ada sebagai kartu KPI dan chip Direktori, lengkap dengan tombol "Tandai ditinjau".
- "Terminal yang perlu perhatian" dan kartu mendesak memakai **popup "Lihat semua"** (bukan memanjang ke bawah).
- Temuan data: beberapa terminal punya dokumen kedaluwarsa sangat lama (AFT Juanda: P&ID terbit 2006 berlaku sampai 2011, "tertua lewat 185 bln"; FT Madiun 251 bln). Perlu dicek apakah itu memang dokumen usang yang perlu diganti atau tanggal terbit lama dari arsip. [Tunggu client]
- Tombol "Tandai ditinjau" sudah dipakai sungguhan oleh akun terminal (AFT Juanda) pada 16 Okt 2026.

**16.12 Evaluasi tahunan: satu tempat keputusan (user, 16 Okt 2026) — SELESAI, belum di-push**
- Alur sebelumnya dinilai ribet karena tombol "Tandai ditinjau" ada di beberapa tempat. Sekarang keputusan hanya di **halaman dokumen**: dokumen yang perlu evaluasi tahunan menampilkan spanduk di atas ("Apakah dokumen ini masih valid?") dengan dua pilihan: **Masih valid** (tercatat tanpa unggah ulang, spanduk hilang) atau **Perlu diperbarui** (membuka dialog Ganti berkas). Akun tanpa hak tulis hanya melihat spanduk informasi.
- Tombol di daftar Direktori dan di bilah aksi halaman dokumen dihapus. Daftar "Perlu evaluasi tahunan" hanya untuk menemukan dokumen, lalu diputuskan di dokumennya.
- Catatan pemakaian: tombol sempat dicoba akun juanda pada dokumen "T-000-1250-001 - HAZOP Report"; catatannya sudah dikembalikan sesuai permintaan user (hanya dokumen itu).

**16.13 HAZID & HAZOP: Report vs Evidence, evidence tidak masuk visualisasi (client, 16 Okt 2026) — SELESAI, belum di-push**
- Client: di drive HAZOP/HAZID dipisah antara report dan evidence; minta sub terpisah di dalam sub HAZOP & HAZID Study; yang masuk visualisasi dashboard hanya Report, **Evidence tidak perlu**. Evidence = dokumen bernama "Hazop xx" di depan atau yang selain "Report"/"Laporan" (perlu dikonfirmasi).
- Data: 1.014 dokumen di 28 lokasi (56% dari seluruh PSI); 890 diawali HAZOP/HAZID (cenderung evidence), 73 memuat Report/Laporan, 51 tidak jelas. Pemilahan tidak bisa 100% otomatis.
- Rencana: dua sub-dokumen kustom "Report PHA" dan "Evidence PHA" di tiap lokasi (menggantikan keputusan folder 16.4), Evidence PHA dikecualikan dari hitungan dashboard (kedaluwarsa, berakhir, evaluasi tahunan, jadwal, kelengkapan), usulan pemilahan dikirim ke client untuk dicek sebelum pemindahan massal. [Tunggu konfirmasi client]
- **SELESAI 16 Okt 2026 (diterapkan atas permintaan user, belum di-push):** kategori "HAZID & HAZOP Study" diganti nama menjadi **Report PHA** (73 dokumen: judul memuat Report/Laporan) dan dibuat **Evidence PHA** (941 dokumen lainnya) di 28 lokasi. Aturan: judul memuat "Report"/"Laporan" = Report, selain itu Evidence (51 dokumen abu-abu ikut Evidence; client bisa memindahkan satu per satu). Evidence PHA dikecualikan dari KPI, Jadwal kedaluwarsa, daftar Overdue, badge Overdue; tetap tersimpan dan bisa dicari. Dampak angka: Evaluasi tahunan 1.253 menjadi 593, Kedaluwarsa 33 menjadi 26. Skrip dengan peta pengembalian: `scripts/split-pha-categories.cjs` (peta ada di luar repo).

**Tahap 1a SELESAI (18 Okt 2026, commit lokal):** matriks risiko 5x5 persis gambar client (klik sel mengisi keparahan dan probabilitas; warna 5 tingkat sudah sesuai ambang yang ternyata sudah ada di kode dari rumus Form MoC 2025: 1–3 hijau tua, 4 hijau muda, 5–9 kuning, 10–12 oranye, ≥13 merah; catatan sebelumnya yang menyebut formulir hanya 3 tingkat keliru, SLA review tetap L5/LTM10/M10/MTH15/H15 hari), Anggaran dengan pilihan + "Lainnya", keterangan Permanen tanpa batas akhir, toggle Tabel 3. Tersisa di Tahap 1: nomor MOC KBO, Reviewer/Approver manual.

**Tahap 1b SELESAI (18 Okt 2026, commit lokal):** Nomor MOC format KBO otomatis saat registrasi Controller: `AAA/MOC/PPNXXXXXXX/BB/TAHUN`, urutan reset per KBO per tahun, bulan dan tahun dari pengajuan pertama (WIB). Keputusan bawaan yang diambil (belum dikonfirmasi client): nomor dialokasikan saat registrasi (bukan saat pengajuan) supaya MOC yang ditolak atau dibatalkan tidak menghabiskan nomor; nomor tidak bisa diketik manual. Unit Regional memilih fungsi pengusul dari daftar 21 fungsi (menentukan KBO). Nomor lama (MOC-...) tidak diubah. Diuji: FT Malang 001 lalu 002 (PPNLL0207), regional HSSE 001 (PPNLL0400), fungsi di luar daftar ditolak saat diajukan. Tersisa di Tahap 1: Reviewer/Approver manual.

**Tahap 1c SELESAI (18 Okt 2026, commit lokal): Reviewer/Approver/Performer manual (tanpa akun).** Pilihan "Isi manual" per baris Reviewer dan "Tidak ada di daftar? Isi nama manual" untuk Approver di panel Ajukan; Performer bisa diisi manual saat persetujuan. Aturan bawaan (usulan, belum dikonfirmasi client): review reviewer manual dicatat pembuat MOC atau Controller atas nama (dengan unggah lembar bertanda tangan opsional); keputusan Approver manual hanya dicatat Controller (Initiator tidak boleh memutuskan MOC-nya sendiri); Controller dapat memperbaiki nama pihak tanpa akun selama review atau persetujuan berjalan; pihak berakun tidak bisa diganti tanpa pengajuan ulang. Riwayat mencatat "dicatat X atas nama Y". Migrasi 0014 (approver_manual_name, approver_manual_jabatan) sudah di Neon. Diuji 17 skenario API (termasuk penolakan hak) dan tampilan.
**Tahap 1 selesai seluruhnya kecuali konfirmasi client** untuk: pemetaan SLA 5 warna, kapan nomor dialokasikan, dan aturan pencatatan atas nama.

**Tahap 2 SELESAI (18 Okt 2026, commit lokal 86db50b; belum di-push karena internet komputer terputus):** Register MOC (kartu Total/Per tahap/Perlu perhatian yang bisa diklik, filter di URL, kolom Anggaran, ekspor Excel 11 kolom Lampiran 8), "Berlaku sampai" manual (Admin Regional), Pengaturan > Siklus Tinjau (siklus per sub-dokumen, opsi hitung ulang dengan pratinjau), status Digantikan (manual, tanpa migrasi), label "Perlu tindakan di" pada pemilih terminal Direktori, dan perbaikan donat tingkat risiko lima tingkat serta label tindakan catat atas nama di dashboard MOC. Laporan rinci per perubahan, hasil uji, dan pertanyaan ada di `C:\Users\thori\Downloads\kerja\Laporan-Perubahan-Per-Tahap.xlsx` (dibangun dari `frontend/docs/build-laporan-tahap.py`; edit daftar ROWS lalu jalankan ulang).
