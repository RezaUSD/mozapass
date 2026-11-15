'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import {
  clearClientBearerToken,
  installClientBearerFetch,
} from '@/lib/client-auth';

export type SidebarIconName =
  | 'grid'
  | 'folder'
  | 'create'
  | 'ticket'
  | 'orders'
  | 'analytics'
  | 'scanner'
  | 'shield'
  | 'support'
  | 'settings'
  | 'login'
  | 'register'
  | 'logout';

export interface SidebarNavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: SidebarIconName;
  badge?: string;
}

/**
 * Kumpulan Aset Ikon SVG Vector Line-Art (stroke 1.8px) bergaya Learnify
 * yang disesuaikan dengan fitur spesifik tiap Role di Mozapass.
 */
export function SidebarFeatureIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: SidebarIconName;
  className?: string;
}) {
  switch (name) {
    case 'grid':
      // 4-Square Bento Grid (persis ikon teratas di referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      );

    case 'folder':
      // Folder / Koleksi Acara Organizer (persis ikon ke-2 di referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h3.2a2 2 0 0 1 1.6.8l1.2 1.6a1 1 0 0 0 .8.4H18a2.5 2.5 0 0 1 2.5 2.5v8.2A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5V6.5Z" />
        </svg>
      );

    case 'create':
      // Edit / Buat Acara Baru (persis ikon ke-3 Square + Pen di referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M12 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V12" />
          <path d="m18.4 4.1 1.5 1.5a1.8 1.8 0 0 1 0 2.5L12.5 15.5 9 16l.5-3.5 7.4-7.4a1.8 1.8 0 0 1 1.5-1Z" />
        </svg>
      );

    case 'orders':
      // Wallet / Transaksi Pesanan & Checkout (persis ikon ke-4 di referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M3.5 9.5h17" />
          <path d="M8 14.5h4" />
        </svg>
      );

    case 'ticket':
      // E-Ticket Boarding Pass QR (fitur utama BUYER S-007)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M3.5 8A2.5 2.5 0 0 1 6 5.5h12A2.5 2.5 0 0 1 20.5 8v2a2 2 0 0 0 0 4v2A2.5 2.5 0 0 1 18 18.5H6A2.5 2.5 0 0 1 3.5 16v-2a2 2 0 0 0 0-4V8Z" />
          <path d="M13 6v12" strokeDasharray="2 2" />
          <path d="M7.5 10.5h2v3h-2z" />
        </svg>
      );

    case 'analytics':
      // Bento Analytics & Pillar Chart (fitur utama ORGANIZER S-009)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M8 16v-4" />
          <path d="M12 16V8" />
          <path d="M16 16v-6" />
        </svg>
      );

    case 'scanner':
      // QR Viewfinder Scanner Pintu Masuk (fitur utama STAFF S-008)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v2" />
          <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
          <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
          <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
        </svg>
      );

    case 'shield':
      // Admin Moderation Shield (fitur utama ADMIN S-013 ST-004/ST-005)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M12 3.5 5 6.5v5.3c0 4.5 3 8.5 7 9.7 4-1.2 7-5.2 7-9.7V6.5l-7-3Z" />
          <path d="m9.5 12 1.8 1.8 3.5-3.6" />
        </svg>
      );

    case 'support':
      // Headset Bantuan / Info Role (persis ikon headset di bawah referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" />
          <rect x="3.5" y="13" width="3.5" height="6" rx="1.5" />
          <rect x="17" y="13" width="3.5" height="6" rx="1.5" />
        </svg>
      );

    case 'settings':
      // Gear Settings / Ganti Akun (persis ikon roda gigi di bawah referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );

    case 'login':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M15 4.5h3a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-3" />
          <path d="M3.5 12h11" />
          <path d="m11.5 8.5 3.5 3.5-3.5 3.5" />
        </svg>
      );

    case 'register':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="9.5" cy="8.5" r="3.5" />
          <path d="M3.5 19.5a6 6 0 0 1 12 0" />
          <path d="M19 8v6" />
          <path d="M16 11h6" />
        </svg>
      );

    case 'logout':
      // Circle Exit Arrow (persis ikon paling kiri bawah di referensi Learnify)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M14 19.5A8 8 0 1 1 14 4.5" />
          <path d="M10 12h10" />
          <path d="m17 9 3 3-3 3" />
        </svg>
      );
  }
}

