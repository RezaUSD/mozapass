'use client';

import React, { useEffect, useState } from 'react';
import { formatCountdownMmSs } from '@/lib/format';

export interface CountdownBannerProps {
  expiresAtIso: string;
  onExpire?: () => void;
}

/**
 * Header Banner Hitung Mundur 15 Menit pada S-005 (BR-003, design.md Bagian 5).
 * Menggunakan Warm Yellow (#FFE37E) berborder 1.5px solid #181824 dan timer tabular-nums.
 */
export function CountdownBanner({ expiresAtIso, onExpire }: CountdownBannerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const diffMs = new Date(expiresAtIso).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  });

  useEffect(() => {
    const updateTimer = () => {
      const diffMs = new Date(expiresAtIso).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);
      if (secs <= 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAtIso, onExpire]);

  const isUrgent = remainingSeconds > 0 && remainingSeconds < 180;
  const isExpired = remainingSeconds <= 0;

  return (
    <div
      role="timer"
      aria-live="polite"
      className={[
        'flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-[1.5px] border-[#181824] px-5 py-4 transition-colors',
        isExpired
          ? 'bg-[#FFD6D6] text-[#8A1C24]'
          : isUrgent
            ? 'bg-[#FFE5B4] text-[#181824]'
            : 'bg-[#FFE37E] text-[#181824]',
      ].join(' ')}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#181824] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            {isExpired ? 'EXPIRED' : '15-MIN HOLD'}
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider">
            {isExpired ? 'Waktu Reservasi Habis' : 'Sisa Waktu Reservasi Kuota (Hold Timer)'}
          </span>
        </div>
        <span className="mt-1 block text-xs font-semibold opacity-90">
          {isExpired
            ? 'Kuota tiket telah dikembalikan otomatis ke publik.'
            : 'Selesaikan pembayaran sebelum hitung mundur berakhir agar kuota tidak dilepas.'}
        </span>
      </div>

      <span className="rounded-xl border-[1.5px] border-[#181824] bg-[#181824] px-4 py-2 font-mono text-2xl font-extrabold text-[#FFE37E] tabular-nums">
        {formatCountdownMmSs(remainingSeconds)}
      </span>
    </div>
  );
}
