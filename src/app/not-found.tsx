import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-[460px] rounded-[14px] border border-[#C5CED3] bg-white px-7 py-8 text-center shadow-[0_12px_32px_-16px_rgba(15,23,42,.25)]">
        <div className="mx-auto mb-4 h-[3px] w-10 rounded-full bg-[#0F3B59]" aria-hidden />
        <h1 className="font-heading text-[19px] font-bold text-[#0F172A]">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#3a3d40]">Alamat yang dibuka tidak ada atau sudah dipindahkan.</p>
        <Link href="/" className="mt-6 inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#0F3B59] px-5 text-[13px] font-bold text-white hover:bg-[#0B2C43]">Ke Dashboard</Link>
      </div>
    </div>
  );
}
