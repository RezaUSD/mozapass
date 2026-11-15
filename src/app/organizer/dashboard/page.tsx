'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventStatus } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  AvatarStack,
  BentoCard,
  BentoSkeleton,
  TactileQuotaBar,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

interface DashboardMetricsData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalQuota: number;
  totalCheckedIn: number;
  dailySalesChart: Array<{
    date: string;
    revenue: number;
    ticketsSold: number;
  }>;
  activeEvents: Array<{
    id: string;
    title: string;
    slug: string;
    status: EventStatus;
    startTime: string;
    location: string;
    totalQuota: number;
    soldCount: number;
    reservedCount: number;
    checkedInCount: number;
    revenue: number;
  }>;
}

export default function OrganizerBentoDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/v1/organizer/dashboard', {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: DashboardMetricsData;
          error?: { message: string };
        };
        if (!res.ok || !json.success || !json.data) {
          setErrorMessage(json.error?.message || 'Gagal memuat metrik dashboard.');
          return;
        }
        setMetrics(json.data);
      } catch {
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, [router]);

  const maxChartSold = metrics
    ? Math.max(1, ...metrics.dailySalesChart.map((d) => d.ticketsSold))
    : 1;

  const filteredEvents = metrics
    ? statusFilter === 'ALL'
      ? metrics.activeEvents
      : metrics.activeEvents.filter((ev) => ev.status === statusFilter)
    : [];

  return (
    <LearnifyAppShell role="ORGANIZER">
      <TopHeader />

      {/* Section Header sejajar penuh dengan kanvas putih Learnify */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#181824]">
            Organizer analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 no-scrollbar">
          {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((tab) => {
            const isSelected = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={[
                  'rounded-xl px-3 py-1 text-xs font-bold transition-colors border-[1.5px]',
                  isSelected
                    ? 'border-[#181824] bg-[#181824] text-white'
                    : 'border-[#181824] bg-white text-[#181824] hover:bg-[#FFE37E]/40',
                ].join(' ')}
              >
                {tab === 'ALL' ? 'All events' : tab === 'PUBLISHED' ? 'Published' : 'Draft'}
              </button>
            );
          })}
          <Link
            href="/organizer/events/new"
            className="rounded-xl border-[1.5px] border-[#181824] bg-[#F05A36] px-3 py-1 text-xs font-bold text-white hover:bg-[#D94B29] transition-colors"
          >
            + Buat Acara
          </Link>
        </div>
      </div>

      {/* 1. Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
          <BentoSkeleton className="h-44 w-full" />
          <BentoSkeleton className="h-44 w-full" />
          <BentoSkeleton className="h-44 w-full" />
        </div>
      )}

      {/* 2. Error State */}
      {!loading && errorMessage && (
        <BentoCard className="border-[#181824] bg-[#FFD6D6]">
          <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
        </BentoCard>
      )}

      {/* 3 & 4. Learnify 3 Pastel Metric Cards + Bottom Split (8-Col Table + 4-Col Dark Spotlight) */}
      {!loading && !errorMessage && metrics && (
        <div className="space-y-4">
          {/* Top Row: 3 Tactile Pastel Metric Cards (#FFE37E, #DEC9FF, #C6EAFF) sesuai proporsi EventCard */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Card 1: Warm Yellow (#FFE37E) — Revenue */}
            <BentoCard
              variant="yellow"
              padding="sm"
              className="flex flex-col justify-between gap-3.5 transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-lg bg-[#181824] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    Revenue
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="#181824"
                    stroke="#181824"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
                  </svg>
                </div>
                <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#181824] tabular-nums">
                  {formatRupiah(metrics.totalRevenue)}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#181824]/75 truncate">
                  Akumulasi seluruh pembayaran pesanan lunas
                </p>
              </div>

              <div className="space-y-3">
                <TactileQuotaBar
                  label="Pesanan Lunas"
                  rightText={`${metrics.totalTicketsSold} tiket`}
                  used={Math.max(1, metrics.totalTicketsSold)}
                  total={Math.max(1, metrics.totalQuota)}
                />
                <div className="flex items-center justify-between gap-2">
                  <AvatarStack countLabel={`+${metrics.totalTicketsSold}`} />
                  <Link href="/organizer/events">
                    <Button variant="primary" size="sm">
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            </BentoCard>

            {/* Card 2: Soft Lavender (#DEC9FF) — Tickets Sold */}
            <BentoCard
              variant="lavender"
              padding="sm"
              className="flex flex-col justify-between gap-3.5 transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-lg border border-[#181824] bg-[#FFE37E] px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824]">
                    Tickets Sold
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="#181824"
                    stroke="#181824"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
                  </svg>
                </div>
                <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#181824] tabular-nums">
                  {metrics.totalTicketsSold} / {metrics.totalQuota}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#181824]/75 truncate">
                  Total tiket terjual dari seluruh kapasitas acara
                </p>
              </div>

              <div className="space-y-3">
                <TactileQuotaBar
                  label="Progress Kuota"
                  rightText={`${metrics.totalTicketsSold}/${metrics.totalQuota} sold`}
                  used={metrics.totalTicketsSold}
                  total={Math.max(1, metrics.totalQuota)}
                />
                <div className="flex items-center justify-between gap-2">
                  <AvatarStack
                    countLabel={`+${metrics.activeEvents.length}`}
                    badgeBg="bg-[#FFE37E] text-[#181824]"
                  />
                  <Link href="/organizer/events">
                    <Button variant="primary" size="sm">
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            </BentoCard>

            {/* Card 3: Soft Sky Blue (#C6EAFF) — Check-in Attendance */}
            <BentoCard
              variant="sky"
              padding="sm"
              className="flex flex-col justify-between gap-3.5 transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-lg border border-[#181824] bg-[#DEC9FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824]">
                    Check-in Gate
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#181824"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
                  </svg>
                </div>
                <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#181824] tabular-nums">
                  {metrics.totalCheckedIn} / {metrics.totalTicketsSold}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#181824]/75 truncate">
                  Peserta sudah dipindai di pintu masuk venue
                </p>
              </div>

              <div className="space-y-3">
                <TactileQuotaBar
                  label="Hadir di Venue"
                  rightText={`${metrics.totalCheckedIn}/${metrics.totalTicketsSold} hadir`}
                  used={metrics.totalCheckedIn}
                  total={Math.max(1, metrics.totalTicketsSold)}
                />
                <div className="flex items-center justify-between gap-2">
                  <AvatarStack
                    countLabel="LIVE"
                    badgeBg="bg-[#DEC9FF] text-[#181824]"
                  />
                  <Link href="/organizer/events">
                    <Button variant="primary" size="sm">
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Bottom Split: Left 8 Cols Numbered Event Table + Chart | Right 4 Cols Dark Spotlight Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <BentoCard
              variant="surface"
              padding="md"
              className="lg:col-span-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#181824]">
                    My active events ({filteredEvents.length})
                  </h2>
                  <Link
                    href="/organizer/events"
                    className="text-xs font-bold text-[#F05A36] hover:underline"
                  >
                    View all events
                  </Link>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-bold text-[#181824]">
                      Tidak ada acara pada filter status ini
                    </p>
                    <div className="mt-3">
                      <Link href="/organizer/events/new">
                        <Button variant="primary" size="sm">
                          + Buat Acara Baru
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-12 gap-2 border-b border-[#E4E4EC] pb-1.5 text-[11px] font-semibold text-[#6E6E82]">
                      <div className="col-span-5">Event &amp; Revenue</div>
                      <div className="col-span-3">Status &amp; Quota</div>
                      <div className="col-span-4 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-[#E4E4EC] max-h-[168px] overflow-y-auto subtle-scroll pr-1">
                      {filteredEvents.map((ev, idx) => {
                        const rowNum = String(idx + 1).padStart(2, '0');
                        return (
                          <div
                            key={ev.id}
                            className="grid grid-cols-12 items-center gap-2 py-2.5 hover:bg-[#F7F7FA] -mx-2 px-2 rounded-xl transition-colors"
                          >
                            <div className="col-span-5 pr-2">
                              <p className="text-xs sm:text-sm font-extrabold text-[#181824] truncate">
                                {rowNum}. {ev.title}
                              </p>
                              <p className="text-[11px] text-[#6E6E82] truncate tabular-nums">
                                {formatEventDateTime(ev.startTime)} • {formatRupiah(ev.revenue)}
                              </p>
                            </div>

                            <div className="col-span-3 flex flex-col items-start gap-0.5">
                              <StatusBadge type="event" status={ev.status} />
                              <span className="text-[10px] font-bold text-[#5A5A6E] tabular-nums">
                                Sold {ev.soldCount}/{ev.totalQuota}
                              </span>
                            </div>

                            <div className="col-span-4 flex flex-wrap items-center justify-end gap-1.5">
                              <Link
                                href={`/organizer/events/${ev.id}/attendees`}
                                className="inline-flex items-center justify-center px-3 py-1 text-xs rounded-xl bg-white text-[#181824] border-[1.5px] border-[#181824] hover:bg-[#F7F7FA] font-bold transition-colors"
                              >
                                Peserta
                              </Link>
                              <Link
                                href={`/organizer/events/${ev.id}/staff`}
                                className="inline-flex items-center justify-center px-3 py-1 text-xs rounded-xl bg-white text-[#181824] border-[1.5px] border-[#181824] hover:bg-[#F7F7FA] font-bold transition-colors"
                              >
                                Staff
                              </Link>
                              <Link
                                href={`/organizer/events/${ev.id}/edit`}
                                className="inline-flex items-center justify-center px-3 py-1 text-xs rounded-xl bg-[#F05A36] text-white hover:bg-[#D94B29] font-bold transition-colors"
                              >
                                Edit
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tactile 7-Day Pillar Bar Chart inside Table Footer */}
              <div className="mt-3 rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#181824]">
                      Tren Penjualan 7 Hari Terakhir
                    </span>
                    <span className="rounded-full border border-[#181824] bg-[#FFE37E] px-2 py-0.5 text-[10px] font-extrabold text-[#181824] tabular-nums">
                      {metrics.dailySalesChart.reduce((acc, d) => acc + d.ticketsSold, 0)} tiket
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-[#5A5A6E]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm border border-[#181824] bg-[#FFE37E]" />
                      Hari ini
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm border border-[#181824] bg-[#DEC9FF]" />
                      6 hari sebelumnya
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {metrics.dailySalesChart.map((bar, idx) => {
                    const isLatest = idx === metrics.dailySalesChart.length - 1;
                    const heightPct =
                      bar.ticketsSold === 0
                        ? 14
                        : Math.max(22, Math.round((bar.ticketsSold / maxChartSold) * 100));
                    const [, mm, dd] = bar.date.split('-');
                    return (
                      <div
                        key={bar.date}
                        title={`${bar.date}: ${bar.ticketsSold} tiket (${formatRupiah(bar.revenue)})`}
                        className="flex flex-col items-center gap-1"
                      >
                        <span className="font-mono text-[10px] font-extrabold text-[#181824] tabular-nums">
                          {bar.ticketsSold}
                        </span>
                        {/* Dedicated fixed-height track agar persentase batang tidak pernah menabrak teks */}
                        <div className="flex h-14 w-full items-end justify-center">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={[
                              'w-full max-w-[34px] rounded-t-lg rounded-b-sm border-[1.5px] border-[#181824] transition-all',
                              isLatest
                                ? 'bg-[#FFE37E]'
                                : bar.ticketsSold > 0
                                  ? 'bg-[#DEC9FF]'
                                  : 'bg-white',
                            ].join(' ')}
                          />
                        </div>
                        <span
                          className={[
                            'font-mono text-[10px] tabular-nums',
                            isLatest ? 'font-extrabold text-[#181824]' : 'font-semibold text-[#6E6E82]',
                          ].join(' ')}
                        >
                          {dd}/{mm}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </BentoCard>

            {/* Right 4 Cols: Dark Charcoal Spotlight Card (#232329) */}
            <BentoCard
              variant="dark"
              padding="md"
              className="lg:col-span-4 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block rounded-lg bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                    Event Builder
                  </span>
                  <span className="text-[11px] font-semibold text-[#9E9EB0]">
                    Aksi Cepat
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                    Luncurkan Acara Baru &amp; Tugaskan Panitia
                  </h3>
                  <p className="text-xs text-[#9E9EB0] leading-relaxed">
                    Kelola kategori tiket, pantau kuota real-time, dan ekspor laporan peserta CSV.
                  </p>
                </div>

                <ul className="space-y-1.5 border-t border-white/10 pt-3 text-xs text-[#D4D4E0]">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D2F865]" />
                    <span>Multi-kategori tiket &amp; kuota otomatis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFE37E]" />
                    <span>Penugasan panitia scanner pintu masuk</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.04] py-2.5">
                  <div className="px-3.5">
                    <p className="text-[11px] font-medium text-[#9E9EB0]">
                      Acara Dikelola
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold tabular-nums text-white">
                      {metrics.activeEvents.length}
                    </p>
                  </div>
                  <div className="px-3.5">
                    <p className="text-[11px] font-medium text-[#9E9EB0]">
                      Tiket Terjual
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold tabular-nums text-[#FFE37E]">
                      {metrics.totalTicketsSold.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <Link href="/organizer/events/new" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    + Buat Acara Baru
                  </Button>
                </Link>
              </div>
            </BentoCard>
          </div>
        </div>
      )}

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
