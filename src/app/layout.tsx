import "./globals.css";
import React from "react";
import ClientProvider from "@/components/ClientProvider";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

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
    <html lang="id">
      <body className="min-h-screen bg-slate-100 flex flex-col antialiased">
        <ClientProvider>
          <AuthGuard>
            <Navbar />
            <div className="flex flex-1">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 bg-slate-50">{children}</main>
                <footer className="bg-slate-100 text-slate-400 text-[10px] py-4 border-t border-[#D9D9D9] text-center font-medium">
                  &copy; 2026 PT Pertamina (Persero) — Direktorat Logistik & Infrastruktur.
                </footer>
              </div>
            </div>
          </AuthGuard>
        </ClientProvider>
      </body>
    </html>
  );
}
