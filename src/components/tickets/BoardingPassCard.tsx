'use client';

import React, { useEffect, useState } from 'react';
import type { TicketStatus } from '@prisma/client';
import QRCode from 'qrcode';
import { AvatarStack } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatEventDateTime, formatRupiah } from '@/lib/format';

export interface BoardingPassCardProps {
  id: string;
  ticketCode: string;
  qrPayload: string;
  status: TicketStatus;
  attendeeName: string;
  attendeeEmail: string;
  checkedInAt: string | null;
  orderCode: string;
  eventTitle: string;
  eventLocation: string;
  eventStartTime: string;
  categoryName: string;
  categoryPrice: number;
  showResendButton?: boolean;
}

/**
 * Kartu E-Ticket bergaya Tactile Boarding Pass dengan QR Code HMAC-SHA256 kontras tinggi (S-007, F-006, E-005).
 */
export function BoardingPassCard({
  id,
  ticketCode,
  qrPayload,
  status,
  attendeeName,
  attendeeEmail,
  checkedInAt,
  orderCode,
  eventTitle,
  eventLocation,
  eventStartTime,
  categoryName,
  categoryPrice,
  showResendButton = true,
}: BoardingPassCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [resending, setResending] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [qrPayload]);

  async function handleResendEmail() {
    setResending(true);
    setResendMessage(null);
    try {
      const res = await fetch(`/api/v1/tickets/${id}/resend-email`, {
        method: 'POST',
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setResendMessage(json.error?.message || 'Gagal mengirim ulang email tiket.');
        return;
      }
      setResendMessage(`E-Ticket berhasil dikirim ulang ke ${attendeeEmail}`);
    } catch {
      setResendMessage('Terjadi kesalahan jaringan.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border-[1.5px] border-[#181824] bg-white">
      {/* Header Dark Anchor (#232329) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-[#181824] bg-[#232329] px-6 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-[1.5px] border-[#181824] bg-[#FFE37E] text-xs font-extrabold text-[#181824]">
            M
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
            MOZAPASS E-TICKET BOARDING PASS
          </span>
        </div>
        <StatusBadge type="ticket" status={status} />
      </div>

      {/* Body Boarding Pass */}
      <div className="grid grid-cols-1 divide-y-[1.5px] divide-dashed divide-[#181824] md:grid-cols-12 md:divide-x-[1.5px] md:divide-y-0">
        {/* Left 7 Cols: Pastel Warm Yellow Top Strip + Event & Attendee Details */}
        <div className="p-6 md:col-span-7 flex flex-col justify-between space-y-5 bg-[#FFE37E]/30">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-block rounded-full border-[1.5px] border-[#181824] bg-[#FFE37E] px-3 py-1 text-xs font-extrabold text-[#181824] tabular-nums">
                {categoryName} • {formatRupiah(categoryPrice)}
              </span>
              <span className="font-mono text-xs font-extrabold text-[#5A5A6E]">
                #{orderCode}
              </span>
            </div>
            <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-[#181824] leading-snug">
              {eventTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border-[1.5px] border-[#181824] bg-white p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[#8E8E9E] font-bold block">01. Waktu Acara</span>
              <strong className="text-[#181824] font-extrabold tabular-nums">
                {formatEventDateTime(eventStartTime)}
              </strong>
            </div>
            <div>
              <span className="text-[#8E8E9E] font-bold block">02. Lokasi Venue</span>
              <strong className="text-[#181824] font-extrabold">{eventLocation}</strong>
            </div>
            <div>
              <span className="text-[#8E8E9E] font-bold block">03. Pemegang Tiket</span>
              <strong className="text-[#181824] font-extrabold">{attendeeName}</strong>
            </div>
            <div>
              <span className="text-[#8E8E9E] font-bold block">04. Email Terdaftar</span>
              <strong className="text-[#181824] font-extrabold">{attendeeEmail}</strong>
            </div>
          </div>

          {status === 'USED' && checkedInAt && (
            <div className="rounded-xl border-[1.5px] border-[#181824] bg-[#DEC9FF] px-3.5 py-2.5 text-xs font-extrabold text-[#181824]">
              ✓ Sudah Check-in pada <strong>{formatEventDateTime(checkedInAt)}</strong>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <AvatarStack countLabel="HMAC" badgeBg="bg-[#181824] text-white" />

            {showResendButton && (
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResendEmail}
                  isLoading={resending}
                >
                  ✉ Kirim Ulang ke Email
                </Button>
              </div>
            )}
          </div>
          {resendMessage && (
            <p className="text-xs font-bold text-[#181824]">{resendMessage}</p>
          )}
        </div>

        {/* Right 5 Cols: Crisp White QR Code Stub & Kode Manual (E-005) */}
        <div className="flex flex-col items-center justify-center bg-white p-6 text-center md:col-span-5">
          <div className="rounded-2xl border-2 border-[#181824] bg-white p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR Tiket ${ticketCode}`}
                width={185}
                height={185}
                className="h-[185px] w-[185px]"
              />
            ) : (
              <div className="flex h-[185px] w-[185px] items-center justify-center text-xs font-bold text-[#6E6E82]">
                Memuat QR...
              </div>
            )}
          </div>

          <div className="mt-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A5A6E] block">
              Kode Tiket Pintu Masuk
            </span>
            <span className="mt-1 inline-block rounded-xl border-[1.5px] border-[#181824] bg-[#FFE37E] px-4 py-1.5 font-mono text-base font-extrabold tracking-widest text-[#181824]">
              {ticketCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
