'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { Button } from '@/components/ui/Button';
import { saveClientBearerToken } from '@/lib/client-auth';

const DEMO_ACCOUNTS = [
  {
    tag: 'BUYER',
    name: 'Pembeli',
    email: 'buyer@mozapass.local',
    pillBg: 'bg-[#FFE37E] text-[#181824]',
  },
  {
    tag: 'ORG',
    name: 'Organizer',
    email: 'organizer@mozapass.local',
    pillBg: 'bg-[#DEC9FF] text-[#181824]',
  },
  {
    tag: 'STAFF',
    name: 'Scanner',
    email: 'staff@mozapass.local',
    pillBg: 'bg-[#C6EAFF] text-[#181824]',
  },
  {
    tag: 'ADMIN',
    name: 'Moderator',
    email: 'admin@mozapass.local',
    pillBg: 'bg-[#D2F865] text-[#181824]',
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { user: { role: string; name: string }; token?: string };
        error?: { message: string };
      };

      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(
          json.error?.message ?? 'Email atau password tidak sesuai. Coba cek lagi ya.'
        );
        setIsLoading(false);
        return;
      }

      saveClientBearerToken(json.data.token);
      setSuccessMessage(`Hey ${json.data.user.name}! Mengarahkan ke workspace kamu...`);
      const role = json.data.user.role;
      if (role === 'ORGANIZER') {
        router.push('/organizer/dashboard');
      } else if (role === 'STAFF') {
        router.push('/scanner');
      } else if (role === 'ADMIN') {
        router.push('/admin/events');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setErrorMessage('Koneksi ke server terputus. Periksa internet kamu.');
      setIsLoading(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('MozaPass2026!');
    setErrorMessage(null);
  }

  return (
    <LearnifyAppShell role="PUBLIC">
      <div className="mx-auto max-w-5xl py-2 sm:py-4">
        {/* Sleek Top Header + Segmented Auth Switcher */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border-[1.5px] border-[#181824] bg-[#D2F865] text-sm font-black text-[#181824]">
              M
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#181824]">
              Mozapass
            </span>
          </Link>

          <div className="inline-flex items-center rounded-full border-[1.5px] border-[#181824] bg-[#F7F7FA] p-1">
            <span className="rounded-full bg-[#181824] px-4 py-1 text-xs font-extrabold text-white">
              Masuk
            </span>
            <Link
              href="/register"
              className="rounded-full px-4 py-1 text-xs font-extrabold text-[#5A5A6E] hover:text-[#181824] transition-colors"
            >
              Daftar
            </Link>
          </div>
        </div>

        {/* Gen-Z Tactile Bento Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 5 Cols: Dark Aesthetic Vibe Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-[28px] border-[1.5px] border-[#181824] bg-[#181824] p-6 sm:p-7 text-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D2F865] px-3 py-1 text-[11px] font-extrabold text-[#181824]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#181824]" />
                  MOZAPASS ACCESS
                </span>
                <span className="text-[11px] font-bold text-[#9E9EB0]">Tiket &amp; Check-in</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.15] tracking-tight">
                Akses tiket acara dalam{' '}
                <span className="text-[#FFE37E]">satu platform.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A5A5B5] leading-relaxed">
                Kelola pesanan, simpan E-Ticket QR resmi, dan lakukan check-in di pintu masuk
                dengan cepat dan terverifikasi.
              </p>

              {/* Mini Feature Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-xl border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-[#E4E4F0]">
                  Kuota Real-Time
                </span>
                <span className="rounded-xl border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-[#E4E4F0]">
                  E-Ticket QR Resmi
                </span>
              </div>
            </div>

            {/* Compact 2x2 Quick Demo Role Switcher */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFE37E]">
                  Isi Cepat Akun Demo
                </span>
                <span className="text-[10px] font-medium text-[#9E9EB0]">1-Klik</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const selected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemoAccount(acc.email)}
                      className={[
                        'flex items-center justify-between rounded-xl border px-2.5 py-2 text-left transition-all',
                        selected
                          ? 'border-[#FFE37E] bg-white/15'
                          : 'border-white/10 bg-[#1E1E24] hover:border-white/30',
                      ].join(' ')}
                    >
                      <span className="text-xs font-extrabold text-white truncate">
                        {acc.name}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${acc.pillBg}`}
                      >
                        {acc.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Crisp White Login Form Card */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-[28px] border-[1.5px] border-[#181824] bg-white p-6 sm:p-8">
            <div>
              <span className="inline-block rounded-full border border-[#181824] bg-[#FFE37E] px-3 py-1 text-[11px] font-extrabold text-[#181824]">
                Portal Masuk
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#181824]">
                Masuk ke Akun Anda
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#6E6E82]">
                Masukkan email dan password Anda, atau pilih akun demo di samping untuk mencoba.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-xs sm:text-sm font-bold text-[#8A1C24]"
                >
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mt-4 rounded-2xl border-[1.5px] border-[#181824] bg-[#D2F865] px-4 py-3 text-xs sm:text-sm font-extrabold text-[#181824]"
                >
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kamu@email.com"
                    className="w-full rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-3 text-sm font-medium text-[#181824] placeholder:text-[#9E9EB0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#181824]/15 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password kamu"
                      className="w-full rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] pl-4 pr-16 py-3 text-sm font-medium text-[#181824] placeholder:text-[#9E9EB0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#181824]/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-extrabold text-[#5A5A6E] hover:bg-[#ECECF2] hover:text-[#181824]"
                    >
                      {showPassword ? 'Sembunyi' : 'Lihat'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Masuk Sekarang →
                  </Button>
                </div>
              </form>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] pt-4 text-xs">
              <span className="text-[#6E6E82]">
                Baru di Mozapass?{' '}
                <Link href="/register" className="font-extrabold text-[#F05A36] hover:underline">
                  Buat akun pembeli gratis
                </Link>
              </span>
              <Link
                href="/"
                className="font-bold text-[#181824] hover:underline"
              >
                ← Lihat Katalog
              </Link>
            </div>
          </div>
        </div>
      </div>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
