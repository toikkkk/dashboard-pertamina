import "./globals.css";
import React from "react";
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import ClientProvider from "@/components/ClientProvider";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// Reserved for tabular figures and short data tokens only (KPI numbers, gauge %,
// table Capaian/Sisa/pct columns) — never for labels or prose, which stay in
// Public Sans/Archivo. See src/lib/domain/statusStyle.ts for the rest of the
// "Presisi Korporat" token set.
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Portal Dokumen PSI & MOC | Pertamina Regional Jatimbalinus",
  description: "Sistem manajemen dokumen Process Safety Information & Management of Change untuk Regional Jatimbalinus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${archivo.variable} ${publicSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased" style={{ background: "#E9EEF3" }}>
        <ClientProvider>
          <AuthGuard>
            <Navbar />
            <div className="flex flex-col min-w-0">
              <main className="w-full px-3.5 lg:px-6 pt-4 lg:pt-5 pb-10 lg:pb-12 relative">{children}</main>
              <footer className="text-slate-400 text-[10px] py-4 border-t border-[#D6DEE8] text-center font-medium">
                &copy; 2026 PT Pertamina (Persero) — Direktorat Logistik & Infrastruktur.
              </footer>
            </div>
          </AuthGuard>
        </ClientProvider>
      </body>
    </html>
  );
}
