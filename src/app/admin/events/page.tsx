'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventStatus } from '@prisma/client';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { AvatarStack, BentoCard, TactileQuotaBar } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime } from '@/lib/format';

interface AdminEventRow {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  location: string;
  startTime: string;
  moderationNote: string | null;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
}

interface AdminOrganizerApplicationRow {
  id: string;
  userId: string;
  organizationName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminModerationEventsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'APPLICATIONS'>('EVENTS');
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [applications, setApplications] = useState<AdminOrganizerApplicationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      const [eventsRes, appsRes] = await Promise.all([
        fetch('/api/v1/admin/events', { cache: 'no-store' }),
        fetch('/api/v1/admin/organizer-applications', { cache: 'no-store' }),
      ]);
      if (eventsRes.status === 401 || appsRes.status === 401) {
        router.push('/login');
        return;
      }
      const eventsJson = (await eventsRes.json()) as {
        success: boolean;
        data?: AdminEventRow[];
        error?: { message: string };
      };
      if (!eventsRes.ok || !eventsJson.success || !eventsJson.data) {
        setErrorMessage(eventsJson.error?.message || 'Gagal memuat daftar moderasi acara.');
        return;
      }
      setEvents(eventsJson.data);

      if (appsRes.ok) {
        const appsJson = (await appsRes.json()) as {
          success: boolean;
          data?: AdminOrganizerApplicationRow[];
        };
        if (appsJson.success && appsJson.data) {
          setApplications(appsJson.data);
        }
      }
    } catch {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function handleModeration(
    eventId: string,
    action: 'SUSPEND' | 'RESTORE'
  ) {
    setProcessingId(eventId);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          action,
          moderationNote:
            action === 'SUSPEND'
              ? 'Ditangguhkan sementara oleh Admin Moderator (ST-004).'
              : 'Dipulihkan kembali oleh Admin Moderator (ST-005).',
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Aksi moderasi gagal.');
        return;
      }
      await loadAdminData();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan.');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleApplicationDecision(
    applicationId: string,
    decision: 'APPROVE' | 'REJECT'
  ) {
    setProcessingId(applicationId);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/organizer-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewNote:
            decision === 'APPROVE'
              ? 'Disetujui Admin menjadi Penyelenggara Acara.'
              : 'Pengajuan belum memenuhi ketentuan penyelenggara.',
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Gagal memproses pengajuan.');
        return;
      }
      await loadAdminData();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan.');
    } finally {
      setProcessingId(null);
    }
  }

  const pendingAppsCount = applications.filter((a) => a.status === 'PENDING').length;

  const publishedCount = events.filter((e) => e.status === 'PUBLISHED').length;
  const suspendedCount = events.filter((e) => e.status === 'SUSPENDED').length;
  const draftCount = events.filter((e) => e.status === 'DRAFT').length;

  return (
    <LearnifyAppShell role="ADMIN">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-2 pb-6 pt-1 sm:px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181824] tracking-tight">
              Admin catalog moderation
            </h1>
            <p className="text-xs font-semibold text-[#5A5A6E]">
              Tinjau acara yang sedang tayang, tangguhkan sementara jika melanggar ketentuan, atau
              pulihkan kembali ke katalog publik.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('EVENTS')}
              className={[
                'rounded-full border-[1.5px] border-[#181824] px-3.5 py-1.5 text-xs font-extrabold transition-colors',
                activeTab === 'EVENTS'
                  ? 'bg-[#181824] text-white'
                  : 'bg-white text-[#181824] hover:bg-[#F7F7FA]',
              ].join(' ')}
            >
              Moderasi Acara
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('APPLICATIONS')}
              className={[
                'rounded-full border-[1.5px] border-[#181824] px-3.5 py-1.5 text-xs font-extrabold transition-colors inline-flex items-center gap-1.5',
                activeTab === 'APPLICATIONS'
                  ? 'bg-[#181824] text-white'
                  : 'bg-[#FFE37E] text-[#181824] hover:bg-[#FFE37E]/80',
              ].join(' ')}
            >
              <span>Pengajuan Organizer</span>
              {pendingAppsCount > 0 && (
                <span className="rounded-full bg-[#F05A36] px-1.5 py-0.5 text-[10px] font-extrabold text-white tabular-nums">
                  {pendingAppsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Top Row: 3 Tactile Pastel Summary Cards (#FFE37E, #DEC9FF, #C6EAFF) sesuai S-013 */}
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <BentoCard variant="yellow" padding="md">
            <span className="rounded-full bg-[#181824] px-3 py-1 text-xs font-bold text-white">
              Published
            </span>
            <p className="mt-3 text-3xl font-extrabold text-[#181824] tabular-nums">
              {publishedCount} Acara
            </p>
            <div className="mt-3">
              <TactileQuotaBar
                label="Aktif di Katalog"
                rightText={`${publishedCount}/${Math.max(1, events.length)}`}
                used={publishedCount}
                total={Math.max(1, events.length)}
              />
            </div>
          </BentoCard>

          <BentoCard variant="lavender" padding="md">
            <span className="rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3 py-1 text-xs font-bold text-[#181824]">
              Suspended
            </span>
            <p className="mt-3 text-3xl font-extrabold text-[#181824] tabular-nums">
              {suspendedCount} Acara
            </p>
            <div className="mt-3">
              <TactileQuotaBar
                label="Ditangguhkan (ST-004)"
                rightText={`${suspendedCount}/${Math.max(1, events.length)}`}
                used={suspendedCount}
                total={Math.max(1, events.length)}
              />
            </div>
          </BentoCard>

          <BentoCard variant="sky" padding="md">
            <span className="rounded-full border-[1.5px] border-[#181824] bg-[#DEC9FF] px-3 py-1 text-xs font-bold text-[#181824]">
              Draft / Others
            </span>
            <p className="mt-3 text-3xl font-extrabold text-[#181824] tabular-nums">
              {draftCount} Acara
            </p>
            <div className="mt-3">
              <TactileQuotaBar
                label="Belum Publik"
                rightText={`${draftCount}/${Math.max(1, events.length)}`}
                used={draftCount}
                total={Math.max(1, events.length)}
              />
            </div>
          </BentoCard>
        </div>

        {errorMessage && (
          <BentoCard className="mb-6 border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-[22px] bg-white border border-[#ECECF2] animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && activeTab === 'APPLICATIONS' && (
          <div className="rounded-[24px] border-[1.5px] border-[#E4E4EC] bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#181824]">
                Antrean Pengajuan Organizer ({applications.length})
              </h2>
              <span className="text-xs font-bold text-[#6E6E82]">
                {pendingAppsCount} menunggu ACC
              </span>
            </div>

            {applications.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-[#6E6E82]">
                Belum ada pengajuan upgrade Organizer dari pembeli.
              </p>
            ) : (
              <div className="divide-y divide-[#ECECF2] max-h-[360px] overflow-y-auto subtle-scroll pr-1">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold',
                            app.status === 'PENDING'
                              ? 'bg-[#FFE37E] text-[#181824]'
                              : app.status === 'APPROVED'
                                ? 'bg-[#D8F5B8] text-[#181824]'
                                : 'bg-[#FFD6D6] text-[#8A1C24]',
                          ].join(' ')}
                        >
                          {app.status}
                        </span>
                        <span className="text-xs text-[#5A5A6E]">
                          <strong>{app.user?.name ?? 'Pengguna'}</strong> ({app.user?.email ?? '-'})
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#181824]">
                        {app.organizationName}
                      </h3>
                      <p className="text-xs text-[#5A5A6E]">{app.reason}</p>
                      <p className="text-[11px] text-[#8E8E9E]">
                        Diajukan: {formatEventDateTime(app.createdAt)}
                      </p>
                    </div>

                    {app.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApplicationDecision(app.id, 'APPROVE')}
                          isLoading={processingId === app.id}
                        >
                          Setujui Organizer
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleApplicationDecision(app.id, 'REJECT')}
                          isLoading={processingId === app.id}
                        >
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'EVENTS' && events.length === 0 && (
          <BentoCard padding="lg" className="border-[1.5px] border-[#181824] py-10 text-center">
            <p className="text-sm font-extrabold text-[#181824]">
              Belum ada acara terdaftar di sistem.
            </p>
          </BentoCard>
        )}

        {!loading && activeTab === 'EVENTS' && events.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 8 Cols: Numbered Moderation Table Card */}
            <div className="lg:col-span-8 rounded-[24px] border-[1.5px] border-[#E4E4EC] bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#181824]">
                  Daftar Moderasi Acara ({events.length})
                </h2>
                <span className="text-xs font-bold text-[#F05A36]">ST-004 &amp; ST-005</span>
              </div>

              <div className="divide-y divide-[#ECECF2] max-h-[260px] overflow-y-auto subtle-scroll pr-1">
                {events.map((ev, idx) => {
                  const rowNum = String(idx + 1).padStart(2, '0');
                  return (
                    <div
                      key={ev.id}
                      className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge type="event" status={ev.status} />
                          <span className="text-xs text-[#5A5A6E]">
                            Oleh <strong>{ev.organizer.name}</strong> ({ev.organizer.email})
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-[#181824]">
                          {rowNum}. {ev.title}
                        </h3>
                        <p className="text-xs text-[#5A5A6E]">
                          📅 {formatEventDateTime(ev.startTime)} • 📍 {ev.location}
                        </p>
                        {ev.moderationNote && (
                          <p className="text-xs font-bold text-[#8A1C24]">
                            Catatan Moderasi: {ev.moderationNote}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.status === 'PUBLISHED' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleModeration(ev.id, 'SUSPEND')}
                            isLoading={processingId === ev.id}
                          >
                            Suspend (ST-004)
                          </Button>
                        )}
                        {ev.status === 'SUSPENDED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleModeration(ev.id, 'RESTORE')}
                            isLoading={processingId === ev.id}
                          >
                            Restore (ST-005)
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 Cols: Dark Moderation Policy Card (#232329) */}
            <BentoCard
              variant="dark"
              padding="lg"
              className="lg:col-span-4 flex flex-col justify-between"
            >
              <div>
                <span className="inline-block rounded-full bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824]">
                  RBAC Isolation
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-white leading-snug">
                  Kebijakan Moderasi Katalog Mozapass
                </h3>
                <p className="mt-2 text-xs text-[#A5A5B5] leading-relaxed">
                  Admin dapat menangguhkan acara publik (`PUBLISHED` → `SUSPENDED`) tanpa mengubah
                  harga atau kuota milik penyelenggara. Tiket yang sudah lunas tetap aman di
                  database.
                </p>
              </div>

              <div className="mt-6">
                <AvatarStack countLabel="ADMIN" badgeBg="bg-[#FFE37E] text-[#181824]" />
              </div>
            </BentoCard>
          </div>
        )}
      </main>
    </LearnifyAppShell>
  );
}
