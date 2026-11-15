'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BentoCard,
  TactileQuotaBar,
  type BentoCardVariant,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

export interface PublicTicketCategory {
  id: string;
  name: string;
  price: number;
  totalQuota: number;
  soldCount: number;
  reservedCount: number;
  availableQuota: number;
  maxPerOrder: number;
  saleStartAt: string;
  saleEndAt: string;
}

export function getCategorySaleWindowState(
  cat: PublicTicketCategory,
  nowMs: number = Date.now()
): 'NOT_STARTED' | 'ENDED' | 'SOLD_OUT' | 'AVAILABLE' {
  const startMs = new Date(cat.saleStartAt).getTime();
  const endMs = new Date(cat.saleEndAt).getTime();

  if (nowMs < startMs) {
    return 'NOT_STARTED';
  }
  if (nowMs > endMs) {
    return 'ENDED';
  }
  if (cat.availableQuota <= 0) {
    return 'SOLD_OUT';
  }
  return 'AVAILABLE';
}

const CARD_VARIANTS: BentoCardVariant[] = ['yellow', 'lavender', 'sky'];

export function CategorySelector({
  eventId,
  categories,
  primaryVariant = 'yellow',
  onQuotaRefreshNeeded,
}: {
  eventId: string;
  categories: PublicTicketCategory[];
  primaryVariant?: BentoCardVariant;
  onQuotaRefreshNeeded?: () => void;
}) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => {
    const firstAvailable = categories.find(
      (c) => getCategorySaleWindowState(c) === 'AVAILABLE'
    );
    return firstAvailable?.id ?? null;
  });
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const maxAllowed = selectedCategory
    ? Math.min(selectedCategory.maxPerOrder, selectedCategory.availableQuota)
    : 1;
  const totalAmount = selectedCategory ? selectedCategory.price * quantity : 0;

  function handleSelectCategory(cat: PublicTicketCategory) {
    if (getCategorySaleWindowState(cat) !== 'AVAILABLE') return;
    setSelectedCategoryId(cat.id);
    setQuantity(1);
    setErrorMessage(null);
  }

  async function handleCheckout() {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketCategoryId: selectedCategory.id,
          quantity,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string; status: string };
        error?: { code: string; message: string };
      };

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Gagal memproses reservasi tiket.');
        if (json.error?.code === 'QUOTA_EXCEEDED' && onQuotaRefreshNeeded) {
          onQuotaRefreshNeeded();
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/orders/${json.data.id}/checkout`);
    } catch {
      setErrorMessage('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-sm font-extrabold text-[#8A1C24]"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Kategori Tiket (sejajar lurus dengan Event Hero Card 8 kolom di atas) */}
        <div
          className={[
            'lg:col-span-8 grid gap-4',
            categories.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
          ].join(' ')}
        >
          {categories.map((cat, idx) => {
            const state = getCategorySaleWindowState(cat);
            const isSelected = selectedCategoryId === cat.id && state === 'AVAILABLE';
            const startIdx = Math.max(0, CARD_VARIANTS.indexOf(primaryVariant));
            const variant =
              CARD_VARIANTS[(startIdx + idx) % CARD_VARIANTS.length] ?? primaryVariant;
            const usedQuota = Math.max(0, cat.totalQuota - cat.availableQuota);

            return (
              <BentoCard
                key={cat.id}
                variant={variant}
                padding="md"
                onClick={() => handleSelectCategory(cat)}
                className={[
                  'flex flex-col justify-between transition-all',
                  state === 'AVAILABLE'
                    ? 'cursor-pointer hover:-translate-y-0.5'
                    : 'opacity-65 cursor-not-allowed',
                  isSelected ? 'ring-2 ring-[#181824] shadow-md' : '',
                ].join(' ')}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-bold text-white">
                      {cat.name}
                    </span>
                    {state === 'AVAILABLE' && (
                      <span className="rounded-full border-[1.5px] border-[#181824] bg-[#D8F5B8] px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824] tabular-nums">
                        Sisa {cat.availableQuota} Kuota
                      </span>
                    )}
                    {state === 'SOLD_OUT' && (
                      <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFD6D6] px-2.5 py-0.5 text-[11px] font-extrabold text-[#8A1C24]">
                        Habis Terjual
                      </span>
                    )}
                    {state === 'NOT_STARTED' && (
                      <span className="rounded-full border-[1.5px] border-[#181824] bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824]">
                        Belum Dibuka
                      </span>
                    )}
                    {state === 'ENDED' && (
                      <span className="rounded-full border-[1.5px] border-[#181824] bg-[#ECECF2] px-2.5 py-0.5 text-[11px] font-extrabold text-[#5A5A6E]">
                        Berakhir
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-2xl font-extrabold text-[#181824] tabular-nums">
                    {formatRupiah(cat.price, true)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#181824]/80 tabular-nums">
                    Maks. {cat.maxPerOrder} tiket/order • S/d {formatEventDateTime(cat.saleEndAt)}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <TactileQuotaBar
                    label="Progress Kuota"
                    rightText={`${cat.availableQuota}/${cat.totalQuota} tersisa`}
                    used={usedQuota}
                    total={cat.totalQuota}
                    trackClass="bg-[#181824]/15"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#181824]/75 tabular-nums">
                      {cat.soldCount} terjual
                    </span>

                    {isSelected ? (
                      <span className="rounded-xl border-[1.5px] border-[#181824] bg-[#181824] px-3 py-1 text-xs font-extrabold text-[#D2F865]">
                        ✓ Di Keranjang
                      </span>
                    ) : (
                      <span className="rounded-xl border-[1.5px] border-[#181824] bg-white/80 px-3 py-1 text-xs font-extrabold text-[#181824]">
                        {state === 'AVAILABLE' ? '+ Keranjang' : 'Tidak Tersedia'}
                      </span>
                    )}
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>

        {/* Right 4 Cols: Keranjang Tiket (sejajar lurus dengan Live Quota Card 4 kolom di atas) */}
        <BentoCard
          variant="dark"
          padding="lg"
          className="lg:col-span-4 lg:sticky lg:top-20 flex flex-col justify-between gap-5"
        >
          <div className="space-y-4">
            {/* Header Keranjang dengan Aset SVG Keranjang */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE37E] text-[#181824]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M2.5 3.5h2.8l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.4-1.1l1.5-6.4H6.5" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white leading-tight">
                    Keranjang Tiket
                  </h3>
                  <p className="text-[11px] text-[#9E9EB0]">1 kategori per pesanan</p>
                </div>
              </div>

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-extrabold text-[#D2F865] tabular-nums">
                {selectedCategory ? `${quantity} item` : '0 item'}
              </span>
            </div>

            {selectedCategory ? (
              <div className="space-y-4">
                {/* Item di Keranjang */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-white">
                        {selectedCategory.name}
                      </p>
                      <p className="text-xs text-[#9E9EB0] tabular-nums">
                        {formatRupiah(selectedCategory.price, true)} / tiket
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(null);
                        setQuantity(1);
                      }}
                      className="text-[11px] font-bold text-[#9E9EB0] hover:text-[#FFD6D6] transition-colors"
                    >
                      Hapus
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#D4D4E0]">Jumlah Tiket</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 font-extrabold text-white hover:bg-white/20 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-extrabold text-white tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        disabled={quantity >= maxAllowed}
                        onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFE37E] font-extrabold text-[#181824] hover:bg-[#D2F865] disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rincian Struk */}
                <div className="space-y-2 border-t border-dashed border-white/15 pt-3 text-xs">
                  <div className="flex items-center justify-between text-[#9E9EB0]">
                    <span>Subtotal ({quantity} tiket)</span>
                    <span className="font-bold text-white tabular-nums">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#9E9EB0]">
                    <span>Biaya Layanan</span>
                    <span className="font-bold text-[#D2F865]">Gratis</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                    <span className="text-sm font-extrabold text-white">Total Pembayaran</span>
                    <span className="text-xl font-extrabold text-[#FFE37E] tabular-nums">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
                <p className="text-sm font-bold text-white">Keranjang masih kosong</p>
                <p className="mt-1 text-xs text-[#9E9EB0]">
                  Pilih kategori tiket di sebelah kiri untuk memasukkannya ke keranjang.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedCategory}
              isLoading={isSubmitting}
              onClick={handleCheckout}
            >
              Checkout Sekarang →
            </Button>
            <p className="text-center text-[11px] text-[#9E9EB0]">
              Kuota otomatis dikunci 15 menit setelah menekan Checkout
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
