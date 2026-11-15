'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { AvatarStack, BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime } from '@/lib/format';

interface AssignedStaffItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  assignedAt: string;
}

interface StaffListPayload {
  event: {
    id: string;
    title: string;
  };
  staff: AssignedStaffItem[];
}

export default function OrganizerEventStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StaffListPayload | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/organizer/events/${params.id}/staff`, {
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: StaffListPayload;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message || 'Gagal memuat daftar panitia.');
        return;
      }
      setData(json.data);
    } catch {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function handleAssignStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${params.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Gagal menugaskan panitia.');
        return;
      }
      setEmailInput('');
      await loadStaff();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveStaff(userId: string) {
    setRemovingUserId(userId);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${params.id}/staff`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Gagal mencabut akses panitia.');
        return;
      }
      await loadStaff();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan.');
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <LearnifyAppShell role="ORGANIZER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-8">
        <div className="mb-6">
          <Link
            href="/organizer/events"
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
          >
            ← Kembali ke Daftar Acara Organizer
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#181824]">
            Penugasan Panitia Pintu Masuk
          </h1>
          {data && (
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Acara: <strong className="text-[#181824]">{data.event.title}</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Numbered Staff List Card */}
          <div className="lg:col-span-8 space-y-4">
            {errorMessage && (
              <BentoCard className="border-[#181824] bg-[#FFD6D6]">
                <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
              </BentoCard>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-2xl bg-white border border-[#ECECF2] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && data && data.staff.length === 0 && (
              <BentoCard
                padding="lg"
                className="border-[1.5px] border-[#181824] py-10 text-center"
              >
                <p className="text-sm font-extrabold text-[#181824]">
                  Belum ada panitia scanner yang ditugaskan
                </p>
                <p className="mt-1 text-xs text-[#5A5A6E]">
                  Tambahkan email akun panitia di panel kanan agar mereka dapat membuka kamera
                  scanner untuk acara ini.
                </p>
              </BentoCard>
            )}

            {!loading && data && data.staff.length > 0 && (
              <div className="rounded-[24px] border-[1.5px] border-[#181824] bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-[#181824]">
                    Daftar Panitia Aktif ({data.staff.length})
                  </h2>
                  <AvatarStack countLabel={`+${data.staff.length}`} />
                </div>

                <div className="divide-y divide-[#ECECF2]">
                  {data.staff.map((item, idx) => {
                    const rowNum = String(idx + 1).padStart(2, '0');
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#181824]">
                              {rowNum}. {item.name}
                            </span>
                            <span className="rounded-full border-[1.5px] border-[#181824] bg-[#DEC9FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#181824]">
                              {item.role}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#5A5A6E]">
                            {item.email} • Ditugaskan {formatEventDateTime(item.assignedAt)}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveStaff(item.userId)}
                          isLoading={removingUserId === item.userId}
                        >
                          Cabut Akses Scanner
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Cols: Dark Spotlight Add Staff Card (#232329) */}
          <BentoCard variant="dark" padding="lg" className="lg:col-span-4 space-y-4">
            <span className="inline-block rounded-full bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
              BR-009 Guard
            </span>
            <h2 className="text-xl font-extrabold text-white">
              Tambah Panitia Berdasarkan Email
            </h2>
            <p className="text-xs text-[#A5A5B5] leading-relaxed">
              Hanya pengguna yang terdaftar di daftar ini yang diizinkan melakukan scan QR E-Ticket
              pada pintu masuk acara ini.
            </p>

            <form onSubmit={handleAssignStaff} className="space-y-3 pt-2">
              <input
                type="email"
                required
                placeholder="Contoh: staff@mozapass.local"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-[#181824] bg-white px-4 py-2.5 text-sm font-semibold text-[#181824] focus:outline-none"
              />
              <Button type="submit" variant="primary" fullWidth isLoading={submitting}>
                + Tugaskan Panitia
              </Button>
            </form>
          </BentoCard>
        </div>
      </main>
    </LearnifyAppShell>
  );
}
