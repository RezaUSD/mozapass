'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TicketStatus } from '@prisma/client';
import { LearnifyAppShell } from '@/components/layout/DarkSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { AvatarStack, BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

interface AttendeeRow {
  ticketId: string;
  ticketCode: string;
  orderCode: string;
  attendeeName: string;
  attendeeEmail: string;
  categoryName: string;
  price: number;
  status: TicketStatus;
  checkedInAt: string | null;
  checkInMethod: string | null;
  checkedInByName: string | null;
}

interface AttendeesPayload {
  event: {
    id: string;
    title: string;
    slug: string;
  };
  attendees: AttendeeRow[];
}

export default function OrganizerAttendeesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AttendeesPayload | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);

      const res = await fetch(
        `/api/v1/organizer/events/${params.id}/attendees?${qs.toString()}`,
        { cache: 'no-store' }
      );
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: AttendeesPayload;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setErrorMessage(json.error?.message || 'Gagal memuat daftar peserta.');
        return;
      }
      setData(json.data);
    } catch {
      setErrorMessage('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, search, statusFilter]);

  useEffect(() => {
    void loadAttendees();
  }, [loadAttendees]);

  const csvDownloadUrl = `/api/v1/organizer/events/${params.id}/attendees?format=csv`;
  const totalTickets = data?.attendees.length ?? 0;
  const checkedInCount =
    data?.attendees.filter((row) => row.status === 'USED').length ?? 0;
  const notCheckedInCount =
    data?.attendees.filter((row) => row.status === 'VALID').length ?? 0;
  const totalRevenue =
    data?.attendees.reduce((sum, row) => sum + row.price, 0) ?? 0;

  return (
    <LearnifyAppShell role="ORGANIZER">
      <TopHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-8 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        {/* Header khusus Print / Export PDF */}
        {data && (
          <div className="hidden print:block mb-5 border-b-2 border-[#181824] pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#F05A36]">
                  MOZAPASS • LAPORAN RESMI KEHADIRAN
                </p>
                <h1 className="mt-1 text-2xl font-extrabold text-[#181824]">
                  {data.event.title}
                </h1>
                <p className="mt-0.5 text-xs text-[#5A5A6E]">
                  Daftar Pemegang Tiket &amp; Status Check-in Gate
                </p>
              </div>
              <div className="text-right text-[11px] text-[#5A5A6E]">
                <p className="font-bold text-[#181824]">Dicetak pada:</p>
                <p className="tabular-nums">{formatEventDateTime(new Date().toISOString())}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-[#181824] bg-[#F7F7FA] px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-[#6E6E82]">Total Tiket</p>
                <p className="mt-0.5 text-base font-extrabold tabular-nums text-[#181824]">
                  {totalTickets}
                </p>
              </div>
              <div className="rounded-xl border border-[#181824] bg-[#E6F9D5] px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-[#166534]">Sudah Check-in</p>
                <p className="mt-0.5 text-base font-extrabold tabular-nums text-[#166534]">
                  {checkedInCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#181824] bg-[#FFE37E] px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-[#181824]">Belum Check-in</p>
                <p className="mt-0.5 text-base font-extrabold tabular-nums text-[#181824]">
                  {notCheckedInCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#181824] bg-[#DEC9FF] px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-[#181824]">Total Nilai</p>
                <p className="mt-0.5 text-base font-extrabold tabular-nums text-[#181824]">
                  {formatRupiah(totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <Link
              href="/organizer/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#181824] bg-white px-3.5 py-1 text-xs font-extrabold text-[#181824] hover:bg-[#FFE37E]"
            >
              ← Kembali ke Dashboard Organizer
            </Link>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#181824]">
              Daftar Peserta &amp; Laporan Kehadiran
            </h1>
            {data && (
              <p className="text-xs font-semibold text-[#5A5A6E]">
                Acara: <strong className="text-[#181824]">{data.event.title}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              Cetak / Simpan PDF
            </Button>
            <a href={csvDownloadUrl} download>
              <Button variant="primary">⬇ Ekspor CSV Peserta</Button>
            </a>
          </div>
        </div>

        {/* Filter & Pencarian ala Learnify */}
        <BentoCard
          variant="yellow"
          padding="md"
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center print:hidden"
        >
          <input
            type="text"
            placeholder="Cari nama, email, atau kode tiket MOZA-..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-full border-[1.5px] border-[#181824] bg-white px-4 py-2 text-sm font-medium text-[#181824] focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'VALID', 'USED', 'VOID'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={[
                  'rounded-full border-[1.5px] border-[#181824] px-3.5 py-1.5 text-xs font-extrabold transition-colors',
                  statusFilter === st
                    ? 'bg-[#181824] text-white'
                    : 'bg-white text-[#181824] hover:bg-[#DEC9FF]',
                ].join(' ')}
              >
                {st === 'ALL' ? 'All status' : st}
              </button>
            ))}
          </div>
        </BentoCard>

        {errorMessage && (
          <BentoCard className="mb-6 border-[#181824] bg-[#FFD6D6]">
            <p className="text-sm font-extrabold text-[#8A1C24]">{errorMessage}</p>
          </BentoCard>
        )}

        {loading && (
          <div className="h-64 rounded-[24px] bg-white border border-[#ECECF2] animate-pulse" />
        )}

        {!loading && data && data.attendees.length === 0 && (
          <BentoCard
            padding="lg"
            className="border-[1.5px] border-[#181824] py-12 text-center"
          >
            <p className="text-sm font-extrabold text-[#181824]">
              Tidak ada data tiket/peserta yang cocok
            </p>
          </BentoCard>
        )}

        {!loading && data && data.attendees.length > 0 && (
          <div className="rounded-[24px] border-[1.5px] border-[#181824] bg-white p-5 sm:p-6 print:rounded-none print:border-0 print:p-0">
            <div className="mb-4 flex items-center justify-between print:mb-2">
              <h2 className="text-lg font-extrabold text-[#181824] print:text-sm">
                Daftar Pemegang Tiket ({data.attendees.length})
              </h2>
              <div className="print:hidden">
                <AvatarStack countLabel={`+${data.attendees.length}`} />
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto subtle-scroll pr-1 print:max-h-none print:overflow-visible print:pr-0">
              <table className="w-full text-left text-xs print:border-collapse print:border print:border-[#181824]">
              <thead className="border-b border-[#ECECF2] text-[11px] font-semibold text-[#8E8E9E] print:bg-[#181824] print:text-white">
                <tr>
                  <th className="py-3 pr-4 print:border print:border-[#181824] print:px-3 print:py-2">No &amp; Kode Tiket</th>
                  <th className="py-3 pr-4 print:border print:border-[#181824] print:px-3 print:py-2">Peserta</th>
                  <th className="py-3 pr-4 print:border print:border-[#181824] print:px-3 print:py-2">Kategori &amp; Harga</th>
                  <th className="py-3 pr-4 print:border print:border-[#181824] print:px-3 print:py-2">Status</th>
                  <th className="py-3 text-right print:border print:border-[#181824] print:px-3 print:py-2">Waktu &amp; Petugas Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECF2] print:divide-y-0">
                {data.attendees.map((row, idx) => {
                  const rowNum = String(idx + 1).padStart(2, '0');
                  const methodLabel =
                    row.checkInMethod === 'QR_SCAN'
                      ? 'Scan QR'
                      : row.checkInMethod === 'MANUAL'
                        ? 'Input Manual'
                        : row.checkInMethod;
                  return (
                    <tr
                      key={row.ticketId}
                      className="hover:bg-[#F7F7FA] print:break-inside-avoid print:even:bg-[#F7F7FA]"
                    >
                      <td className="py-3.5 pr-4 font-mono font-extrabold text-[#181824] print:border print:border-[#D1D1DC] print:px-3 print:py-2">
                        {rowNum}. {row.ticketCode}
                        <div className="text-[11px] font-normal text-[#8E8E9E]">
                          {row.orderCode}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 print:border print:border-[#D1D1DC] print:px-3 print:py-2">
                        <div className="font-extrabold text-[#181824]">{row.attendeeName}</div>
                        <div className="text-[#5A5A6E]">{row.attendeeEmail}</div>
                      </td>
                      <td className="py-3.5 pr-4 tabular-nums print:border print:border-[#D1D1DC] print:px-3 print:py-2">
                        <div className="font-bold text-[#181824]">{row.categoryName}</div>
                        <div className="text-[#5A5A6E]">{formatRupiah(row.price)}</div>
                      </td>
                      <td className="py-3.5 pr-4 print:border print:border-[#D1D1DC] print:px-3 print:py-2">
                        <StatusBadge type="ticket" status={row.status} />
                      </td>
                      <td className="py-3.5 text-right text-[#5A5A6E] print:border print:border-[#D1D1DC] print:px-3 print:py-2">
                        {row.checkedInAt ? (
                          <div>
                            <strong className="text-[#181824] tabular-nums">
                              {formatEventDateTime(row.checkedInAt)}
                            </strong>
                            <div>
                              oleh {row.checkedInByName ?? 'Petugas'} ({methodLabel})
                            </div>
                          </div>
                        ) : (
                          <span>Belum Check-in</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </LearnifyAppShell>
  );
}
