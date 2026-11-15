import React from 'react';
import type { OrderStatus } from '@prisma/client';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

export interface CheckoutSummaryProps {
  orderCode: string;
  status: OrderStatus;
  eventTitle: string;
  eventLocation: string;
  eventStartTime: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
}

/**
 * Kartu ringkasan pesanan di S-005 Checkout dengan latar putih bersih & tenang (variant="calm")
 * dan rincian baris bernomor ("01.", "02.", "03.") sesuai Learnify UI (design.md v2.0.0).
 */
export function CheckoutSummary({
  orderCode,
  status,
  eventTitle,
  eventLocation,
  eventStartTime,
  categoryName,
  quantity,
  unitPrice,
  totalAmount,
  buyerName,
  buyerEmail,
}: CheckoutSummaryProps) {
  return (
    <BentoCard variant="calm" padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECECF2] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E9E] block">
            Kode Pesanan Resmi
          </span>
          <span className="font-mono text-base font-extrabold text-[#181824]">{orderCode}</span>
        </div>
        <StatusBadge type="order" status={status} />
      </div>

      <div>
        <span className="inline-block rounded-full border-[1.5px] border-[#181824] bg-[#DEC9FF] px-3 py-0.5 text-[11px] font-extrabold text-[#181824]">
          Ringkasan Acara
        </span>
        <h2 className="mt-2 text-xl font-extrabold text-[#181824]">{eventTitle}</h2>
        <p className="mt-1 text-xs font-semibold text-[#5A5A6E]">
          📅 {formatEventDateTime(eventStartTime)} • 📍 {eventLocation}
        </p>
      </div>

      {/* Tabel Rincian Bernomor ala Learnify ("01.", "02.", "03.") */}
      <div className="divide-y divide-[#ECECF2] rounded-2xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4">
        <div className="flex items-center justify-between py-3.5 text-sm">
          <div>
            <span className="font-extrabold text-[#181824]">01. Kategori Tiket</span>
            <span className="block text-xs text-[#5A5A6E]">1 pesanan mengunci 1 kategori</span>
          </div>
          <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
            {categoryName}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5 text-sm tabular-nums">
          <div>
            <span className="font-extrabold text-[#181824]">02. Harga Satuan × Kuantitas</span>
            <span className="block text-xs text-[#5A5A6E]">Harga resmi termasuk pajak acara</span>
          </div>
          <span className="font-bold text-[#181824]">
            {formatRupiah(unitPrice)} × {quantity}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5 text-sm">
          <div>
            <span className="font-extrabold text-[#181824]">03. Penerima E-Ticket QR</span>
            <span className="block text-xs text-[#5A5A6E]">{buyerEmail}</span>
          </div>
          <span className="font-bold text-[#181824]">{buyerName}</span>
        </div>

        <div className="flex items-center justify-between py-4 tabular-nums">
          <span className="text-base font-extrabold text-[#181824]">Total Pembayaran</span>
          <span className="text-2xl font-extrabold text-[#F05A36]">
            {formatRupiah(totalAmount)}
          </span>
        </div>
      </div>
    </BentoCard>
  );
}
