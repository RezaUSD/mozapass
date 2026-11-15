'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BentoCard, BentoSkeleton } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { clearClientBearerToken } from '@/lib/client-auth';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const ROLE_DESCRIPTION: Record<UserRole, { label: string; desc: string; homeHref: string; homeLabel: string }> = {
  BUYER: {
    label: 'BUYER • Pembeli Tiket',
    desc: 'Anda dapat menjelajahi katalog acara, memesan tiket, dan menyimpan E-Ticket QR.',
    homeHref: '/my-tickets',
    homeLabel: 'Buka Tiket QR Saya',
  },
  ORGANIZER: {
    label: 'ORGANIZER • Penyelenggara Acara',
    desc: 'Anda dapat membuat acara, mengatur kuota kategori, menugaskan panitia, dan ekspor laporan.',
    homeHref: '/organizer/dashboard',
    homeLabel: 'Buka Dashboard Organizer',
  },
  STAFF: {
    label: 'STAFF • Panitia Scanner',
    desc: 'Anda dapat mengakses daftar acara tugas dan melakukan check-in QR peserta di pintu masuk.',
    homeHref: '/scanner',
    homeLabel: 'Buka Scanner Pintu Masuk',
  },
  ADMIN: {
    label: 'ADMIN • Moderator Sistem',
    desc: 'Anda dapat memoderasi katalog acara serta meninjau pengajuan upgrade Organizer.',
    homeHref: '/admin/events',
    homeLabel: 'Buka Panel Admin',
  },
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/v1/auth/me', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: { user: SessionUser };
        };
        if (res.ok && json.success && json.data?.user) {
          setUser(json.data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [router]);

  async function handleLogout() {
    clearClientBearerToken();
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <LearnifyAppShell role={user?.role ?? 'BUYER'} userName={user?.name}>
      <TopHeader />

      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#181824]">
              Pengaturan Akun
            </h1>
            <p className="text-xs text-[#6E6E82] mt-0.5">
              Informasi profil sesi aktif, peran akses, dan pengelolaan akun Anda.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Kembali ke Katalog
            </Button>
          </Link>
        </div>

        {loading || !user ? (
          <BentoCard variant="surface" padding="lg">
            <BentoSkeleton className="h-44 w-full" />
          </BentoCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 Cols: Profil Akun */}
            <BentoCard
              variant="surface"
              padding="lg"
              className="lg:col-span-7 border-[1.5px] border-[#181824] flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-[1.5px] border-[#181824] bg-[#FFE37E] text-lg font-extrabold text-[#181824]">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#181824]">{user.name}</h2>
                    <p className="text-xs font-medium text-[#6E6E82]">{user.email}</p>
                  </div>
                </div>

                <div className="rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] p-4 space-y-2">
                  <span className="inline-block rounded-full border border-[#181824] bg-[#D2F865] px-3 py-0.5 text-[11px] font-extrabold text-[#181824]">
                    {ROLE_DESCRIPTION[user.role].label}
                  </span>
                  <p className="text-xs text-[#5A5A6E] leading-relaxed">
                    {ROLE_DESCRIPTION[user.role].desc}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#ECECF2]">
                <Link href={ROLE_DESCRIPTION[user.role].homeHref}>
                  <Button variant="primary" size="md">
                    {ROLE_DESCRIPTION[user.role].homeLabel} →
                  </Button>
                </Link>
                {user.role === 'BUYER' && (
                  <Link href="/become-organizer">
                    <Button variant="outline" size="md">
                      Ajukan Jadi Organizer
                    </Button>
                  </Link>
                )}
              </div>
            </BentoCard>

            {/* Right 5 Cols: Dark Sesi & Aksi Akun */}
            <BentoCard
              variant="dark"
              padding="lg"
              className="lg:col-span-5 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <span className="inline-block rounded-lg bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                  Sesi Aktif
                </span>
                <h3 className="text-lg font-extrabold text-white leading-snug">
                  Ganti Akun atau Keluar dari Sesi
                </h3>
                <p className="text-xs text-[#9E9EB0] leading-relaxed">
                  Anda dapat beralih ke akun lain melalui halaman masuk atau keluar dari sesi saat
                  ini dengan aman.
                </p>
              </div>

              <div className="space-y-2.5">
                <Link href="/login" className="block">
                  <Button variant="lime" size="md" fullWidth>
                    Ganti Akun / Role Demo
                  </Button>
                </Link>
                <Button variant="danger" size="md" fullWidth onClick={handleLogout}>
                  Keluar dari Akun
                </Button>
              </div>
            </BentoCard>
          </div>
        )}
      </div>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
