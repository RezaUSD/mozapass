'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TicketStatus } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BoardingPassCard } from '@/components/tickets/BoardingPassCard';
import { BentoCard } from '@/components/ui/BentoCard';

interface BuyerTicketDetail {
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

export default function SingleBuyerTicketPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<BuyerTicketDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/v1/tickets/${params.ticketId}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: BuyerTicketDetail;
          error?: { message: string };
        };
        if (!res.ok || !json.success || !json.data) {
          setErrorMessage(json.error?.message || 'Tiket tidak ditemukan.');
          return;
        }
        setTicket(json.data);
      } catch {
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    }
    void loadDetail();
  }, [params.ticketId, router]);

  return (
    <LearnifyAppShell role="BUYER">
      <TopHeader />

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-2 sm:px-8 lg:pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              href="/my-tickets"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
            >
              ← Kembali ke Daftar E-Ticket Saya
            </Link>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#181824]">
              Boarding Pass Pintu Masuk
            </h1>
          </div>
          <span className="rounded-full border-[1.5px] border-[#181824] bg-[#DEC9FF] px-3 py-1 text-xs font-extrabold text-[#181824]">
            E-Ticket Resmi
          </span>
        </div>

        {loading && (
          <div className="h-72 rounded-[24px] bg-white border border-[#ECECF2] animate-pulse" />
        )}

        {!loading && errorMessage && (
          <BentoCard className="border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {!loading && ticket && (
          <BoardingPassCard
            id={ticket.id}
            ticketCode={ticket.ticketCode}
            qrPayload={ticket.qrPayload}
            status={ticket.status}
            attendeeName={ticket.attendeeName}
            attendeeEmail={ticket.attendeeEmail}
            checkedInAt={ticket.checkedInAt}
            orderCode={ticket.orderCode}
            eventTitle={ticket.event.title}
            eventLocation={ticket.event.location}
            eventStartTime={ticket.event.startTime}
            categoryName={ticket.category.name}
            categoryPrice={ticket.category.price}
          />
        )}
      </main>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
