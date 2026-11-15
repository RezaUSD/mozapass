'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TicketStatus } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BoardingPassCard } from '@/components/tickets/BoardingPassCard';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';

interface BuyerTicketItem {
  id: string;
  ticketCode: string;
  qrPayload: string;
  status: TicketStatus;
  attendeeName: string;
  attendeeEmail: string;
  checkedInAt: string | null;
  orderCode: string;
  event: {
    id: string;
    title: string;
    slug: string;
    location: string;
    startTime: string;
  };
  category: {
    id: string;
    name: string;
    price: number;
  };
}

export default function BuyerTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<BuyerTicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickets() {
      try {
        const res = await fetch('/api/v1/tickets', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: BuyerTicketItem[];
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          setErrorMessage(json.error?.message || 'Gagal memuat daftar E-Ticket.');
          return;
        }
        setTickets(json.data ?? []);
      } catch {
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    }
    void loadTickets();
  }, [router]);

  return (
    <LearnifyAppShell role="BUYER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-2 sm:px-8 lg:pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181824] tracking-tight">
              My E-Tickets &amp; Boarding Pass
            </h1>
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Tunjukkan QR Code di bawah ini kepada petugas saat tiba di pintu masuk lokasi acara.
            </p>
          </div>
          <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3.5 py-1 text-xs font-extrabold text-[#181824] tabular-nums">
            {tickets.length} Tiket Aktif
          </span>
        </div>

        {/* 1. Loading Skeleton */}
        {loading && (
          <div className="space-y-6">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-64 rounded-[24px] bg-white border border-[#ECECF2] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {!loading && errorMessage && (
          <BentoCard className="border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {/* 3. Empty State */}
        {!loading && !errorMessage && tickets.length === 0 && (
          <BentoCard padding="lg" className="border-[1.5px] border-[#181824] py-12 text-center">
            <h2 className="text-lg font-extrabold text-[#181824]">Belum ada tiket aktif</h2>
            <p className="mt-1 text-sm text-[#5A5A6E]">
              Tiket ber-QR akan langsung muncul di sini begitu pembayaran pesanan Anda lunas.
            </p>
            <div className="mt-5">
              <Link href="/">
                <Button variant="primary">Cari Acara Sekarang</Button>
              </Link>
            </div>
          </BentoCard>
        )}

        {/* 4. Success State */}
        {!loading && !errorMessage && tickets.length > 0 && (
          <div className="space-y-6">
            {tickets.map((t) => (
              <div key={t.id} className="space-y-2">
                <BoardingPassCard
                  id={t.id}
                  ticketCode={t.ticketCode}
                  qrPayload={t.qrPayload}
                  status={t.status}
                  attendeeName={t.attendeeName}
                  attendeeEmail={t.attendeeEmail}
                  checkedInAt={t.checkedInAt}
                  orderCode={t.orderCode}
                  eventTitle={t.event.title}
                  eventLocation={t.event.location}
                  eventStartTime={t.event.startTime}
                  categoryName={t.category.name}
                  categoryPrice={t.category.price}
                />
                <div className="flex justify-end">
                  <Link
                    href={`/my-tickets/${t.id}`}
                    className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#F05A36] hover:text-white transition-colors"
                  >
                    Buka Layar Penuh untuk Scan Pintu Masuk →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
