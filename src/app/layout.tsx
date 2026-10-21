import "./globals.css";
import "@/styles/shell.css";
import React from "react";
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import ClientProvider from "@/components/ClientProvider";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/shell/AppShell";
import OnboardingPreferencesModal from "@/components/OnboardingPreferencesModal";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// Reserved for tabular figures and short data tokens only (KPI numbers, gauge %,
// table Capaian/Sisa/pct columns) — never for labels or prose, which stay in
// Public Sans/Archivo. See src/lib/domain/statusStyle.ts for the rest of the
// "Presisi Korporat" token set.
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "PSIOneVision | Pertamina Regional Jatimbalinus",
  description: "Sistem manajemen dokumen Process Safety Information & Management of Change untuk Regional Jatimbalinus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${archivo.variable} ${publicSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen antialiased" style={{ background: "#CAD4DA" }}>
        <ClientProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
            <OnboardingPreferencesModal />
          </AuthGuard>
        </ClientProvider>
      </body>
    </html>
  );
}
