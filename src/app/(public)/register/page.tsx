'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { Button } from '@/components/ui/Button';
import { saveClientBearerToken } from '@/lib/client-auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'BUYER' }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { user: { role: string }; token?: string };
        error?: { message: string };
      };

      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Gagal mendaftarkan akun.');
        setIsLoading(false);
        return;
      }

      saveClientBearerToken(json.data.token);
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Koneksi ke server terputus. Periksa internet kamu.');
      setIsLoading(false);
    }
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
            <Link
              href="/login"
              className="rounded-full px-4 py-1 text-xs font-extrabold text-[#5A5A6E] hover:text-[#181824] transition-colors"
            >
              Masuk
            </Link>
            <span className="rounded-full bg-[#181824] px-4 py-1 text-xs font-extrabold text-white">
              Daftar
            </span>
          </div>
        </div>

        {/* Gen-Z Tactile Bento Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 5 Cols: Dark Aesthetic Onboarding Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-[28px] border-[1.5px] border-[#181824] bg-[#181824] p-6 sm:p-7 text-white">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE37E] px-3 py-1 text-[11px] font-extrabold text-[#181824]">
                AKUN PEMBELI
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.15] tracking-tight">
                Mulai pengalaman acara Anda bersama{' '}
                <span className="text-[#D2F865]">Mozapass.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A5A5B5] leading-relaxed">
                Daftar dalam hitungan detik untuk memesan tiket resmi dan mengelola seluruh
                E-Ticket QR Anda dalam satu tempat.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <p className="text-xs font-extrabold text-[#D2F865]">
                  Reservasi Kuota 15 Menit
                </p>
                <p className="mt-1 text-[11px] text-[#A5A5B5] leading-relaxed">
                  Kuota tiket terkunci otomatis untuk Anda selama proses pembayaran berlangsung.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#DEC9FF]/15 p-3.5">
                <p className="text-xs font-extrabold text-[#DEC9FF]">
                  Akses Penyelenggara Acara
                </p>
                <p className="mt-1 text-[11px] text-[#D4D4E0] leading-relaxed">
                  Daftar sebagai pembeli terlebih dahulu, lalu ajukan verifikasi{' '}
                  <strong className="text-white">Organizer</strong> melalui menu akun untuk
                  persetujuan Admin.
                </p>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Crisp White Register Form Card */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-[28px] border-[1.5px] border-[#181824] bg-white p-6 sm:p-8">
            <div>
              <span className="inline-block rounded-full border border-[#181824] bg-[#D2F865] px-3 py-1 text-[11px] font-extrabold text-[#181824]">
                Akun Pembeli Baru
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#181824]">
                Buat Akun Mozapass
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#6E6E82]">
                Lengkapi data di bawah ini untuk membuat akun pembeli dan memesan tiket acara.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-xs sm:text-sm font-bold text-[#8A1C24]"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-3 text-sm font-medium text-[#181824] placeholder:text-[#9E9EB0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#181824]/15 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Alamat Email
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
                    Password (Minimal 8 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Buat password yang kuat"
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
                    Daftar Sekarang →
                  </Button>
                </div>
              </form>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] pt-4 text-xs">
              <span className="text-[#6E6E82]">
                Sudah punya akun?{' '}
                <Link href="/login" className="font-extrabold text-[#F05A36] hover:underline">
                  Masuk di sini
                </Link>
              </span>
              <Link href="/" className="font-bold text-[#181824] hover:underline">
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
