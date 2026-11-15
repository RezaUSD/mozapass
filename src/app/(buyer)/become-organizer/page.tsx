'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BuyerBottomNav } from '@/components/layout/BuyerBottomNav';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  BentoCard,
  BentoErrorState,
  BentoSkeleton,
} from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime } from '@/lib/format';

interface OrganizerApplicationData {
  id: string;
  organizationName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export default function BecomeOrganizerPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<string>('BUYER');
  const [application, setApplication] = useState<OrganizerApplicationData | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/organizer-applications/me', {
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          currentRole: string;
          application: OrganizerApplicationData | null;
        };
        error?: { message: string };
      };

      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message ?? 'Gagal memuat status pengajuan.');
        return;
      }

      setCurrentRole(json.data.currentRole);
      setApplication(json.data.application);
      if (json.data.application && json.data.application.status === 'REJECTED') {
        setOrganizationName(json.data.application.organizationName);
        setReason(json.data.application.reason);
      }
    } catch {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/v1/organizer-applications/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationName, reason }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: OrganizerApplicationData;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setSubmitError(json.error?.message ?? 'Gagal mengirim pengajuan.');
        return;
      }
      setApplication(json.data);
    } catch {
      setSubmitError('Gagal terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LearnifyAppShell role="BUYER">
      <TopHeader />

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#181824]">
              Ajukan Jadi Organizer
            </h1>
            <p className="text-xs text-[#6E6E82] mt-0.5">
              Upgrade akun Pembeli Anda menjadi Penyelenggara Acara dengan persetujuan Admin.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Kembali ke Katalog
            </Button>
          </Link>
        </div>

        {loading && (
          <BentoCard variant="surface" padding="lg">
            <BentoSkeleton className="h-44 w-full" />
          </BentoCard>
        )}

        {!loading && errorMessage && (
          <BentoErrorState
            message={errorMessage}
            onRetry={() => void loadStatus()}
          />
        )}

        {!loading && !errorMessage && currentRole === 'ORGANIZER' && (
          <BentoCard variant="mint" padding="lg" className="border-[1.5px] border-[#181824]">
            <span className="inline-block rounded-full bg-[#181824] px-3 py-1 text-[11px] font-extrabold text-white">
              Disetujui Admin
            </span>
            <h2 className="mt-3 text-xl font-extrabold text-[#181824]">
              Akun Anda Sudah Menjadi Organizer!
            </h2>
            <p className="mt-1 text-sm text-[#181824]/80">
              Anda sudah dapat membuat acara, mengatur kuota kategori tiket, menugaskan panitia
              scanner, dan memantau laporan penjualan.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/organizer/dashboard">
                <Button variant="primary" size="md">
                  Buka Dashboard Organizer →
                </Button>
              </Link>
              <Link href="/organizer/events/new">
                <Button variant="outline" size="md">
                  + Buat Acara Baru
                </Button>
              </Link>
            </div>
          </BentoCard>
        )}

        {!loading && !errorMessage && currentRole === 'BUYER' && application?.status === 'PENDING' && (
          <BentoCard variant="yellow" padding="lg" className="border-[1.5px] border-[#181824]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#181824] px-3 py-1 text-[11px] font-extrabold text-white">
                Menunggu Persetujuan Admin
              </span>
              <span className="text-xs font-bold text-[#181824]/75">
                Diajukan: {formatEventDateTime(application.createdAt)}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-[#181824]">
              {application.organizationName}
            </h2>
            <p className="mt-1.5 text-sm text-[#181824]/85 whitespace-pre-line">
              {application.reason}
            </p>
            <p className="mt-4 text-xs font-semibold text-[#181824]/70">
              Admin akan meninjau pengajuan Anda. Muat ulang halaman ini setelah disetujui untuk
              langsung mengaktifkan akses Organizer.
            </p>
          </BentoCard>
        )}

        {!loading &&
          !errorMessage &&
          currentRole === 'BUYER' &&
          (!application || application.status === 'REJECTED') && (
            <BentoCard variant="surface" padding="lg" className="border-[1.5px] border-[#181824]">
              {application?.status === 'REJECTED' && (
                <div className="mb-5 rounded-2xl border-[1.5px] border-[#181824] bg-[#FFD6D6] p-4 text-xs font-bold text-[#8A1C24]">
                  <p className="text-sm font-extrabold">Pengajuan Sebelumnya Ditolak</p>
                  <p className="mt-1 font-medium">
                    Catatan Admin: {application.reviewNote || 'Belum memenuhi syarat.'}
                  </p>
                  <p className="mt-1 text-[11px]">
                    Anda dapat memperbarui data di bawah ini dan mengirim ulang pengajuan.
                  </p>
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border-[1.5px] border-[#181824] bg-[#FFD6D6] px-4 py-3 text-sm font-bold text-[#8A1C24]"
                >
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="organizationName"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Nama Organisasi / Penyelenggara
                  </label>
                  <input
                    id="organizationName"
                    type="text"
                    required
                    minLength={3}
                    maxLength={150}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Contoh: Komunitas Musik Nusantara"
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-3 text-sm font-medium text-[#181824] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="block text-xs font-extrabold text-[#181824] mb-1.5"
                  >
                    Rencana Acara &amp; Alasan Pengajuan
                  </label>
                  <textarea
                    id="reason"
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ceritakan jenis acara yang akan diselenggarakan, perkiraan kapasitas peserta, dan pengalaman Anda..."
                    className="w-full rounded-xl border-[1.5px] border-[#181824] bg-[#F7F7FA] px-4 py-3 text-sm font-medium text-[#181824] focus:bg-white focus:outline-none"
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={submitting}>
                  Kirim Pengajuan Organizer
                </Button>
              </form>
            </BentoCard>
          )}
      </div>

      <BuyerBottomNav />
    </LearnifyAppShell>
  );
}