const ORGANIZER_ITEMS: SidebarNavItem[] = [
  {
    label: 'Dashboard Analitik & Grafik Penjualan (S-009)',
    shortLabel: 'Analitik',
    href: '/organizer/dashboard',
    icon: 'analytics',
  },
  {
    label: 'Kelola Acara, Kuota, Peserta CSV & Staff (S-010..S-012)',
    shortLabel: 'Acara',
    href: '/organizer/events',
    icon: 'folder',
  },
  {
    label: 'Buat Acara & Kategori Tiket Baru (S-010)',
    shortLabel: 'Buat',
    href: '/organizer/events/new',
    icon: 'create',
  },
  {
    label: 'Lihat Katalog Acara Publik (S-003)',
    shortLabel: 'Katalog',
    href: '/',
    icon: 'grid',
  },
];

const ADMIN_ITEMS: SidebarNavItem[] = [
  {
    label: 'Moderasi Katalog: Suspend & Restore Acara (S-013)',
    shortLabel: 'Moderasi',
    href: '/admin/events',
    icon: 'shield',
  },
  {
    label: 'Katalog Acara Publik (S-003)',
    shortLabel: 'Katalog',
    href: '/',
    icon: 'grid',
  },
];

const STAFF_ITEMS: SidebarNavItem[] = [
  {
    label: 'Kamera Scanner QR & Input Kode Manual (S-008)',
    shortLabel: 'Scanner',
    href: '/scanner',
    icon: 'scanner',
  },
  {
    label: 'Katalog Acara Publik (S-003)',
    shortLabel: 'Katalog',
    href: '/',
    icon: 'grid',
  },
];

const BUYER_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    label: 'Jelajah Katalog Acara Publik (S-003)',
    shortLabel: 'Katalog',
    href: '/',
    icon: 'grid',
  },
  {
    label: 'Dompet E-Ticket QR Boarding Pass Saya (S-007)',
    shortLabel: 'Tiket QR',
    href: '/my-tickets',
    icon: 'ticket',
  },
  {
    label: 'Riwayat Pesanan & Checkout 15 Menit (S-005 & S-006)',
    shortLabel: 'Pesanan',
    href: '/my-orders',
    icon: 'orders',
  },
  {
    label: 'Ajukan Upgrade Menjadi Organizer',
    shortLabel: 'Jadi Org',
    href: '/become-organizer',
    icon: 'create',
  },
];

const PUBLIC_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    label: 'Jelajah Katalog Acara Publik (S-003)',
    shortLabel: 'Katalog',
    href: '/',
    icon: 'grid',
  },
  {
    label: 'Masuk ke Akun Mozapass (S-001)',
    shortLabel: 'Masuk',
    href: '/login',
    icon: 'login',
  },
  {
    label: 'Daftar Akun Pembeli Baru (S-002)',
    shortLabel: 'Daftar',
    href: '/register',
    icon: 'register',
  },
];

export function getNavItemsForRole(role: UserRole | 'PUBLIC'): SidebarNavItem[] {
  if (role === 'PUBLIC') {
    return PUBLIC_SIDEBAR_ITEMS;
  }
  if (role === 'ORGANIZER') {
    return ORGANIZER_ITEMS;
  }
  if (role === 'ADMIN') {
    return ADMIN_ITEMS;
  }
  if (role === 'STAFF') {
    return STAFF_ITEMS;
  }
  return BUYER_SIDEBAR_ITEMS;
}

const ROLE_SHORT_TAG: Record<UserRole | 'PUBLIC', string> = {
  PUBLIC: 'GUEST',
  BUYER: 'BUYER',
  ORGANIZER: 'ORG',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
};

/**
 * Left Icon Rail Sidebar (#1E1E24) dengan Aset Ikon SVG Vector Line-Art
 * dan kotak aktif Warm Yellow (#FFE37E) yang disesuaikan dengan fitur tiap Role.
 */
