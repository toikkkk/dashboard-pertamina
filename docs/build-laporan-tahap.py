# Membangun Excel "Laporan Perubahan Per Tahap" versi ringkas: satu baris per perubahan dengan kolom
# Yang diubah, Berhasil?, Masalah atau hal yang ambigu, Pertanyaan (hanya yang mendesak dan penting), dan Jawaban.
# Edit daftar ROWS lalu jalankan:  python -I build-laporan-tahap.py <keluaran.xlsx>
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

OUT = sys.argv[1]

T0, T1, T2, T3, T4 = "Tahap 0 (revisi awal)", "Tahap 1", "Tahap 2", "Tahap 3", "Tahap 4"

# (tahap, area, yang diubah, berhasil, masalah atau hal ambigu, pertanyaan)
# Pertanyaan HANYA diisi untuk hal yang mendesak dan penting; hal lain cukup dicatat di kolom masalah.
ROWS = [
    # ------------------------------------------------------------ Tahap 0
    (T0, "Tampilan umum", "Teks footer diganti \"© 2026 PT Pertamina Patra Niaga - Direktorat Optimasi Hilir & Distribusi\" di aplikasi dan email.", "Ya", "", ""),
    (T0, "Dashboard PSI", "Infografik baru: kelengkapan per sub chapter, terminal yang perlu perhatian, jadwal kedaluwarsa per tahun. Angka bisa diklik ke daftar; daftar panjang dibuka dalam popup.", "Ya",
     "Sub-dokumen ber-\"N/A\" ikut dihitung, sehingga hanya 139 dari 1.537 sub-dokumen terpenuhi.", ""),
    (T0, "Dashboard PSI", "Kartu \"Terminal paling mendesak\": jumlah kedaluwarsa dan berakhir ≤ 90 hari per terminal.", "Ya",
     "Ada dokumen kedaluwarsa sangat lama (mis. P&ID AFT Juanda terbit 2006, lewat 185 bulan).", ""),
    (T0, "Evaluasi tahunan", "\"Belum diperbarui\" menjadi \"Perlu evaluasi tahunan\"; halaman dokumen punya spanduk Masih valid / Perlu diperbarui.", "Ya",
     "Siapa yang boleh menandai \"Masih valid\" dan batas ulang 12 bulan belum dikonfirmasi client.", ""),
    (T0, "HAZID & HAZOP", "Dipilah menjadi Report PHA (73 dokumen) dan Evidence PHA (941 dokumen); Evidence tidak dihitung di dashboard.", "Ya",
     "51 dokumen berjudul tidak jelas otomatis masuk Evidence.",
     "Apakah aturan \"judul memuat Report/Laporan = Report, selain itu = Evidence\" sudah benar, dan bolehkah kami kirim daftar 51 dokumen abu-abu untuk dicek client?"),
    # ------------------------------------------------------------ Tahap 1
    (T1, "Formulir MOC", "Matriks risiko 5×5 seperti gambar client; klik sel mengisi keparahan dan probabilitas, nilai dan tingkat risiko otomatis.", "Ya",
     "SLA review untuk 5 tingkat risiko memakai pemetaan kami: L=5, LTM=10, M=10, MTH=15, H=15 hari kerja (TKO hanya punya 3 tingkat).",
     "Apakah pemetaan SLA review itu benar, atau Rendah-Menengah cukup 5 hari dan Menengah-Tinggi 10 hari?"),
    (T1, "Formulir MOC", "Anggaran: pilihan ABO / ABI / ABO Khusus / Lainnya dengan isian manual.", "Ya", "", ""),
    (T1, "Formulir MOC", "Sifat Permanen: Masa Berlaku opsional dan tanpa batas akhir.", "Sebagian", "Perilaku ini sebenarnya sudah ada; hanya keterangan yang ditambah.", ""),
    (T1, "Formulir MOC", "Toggle info Tabel 3 Kewenangan Validasi di langkah memilih Reviewer.", "Ya", "Dibuat ulang sebagai tabel teks karena gambar client memuat watermark nama.", ""),
    (T1, "Nomor MOC", "Nomor format KBO otomatis saat registrasi: AAA/MOC/PPNXXXXXXX/BB/TAHUN (urut per KBO per tahun, bulan dari pengajuan).", "Ya",
     "Nomor dialokasikan saat registrasi dan tidak bisa diketik manual; di List KBO ada dua jabatan Internal Audit.",
     "Apakah nomor urut diberikan saat registrasi (MOC yang ditolak tidak menghabiskan nomor) atau saat pengajuan, dan KBO mana yang dipakai Internal Audit regional (PPNAB0801 atau PNA353000)?"),
    (T1, "Nomor MOC", "Unit Regional memilih fungsi pengusul (21 fungsi) yang menentukan KBO nomor.", "Ya", "Daftar fungsi disusun dari List KBO dan belum dikonfirmasi client.", ""),
    (T1, "Pihak MOC", "Reviewer, Approver, dan Performer bisa diketik manual (tanpa akun); review dicatat Initiator atau Controller atas nama, keputusan Approver manual hanya dicatat Controller.", "Ya",
     "Aturan pencatatan atas nama adalah usulan kami.",
     "Apakah aturan ini sesuai: review reviewer manual dicatat Initiator/Controller, keputusan Approver manual hanya dicatat Controller, dan nama hanya diubah Controller setelah review berjalan?"),
    (T1, "Database", "Migrasi 0014: dua kolom Approver manual di moc_requests.", "Ya", "", ""),
    # ------------------------------------------------------------ Tahap 2
    (T2, "Register MOC", "Ringkasan di atas Register (Total, Per tahap, Perlu perhatian) yang bisa diklik dan memfilter daftar; filter tersimpan di URL.", "Ya",
     "Kotak \"jatuh tempo / PSI belum diperbarui sebelum closing\" menunggu Tahap 3 dan 4.", ""),
    (T2, "Register MOC", "Tombol Ekspor Register ke Excel dengan 11 kolom Lampiran 8.", "Ya", "Tombol ini usulan kami, belum dikonfirmasi client.", ""),
    (T2, "Masa berlaku PSI", "\"Berlaku sampai\" bisa diubah manual oleh Admin Regional.", "Ya", "Mengubah tanggal terbit lagi akan menimpa tanggal berlaku manual.", ""),
    (T2, "Masa berlaku PSI", "Pengaturan > Siklus Tinjau: ubah siklus per sub-dokumen (semua lokasi) dengan opsi hitung ulang dokumen yang sudah ada.", "Ya",
     "Belum bisa per lokasi atau per dokumen; siklus Grounding masih 5 tahun karena daftar dari client belum ada.",
     "Bisakah client mengirim daftar sub-dokumen yang siklus tinjaunya bukan 5 tahun (mis. Grounding 6 bulan), dan apakah siklus cukup per sub-dokumen untuk semua lokasi?"),
    (T2, "Versi dokumen", "Status Digantikan (ditandai manual) dan Aktifkan kembali; tidak dihitung di KPI dan Overdue.", "Ya", "Dokumen pengganti boleh dari sub-dokumen mana pun di lokasi yang sama.", ""),
    (T2, "Direktori", "Label \"Perlu tindakan di\" di samping pemilih terminal.", "Ya", "Pilihan agar pencarian ikut pemilih terminal belum dijawab client.", ""),
    (T2, "Perbaikan temuan", "Dashboard MOC: label tindakan catat atas nama dan donat 5 tingkat risiko diperbaiki.", "Ya", "", ""),
    # ------------------------------------------------------------ Tahap 3
    (T3, "Pemantauan", "Formulir Pemantauan Ke-N (Lampiran 6): tanggal, tabel kegiatan, aksi tindak lanjut, catatan, dan hasil Lanjut / Perpanjang 6 bulan / Tutup. Dicatat oleh pembuat MOC, Performer, atau Controller. Batas pemantauan berikutnya 3 bulan setelah pemantauan terakhir.", "Ya",
     "Perpanjangan berlaku untuk semua sifat perubahan sesuai catatan client; pada MOC Sementara tanggal berlaku ikut bergeser 6 bulan. Perpanjangan ketiga ditolak dengan pesan risiko harus direview ulang.",
     "TKO hanya mengizinkan perpanjangan untuk perubahan sementara, sedangkan catatan client menyebut semua MOC. Kami mengikuti catatan client; benarkah?"),
    (T3, "Tinjauan Akhir", "Formulir Tinjauan Akhir (Lampiran 7): empat pertanyaan Ya/Tidak (Tidak wajib diberi keterangan), aksi tindak lanjut, tim peninjau. Batas waktu dihitung dari masuk tahap: Permanen 3 bulan, Sementara 1 bulan, Darurat 1 bulan.", "Ya",
     "Darurat yang ditetapkan menjadi permanen (batas 3 bulan) belum bisa dibedakan karena belum ada isian penetapan permanen.", ""),
    (T3, "Penutupan", "Approver (berakun) menutup MOC setelah Tinjauan Akhir dicatat; bila Approver tanpa akun, Controller menutup atas namanya. Status Register menjadi Closed, tercatat di Riwayat.", "Ya",
     "Penutupan belum otomatis menandai PSI terdampak untuk diperbarui (menunggu Tahap 4).", ""),
    (T3, "Tampilan", "Detail MOC menampilkan riwayat pemantauan, tinjauan akhir, dan penutupan; dashboard MOC menandai pemantauan atau tinjauan yang lewat batas sebagai SLA terlambat.", "Ya", "", ""),
    (T3, "Perbaikan temuan", "Perhitungan tambah bulan meluap di akhir bulan (31 Des + 6 bulan menjadi 1 Jul); kini dijepit ke akhir bulan (30 Jun).", "Ya", "", ""),
    (T3, "Pengujian dan rilis", "Uji domain, API (izin per peran, validasi, batas perpanjangan, penutupan, closeProxy), dan browser lulus; migrasi 0015 diterapkan ke database. Commit 1998ee7.", "Sebagian",
     "Lembar cetak Lampiran 6 dan 7 belum dibuat (formulir diisi di layar). next build penuh belum diverifikasi (internet komputer terputus) dan push belum bisa dilakukan.",
     "Perlukah lembar cetak Lampiran 6 dan 7 untuk ditandatangani di luar web, seperti Lampiran 5?"),
    # ------------------------------------------------------------ Tahap 4
    (T4, "MOC dan PSI", "PSI terdampak dipilih per MOC dari Direktori lokasi yang sama (pembuat MOC atau Controller; dilepas kapan saja sebelum MOC Closed). Tersimpan sebagai tautan ke dokumen, bukan salinan; tiap penandaan dan pelepasan masuk Riwayat MOC.", "Ya",
     "Pilihan hanya dari dokumen di lokasi MOC. Dokumen yang sama boleh ditandai oleh beberapa MOC sekaligus.", ""),
    (T4, "MOC dan PSI", "Status \"Sudah diperbarui\" per dokumen terdampak dihitung otomatis dari riwayat dokumen (revisi nyata setelah ditandai; koreksi, tinjauan, dan penggantian tidak dihitung). Halaman dokumen punya kartu \"Terkait MOC\" berisi MOC yang menyangkut dokumen itu beserta statusnya.", "Ya",
     "Riwayat dokumen belum memuat entri \"Diperbarui karena MOC [nomor]\" sebagai baris tersendiri; keterkaitan tampil di kartu Terkait MOC.", ""),
    (T4, "MOC dan PSI", "Saat penutupan MOC, bila ada PSI terdampak yang belum diperbarui muncul peringatan berisi nomor dokumennya.", "Sebagian",
     "Peringatan saja, belum menahan penutupan. Dua MOC bersamaan: kartu Terkait MOC memberi peringatan bila lebih dari satu MOC berjalan; dokumen tidak otomatis berpindah ke versi baru, dan acknowledge notice belum ada.",
     "Apakah MOC tidak boleh ditutup sebelum seluruh PSI terdampak diperbarui (menahan penutupan), atau cukup peringatan seperti sekarang?"),
    (T4, "Pengingat", "Pengingat otomatis email/notifikasi dan notifikasi unggahan untuk Admin Regional.", "Belum dikerjakan",
     "Butuh layanan pengirim email dan penjadwal harian; belum ada akun layanan email. Yang sudah ada di aplikasi: tanda SLA terlambat di dashboard MOC dan badge tindakan.",
     "Layanan email apa yang boleh dipakai (mis. Resend atau SMTP Pertamina), dan alamat pengirimnya?"),
    (T4, "Akun", "Wajib ganti kata sandi saat login pertama: layar /ganti-sandi, API ganti sandi, dan semua API lain diblokir (403) sampai sandi diganti; data dasbor tidak dikirim ke akun yang belum mengganti. Migrasi 0017 (kolom baru, default false) diterapkan.", "Ya",
     "Berlaku untuk akun yang ditandai saja; akun lama tidak terpengaruh.", ""),
    (T4, "Akun", "Akun sungguhan dibuat dari List KBO: 168 akun sesuai daftar client (Initiator 46, Approver 46, Controller HSSE 25, Reviewer lokasi 48, Reviewer Region 3; Performer tanpa akun) ditambah 1 Admin Regional (admin.regional). Semua akun demo (182) dihapus; data uji MOC dan log yang menunjuk akun demo dikosongkan penunjuknya, tidak dihapus. Penamaan sesuai peran: username peran.lokasi (mis. initiator.ft-malang, approver.ft-malang, controller.ft-malang, rev-dre.ft-malang); nama akun = nama peran, kecuali Approver memakai nama pejabatnya; nama orang Initiator, Reviewer, dan Controller diketik manual di MOC. Kata sandi awal seragam Pertamina@2026, TIDAK dipaksa diganti.", "Ya",
     "Daftar client berjumlah 173; 5 akun untuk AFT Dhoho Group (KBO PPNLL0105) sengaja tidak dibuat karena lokasinya tidak ada di aplikasi (keputusan: 168 cukup). Semua email sekarang email penanda @akun.portal.invalid (tidak bisa menerima email); pemilik akun mengganti ke email aktif (mis. Gmail) di Pengaturan > Keamanan Akun, lalu diverifikasi, supaya lupa sandi dan verifikasi bisa sampai. Ganti kata sandi juga opsional di menu yang sama. Login lewat username.",
     "Apakah nama orang untuk Controller juga perlu diketik manual di MOC (sekarang baru Initiator dan Reviewer yang punya isian nama manual)?"),
    (T4, "Pengujian dan rilis", "Uji API dan browser PSI terdampak lulus (izin per peran, lokasi berbeda, tanda ganda, koreksi bukan pembaruan, revisi nyata menandai selesai); migrasi 0016 (tabel baru) diterapkan ke database.", "Sebagian",
     "Belum di-push dan next build penuh belum diverifikasi karena internet komputer terputus.", ""),
    # ------------------------------------------------------------ Revisi client 20 Okt 2026 (13 catatan MOC)
    (T4, "Revisi 20 Okt - formulir", "Semua isian formulir MOC wajib. Saat Ajukan, bagian yang kosong ditampilkan sebagai daftar tautan; klik membawa ke halaman Ubah, tergulir ke bagian itu dengan tanda merah dan pesan. Tombol Ajukan nonaktif sampai lengkap. Bagian persetujuan (pilih Reviewer dan Approver) dipindah ke bawah formulir.", "Ya", "Jenis anggaran manual dan Performer manual sudah ada sebelumnya.", ""),
    (T4, "Revisi 20 Okt - Reviewer", "Daftar Reviewer menampilkan jabatan/fungsi (bukan nama akun) dan nama pekerja wajib diketik. Approver regional tampil dengan nama dan fungsinya (mis. Human Capital (HC)). Istilah RPD diganti DRE di seluruh aplikasi. Jabatan Approver dan Reviewer di lembar cetak terisi dari fungsi akun bila tidak diketik.", "Ya", "Badge MOC Reviewer HSSE diuji dan muncul; kemungkinan penyebab di client adalah akun HSSE yang dipilih berbeda dari yang dipakai login.", "Bila badge masih tidak muncul, akun HSSE mana yang dipilih saat Ajukan dan akun mana yang dipakai login?"),
    (T4, "Revisi 20 Okt - peran", "Komunikasi, Rencana Implementasi, serah ke Performer, dan Pemantauan hanya dikerjakan Initiator pembuat MOC (Controller ditolak di server). Bukti komunikasi wajib dilampirkan.", "Ya", "", ""),
    (T4, "Revisi 20 Okt - Pemantauan", "Form Pemantauan (Lampiran 6) diisi Initiator; Controller wajib mengunggah form bertanda tangan lengkap sebelum pemantauan berikutnya atau Tinjauan Akhir (bisa berulang, batas perpanjangan 2x6 bulan tetap). Lembar cetak Lampiran 6 terisi data pemantauan (?form=pemantauan&no=N).", "Ya", "Tutup pemantauan baru pindah ke Tinjauan Akhir setelah form bertanda tangan diunggah.", ""),
    (T4, "Revisi 20 Okt - tunda/henti", "Initiator dapat mengajukan penundaan atau penghentian ke Approver saat Pemantauan. Bila disetujui MOC berstatus Ditunda/Dihentikan; melanjutkan kembali mengulang Penilaian Risiko dan Validasi (Komunikasi, rencana, dan tinjauan akhir direset; Nomor MoC dan riwayat dipertahankan).", "Ya", "Asumsi: penundaan dan penghentian sama-sama bisa dilanjutkan kembali.", "Apakah MOC yang DIHENTIKAN masih boleh dilanjutkan kembali, atau hanya yang ditunda?"),
    (T4, "Revisi 20 Okt - Tinjauan Akhir", "Tinjauan Akhir (Lampiran 7) diisi Initiator, lalu tiap Reviewer menanggapi (Sesuai / Perlu Perubahan; Reviewer tanpa akun dicatat Initiator atau Controller). Setelah semua Sesuai, Approver menyetujui penutupan, lalu Controller memfinalisasi dengan mengunggah form penutupan bertanda tangan; baru MOC Closed. Lembar Lampiran 7 terisi data tinjauan.", "Ya", "Asumsi: Reviewer Tinjauan Akhir sama dengan Reviewer saat Validasi.", "Benarkah Reviewer Tinjauan Akhir sama dengan Reviewer saat Validasi?"),
    (T4, "Revisi 20 Okt - dokumen", "Setelah penutupan, form bertanda tangan (Lampiran 5, tiap Pemantauan, dan Penutupan) dan lampiran tetap tampil di detail MOC dan dapat dibuka/diunduh. Admin Regional dapat menghapus MOC (konfirmasi dua langkah, tercatat di Log Aktivitas).", "Ya", "Tidak ada tombol hapus MOC untuk selain Admin Regional.", ""),
]

