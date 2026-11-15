'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { saveClientBearerToken } from '@/lib/client-auth';

export interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  user?: {
    name: string;
    role: UserRole;
    email?: string;
  } | null;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
}

interface RoleQuickLink {
  label: string;
  href: string;
  highlight?: boolean;
}

const ROLE_QUICK_LINKS: Record<UserRole, RoleQuickLink[]> = {
  BUYER: [
    { label: 'Jelajah Acara', href: '/' },
    { label: 'Pesanan Saya', href: '/my-orders' },
    { label: 'E-Ticket QR Saya', href: '/my-tickets', highlight: true },
    { label: 'Jadi Organizer', href: '/become-organizer' },
  ],
  ORGANIZER: [
    { label: 'Dashboard Analitik', href: '/organizer/dashboard', highlight: true },
    { label: 'Kelola Acara & Kuota', href: '/organizer/events' },
    { label: '+ Buat Acara Baru', href: '/organizer/events/new' },
    { label: 'Katalog Publik', href: '/' },
  ],
  STAFF: [
    { label: 'Kamera Scanner & Tugas Gate', href: '/scanner', highlight: true },
    { label: 'Lihat Katalog Acara', href: '/' },
  ],
  ADMIN: [
    { label: 'Moderasi Acara (Suspend/Restore)', href: '/admin/events', highlight: true },
    { label: 'Lihat Katalog Publik', href: '/' },
  ],
};

const ROLE_BADGE_STYLE: Record<UserRole, { bg: string; label: string }> = {
  BUYER: { bg: 'bg-[#FFE37E]', label: 'BUYER • Pembeli Tiket' },
  ORGANIZER: { bg: 'bg-[#DEC9FF]', label: 'ORGANIZER • Penyelenggara' },
  STAFF: { bg: 'bg-[#C6EAFF]', label: 'STAFF • Panitia Scanner' },
  ADMIN: { bg: 'bg-[#D8F5B8]', label: 'ADMIN • Moderator Sistem' },
};

const DEMO_SWITCH_ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  email: string;
  targetPath: string;
  pillBg: string;
}> = [
  {
    role: 'BUYER',
    label: 'BUYER (Pembeli)',
    email: 'buyer@mozapass.local',
    targetPath: '/',
    pillBg: 'bg-[#FFE37E]',
  },
  {
    role: 'ORGANIZER',
    label: 'ORGANIZER (Penyelenggara)',
    email: 'organizer@mozapass.local',
    targetPath: '/organizer/dashboard',
    pillBg: 'bg-[#DEC9FF]',
  },
  {
    role: 'STAFF',
    label: 'STAFF (Scanner Pintu)',
    email: 'staff@mozapass.local',
    targetPath: '/scanner',
    pillBg: 'bg-[#C6EAFF]',
  },
  {
    role: 'ADMIN',
    label: 'ADMIN (Moderasi)',
    email: 'admin@mozapass.local',
    targetPath: '/admin/events',
    pillBg: 'bg-[#D8F5B8]',
  },
];

/**
 * Top Bar Learnify dengan Deteksi Sesi Otomatis, Navigasi Fitur Sesuai Role,
 * dan 1-Click Demo Role Switcher agar seluruh fitur per-role mudah diakses.
 */
