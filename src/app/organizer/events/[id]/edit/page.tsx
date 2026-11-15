'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { EventStatus } from '@prisma/client';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  BentoCard,
  BentoErrorState,
  BentoSkeleton,
  type BentoCardVariant,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EditableCategory {
  id?: string;
  name: string;
  price: number;
  totalQuota: number;
  soldCount: number;
  reservedCount: number;
  maxPerOrder: number;
  saleStartAt: string;
  saleEndAt: string;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '2026-12-01T10:00';
  return d.toISOString().slice(0, 16);
}

const CARD_VARIANTS: BentoCardVariant[] = ['yellow', 'lavender', 'sky'];

export default function EditOrganizerEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          title: string;
          description: string;
          location: string;
          bannerUrl: string | null;
          startTime: string;
          endTime: string;
          status: EventStatus;
          categories: EditableCategory[];
        };
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Acara tidak ditemukan.');
      } else {
        const ev = json.data;
        setTitle(ev.title);
        setDescription(ev.description);
        setLocation(ev.location);
        setBannerUrl(ev.bannerUrl ?? '');
        setStartTime(toDatetimeLocalValue(ev.startTime));
        setEndTime(toDatetimeLocalValue(ev.endTime));
        setStatus(ev.status);
        setCategories(
          ev.categories.map((c) => ({
            ...c,
            saleStartAt: toDatetimeLocalValue(c.saleStartAt),
            saleEndAt: toDatetimeLocalValue(c.saleEndAt),
          }))
        );
      }
    } catch {
      setErrorMessage('Gagal memuat detail acara.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  function addNewCategory() {
    setCategories((prev) => [
      ...prev,
      {
        name: `Kategori Baru ${prev.length + 1}`,
        price: 150000,
        totalQuota: 50,
        soldCount: 0,
        reservedCount: 0,
        maxPerOrder: 5,
        saleStartAt: startTime || '2026-11-14T00:00',
        saleEndAt: endTime || '2026-12-15T10:00',
      },
    ]);
  }

  function removeCategory(idx: number) {
    const target = categories[idx];
    if (!target) return;
    if (target.soldCount + target.reservedCount > 0) {
      alert('Kategori ini sudah memiliki transaksi dan tidak boleh dihapus (BR-010).');
      return;
    }
    if (target.id) {
      const removedId = target.id;
      setDeletedCategoryIds((prev) => [...prev, removedId]);
    }
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCategoryField<K extends keyof EditableCategory>(
    idx: number,
    field: K,
    value: EditableCategory[K]
  ) {
    setCategories((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  async function handleSave(e: React.FormEvent, action?: 'PUBLISH' | 'END' | 'CANCEL') {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const payload = {
        title,
        description,
        location,
        bannerUrl: bannerUrl.trim() || null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        ...(action ? { action } : {}),
        deletedCategoryIds,
        categories: categories.map((c) => ({
          ...(c.id ? { id: c.id } : {}),
          name: c.name,
          price: Math.trunc(Number(c.price)),
          totalQuota: Math.trunc(Number(c.totalQuota)),
          maxPerOrder: Math.trunc(Number(c.maxPerOrder)),
          saleStartAt: new Date(c.saleStartAt).toISOString(),
          saleEndAt: new Date(c.saleEndAt).toISOString(),
        })),
      };

      const res = await fetch(`/api/v1/organizer/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };

      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message ?? 'Gagal menyimpan perubahan acara.');
      } else {
        setSaveMessage('Perubahan acara dan kategori tiket berhasil disimpan.');
        setDeletedCategoryIds([]);
        await loadEvent();
      }
    } catch {
      setErrorMessage('Gagal menghubungi server.');
    } finally {
      setIsSaving(false);
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
              Edit Acara &amp; Kategori Tiket (S-010)
            </h1>
          </div>
        </div>

        {isLoading ? (
          <BentoSkeleton className="h-96 w-full" />
        ) : errorMessage && !title ? (
          <BentoErrorState message={errorMessage} onRetry={loadEvent} />
        ) : (
          <form onSubmit={(e) => handleSave(e)} className="space-y-6">
            {errorMessage && (
              <div className="rounded-xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-sm font-extrabold text-[#8A1C24]">
                {errorMessage}
              </div>
            )}
            {saveMessage && (
              <div className="rounded-xl border-[1.5px] border-[#181824] bg-[#D8F5B8] px-4 py-3 text-sm font-extrabold text-[#181824]">
                {saveMessage}
              </div>
            )}

            <BentoCard
              variant="surface"
              padding="lg"
              className="space-y-4 border-[1.5px] border-[#181824]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-extrabold text-[#181824]">01. Detail Acara</h2>
                  <StatusBadge type="event" status={status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {status === 'DRAFT' && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isSaving}
                      onClick={(e) => handleSave(e, 'PUBLISH')}
                    >
                      Publikasikan Acara (ST-001)
                    </Button>
                  )}
                  {status === 'PUBLISHED' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isSaving}
                      onClick={(e) => handleSave(e, 'END')}
                    >
                      Akhiri Acara (ST-002)
                    </Button>
                  )}
                  {(status === 'DRAFT' || status === 'PUBLISHED') && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isLoading={isSaving}
                      onClick={(e) => handleSave(e, 'CANCEL')}
                    >
                      Batalkan Acara (ST-003)
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold mb-1">Judul Acara</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold mb-1">Deskripsi</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold mb-1">Lokasi</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold mb-1">URL Banner</label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </BentoCard>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#181824]">
                  02. Kategori Tiket (BR-010 Guard)
                </h2>
                <Button type="button" variant="primary" size="sm" onClick={addNewCategory}>
                  + Tambah Kategori
                </Button>
              </div>

              <div className="space-y-4">
                {categories.map((cat, idx) => {
                  const isLocked = cat.soldCount + cat.reservedCount > 0;
                  const variant = CARD_VARIANTS[idx % CARD_VARIANTS.length] ?? 'yellow';
                  return (
                    <BentoCard
                      key={cat.id ?? idx}
                      variant={variant}
                      padding="md"
                      className="space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-extrabold text-white">
                            {cat.name}
                          </span>
                          <span className="rounded-full border-[1.5px] border-[#181824] bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824] tabular-nums">
                            Terjual: {cat.soldCount} | Ditahan: {cat.reservedCount}
                          </span>
                          {isLocked && (
                            <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFD6D6] px-2.5 py-0.5 text-[11px] font-extrabold text-[#8A1C24]">
                              🔒 Harga &amp; Hapus Terkunci (BR-010)
                            </span>
                          )}
                        </div>
                        {!isLocked && categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCategory(idx)}
                            className="rounded-full border-[1.5px] border-[#181824] bg-[#FFD6D6] px-3 py-0.5 text-xs font-extrabold text-[#8A1C24]"
                          >
                            Hapus Kategori
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-extrabold mb-1">Nama</label>
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
                            disabled={isLocked}
                            min={0}
                            value={cat.price}
                            onChange={(e) =>
                              updateCategoryField(idx, 'price', Number(e.target.value))
                            }
                            className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold tabular-nums disabled:bg-[#ECECF2] disabled:text-[#6E6E82]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold mb-1">
                            Total Kuota (Min: {Math.max(1, cat.soldCount + cat.reservedCount)})
                          </label>
                          <input
                            type="number"
                            required
                            min={Math.max(1, cat.soldCount + cat.reservedCount)}
                            value={cat.totalQuota}
                            onChange={(e) =>
                              updateCategoryField(idx, 'totalQuota', Number(e.target.value))
                            }
                            className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-3 py-2 text-sm font-semibold tabular-nums"
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
                Kembali
              </Button>
              <Button type="submit" variant="primary" size="lg" isLoading={isSaving}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </main>
    </LearnifyAppShell>
  );
}
