import React from "react";

// Kartu widget dashboard: judul + slot kanan opsional. `id` dipakai sebagai jangkar
// (mis. #segera-kedaluwarsa) dan scroll-mt agar tidak tertutup navbar.
export default function Panel({
  title,
  right,
  id,
  className = "",
  children,
}: {
  title: string;
  right?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 lg:p-5 scroll-mt-24 flex flex-col h-full ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-bold text-[#0F172A]">{title}</h3>
        {right && <div className="text-[11px] font-semibold text-[#3a3d40]">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="flex-1 flex items-center justify-center text-center text-[12.5px] text-[#3a3d40] py-6">{children}</p>;
}