export function TopHeader({
  title,
  subtitle,
  user: propUser,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search event, concert, city...',
}: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [fetchedUser, setFetchedUser] = useState<{
    name: string;
    role: UserRole;
    email?: string;
  } | null>(null);
  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (propUser !== undefined) return;
    let active = true;
    fetch('/api/v1/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          json: {
            data?: { user: { name: string; role: UserRole; email?: string } };
          } | null
        ) => {
          if (active && json?.data?.user) {
            setFetchedUser(json.data.user);
          }
        }
      )
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [propUser, pathname]);

  const activeUser = propUser !== undefined ? propUser : fetchedUser;

  async function handleQuickSwitchRole(
    demoEmail: string,
    role: UserRole,
    targetPath: string
  ) {
    setSwitchingRole(role);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'MozaPass2026!' }),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as {
          data?: { token?: string };
        } | null;
        saveClientBearerToken(json?.data?.token);
        router.push(targetPath);
        router.refresh();
        if (pathname === targetPath) {
          window.location.reload();
        }
      }
    } finally {
      setSwitchingRole(null);
    }
  }

  const handleTag = activeUser
    ? `@${activeUser.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : '@guest_visitor';

  const roleLinks = activeUser ? ROLE_QUICK_LINKS[activeUser.role] : [];

  return (
    <header className="lg:sticky lg:top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-2.5 mb-3 bg-white space-y-2.5 border-b border-[#F0F0F5] print:hidden">
      {/* Baris 1: Welcome Brand + Search Bar + Avatar Profile */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        <Link href="/" className="order-1 flex items-center gap-1.5 shrink-0">
          <span className="text-xs sm:text-sm font-medium text-[#6E6E82]">Welcome to</span>
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#F05A36]">
            Mozapass
          </span>
        </Link>

        {/* Search Input persis seperti di tengah atas gambar referensi Learnify */}
        {onSearchChange !== undefined && (
          <div className="relative order-3 w-full sm:order-2 sm:flex-1 sm:max-w-sm">
            <input
              type="search"
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white pl-4 pr-11 py-2 text-xs sm:text-sm font-medium text-[#181824] placeholder:text-[#9E9EB0] focus:outline-none"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F05A36] text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
          </div>
        )}

        {/* Profil & Aksi Kanan */}
        <div className="order-2 sm:order-3 flex items-center gap-2">
          {activeUser && (
            <Link
              href={
                activeUser.role === 'ORGANIZER'
                  ? '/organizer/dashboard'
                  : activeUser.role === 'STAFF'
                    ? '/scanner'
                    : activeUser.role === 'ADMIN'
                      ? '/admin/events'
                      : '/my-tickets'
              }
              title="Notifikasi & Tiket Aktif"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-[#181824] bg-white text-[#181824] hover:bg-[#FFE37E] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F05A36]" />
            </Link>
          )}

          {activeUser ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`hidden sm:inline-flex rounded-full border-[1.5px] border-[#181824] px-3 py-1 text-[11px] font-extrabold text-[#181824] ${ROLE_BADGE_STYLE[activeUser.role].bg}`}
              >
                {ROLE_BADGE_STYLE[activeUser.role].label}
              </span>

              <div className="flex items-center gap-2 rounded-full border-[1.5px] border-[#181824] bg-[#F7F7FA] px-2.5 py-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#181824] bg-[#FFE37E] text-xs font-extrabold text-[#181824]">
                  {activeUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight pr-1">
                  <span className="block text-xs font-extrabold text-[#181824]">
                    {activeUser.name}
                  </span>
                  <span className="block text-[10px] text-[#6E6E82]">{handleTag}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Masuk / Demo
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Daftar Akun
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Baris 2: Menu Fitur Sesuai Role Aktif + 1-Click Role Showcase untuk Portofolio */}
      {(process.env.NEXT_PUBLIC_ENABLE_DEMO_BAR !== 'false' || Boolean(activeUser)) && (
        <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] p-2.5 sm:p-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Kiri: Menu Fitur Berdasarkan Role Aktif atau Info Showcase Portofolio */}
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            {activeUser ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#181824] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Menu {activeUser.role}
                </span>
                {roleLinks.map((item) => {
                  const isCurrent =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        'rounded-xl border-[1.5px] border-[#181824] px-3 py-1 text-xs font-extrabold transition-colors',
                        isCurrent
                          ? 'bg-[#181824] text-[#FFE37E]'
                          : item.highlight
                            ? 'bg-[#F05A36] text-white hover:bg-[#D94B29]'
                            : 'bg-white text-[#181824] hover:bg-[#FFE37E]',
                      ].join(' ')}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#181824] bg-[#FFE37E] px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F05A36] animate-pulse" />
                  Live Showcase
                </span>
                <span className="text-xs font-semibold text-[#5A5A6E]">
                  Jelajahi fitur &amp; hak akses 4 role aplikasi secara instan →
                </span>
              </div>
            )}
          </div>

          {/* Kanan: 1-Click Role Switcher untuk Menguji 4 Role RBAC Secara Instan */}
          {process.env.NEXT_PUBLIC_ENABLE_DEMO_BAR !== 'false' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-[#6E6E82]">
                ⚡ Uji Role:
              </span>
              {DEMO_SWITCH_ACCOUNTS.map((demo) => {
                const isCurrentRole = activeUser?.role === demo.role;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    disabled={switchingRole !== null}
                    onClick={() =>
                      void handleQuickSwitchRole(demo.email, demo.role, demo.targetPath)
                    }
                    title={`Beralih ke akun ${demo.label}`}
                    className={[
                      'rounded-lg border-[1.5px] border-[#181824] px-2.5 py-1 text-[11px] font-extrabold transition-all',
                      isCurrentRole
                        ? `${demo.pillBg} text-[#181824] ring-2 ring-[#181824]`
                        : 'bg-white text-[#181824] hover:bg-[#FFE37E]/60',
                    ].join(' ')}
                  >
                    {switchingRole === demo.role ? '...' : demo.role}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Jika halaman mengirimkan title spesifik */}
      {title && (
        <div className="pt-1">
          <h1 className="text-2xl font-extrabold text-[#181824]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-[#6E6E82]">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
