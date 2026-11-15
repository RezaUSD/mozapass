'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BentoCard, type BentoCardVariant } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';

interface DraftCategory {
  name: string;
  price: number;
  totalQuota: number;
  maxPerOrder: number;
  saleStartAt: string;
  saleEndAt: string;
}

const CARD_VARIANTS: BentoCardVariant[] = ['yellow', 'lavender', 'sky'];

export default function NewOrganizerEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startTime, setStartTime] = useState('2026-12-15T10:00');
  const [endTime, setEndTime] = useState('2026-12-15T16:00');
  const [categories, setCategories] = useState<DraftCategory[]>([
    {
      name: 'Regular Pass',
      price: 150000,
      totalQuota: 100,
      maxPerOrder: 5,
      saleStartAt: '2026-11-14T00:00',
      saleEndAt: '2026-12-15T09:00',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function addCategory() {
    setCategories((prev) => [
      ...prev,
      {
        name: `Kategori ${prev.length + 1}`,
        price: 250000,
        totalQuota: 50,
        maxPerOrder: 5,
        saleStartAt: '2026-11-14T00:00',
        saleEndAt: '2026-12-15T09:00',
      },
    ]);
  }

  function removeCategory(idx: number) {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCategoryField<K extends keyof DraftCategory>(
    idx: number,
    field: K,
    value: DraftCategory[K]
  ) {
    setCategories((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        title,
        description,
        location,
        bannerUrl: bannerUrl.trim() || null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        categories: categories.map((cat) => ({
          name: cat.name,
          price: Math.trunc(Number(cat.price)),
          totalQuota: Math.trunc(Number(cat.totalQuota)),
          maxPerOrder: Math.trunc(Number(cat.maxPerOrder)),
          saleStartAt: new Date(cat.saleStartAt).toISOString(),
          saleEndAt: new Date(cat.saleEndAt).toISOString(),
        })),
      };

      const res = await fetch('/api/v1/organizer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };

      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message ?? 'Gagal menyimpan acara baru.');
        setIsLoading(false);
        return;
      }

      router.push('/organizer/events');
      router.refresh();
    } catch {
      setErrorMessage('Gagal menghubungi server.');
      setIsLoading(false);
    }
  }

  return (
    <LearnifyAppShell role="ORGANIZER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              href="/organizer/events"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
            >
              ← Kembali ke Daftar Acara
            </Link>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#181824]">
              Buat Acara Baru (S-010)
            </h1>
          </div>
          <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3.5 py-1 text-xs font-extrabold text-[#181824]">
            Disimpan sebagai DRAFT
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-sm font-extrabold text-[#8A1C24]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <BentoCard
            variant="surface"
            padding="lg"
            className="space-y-4 border-[1.5px] border-[#181824]"
          >
            <h2 className="text-lg font-extrabold text-[#181824]">01. Informasi Utama Acara</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  Judul Acara
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Mozapass Tech & Music Fest 2026"
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  Deskripsi Lengkap
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail acara, bintang tamu, dan ketentuan..."
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  Lokasi / Venue
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Jakarta Convention Center (JCC)"
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  URL Banner (Opsional)
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  Waktu Mulai Acara
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#181824] mb-1">
                  Waktu Selesai Acara
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </BentoCard>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#181824]">
                  02. Kategori Tiket &amp; Kuota Anti-Oversell
                </h2>
                <p className="text-xs font-semibold text-[#5A5A6E]">
                  Semua harga wajib integer Rupiah penuh tanpa desimal (BR-001).
                </p>
              </div>
              <Button type="button" variant="primary" size="sm" onClick={addCategory}>
                + Tambah Kategori
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {categories.map((cat, idx) => {
                const variant = CARD_VARIANTS[idx % CARD_VARIANTS.length] ?? 'yellow';
                return (
                  <BentoCard key={idx} variant={variant} padding="md" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-extrabold text-white">
                        Kategori #{idx + 1}
                      </span>
                      {categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCategory(idx)}
                          className="rounded-full border-[1.5px] border-[#181824] bg-[#FFD6D6] px-3 py-0.5 text-xs font-extrabold text-[#8A1C24]"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold mb-1">Nama Kategori</label>
                        <input
                          type="text"
                          required
                          value={cat.name}
                          onChange={(e) => updateCategoryField(idx, 'name', e.target.value)}
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold mb-1">
                          Harga (Rupiah Integer)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          step={1}
                          value={cat.price}
                          onChange={(e) =>
                            updateCategoryField(idx, 'price', Number(e.target.value))
                          }
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold mb-1">Total Kuota</label>
                        <input
                          type="number"
                          required
                          min={1}
                          step={1}
                          value={cat.totalQuota}
                          onChange={(e) =>
                            updateCategoryField(idx, 'totalQuota', Number(e.target.value))
                          }
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold mb-1">
                          Maks Beli per Order (1–10)
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={10}
                          value={cat.maxPerOrder}
                          onChange={(e) =>
                            updateCategoryField(idx, 'maxPerOrder', Number(e.target.value))
                          }
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold mb-1">Mulai Penjualan</label>
                        <input
                          type="datetime-local"
                          required
                          value={cat.saleStartAt}
                          onChange={(e) =>
                            updateCategoryField(idx, 'saleStartAt', e.target.value)
                          }
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold mb-1">
                          Selesai Penjualan
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={cat.saleEndAt}
                          onChange={(e) => updateCategoryField(idx, 'saleEndAt', e.target.value)}
                          className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </BentoCard>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/organizer/events')}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
              Simpan Acara (Draf)
            </Button>
          </div>
        </form>
      </main>
    </LearnifyAppShell>
  );
}
