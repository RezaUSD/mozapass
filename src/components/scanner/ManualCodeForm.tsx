'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface ManualCodeFormProps {
  onSubmitCode: (ticketCode: string) => Promise<void>;
  isLoading: boolean;
  cameraFallbackReason?: string | null;
}

/**
 * Form Fallback Input Kode Manual untuk S-008 (E-005).
 * Otomatis ditampilkan jika izin kamera ditolak atau layar HP pengunjung retak.
 */
export function ManualCodeForm({
  onSubmitCode,
  isLoading,
  cameraFallbackReason,
}: ManualCodeFormProps) {
  const [code, setCode] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    await onSubmitCode(cleaned);
    setCode('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-white/15 bg-[#232329] p-5 space-y-4"
    >
      {cameraFallbackReason && (
        <div className="rounded-2xl border-[1.5px] border-[#181824] bg-[#FFE37E] px-4 py-3 text-xs font-extrabold text-[#181824]">
          ⚠️ Mode Input Manual Aktif (E-005): {cameraFallbackReason}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label
            htmlFor="manual-ticket-code"
            className="block text-xs font-extrabold uppercase tracking-wider text-[#FFE37E]"
          >
            Input Kode Tiket Manual (E-005)
          </label>
          <p className="mt-0.5 text-xs text-[#A5A5B5]">
            Ketik kode tiket dari kartu Boarding Pass pengunjung atau klik tombol kode demo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCode('MOZA-DEMO-0001')}
          className="rounded-xl border border-[#FFE37E]/50 bg-[#1E1E24] px-3 py-1.5 font-mono text-xs font-extrabold text-[#FFE37E] hover:bg-[#FFE37E] hover:text-[#181824] transition-colors"
        >
          ⚡ Isi Demo: MOZA-DEMO-0001
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="manual-ticket-code"
          type="text"
          required
          placeholder="MOZA-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 rounded-2xl border border-white/20 bg-[#1E1E24] px-4 py-3 font-mono text-base font-extrabold uppercase tracking-widest text-white placeholder:text-[#6E6E82] focus:border-[#FFE37E] focus:outline-none"
        />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
          Verifikasi &amp; Check-in
        </Button>
      </div>
    </form>
  );
}
