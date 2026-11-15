'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { EventStatus } from '@prisma/client';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  AvatarStack,
  BentoCard,
  BentoEmptyState,
  BentoErrorState,
  BentoSkeleton,
  TactileQuotaBar,
  type BentoCardVariant,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

interface OrganizerEventItem {
  id: string;
  title: string;
  slug: string;
  location: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  moderationNote?: string | null;
  categories: Array<{
    id: string;
    name: string;
    price: number;
    totalQuota: number;
    soldCount: number;
    reservedCount: number;
  }>;
  counts: {
    tickets: number;
    orders: number;
    staffAssignments: number;
  };
}

const CARD_VARIANTS: BentoCardVariant[] = ['yellow', 'lavender', 'sky'];

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/organizer/events');
      const json = (await res.json()) as {
        success: boolean;
        data?: OrganizerEventItem[];
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Gagal memuat daftar acara.');
      } else {
        setEvents(json.data);
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi saat memuat acara.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  async function handleQuickAction(eventId: string, action: 'PUBLISH' | 'END' | 'CANCEL') {
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        alert(json.error?.message ?? 'Gagal mengubah status acara.');
        return;
      }
      await fetchEvents();
    } catch {
      alert('Gagal menghubungi server.');
    }
  }

  return (
    <LearnifyAppShell role="ORGANIZER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181824] tracking-tight">
              Manage my events ({events.length})
            </h1>
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Kelola jadwal acara, kategori tiket, kuota peserta, dan tim panitia pintu masuk.
            </p>
          </div>
          <Link href="/organizer/events/new">
            <Button variant="primary" size="md">
              + Buat Acara Baru
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            <BentoSkeleton className="h-44 w-full" />
            <BentoSkeleton className="h-44 w-full" />
          </div>
        ) : errorMessage ? (
          <BentoErrorState message={errorMessage} onRetry={fetchEvents} />
        ) : events.length === 0 ? (
          <BentoEmptyState
            title="Belum ada acara yang Anda buat"
            description="Mulai buat acara pertama Anda, atur kategori tiket dan kuota, lalu publikasikan ke katalog."
            actionLabel="+ Buat Acara Pertama"
            onAction={() => {
              window.location.href = '/organizer/events/new';
            }}
          />
        ) : (
          <div className="space-y-5">
            {events.map((ev, idx) => {
              const totalQuota = ev.categories.reduce((a, c) => a + c.totalQuota, 0);
              const totalSold = ev.categories.reduce((a, c) => a + c.soldCount, 0);
              const totalReserved = ev.categories.reduce((a, c) => a + c.reservedCount, 0);
              const variant = CARD_VARIANTS[idx % CARD_VARIANTS.length] ?? 'yellow';

              return (
                <BentoCard key={ev.id} variant={variant} padding="lg">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge type="event" status={ev.status} />
                        <span className="rounded-full border-[1.5px] border-[#181824] bg-white px-3 py-0.5 text-xs font-bold text-[#181824]">
                          📅 {formatEventDateTime(ev.startTime)} • 📍 {ev.location}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-extrabold text-[#181824]">
                        {String(idx + 1).padStart(2, '0')}. {ev.title}
                      </h2>
                      {ev.moderationNote && (
                        <p className="mt-2 rounded-xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-3 py-1.5 text-xs font-extrabold text-[#8A1C24]">
                          Catatan Moderasi Admin: {ev.moderationNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ev.status === 'DRAFT' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickAction(ev.id, 'PUBLISH')}
                        >
                          Publikasikan Acara
                        </Button>
                      )}
                      {ev.status === 'PUBLISHED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(ev.id, 'END')}
                        >
                          Akhiri Acara
                        </Button>
                      )}
                      <Link href={`/organizer/events/${ev.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit &amp; Kategori
                        </Button>
                      </Link>
                      <Link href={`/organizer/events/${ev.id}/attendees`}>
                        <Button variant="dark" size="sm">
                          Peserta &amp; CSV
                        </Button>
                      </Link>
                      <Link href={`/organizer/events/${ev.id}/staff`}>
                        <Button variant="outline" size="sm">
                          Panitia ({ev.counts.staffAssignments})
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-t border-[#181824]/15 pt-4">
                    <div className="md:col-span-5">
                      <TactileQuotaBar
                        label="Progress Penjualan"
                        rightText={`${totalSold}/${totalQuota} terjual (${totalReserved} hold)`}
                        used={totalSold + totalReserved}
                        total={Math.max(1, totalQuota)}
                      />
                    </div>

                    <div className="md:col-span-5 flex flex-wrap gap-2">
                      {ev.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3 py-1 text-xs font-extrabold text-[#181824] tabular-nums"
                        >
                          <span>{cat.name}:</span>
                          <span>{formatRupiah(cat.price, true)}</span>
                          <span className="text-[#5A5A6E]">
                            ({cat.soldCount}/{cat.totalQuota})
                          </span>
                        </span>
                      ))}
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <AvatarStack countLabel={`+${totalSold}`} />
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        )}
      </main>
    </LearnifyAppShell>
  );
}
