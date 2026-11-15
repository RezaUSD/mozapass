'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { CheckoutSummary } from '@/components/orders/CheckoutSummary';
import { CountdownBanner } from '@/components/orders/CountdownBanner';
import { AvatarStack, BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/format';

interface OrderDetailData {
  id: string;
  orderCode: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  snapToken: string | null;
  paymentRedirectUrl: string | null;
  expiresAt: string;
  paidAt: string | null;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
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
  simulatorEnabled: boolean;
}

export default function BuyerCheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'pay' | 'simulate' | 'cancel' | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orders/${params.orderId}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: OrderDetailData;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message || 'Gagal memuat detail pesanan.');
        return;
      }
      setOrder(json.data);
    } catch {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [params.orderId, router]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const handleTimerExpired = useCallback(() => {
    setOrder((prev) => (prev && prev.status === 'PENDING' ? { ...prev, status: 'EXPIRED' } : prev));
  }, []);

  async function handleSimulatePay() {
    if (!order) return;
    setActionLoading('simulate');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/simulate-pay`, {
        method: 'POST',
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Simulasi pembayaran gagal.');
        return;
      }
      await fetchOrder();
      router.push('/my-tickets');
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan saat simulasi pembayaran.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    setActionLoading('cancel');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/cancel`, {
        method: 'POST',
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Gagal membatalkan pesanan.');
        return;
      }
      await fetchOrder();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan saat membatalkan pesanan.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleMidtransPay() {
    if (!order) return;
    if (order.paymentRedirectUrl) {
      window.open(order.paymentRedirectUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <LearnifyAppShell role="BUYER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-2 sm:px-8 lg:pb-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              href="/my-orders"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
            >
              ← Kembali ke Pesanan Saya
            </Link>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#181824]">
              Checkout &amp; Pembayaran Tenang
            </h1>
          </div>
          <span className="rounded-full border-[1.5px] border-[#181824] bg-[#C6EAFF] px-3 py-1 text-xs font-extrabold text-[#181824]">
            Pembayaran Resmi
          </span>
        </div>

        {/* 1. Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-20 rounded-[22px] bg-[#ECECF2] animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 h-80 rounded-[22px] bg-white border border-[#ECECF2] animate-pulse" />
              <div className="lg:col-span-5 h-80 rounded-[22px] bg-[#232329] animate-pulse" />
            </div>
          </div>
        )}

        {/* 2. Error State */}
        {errorMessage && (
          <BentoCard variant="calm" className="mb-4 border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {/* 3. Empty State */}
        {!loading && !order && !errorMessage && (
          <BentoCard variant="calm" padding="lg" className="text-center">
            <p className="text-sm font-bold text-[#181824]">Pesanan tidak ditemukan.</p>
          </BentoCard>
        )}

        {/* 4. Success State */}
        {!loading && order && (
          <div className="space-y-5">
            {order.status === 'PENDING' && (
              <CountdownBanner
                expiresAtIso={order.expiresAt}
                onExpire={handleTimerExpired}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Calm White Checkout Summary Card (#FFFFFF) */}
              <div className="lg:col-span-7">
                <CheckoutSummary
                  orderCode={order.orderCode}
                  status={order.status}
                  eventTitle={order.event.title}
                  eventLocation={order.event.location}
                  eventStartTime={order.event.startTime}
                  categoryName={order.category.name}
                  quantity={order.quantity}
                  unitPrice={order.unitPrice}
                  totalAmount={order.totalAmount}
                  buyerName={order.buyer.name}
                  buyerEmail={order.buyer.email}
                />
              </div>

              {/* Right 5 Cols: Dark Charcoal Payment Action Card (#232329) sesuai S-005 design.md */}
              <div className="lg:col-span-5">
                {order.status === 'PENDING' && (
                  <BentoCard variant="dark" padding="lg" className="space-y-5">
                    <div>
                      <span className="inline-block rounded-full bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                        Payment Gateway
                      </span>
                      <h3 className="mt-3 text-xl font-extrabold text-white">
                        Selesaikan Pembayaran Anda
                      </h3>
                      <p className="mt-1 text-xs text-[#A5A5B5] leading-relaxed">
                        Begitu pembayaran dikonfirmasi, {order.quantity} E-Ticket ber-QR resmi akan
                        langsung diterbitkan ke akun dan email Anda.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-[#1E1E24] p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-[#A5A5B5] block">Tagihan Akhir</span>
                        <span className="text-xl font-extrabold text-white tabular-nums">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </div>
                      <AvatarStack countLabel="SSL" badgeBg="bg-[#FFE37E] text-[#181824]" />
                    </div>

                    <div className="space-y-2.5">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={handleMidtransPay}
                        isLoading={actionLoading === 'pay'}
                      >
                        Bayar via Midtrans Sandbox →
                      </Button>

                      {order.simulatorEnabled && (
                        <Button
                          variant="lime"
                          size="lg"
                          fullWidth
                          onClick={handleSimulatePay}
                          isLoading={actionLoading === 'simulate'}
                        >
                          ⚡ Simulasi Bayar Lunas (Demo Portofolio)
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={actionLoading === 'cancel'}
                        className="w-full rounded-xl border border-white/20 py-2.5 text-xs font-bold text-[#A5A5B5] hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {actionLoading === 'cancel'
                          ? 'Membatalkan...'
                          : 'Batalkan Pesanan & Kembalikan Kuota'}
                      </button>
                    </div>
                  </BentoCard>
                )}

                {order.status === 'PAID' && (
                  <BentoCard variant="dark" padding="lg" className="space-y-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[#181824] bg-[#D8F5B8] text-[#181824] text-xl font-extrabold">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white">
                        Pembayaran Lunas!
                      </h3>
                      <p className="mt-1 text-xs text-[#A5A5B5]">
                        {order.tickets.length} E-Ticket ber-QR telah diterbitkan untuk{' '}
                        <strong className="text-white">{order.buyer.email}</strong>.
                      </p>
                    </div>
                    <Link href="/my-tickets" className="block">
                      <Button variant="primary" size="lg" fullWidth>
                        Lihat E-Ticket QR Saya ({order.tickets.length} Tiket)
                      </Button>
                    </Link>
                  </BentoCard>
                )}

                {(order.status === 'EXPIRED' ||
                  order.status === 'CANCELLED' ||
                  order.status === 'FAILED') && (
                  <BentoCard variant="dark" padding="lg" className="space-y-4 text-center">
                    <span className="inline-block rounded-full bg-[#FFD6D6] px-3 py-1 text-xs font-extrabold text-[#8A1C24]">
                      Status: {order.status}
                    </span>
                    <p className="text-sm font-semibold text-white">
                      Pesanan ini sudah tidak aktif dan kuota tiket telah dikembalikan ke publik.
                    </p>
                    <Link href={`/events/${order.event.slug}`} className="block">
                      <Button variant="primary" size="md" fullWidth>
                        Pesan Ulang di Halaman Acara
                      </Button>
                    </Link>
                  </BentoCard>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
