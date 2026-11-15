'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import {
  SidebarFeatureIcon,
  type SidebarIconName,
} from '@/components/layout/DarkSidebar';

interface MobileTabItem {
  label: string;
  href: string;
  icon: SidebarIconName;
}

const MOBILE_ROLE_TABS: Record<UserRole | 'PUBLIC', MobileTabItem[]> = {
  PUBLIC: [
    { label: 'Katalog', href: '/', icon: 'grid' },
    { label: 'Masuk', href: '/login', icon: 'login' },
    { label: 'Daftar', href: '/register', icon: 'register' },
  ],
  BUYER: [
    { label: 'Katalog', href: '/', icon: 'grid' },
    { label: 'Tiket QR', href: '/my-tickets', icon: 'ticket' },
    { label: 'Pesanan', href: '/my-orders', icon: 'orders' },
    { label: 'Akun', href: '/settings', icon: 'settings' },
  ],
  ORGANIZER: [
    { label: 'Analitik', href: '/organizer/dashboard', icon: 'analytics' },
    { label: 'Acara Saya', href: '/organizer/events', icon: 'folder' },
    { label: '+ Buat', href: '/organizer/events/new', icon: 'create' },
    { label: 'Akun', href: '/settings', icon: 'settings' },
  ],
  STAFF: [
    { label: 'Scanner QR', href: '/scanner', icon: 'scanner' },
    { label: 'Katalog', href: '/', icon: 'grid' },
    { label: 'Akun', href: '/settings', icon: 'settings' },
  ],
  ADMIN: [
    { label: 'Moderasi', href: '/admin/events', icon: 'shield' },
    { label: 'Katalog', href: '/', icon: 'grid' },
    { label: 'Akun', href: '/settings', icon: 'settings' },
  ],
};

/**
 * Navigasi Bawah Mobile-First dengan Aset Ikon SVG Vector Line-Art sesuai 4 Role RBAC.
 */
export function BuyerBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | 'PUBLIC'>('PUBLIC');

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { user: { role: UserRole } } } | null) => {
        if (!active) return;
        setRole(json?.data?.user?.role ?? 'PUBLIC');
      })
      .catch(() => {
        if (active) setRole('PUBLIC');
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const tabs = MOBILE_ROLE_TABS[role];

  return (
    <nav
      aria-label="Navigasi Mobile Sesuai Role"
      className="fixed bottom-0 left-0 right-0 z-50 print:hidden border-t border-white/10 bg-[#181824] px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] text-white shadow-[0_-6px_24px_rgba(0,0,0,0.35)] lg:hidden"
    >
      <div
        className="mx-auto grid max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/' || pathname.startsWith('/events')
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl py-1 transition-colors"
            >
              <span
                className={[
                  'flex h-7 w-12 items-center justify-center rounded-full transition-all',
                  isActive
                    ? 'bg-[#FFE37E] text-[#181824]'
                    : 'text-[#9E9EB0]',
                ].join(' ')}
              >
                <SidebarFeatureIcon name={tab.icon} className="h-4 w-4 shrink-0" />
              </span>
              <span
                className={[
                  'text-[10px] leading-none tracking-tight',
                  isActive ? 'font-extrabold text-[#FFE37E]' : 'font-semibold text-[#9E9EB0]',
                ].join(' ')}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
