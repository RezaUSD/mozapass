'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { UserRole } from '@prisma/client';
import { EventCard, type PublicEventSummary } from '@/components/events/EventCard';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  AvatarStack,
  BentoCard,
  BentoEmptyState,
  BentoErrorState,
  BentoSkeleton,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All events' },
  { id: 'MUSIC', label: 'Music & Fest' },
  { id: 'TECH', label: 'Computer Science & Tech' },
  { id: 'WORKSHOP', label: 'Workshop & Leadership' },
] as const;

function matchesCategoryTab(ev: PublicEventSummary, tabId: string): boolean {
  if (tabId === 'ALL') return true;
  const text = `${ev.title} ${ev.location}`.toLowerCase();
  if (tabId === 'MUSIC') {
    return text.includes('music') || text.includes('fest') || text.includes('konser');
  }
  if (tabId === 'TECH') {
    return (
      text.includes('tech') ||
      text.includes('cloud') ||
      text.includes('distributed') ||
      text.includes('systems')
    );
  }
  if (tabId === 'WORKSHOP') {
    return (
      text.includes('workshop') ||
      text.includes('speaking') ||
      text.includes('leadership') ||
      text.includes('design')
    );
  }
  return true;
}

interface RoleFeatureAction {
  num: string;
  title: string;
  subtitle: string;
  ownerLabel: string;
  ownerInitial: string;
  ownerColor: string;
  rightBadge: string;
  href: string;
}

function getRoleSpecificFeatureRows(role: UserRole | undefined): RoleFeatureAction[] {
  if (role === 'ORGANIZER') {
    return [
      {
        num: '04',
        title: 'Dashboard Ringkasan Penjualan & Kehadiran Peserta',
        subtitle: 'Pantau total pendapatan lunas, tiket terjual, dan kehadiran pengunjung',
        ownerLabel: 'Raka Organizer',
        ownerInitial: 'R',
        ownerColor: 'bg-[#DEC9FF]',
        rightBadge: 'Analitik',
        href: '/organizer/dashboard',
      },
      {
        num: '05',
        title: 'Kelola Acara, Kategori Tiket, Panitia & Laporan CSV',
        subtitle: 'Atur kuota kategori tiket, tugaskan tim pintu masuk, dan unduh data peserta',
        ownerLabel: 'Event Manager',
        ownerInitial: 'M',
        ownerColor: 'bg-[#FFE37E]',
        rightBadge: 'Kelola',
        href: '/organizer/events',
      },
    ];
  }

  if (role === 'STAFF') {
    return [
      {
        num: '04',
        title: 'Pilih Acara Tugas & Buka Kamera Scanner Pintu Masuk',
        subtitle: 'Pindai QR E-Ticket pengunjung dengan cepat di pintu masuk venue',
        ownerLabel: 'Dina Panitia',
        ownerInitial: 'D',
        ownerColor: 'bg-[#C6EAFF]',
        rightBadge: 'Gate Scanner',
        href: '/scanner',
      },
      {
        num: '05',
        title: 'Input Kode Tiket Manual Pintu Masuk',
        subtitle: 'Tetap bisa check-in dengan mengetik nomor tiket jika kamera tidak aktif',
        ownerLabel: 'Gate Officer',
        ownerInitial: 'G',
        ownerColor: 'bg-[#FFE37E]',
        rightBadge: 'Input Manual',
        href: '/scanner',
      },
    ];
  }

  if (role === 'ADMIN') {
    return [
      {
        num: '04',
        title: 'Panel Moderasi Katalog Acara Publik',
        subtitle: 'Tinjau, tangguhkan sementara, atau pulihkan tayangan acara di katalog',
        ownerLabel: 'Admin Moderator',
        ownerInitial: 'A',
        ownerColor: 'bg-[#D8F5B8]',
        rightBadge: 'Moderasi',
        href: '/admin/events',
      },
      {
        num: '05',
        title: 'Perlindungan Keamanan Katalog & Transaksi',
        subtitle: 'Pastikan seluruh acara yang tayang mematuhi standar komunitas Mozapass',
        ownerLabel: 'System Guard',
        ownerInitial: 'S',
        ownerColor: 'bg-[#FFE37E]',
        rightBadge: 'Aktif',
        href: '/admin/events',
      },
    ];
  }

  if (role === 'BUYER') {
    return [
      {
        num: '04',
        title: 'Dompet E-Ticket & QR Boarding Pass Saya',
        subtitle: 'Tunjukkan QR Code tiket Anda saat tiba di pintu masuk lokasi acara',
        ownerLabel: 'Pembeli',
        ownerInitial: 'B',
        ownerColor: 'bg-[#E6F9D5]',
        rightBadge: 'E-Ticket',
        href: '/my-tickets',
      },
      {
        num: '05',
        title: 'Riwayat Pesanan & Status Pembayaran',
        subtitle: 'Lanjutkan pembayaran pesanan aktif atau cek riwayat pembelian tiket Anda',
        ownerLabel: 'Pesanan Saya',
        ownerInitial: 'P',
        ownerColor: 'bg-[#FFE37E]',
        rightBadge: 'Transaksi',
        href: '/my-orders',
      },
    ];
  }

  // Tampilan awal (Guest / belum login): wajib masuk atau daftar untuk akses fitur
  return [
    {
      num: '04',
      title: 'Masuk ke Akun Mozapass',
      subtitle: 'Login untuk memesan tiket, melihat E-Ticket QR, atau masuk ke panel role Anda',
      ownerLabel: 'Akses Akun',
      ownerInitial: 'M',
      ownerColor: 'bg-[#FFE37E]',
      rightBadge: 'Masuk',
      href: '/login',
    },
    {
      num: '05',
      title: 'Daftar Akun Pembeli Baru',
      subtitle: 'Buat akun gratis untuk memesan tiket acara dengan kuota real-time',
      ownerLabel: 'Pengunjung',
      ownerInitial: 'D',
      ownerColor: 'bg-[#E6F9D5]',
      rightBadge: 'Daftar',
      href: '/register',
    },
  ];
}

