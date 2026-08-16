"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { ShieldCheck, Lock, User, KeyRound, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { users, login, isLoggedIn, isAuthLoaded } = usePsi();
  
  const [selectedUserId, setSelectedUserId] = useState(users[0].id);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Automatically select the corresponding email when dropdown changes for realism
  useEffect(() => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      // Mock email based on name
      const mockedEmail = `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@pertamina.com`;
      setEmail(mockedEmail);
      setPassword("pertamina123");
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (isAuthLoaded && isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, isAuthLoaded, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      login(user);
      router.push("/");
    }
  };

  if (!isAuthLoaded) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#D9D9D9] overflow-hidden relative z-10">
        <div className="bg-[#284B63] p-6 text-center text-white relative">
          <div className="absolute top-0 right-0 bg-[#D32F2F] px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider shadow-sm">
            Restricted Access
          </div>
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-10 h-10 text-[#284B63]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">Masuk ke Portal</h1>
          <p className="text-xs text-blue-200 font-medium">Process Safety Information & MOC — Modul 02</p>
          <p className="text-[10px] text-blue-300 mt-2 font-mono">PT Pertamina (Persero) - Regional Jatimbalinus</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-2">
            <p className="text-xs text-[#284B63] font-bold mb-2 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              <span>Akses Berbasis Peran (RBAC)</span>
            </p>
            <p className="text-[11px] text-blue-800/80 leading-relaxed">
              Sistem membatasi akses data secara otomatis per fasilitas dan hak sirkuler sesuai peran Anda.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Pilih Peran</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 border border-[#D9D9D9] text-sm font-bold text-[#353535] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284B63] transition cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.location}){u.isRegionalAdmin ? " — Admin Regional" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Email Korporat (Auto-filled)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-[#D9D9D9] text-sm p-3 pl-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284B63] transition"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-[#D9D9D9] text-sm p-3 pl-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284B63] transition"
                  readOnly
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#284B63] hover:bg-[#1E3A4F] text-white font-black text-sm py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-4 active:scale-95"
          >
            <span>Masuk ke Dasbor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500 font-medium">
        Portal Dokumen PSI & MOC — Regional Jatimbalinus
      </div>
    </div>
  );
}