HEAD = ["No", "Tahap", "Area", "Yang diubah / dikerjakan", "Berhasil?", "Masalah atau hal yang ambigu", "Pertanyaan yang perlu dijawab", "Jawaban / keputusan"]
WIDTH = [5, 18, 18, 62, 14, 50, 60, 36]

NAVY = "0F3B59"
f = lambda **k: Font(name="Arial", size=k.pop("size", 10), **k)
thin = Side(style="thin", color="C5CED3")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()
ws = wb.active
ws.title = "Perubahan"
ws.sheet_view.showGridLines = False
ws.cell(1, 1, "Laporan Perubahan Per Tahap — Portal PSI & MOC Regional Jatimbalinus").font = f(size=14, bold=True, color=NAVY)
ws.cell(2, 1, "Satu baris per perubahan. Pertanyaan hanya untuk hal yang mendesak dan penting; isi kolom Jawaban setelah dijawab.").font = f(size=9, color="6B6E72")
HR = 4
for i, (h, w) in enumerate(zip(HEAD, WIDTH), start=1):
    c = ws.cell(HR, i, h)
    c.font = f(bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(vertical="center", wrap_text=True)
    c.border = border
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[HR].height = 28

TAHAP_FILL = {T0: "EEF2F4", T1: "FFFFFF", T2: "F8FAFB", T3: "FFFFFF", T4: "F8FAFB"}
for n, (tahap, area, kerja, ok, masalah, tanya) in enumerate(ROWS, start=1):
    r = HR + n
    for i, v in enumerate([n, tahap, area, kerja, ok, masalah, tanya, ""], start=1):
        c = ws.cell(r, i, v)
        c.font = f(bold=(i == 7 and bool(v)))
        c.alignment = Alignment(vertical="top", wrap_text=True, horizontal="center" if i in (1, 5) else "left")
        c.border = border
        c.fill = PatternFill("solid", fgColor=TAHAP_FILL.get(tahap, "FFFFFF"))
    longest = max(len(kerja) / 62, len(masalah) / 50, len(tanya) / 60)
    ws.row_dimensions[r].height = max(28, min(220, 13.5 * (int(longest) + 2)))
last = HR + len(ROWS)
ws.freeze_panes = ws.cell(HR + 1, 5)
ws.auto_filter.ref = f"A{HR}:{get_column_letter(len(HEAD))}{last}"

dv = DataValidation(type="list", formula1='"Ya,Sebagian,Tidak,Belum dikerjakan"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(f"E{HR + 1}:E{last + 60}")
rng = f"E{HR + 1}:E{last + 60}"
for val, bg, fg in (("Ya", "DCFCE7", "15803D"), ("Sebagian", "FFF3D9", "B45309"), ("Tidak", "FDE8E8", "DC2626"), ("Belum dikerjakan", "ECEDED", "6B6E72")):
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[f'"{val}"'], fill=PatternFill("solid", bgColor=bg, fgColor=bg), font=Font(name="Arial", size=10, color=fg, bold=True)))

