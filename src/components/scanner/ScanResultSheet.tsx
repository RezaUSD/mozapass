'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatEventDateTime } from '@/lib/format';

export interface ScanFeedbackState {
  outcome: 'SUCCESS' | 'ERROR';
  code: string;
  message: string;
  ticketCode?: string;
  attendeeName?: string;
  categoryName?: string;
  checkedInAt?: string;
  checkedInByName?: string;
  checkInMethod?: string;
}

export interface ScanResultSheetProps {
  feedback: ScanFeedbackState | null;
  onDismiss: () => void;
}

function formatMethodLabel(method?: string): string {
  if (method === 'QR_SCAN') return 'Scan QR Kamera';
  if (method === 'MANUAL') return 'Input Kode Manual';
  return method ?? '-';
}

/**
 * Panel hasil scan kontras tinggi untuk S-008 (design.md Bagian 5, BR-007).
 * Hijau penuh (#16A34A) untuk VALID, Merah penuh (#DC2626) untuk USED / INVALID / WRONG_EVENT.
 */
export function ScanResultSheet({ feedback, onDismiss }: ScanResultSheetProps) {
  if (!feedback) return null;

  const isSuccess = feedback.outcome === 'SUCCESS';

  return (
    <div
      role="status"
      aria-live="assertive"
      className={[
        'rounded-3xl border-2 border-[#181824] p-5 text-white shadow-xl transition-all',
        isSuccess ? 'bg-[#16A34A]' : 'bg-[#DC2626]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/20">
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <XCircle className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">
            {isSuccess ? 'Tiket Valid — Silakan Masuk' : `Ditolak (${feedback.code})`}
          </span>
          <h3 className="mt-1.5 text-lg sm:text-xl font-extrabold leading-snug">
            {feedback.message}
          </h3>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-black/20 p-4 text-xs">
        {feedback.ticketCode && (
          <div>
            <p className="text-[11px] font-semibold text-white/75">Kode Tiket</p>
            <p className="mt-0.5 font-mono text-sm font-extrabold">{feedback.ticketCode}</p>
          </div>
        )}
        {feedback.attendeeName && (
          <div>
            <p className="text-[11px] font-semibold text-white/75">Nama Peserta</p>
            <p className="mt-0.5 font-extrabold truncate">{feedback.attendeeName}</p>
          </div>
        )}
        {feedback.categoryName && (
          <div>
            <p className="text-[11px] font-semibold text-white/75">Kategori</p>
            <p className="mt-0.5 font-bold">{feedback.categoryName}</p>
          </div>
        )}
        {feedback.checkInMethod && (
          <div>
            <p className="text-[11px] font-semibold text-white/75">Metode</p>
            <p className="mt-0.5 font-bold">{formatMethodLabel(feedback.checkInMethod)}</p>
          </div>
        )}
        {feedback.checkedInAt && (
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-white/75">Waktu Check-in</p>
            <p className="mt-0.5 font-bold tabular-nums">
              {formatEventDateTime(feedback.checkedInAt)}
            </p>
          </div>
        )}
        {feedback.checkedInByName && (
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-white/75">Petugas Sebelumnya</p>
            <p className="mt-0.5 font-bold">{feedback.checkedInByName}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Button
          variant="dark"
          size="lg"
          fullWidth
          onClick={onDismiss}
          className="inline-flex items-center justify-center gap-2"
        >
          Scan Tiket Berikutnya
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
