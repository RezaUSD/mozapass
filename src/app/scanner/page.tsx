'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  AvatarStack,
  BentoCard,
  TactileQuotaBar,
  type BentoCardVariant,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime } from '@/lib/format';

interface ScannerEventItem {
  id: string;
  title: string;
  slug: string;
  location: string;
  startTime: string;
  endTime: string;
  status: string;
  totalValidOrUsed: number;
  checkedInCount: number;
}

const CARD_VARIANTS: BentoCardVariant[] = ['yellow', 'lavender', 'sky'];

export default function ScannerEventSelectionPage() {
  const router = useRouter();
  const [events, setEvents] = useState<ScannerEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadScannerEvents() {
      try {
        const res = await fetch('/api/v1/scanner/events', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: ScannerEventItem[];
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          setErrorMessage(json.error?.message || 'Gagal memuat daftar acara tugas.');
          return;
        }
        setEvents(json.data ?? []);
      } catch {
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    }
    void loadScannerEvents();
  }, [router]);

  return (
    <LearnifyAppShell role="STAFF">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
              MODE PETUGAS PINTU MASUK
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#181824]">
              Pilih Acara untuk Check-in QR
            </h1>
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Pilih acara tempat Anda bertugas untuk mulai memindai tiket pengunjung.
            </p>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-[22px] bg-[#ECECF2] animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && errorMessage && (
          <BentoCard className="border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {!loading && !errorMessage && events.length === 0 && (
          <BentoCard
            padding="lg"
            className="border-[1.5px] border-[#181824] py-12 text-center"
          >
            <h2 className="text-lg font-extrabold text-[#181824]">
              Belum ada penugasan acara
            </h2>
            <p className="mt-1 text-xs text-[#5A5A6E]">
              Hubungi Organizer acara untuk menambahkan email Anda di menu Penugasan Panitia
              Scanner.
            </p>
          </BentoCard>
        )}

        {!loading && !errorMessage && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((ev, idx) => {
              const variant = CARD_VARIANTS[idx % CARD_VARIANTS.length] ?? 'yellow';
              return (
                <BentoCard
                  key={ev.id}
                  variant={variant}
                  padding="lg"
                  className="flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-bold text-white">
                        Gate Assigned
                      </span>
                      <span className="text-xs font-extrabold text-[#181824]">
                        {ev.status}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-extrabold text-[#181824]">
                      {ev.title}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-[#181824]/80">
                      📅 {formatEventDateTime(ev.startTime)} • 📍 {ev.location}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <TactileQuotaBar
                      label="Kehadiran Check-in"
                      rightText={`${ev.checkedInCount}/${ev.totalValidOrUsed} peserta hadir`}
                      used={ev.checkedInCount}
                      total={Math.max(1, ev.totalValidOrUsed)}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <AvatarStack countLabel={`+${ev.checkedInCount}`} />
                      <Link href={`/scanner/${ev.id}`}>
                        <Button variant="primary" size="md">
                          Buka Kamera Scanner →
                        </Button>
                      </Link>
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
