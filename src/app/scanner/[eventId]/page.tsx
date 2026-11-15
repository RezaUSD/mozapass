'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Keyboard, MapPin } from 'lucide-react';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
import { ManualCodeForm } from '@/components/scanner/ManualCodeForm';
import {
  type ScanFeedbackState,
  ScanResultSheet,
} from '@/components/scanner/ScanResultSheet';
import { BentoCard, TactileQuotaBar } from '@/components/ui/BentoCard';

interface AssignedEventSummary {
  id: string;
  title: string;
  location: string;
  totalValidOrUsed: number;
  checkedInCount: number;
}

export default function EventVenueScannerPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const [eventInfo, setEventInfo] = useState<AssignedEventSummary | null>(null);
  const [mode, setMode] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [cameraErrorReason, setCameraErrorReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<ScanFeedbackState | null>(null);

  const loadEventStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/events', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: AssignedEventSummary[];
      };
      if (res.ok && json.success && json.data) {
        const found = json.data.find((e) => e.id === params.eventId) ?? null;
        setEventInfo(found);
      }
    } catch {
      // Tetap lanjutkan
    }
  }, [params.eventId, router]);

  useEffect(() => {
    void loadEventStats();
  }, [loadEventStats]);

  const executeCheckIn = useCallback(
    async (payload: { qrPayload?: string; ticketCode?: string }) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch('/api/v1/scanner/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: params.eventId,
            qrPayload: payload.qrPayload ?? null,
            ticketCode: payload.ticketCode ?? null,
          }),
        });

        const json = (await res.json()) as {
          success: boolean;
          data?: {
            result: string;
            ticketCode: string;
            attendeeName: string;
            categoryName: string;
            checkInMethod: string;
            checkedInAt: string;
          };
          error?: {
            code: string;
            message: string;
            details?: {
              ticketCode?: string;
              attendeeName?: string;
              categoryName?: string;
              checkedInAt?: string;
              checkedInByName?: string;
              checkInMethod?: string;
            };
          };
        };

        if (res.ok && json.success && json.data) {
          setFeedback({
            outcome: 'SUCCESS',
            code: 'VALID',
            message: `Check-in Berhasil: ${json.data.attendeeName}`,
            ticketCode: json.data.ticketCode,
            attendeeName: json.data.attendeeName,
            categoryName: json.data.categoryName,
            checkedInAt: json.data.checkedInAt,
            checkInMethod: json.data.checkInMethod,
          });
          await loadEventStats();
        } else {
          setFeedback({
            outcome: 'ERROR',
            code: json.error?.code || 'ERROR',
            message: json.error?.message || 'Tiket tidak dapat divalidasi.',
            ticketCode: json.error?.details?.ticketCode,
            attendeeName: json.error?.details?.attendeeName,
            categoryName: json.error?.details?.categoryName,
            checkedInAt: json.error?.details?.checkedInAt,
            checkedInByName: json.error?.details?.checkedInByName,
            checkInMethod: json.error?.details?.checkInMethod,
          });
        }
      } catch {
        setFeedback({
          outcome: 'ERROR',
          code: 'NETWORK_ERROR',
          message: 'Koneksi internet terputus. Periksa jaringan di pintu masuk.',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [params.eventId, submitting, loadEventStats]
  );

  const handleCameraError = useCallback((reason: string) => {
    setCameraErrorReason(reason);
    setMode('MANUAL');
  }, []);

  return (
    <main className="min-h-screen bg-[#181824] px-4 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-lg space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#232329] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#FFE37E] hover:text-[#181824] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ganti Acara
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D2F865]/30 bg-[#232329] px-3 py-1.5 text-[11px] font-extrabold text-[#D2F865]">
            <span className="h-2 w-2 rounded-full bg-[#D2F865] animate-pulse" />
            Gate Scanner Aktif
          </span>
        </div>

        {/* Tactile Warm Yellow Header Card for Live Venue Attendance */}
        <BentoCard variant="yellow" padding="md" className="text-[#181824]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-[#181824] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
              Live Check-in
            </span>
            {eventInfo && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#181824]/80">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{eventInfo.location}</span>
              </span>
            )}
          </div>
          <h1 className="mt-2 text-lg sm:text-xl font-extrabold leading-snug text-[#181824]">
            {eventInfo ? eventInfo.title : 'Scanner Pintu Masuk'}
          </h1>
          {eventInfo && (
            <div className="mt-3">
              <TactileQuotaBar
                label="Progress Kehadiran"
                rightText={`${eventInfo.checkedInCount}/${eventInfo.totalValidOrUsed} hadir`}
                used={eventInfo.checkedInCount}
                total={Math.max(1, eventInfo.totalValidOrUsed)}
              />
            </div>
          )}
        </BentoCard>

        {/* Toggle Kamera vs Input Manual (E-005) */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/15 bg-[#232329] p-1.5">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode('CAMERA');
            }}
            className={[
              'inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl text-xs font-extrabold transition-colors',
              mode === 'CAMERA'
                ? 'bg-[#FFE37E] text-[#181824]'
                : 'text-[#A5A5B5] hover:text-white',
            ].join(' ')}
          >
            <Camera className="h-4 w-4" />
            Scan Kamera QR
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode('MANUAL');
            }}
            className={[
              'inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl text-xs font-extrabold transition-colors',
              mode === 'MANUAL'
                ? 'bg-[#FFE37E] text-[#181824]'
                : 'text-[#A5A5B5] hover:text-white',
            ].join(' ')}
          >
            <Keyboard className="h-4 w-4" />
            Input Manual
          </button>
        </div>

        <ScanResultSheet
          feedback={feedback}
          onDismiss={() => setFeedback(null)}
        />

        {!feedback && mode === 'CAMERA' && (
          <CameraQrScanner
            paused={submitting}
            onScanSuccess={(qrPayload) => {
              void executeCheckIn({ qrPayload });
            }}
            onCameraError={handleCameraError}
          />
        )}

        {!feedback && mode === 'MANUAL' && (
          <ManualCodeForm
            isLoading={submitting}
            cameraFallbackReason={cameraErrorReason}
            onSubmitCode={async (ticketCode) => {
              await executeCheckIn({ ticketCode });
            }}
          />
        )}
      </div>
    </main>
  );
}
