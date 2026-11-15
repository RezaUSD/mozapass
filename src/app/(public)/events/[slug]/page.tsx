'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  CategorySelector,
  type PublicTicketCategory,
} from '@/components/events/CategorySelector';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  BentoCard,
  BentoErrorState,
  BentoSkeleton,
  type BentoVariant,
  TactileQuotaBar,
} from '@/components/ui/BentoCard';
import { formatEventDateTime } from '@/lib/format';

interface PublicEventDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerUrl?: string | null;
  location: string;
  startTime: string;
  endTime: string;
  organizer: {
    id: string;
    name: string;
  };
  categories: PublicTicketCategory[];
}

function EventDetailContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const rawTheme = searchParams.get('theme');
  const activeTheme: BentoVariant =
    rawTheme === 'lavender' || rawTheme === 'sky' || rawTheme === 'yellow'
      ? rawTheme
      : 'yellow';

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/events/${encodeURIComponent(slug)}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: PublicEventDetail;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Acara tidak ditemukan.');
      } else {
        setEvent(json.data);
      }
    } catch {
      setErrorMessage('Gagal memuat detail acara. Periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const totalQuota = event
    ? event.categories.reduce((acc, c) => acc + c.totalQuota, 0)
    : 0;
  const availableQuota = event
    ? event.categories.reduce((acc, c) => acc + c.availableQuota, 0)
    : 0;
  const usedQuota = Math.max(0, totalQuota - availableQuota);

  return (
    <LearnifyAppShell role="PUBLIC">
      <TopHeader />

      <div className="mx-auto max-w-6xl px-2 pb-10 pt-1 sm:px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#181824] bg-white px-4 py-1.5 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
          >
            ← Kembali ke Katalog Acara
          </Link>
          <span className="text-xs font-bold text-[#8E8E9E]">Detail Acara &amp; Tiket</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <BentoSkeleton className="h-60 w-full" />
            <BentoSkeleton className="h-44 w-full" />
          </div>
        ) : errorMessage || !event ? (
          <BentoErrorState
            message={errorMessage ?? 'Acara tidak ditemukan.'}
            onRetry={loadDetail}
          />
        ) : (
          <div className="space-y-6">
            {/* Top Split: Left 8 Cols Dark Event Hero + Right 4 Cols Warm Yellow Quota Card sesuai S-004 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <BentoCard variant="dark" padding="lg" className="lg:col-span-8 flex flex-col justify-between">
                <div>
                  {event.bannerUrl && !bannerError && (
                    <div className="mb-4 h-44 sm:h-52 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#1E1E24]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.bannerUrl}
                        alt={event.title}
                        onError={() => setBannerError(true)}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                      Sedang Tayang
                    </span>
                    <span className="rounded-full border border-white/15 bg-[#1E1E24] px-3 py-1 text-xs font-semibold text-white">
                      Oleh {event.organizer.name}
                    </span>
                  </div>

                  <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {event.title}
                  </h1>

                  <p className="mt-3 text-sm text-[#A5A5B5] leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#1E1E24] p-4 text-xs text-white">
                  <div>
                    <span className="text-[#8E8E9E] block">Jadwal Acara</span>
                    <span className="font-bold mt-0.5 block tabular-nums">
                      📅 {formatEventDateTime(event.startTime)} –{' '}
                      {formatEventDateTime(event.endTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E8E9E] block">Lokasi Venue</span>
                    <span className="font-bold mt-0.5 block">📍 {event.location}</span>
                  </div>
                </div>
              </BentoCard>

              <BentoCard
                variant={activeTheme}
                padding="lg"
                className="lg:col-span-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-bold text-white">
                      Live Quota
                    </span>
                    <span className="text-xs font-extrabold text-[#181824] tabular-nums">
                      {event.categories.length} Kategori
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-extrabold text-[#181824]">
                    Jaminan Tiket Resmi
                  </h2>
                  <p className="mt-1.5 text-xs font-medium text-[#181824]/80 leading-relaxed">
                    Saat Anda lanjut ke pembayaran, tiket pilihan Anda otomatis diamankan selama 15
                    menit agar tidak diambil pembeli lain.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <TactileQuotaBar
                    label="Sisa Kuota"
                    rightText={`${availableQuota}/${totalQuota} tersedia`}
                    used={usedQuota}
                    total={totalQuota}
                  />
                  <div className="flex items-center justify-between border-t border-[#181824]/15 pt-3 text-xs font-extrabold text-[#181824]">
                    <span className="tabular-nums">{usedQuota} tiket terjual</span>
                    <span>{availableQuota > 0 ? 'Siap Dipesan' : 'Kuota Habis'}</span>
                  </div>
                </div>
              </BentoCard>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-[#181824]">
                  Pilih Kategori &amp; Jumlah Tiket
                </h2>
                <span className="text-xs font-bold text-[#5A5A6E]">
                  Pilih kategori tiket yang sesuai dengan kebutuhan Anda
                </span>
              </div>
              <CategorySelector
                eventId={event.id}
                categories={event.categories}
                primaryVariant={activeTheme}
                onQuotaRefreshNeeded={loadDetail}
              />
            </div>
          </div>
        )}
      </div>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <LearnifyAppShell role="PUBLIC">
          <div className="mx-auto max-w-6xl px-2 py-6 sm:px-4">
            <BentoSkeleton className="h-60 w-full" />
          </div>
        </LearnifyAppShell>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