# ------------------------------------------------------------ Ringkasan
sm = wb.create_sheet("Ringkasan", 0)
sm.sheet_view.showGridLines = False
sm.column_dimensions["A"].width = 3
sm.column_dimensions["B"].width = 26
for col in "CDEFGH":
    sm.column_dimensions[col].width = 16
sm.cell(2, 2, "Ringkasan Per Tahap").font = f(size=16, bold=True, color=NAVY)
sm.cell(3, 2, "Angka dihitung otomatis dari lembar \"Perubahan\".").font = f(size=9, color="6B6E72")
heads = ["Tahap", "Jumlah perubahan", "Berhasil (Ya)", "Sebagian", "Tidak", "Belum dikerjakan", "Pertanyaan belum dijawab"]
for i, h in enumerate(heads, start=2):
    c = sm.cell(5, i, h)
    c.font = f(bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(vertical="center", wrap_text=True, horizontal="center" if i > 2 else "left")
    c.border = border
sm.row_dimensions[5].height = 32
rT = f"Perubahan!$B${HR + 1}:$B$500"
rE = f"Perubahan!$E${HR + 1}:$E$500"
rG = f"Perubahan!$G${HR + 1}:$G$500"
rH = f"Perubahan!$H${HR + 1}:$H$500"
tahaps = [T0, T1, T2, T3, T4]
for k, t in enumerate(tahaps):
    r = 6 + k
    sm.cell(r, 2, t)
    sm.cell(r, 3, f"=COUNTIF({rT},B{r})")
    sm.cell(r, 4, f'=COUNTIFS({rT},B{r},{rE},"Ya")')
    sm.cell(r, 5, f'=COUNTIFS({rT},B{r},{rE},"Sebagian")')
    sm.cell(r, 6, f'=COUNTIFS({rT},B{r},{rE},"Tidak")')
    sm.cell(r, 7, f'=COUNTIFS({rT},B{r},{rE},"Belum dikerjakan")')
    sm.cell(r, 8, f'=COUNTIFS({rT},B{r},{rG},"<>",{rH},"")')
tr = 6 + len(tahaps)
sm.cell(tr, 2, "Total")
for col in range(3, 9):
    L = get_column_letter(col)
    sm.cell(tr, col, f"=SUM({L}6:{L}{tr - 1})")
for r in range(6, tr + 1):
    for col in range(2, 9):
        c = sm.cell(r, col)
        c.border = border
        c.font = f(bold=(r == tr))
        c.alignment = Alignment(horizontal="left" if col == 2 else "center", vertical="center")
sm.cell(tr + 2, 2, "Berhasil? = Ya (selesai dan lolos uji), Sebagian (jalan tetapi ada bagian yang belum sesuai), Tidak (gagal), Belum dikerjakan (rencana).").font = f(size=9, color="3A3D40")
sm.cell(tr + 3, 2, "Pertanyaan belum dijawab = baris yang kolom Pertanyaannya terisi sementara kolom Jawaban masih kosong.").font = f(size=9, color="3A3D40")

try:
    wb.save(OUT)
    print("tersimpan:", OUT, "| baris:", len(ROWS))
except PermissionError:
    alt = OUT.replace(".xlsx", "-baru.xlsx")
    wb.save(alt)
    print("berkas asli sedang terbuka di Excel; disimpan sebagai:", alt)