export default function PublicCatalogPage() {
  const [events, setEvents] = useState<PublicEventSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [user, setUser] = useState<{ name: string; role: UserRole } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { user: { name: string; role: UserRole } } } | null) => {
        if (json?.data?.user) {
          setUser(json.data.user);
        }
      })
      .catch(() => null);
  }, []);

  const loadCatalog = useCallback(async (q?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const url = q
        ? `/api/v1/events?q=${encodeURIComponent(q)}`
        : '/api/v1/events';
      const res = await fetch(url);
      const json = (await res.json()) as {
        success: boolean;
        data?: PublicEventSummary[];
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Gagal memuat katalog acara.');
      } else {
        setEvents(json.data);
      }
    } catch {
      setErrorMessage('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      void loadCatalog('');
      return;
    }
    const timer = setTimeout(() => {
      void loadCatalog(searchQuery);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery, loadCatalog]);

  const filteredEvents = events.filter((ev) => matchesCategoryTab(ev, activeTab));
  const primaryEvent = filteredEvents[0] ?? events[0];
  const topShowcaseCards = filteredEvents.slice(0, 3);
  const roleFeatureRows = getRoleSpecificFeatureRows(user?.role);

  return (
    <LearnifyAppShell role={user?.role ?? 'PUBLIC'} userName={user?.name}>
      <TopHeader
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search events, concerts..."
      />

      {/* Section Header: "Featured Events" di kiri + Filter Pills di kanan persis seperti Learnify */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#181824]">
            Featured Events
          </h1>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'shrink-0 rounded-xl px-3 py-1.5 sm:py-1 text-xs font-bold transition-colors border-[1.5px]',
                  isSelected
                    ? 'border-[#181824] bg-[#181824] text-white'
                    : 'border-[#181824] bg-white text-[#181824] hover:bg-[#FFE37E]/40',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BARIS ATAS: 3 Kartu Pastel (#FFE37E, #DEC9FF, #C6EAFF) - Swipeable horizontal di mobile, Grid 3 kolom di desktop */}
      {isLoading ? (
        <div className="flex overflow-x-auto no-scrollbar gap-3 -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4 mb-4">
          <BentoSkeleton className="h-44 shrink-0 w-[82vw] max-w-[320px] md:w-full md:max-w-none" />
          <BentoSkeleton className="h-44 shrink-0 w-[82vw] max-w-[320px] md:w-full md:max-w-none" />
          <BentoSkeleton className="h-44 shrink-0 w-[82vw] max-w-[320px] md:w-full md:max-w-none" />
        </div>
      ) : errorMessage ? (
        <div className="mb-4">
          <BentoErrorState
            message={errorMessage}
            onRetry={() => loadCatalog(searchQuery)}
          />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="mb-4">
          <BentoEmptyState
            title="Belum ada acara pada filter ini"
            description="Coba pilih kategori 'All events' atau gunakan kata kunci pencarian lain."
            actionLabel="Tampilkan Semua Acara"
            onAction={() => {
              setActiveTab('ALL');
              setSearchQuery('');
            }}
          />
        </div>
      ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4 mb-4">
          {topShowcaseCards.map((ev, index) => (
            <div
              key={ev.id}
              className="shrink-0 w-[82vw] max-w-[320px] snap-start md:w-auto md:max-w-none flex flex-col [&>*]:h-full"
            >
              <EventCard event={ev} index={index} />
            </div>
          ))}
        </div>
      )}

      {/* BARIS BAWAH: Split 8 Kolom Kiri (Tabel Bernomor 01..05) + 4 Kolom Kanan (Dark Spotlight Card #232329 Sesuai Role) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Kiri (8 Kolom): Jadwal & Fitur Sesuai Role */}
        <BentoCard
          variant="surface"
          padding="md"
          className="lg:col-span-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h2 className="text-base sm:text-lg font-extrabold text-[#181824]">
                Upcoming Sessions &amp; Quick Access ({user?.role ?? 'BUYER'})
              </h2>
              <Link
                href={
                  user?.role === 'ORGANIZER'
                    ? '/organizer/events'
                    : user?.role === 'STAFF'
                      ? '/scanner'
                      : user?.role === 'ADMIN'
                        ? '/admin/events'
                        : '/my-orders'
                }
                className="text-xs font-bold text-[#F05A36] hover:underline"
              >
                {user?.role === 'ORGANIZER'
                  ? 'Kelola semua acara →'
                  : user?.role === 'STAFF'
                    ? 'Buka scanner tugas →'
                    : user?.role === 'ADMIN'
                      ? 'Buka panel moderasi →'
                      : 'Lihat pesanan saya →'}
              </Link>
            </div>

            {/* Header Kolom Tabel */}
            <div className="grid grid-cols-12 border-b border-[#E4E4EC] pb-1.5 text-[11px] font-semibold text-[#6E6E82]">
              <div className="col-span-8 sm:col-span-7">Event / Feature</div>
              <div className="hidden sm:block sm:col-span-3">Organizer / Role</div>
              <div className="col-span-4 sm:col-span-2 text-right">Price / Status</div>
            </div>

            {/* Daftar Baris Bernomor 01..05 (Hanya bagian daftar ini yang bisa di-scroll jika itemnya banyak) */}
            <div className="divide-y divide-[#E4E4EC] max-h-[260px] overflow-y-auto overflow-x-hidden subtle-scroll">
              {topShowcaseCards.map((ev, idx) => {
                const rowNum = String(idx + 1).padStart(2, '0');
                const avatarColors = ['bg-[#FFE37E]', 'bg-[#DEC9FF]', 'bg-[#C6EAFF]'];
                return (
                  <Link
                    key={`row-${ev.id}`}
                    href={`/events/${ev.slug}`}
                    className="grid grid-cols-12 items-center py-3.5 hover:bg-[#F7F7FA] px-1.5 sm:px-2 rounded-xl transition-colors"
                  >
                    <div className="col-span-8 sm:col-span-7 min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-extrabold text-[#181824] truncate">
                        {rowNum}. {ev.title}
                      </p>
                      <p className="text-[11px] text-[#6E6E82] truncate">
                        {ev.location} • {formatEventDateTime(ev.startTime)}
                      </p>
                    </div>

                    <div className="hidden sm:flex sm:col-span-3 items-center gap-2 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#181824] text-[11px] font-extrabold text-[#181824] ${avatarColors[idx % avatarColors.length]}`}
                      >
                        {ev.organizerName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-[#181824] truncate">
                        {ev.organizerName}
                      </span>
                    </div>

                    <div className="col-span-4 sm:col-span-2 text-right tabular-nums">
                      <span className="text-xs font-extrabold text-[#181824] block">
                        {formatRupiah(ev.startingPrice, true)}
                      </span>
                      <span className="text-[10px] font-semibold text-[#6E6E82]">
                        {ev.totalAvailableQuota} left
                      </span>
                    </div>
                  </Link>
                );
              })}

              {/* Baris 04 & 05 Otomatis Menyesuaikan Role Aktif (BUYER / ORGANIZER / STAFF / ADMIN) */}
              {roleFeatureRows.map((feat) => (
                <Link
                  key={feat.num}
                  href={feat.href}
                  className="grid grid-cols-12 items-center py-3.5 hover:bg-[#F7F7FA] px-1.5 sm:px-2 rounded-xl transition-colors"
                >
                  <div className="col-span-8 sm:col-span-7 min-w-0 pr-2">
                    <p className="text-xs sm:text-sm font-extrabold text-[#181824] truncate">
                      {feat.num}. {feat.title}
                    </p>
                    <p className="text-[11px] text-[#6E6E82] truncate">{feat.subtitle}</p>
                  </div>
                  <div className="hidden sm:flex sm:col-span-3 items-center gap-2 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#181824] text-[11px] font-extrabold text-[#181824] ${feat.ownerColor}`}
                    >
                      {feat.ownerInitial}
                    </span>
                    <span className="text-xs font-semibold text-[#181824] truncate">
                      {feat.ownerLabel}
                    </span>
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right tabular-nums">
                    <span className="inline-block rounded-full border border-[#181824] bg-[#FFE37E] px-2 py-0.5 text-[10px] font-extrabold text-[#181824]">
                      {feat.rightBadge}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Kanan (4 Kolom): Dark Charcoal Spotlight Card (#232329) yang Menyesuaikan Role Aktif */}
        <BentoCard
          variant="dark"
          padding="lg"
          className="lg:col-span-4 flex flex-col justify-between gap-6"
        >
          {user?.role === 'ORGANIZER' ? (
            <>
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#9E9EB0]">
                  Organizer Workspace Active
                </p>
                <span className="inline-block rounded-lg bg-[#DEC9FF] px-3 py-1 text-xs font-extrabold text-[#181824]">
                  ORGANIZER • Penyelenggara
                </span>
                <h3 className="text-xl font-extrabold leading-snug text-white">
                  Kelola Acara, Kuota Anti-Oversell &amp; Laporan CSV Peserta
                </h3>
                <div className="pt-1 space-y-2">
                  <p className="text-xs font-medium text-[#9E9EB0]">
                    4 acara terdaftar di akun Anda
                  </p>
                  <AvatarStack countLabel="ORG" badgeBgClass="bg-[#FFE37E] text-[#181824]" />
                </div>
              </div>
              <div className="space-y-2">
                <Link href="/organizer/dashboard" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Buka Dashboard Organizer →
                  </Button>
                </Link>
                <Link href="/organizer/events/new" className="block">
                  <Button variant="lime" size="md" fullWidth>
                    + Buat Acara Baru
                  </Button>
                </Link>
              </div>
            </>
          ) : user?.role === 'STAFF' ? (
            <>
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#9E9EB0]">
                  Gate Scanner Staff Active
                </p>
                <span className="inline-block rounded-lg bg-[#C6EAFF] px-3 py-1 text-xs font-extrabold text-[#181824]">
                  STAFF • Panitia Pintu Masuk
                </span>
                <h3 className="text-xl font-extrabold leading-snug text-white">
                  Buka Kamera QR Scanner &amp; Validasi Tiket Pengunjung
                </h3>
                <div className="pt-1 space-y-2">
                  <p className="text-xs font-medium text-[#9E9EB0]">
                    Dilengkapi Fallback Input Kode Manual (E-005)
                  </p>
                  <AvatarStack countLabel="GATE" badgeBgClass="bg-[#FFE37E] text-[#181824]" />
                </div>
              </div>
              <div className="space-y-2">
                <Link href="/scanner" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Buka Kamera Scanner QR →
                  </Button>
                </Link>
              </div>
            </>
          ) : user?.role === 'ADMIN' ? (
            <>
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#9E9EB0]">
                  System Moderator Active
                </p>
                <span className="inline-block rounded-lg bg-[#D8F5B8] px-3 py-1 text-xs font-extrabold text-[#181824]">
                  ADMIN • Moderator Katalog
                </span>
                <h3 className="text-xl font-extrabold leading-snug text-white">
                  Moderasi Katalog Acara Publik (Suspend ST-004 / Restore ST-005)
                </h3>
                <div className="pt-1 space-y-2">
                  <p className="text-xs font-medium text-[#9E9EB0]">
                    Isolasi penuh dari harga &amp; kuota penyelenggara
                  </p>
                  <AvatarStack countLabel="ADM" badgeBgClass="bg-[#FFE37E] text-[#181824]" />
                </div>
              </div>
              <div className="space-y-2">
                <Link href="/admin/events" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Buka Panel Moderasi Admin →
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block rounded-lg bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                    Acara Unggulan
                  </span>
                  <span className="text-[11px] font-semibold text-[#9E9EB0]">
                    Sedang Tayang
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold leading-snug text-white">
                    {primaryEvent
                      ? primaryEvent.title
                      : 'Temukan Acara Terbaik Untukmu'}
                  </h3>
                  {primaryEvent ? (
                    <ul className="space-y-1 text-xs text-[#D4D4E0]">
                      <li className="truncate">
                        📅 {formatEventDateTime(primaryEvent.startTime)}
                      </li>
                      <li className="truncate">📍 {primaryEvent.location}</li>
                    </ul>
                  ) : (
                    <p className="text-xs text-[#9E9EB0] leading-relaxed">
                      Pilih acara favoritmu, pesan tiket dengan kuota real-time, dan dapatkan e-ticket QR instan.
                    </p>
                  )}
                </div>

                {primaryEvent && (
                  <div className="grid grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.04] py-2.5">
                    <div className="px-3.5">
                      <p className="text-[11px] font-medium text-[#9E9EB0]">
                        Mulai Dari
                      </p>
                      <p className="mt-0.5 text-sm sm:text-base font-extrabold tabular-nums text-white">
                        {formatRupiah(primaryEvent.startingPrice)}
                      </p>
                    </div>
                    <div className="px-3.5">
                      <p className="text-[11px] font-medium text-[#9E9EB0]">
                        Sisa Kuota
                      </p>
                      <p className="mt-0.5 text-sm sm:text-base font-extrabold tabular-nums text-[#FFE37E]">
                        {primaryEvent.totalAvailableQuota > 0
                          ? `${primaryEvent.totalAvailableQuota} tiket`
                          : 'Habis'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Link
                  href={
                    user
                      ? primaryEvent
                        ? `/events/${primaryEvent.slug}`
                        : '/login'
                      : '/login'
                  }
                  className="block"
                >
                  <Button variant="primary" size="lg" fullWidth>
                    {user ? 'Pesan Tiket Sekarang →' : 'Masuk untuk Pesan Tiket →'}
                  </Button>
                </Link>
                {!user && (
                  <Link
                    href="/register"
                    className="block text-center text-[11px] font-semibold text-[#9E9EB0] hover:text-white"
                  >
                    Belum punya akun? Daftar sekarang →
                  </Link>
                )}
              </div>
            </>
          )}
        </BentoCard>
      </div>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