export function DarkSidebar({
  role = 'PUBLIC',
  userName,
}: {
  role?: UserRole | 'PUBLIC';
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = getNavItemsForRole(role);

  async function handleLogout() {
    clearClientBearerToken();
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      aria-label="Navigasi Utama Sesuai Role"
      className="hidden lg:flex print:hidden flex-col items-center justify-between w-[72px] shrink-0 py-4 h-full overflow-hidden text-white select-none"
    >
      {/* Top Icons Rail Sesuai Fitur Role */}
      <div className="flex flex-col items-center gap-3.5 w-full">
        <span
          title={userName ? `${userName} (${role})` : `Role: ${role}`}
          className="rounded-lg bg-[#FFE37E]/15 border border-[#FFE37E]/40 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-[#FFE37E]"
        >
          {ROLE_SHORT_TAG[role]}
        </span>

        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/' || pathname.startsWith('/events')
              : pathname === item.href ||
                (item.href !== '/organizer/events' &&
                  pathname.startsWith(`${item.href}/`)) ||
                (item.href === '/organizer/events' &&
                  pathname.startsWith('/organizer/events') &&
                  pathname !== '/organizer/events/new');

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className="group flex flex-col items-center gap-1 w-full"
            >
              <span
                className={[
                  'relative flex h-12 w-12 items-center justify-center rounded-[18px] transition-all',
                  isActive
                    ? 'bg-[#FFE37E] text-[#181824] shadow-sm -ml-2 pl-2 w-14 rounded-l-none rounded-r-[18px]'
                    : 'text-[#9E9EB0] group-hover:bg-white/10 group-hover:text-white',
                ].join(' ')}
              >
                <SidebarFeatureIcon name={item.icon} className="h-[21px] w-[21px]" />
              </span>
              <span
                className={[
                  'text-[10px] font-bold tracking-tight transition-colors',
                  isActive
                    ? 'text-[#FFE37E]'
                    : 'text-[#8E8E9E] group-hover:text-white',
                ].join(' ')}
              >
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Utility SVG Icons (Hanya tampil saat sudah login) */}
      {role !== 'PUBLIC' ? (
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/settings"
            title="Pengaturan Akun"
            aria-label="Pengaturan Akun"
            className={[
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              pathname === '/settings'
                ? 'bg-[#FFE37E] text-[#181824]'
                : 'text-[#9E9EB0] hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            <SidebarFeatureIcon name="settings" className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar (Logout)"
            aria-label="Keluar (Logout)"
            className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl text-[#9E9EB0] hover:bg-[#FFD6D6]/20 hover:text-[#FFD6D6] transition-colors"
          >
            <SidebarFeatureIcon name="logout" className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </aside>
  );
}

/**
 * Pembungkus App Shell Learnify:
 * Latar luar #1E1E24 + Left Icon Rail (otomatis menyesuaikan role sesi aktif) + Kanvas Putih Besar rounded-[30px].
 */
export function LearnifyAppShell({
  role = 'PUBLIC',
  userName,
  children,
}: {
  role?: UserRole | 'PUBLIC';
  userName?: string;
  children: React.ReactNode;
}) {
  if (typeof window !== 'undefined') {
    installClientBearerFetch();
  }
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<{
    name: string;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { user: { name: string; role: UserRole } } } | null) => {
        if (active && json?.data?.user) {
          setSessionUser(json.data.user);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [pathname]);

  const effectiveRole: UserRole | 'PUBLIC' = sessionUser?.role ?? role;
  const effectiveUserName = userName ?? sessionUser?.name;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#1E1E24] p-2 sm:p-3 lg:p-3.5 pb-20 lg:pb-3.5 print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto flex h-full max-w-[1440px] items-stretch gap-2 lg:gap-2.5 print:block print:h-auto print:max-w-none">
        <DarkSidebar role={effectiveRole} userName={effectiveUserName} />
        <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto subtle-scroll rounded-[24px] sm:rounded-[28px] bg-white px-4 pb-4 sm:px-6 sm:pb-4 shadow-2xl print:h-auto print:overflow-visible print:rounded-none print:px-0 print:pb-0 print:shadow-none">
          {children}
        </div>
      </div>
    </div>
  );
}
