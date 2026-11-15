'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AvatarStack,
  BentoCard,
  type BentoVariant,
  TactileQuotaBar,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

export interface PublicEventSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerUrl?: string | null;
  location: string;
  startTime: string;
  endTime: string;
  organizerName: string;
  startingPrice: number;
  totalAvailableQuota: number;
  categoryCount: number;
}

const CARD_THEMES: Array<{
  variant: BentoVariant;
  pillClass: string;
  tagLabel: string;
  counterBadgeClass: string;
}> = [
  {
    variant: 'yellow',
    pillClass: 'bg-[#181824] text-white',
    tagLabel: 'Music & Tech',
    counterBadgeClass: 'bg-[#181824] text-white',
  },
  {
    variant: 'lavender',
    pillClass: 'bg-[#FFE37E] text-[#181824] border border-[#181824]',
    tagLabel: 'Conference',
    counterBadgeClass: 'bg-[#FFE37E] text-[#181824]',
  },
  {
    variant: 'sky',
    pillClass: 'bg-[#DEC9FF] text-[#181824] border border-[#181824]',
    tagLabel: 'Workshop',
    counterBadgeClass: 'bg-[#DEC9FF] text-[#181824]',
  },
];

/**
 * Kartu Acara bergaya Learnify Tactile Bento:
 * 1) Latar Pastel (#FFE37E / #DEC9FF / #C6EAFF) + Border 1.5px solid #181824
 * 2) Pill Kategori di kiri atas + Ikon Bookmark di kanan atas
 * 3) Judul tegas + Info Tanggal/Lokasi
 * 4) Horizontal Progress Bar Kuota Tiket
 * 5) Avatar Stack ("+120") di kiri bawah + Tombol Coral "Pesan" di kanan bawah
 */
export function EventCard({
  event,
  index = 0,
}: {
  event: PublicEventSummary;
  index?: number;
}) {
  const [bannerError, setBannerError] = useState(false);
  const theme = CARD_THEMES[index % CARD_THEMES.length] ?? CARD_THEMES[0];
  const isSoldOut = event.totalAvailableQuota <= 0;
  const estimatedTotal = Math.max(150, event.totalAvailableQuota + 25);
  const soldOrBooked = Math.max(12, estimatedTotal - event.totalAvailableQuota);
  const fillPct = isSoldOut
    ? 100
    : Math.min(92, Math.max(24, Math.round((soldOrBooked / estimatedTotal) * 100)));

  return (
    <BentoCard
      variant={theme.variant}
      padding="sm"
      className="flex flex-col justify-between gap-3.5 transition-transform duration-150 hover:-translate-y-0.5"
    >
      {/* Top Row: Category Pill + Bookmark Icon */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold ${theme.pillClass}`}
          >
            {theme.tagLabel}
          </span>
          <span
            aria-hidden="true"
            className="text-[#181824]"
            title={`${event.categoryCount} Kategori Tiket`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={index < 2 ? '#181824' : 'none'}
              stroke="#181824"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
            </svg>
          </span>
        </div>

        {/* Optional Banner Image from Organizer */}
        {event.bannerUrl && !bannerError && (
          <div className="mt-2.5 h-28 w-full overflow-hidden rounded-2xl border-[1.5px] border-[#181824] bg-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.bannerUrl}
              alt={event.title}
              onError={() => setBannerError(true)}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Title & Venue */}
        <h3 className="mt-2.5 text-base font-extrabold leading-snug text-[#181824] line-clamp-1">
          {event.title}
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold text-[#181824]/75 truncate">
          📅 {formatEventDateTime(event.startTime)} • 📍 {event.location}
        </p>
      </div>

      {/* Middle Row: Progress Bar Kuota */}
      <div className="space-y-3">
        <TactileQuotaBar
          label={isSoldOut ? 'Kuota Habis' : `Mulai ${formatRupiah(event.startingPrice, true)}`}
          rightText={
            isSoldOut ? '0 kuota tersisa' : `Sisa ${event.totalAvailableQuota} tiket`
          }
          percentage={fillPct}
        />

        {/* Bottom Row: Avatar Stack + Coral CTA Button */}
        <div className="flex items-center justify-between gap-2">
          <AvatarStack
            countLabel={`+${soldOrBooked}`}
            badgeBgClass={theme.counterBadgeClass}
          />

          <Link href={`/events/${event.slug}?theme=${theme.variant}`}>
            <Button variant={isSoldOut ? 'outline' : 'primary'} size="sm">
              {isSoldOut ? 'Detail' : 'Continue'}
            </Button>
          </Link>
        </div>
      </div>
    </BentoCard>
  );
}
