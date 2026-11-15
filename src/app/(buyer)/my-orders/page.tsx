'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

interface BuyerOrderSummary {
  id: string;
  orderCode: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
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
  tickets: Array<{
    id: string;
    ticketCode: string;
    status: string;
  }>;
}

const FILTER_TABS: Array<{ id: 'ALL' | OrderStatus; label: string }> = [
  { id: 'ALL', label: 'Semua' },
  { id: 'PENDING', label: 'Menunggu Bayar' },
  { id: 'PAID', label: 'Lunas' },
  { id: 'EXPIRED', label: 'Kedaluwarsa' },
  { id: 'CANCELLED', label: 'Dibatalkan' },
];

export default function BuyerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/v1/orders', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: BuyerOrderSummary[];
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          setErrorMessage(json.error?.message || 'Gagal memuat riwayat pesanan.');
          return;
        }
        setOrders(json.data ?? []);
      } catch {
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    }
    void loadOrders();
  }, [router]);

  const filteredOrders =
    filterStatus === 'ALL'
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const paidOrdersCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const totalTicketsCount = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + o.tickets.length, 0);

  return (
    <LearnifyAppShell role="BUYER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-1 pb-6 pt-1 sm:px-2">
        {/* Title Row + Filter Pills */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181824] tracking-tight">
              Pesanan Saya
            </h1>
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Pantau status pembayaran, lanjutkan checkout aktif, atau buka E-Ticket QR Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => {
              const active = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={[
                    'rounded-full border-[1.5px] border-[#181824] px-3.5 py-1.5 text-xs font-bold transition-colors',
                    active
                      ? 'bg-[#181824] text-white'
                      : 'bg-white text-[#181824] hover:bg-[#FFE37E]',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-[22px] bg-white border border-[#ECECF2] animate-pulse"
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
        {!loading && !errorMessage && filteredOrders.length === 0 && (
          <BentoCard padding="lg" className="border-[1.5px] border-[#181824] text-center py-12">
            <h2 className="text-lg font-extrabold text-[#181824]">Belum ada pesanan</h2>
            <p className="mt-1 text-sm text-[#5A5A6E]">
              Anda belum memiliki transaksi pada filter status ini.
            </p>
            <div className="mt-5">
              <Link href="/">
                <Button variant="primary">Jelajahi Katalog Acara</Button>
              </Link>
            </div>
          </BentoCard>
        )}

        {/* 4. Success State: 8-Col Clean Transaction List + 4-Col Dark Wallet Summary */}
        {!loading && !errorMessage && filteredOrders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 rounded-[24px] border-[1.5px] border-[#E4E4EC] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-[#181824]">Daftar Transaksi</h2>
                <span className="rounded-full bg-[#F7F7FA] px-3 py-1 text-xs font-extrabold text-[#F05A36] tabular-nums">
                  {filteredOrders.length} transaksi
                </span>
              </div>

              <div className="hidden sm:grid grid-cols-12 gap-2 border-b border-[#ECECF2] pb-2 text-[11px] font-semibold text-[#8E8E9E]">
                <div className="col-span-6">Pesanan &amp; Acara</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-3 text-right">Total &amp; Aksi</div>
              </div>

              <div className="divide-y divide-[#ECECF2] max-h-[380px] overflow-y-auto overflow-x-hidden subtle-scroll">
                {filteredOrders.map((order, idx) => {
                  const rowNum = String(idx + 1).padStart(2, '0');
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-2.5 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 py-4 px-2 hover:bg-[#F7F7FA] rounded-xl transition-colors"
                    >
                      <div className="sm:col-span-6 min-w-0 sm:pr-2">
                        <p className="text-xs sm:text-sm font-extrabold text-[#181824] truncate">
                          {rowNum}. {order.orderCode} — {order.event.title}
                        </p>
                        <p className="text-[11px] text-[#6E6E82] mt-0.5 truncate">
                          {order.category.name} × {order.quantity} •{' '}
                          {formatEventDateTime(order.event.startTime)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:contents">
                        <div className="sm:col-span-3">
                          <StatusBadge type="order" status={order.status} />
                        </div>

                        <div className="sm:col-span-3 flex flex-col items-end gap-1.5">
                          <span className="text-xs sm:text-sm font-extrabold text-[#181824] tabular-nums">
                            {formatRupiah(order.totalAmount)}
                          </span>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {order.status === 'PENDING' && (
                              <Link href={`/orders/${order.id}/checkout`}>
                                <Button variant="primary" size="sm">
                                  Bayar
                                </Button>
                              </Link>
                            )}
                            {order.status === 'PAID' && (
                              <Link href="/my-tickets">
                                <Button variant="lime" size="sm">
                                  Lihat QR ({order.tickets.length})
                                </Button>
                              </Link>
                            )}
                            <Link
                              href={`/orders/${order.id}/checkout`}
                              className="text-[11px] font-extrabold text-[#5A5A6E] underline hover:text-[#181824]"
                            >
                              Detail
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <BentoCard
              variant="dark"
              padding="lg"
              className="lg:col-span-4 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block rounded-lg bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                    Dompet E-Ticket
                  </span>
                  {pendingOrdersCount > 0 && (
                    <span className="rounded-full bg-[#F05A36] px-2.5 py-0.5 text-[10px] font-extrabold text-white tabular-nums">
                      {pendingOrdersCount} menunggu bayar
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-white leading-snug">
                  Siap Masuk Venue Tanpa Antre Panjang
                </h3>
                <p className="text-xs text-[#9E9EB0] leading-relaxed">
                  Setelah pembayaran selesai, E-Ticket QR Anda langsung aktif dan siap dipindai
                  di pintu masuk acara.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.04] py-2.5">
                  <div className="px-3.5">
                    <p className="text-[11px] font-medium text-[#9E9EB0]">Pesanan Lunas</p>
                    <p className="mt-0.5 text-xl font-extrabold tabular-nums text-white">
                      {paidOrdersCount}
                    </p>
                  </div>
                  <div className="px-3.5">
                    <p className="text-[11px] font-medium text-[#9E9EB0]">Tiket QR Aktif</p>
                    <p className="mt-0.5 text-xl font-extrabold tabular-nums text-[#D2F865]">
                      {totalTicketsCount}
                    </p>
                  </div>
                </div>

                <Link href="/my-tickets" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Buka E-Ticket Saya →
                  </Button>
                </Link>
              </div>
            </BentoCard>
          </div>
        )}
      </main>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
