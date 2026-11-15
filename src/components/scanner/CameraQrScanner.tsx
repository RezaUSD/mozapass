'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export interface CameraQrScannerProps {
  onScanSuccess: (qrPayload: string) => void;
  onCameraError: (reason: string) => void;
  paused?: boolean;
}

/**
 * Komponen kamera pemindai QR menggunakan html5-qrcode (S-008, F-008, E-005).
 * Jika izin kamera ditolak atau tidak tersedia, memicu onCameraError agar UI beralih ke Input Kode Manual.
 */
export function CameraQrScanner({
  onScanSuccess,
  onCameraError,
  paused = false,
}: CameraQrScannerProps) {
  const containerId = 'mozapass-qr-reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const pausedRef = useRef<boolean>(paused);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCameraErrorRef = useRef(onCameraError);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    onCameraErrorRef.current = onCameraError;
  }, [onCameraError]);

  useEffect(() => {
    let mounted = true;
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.max(
              160,
              Math.min(220, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.68))
            );
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          if (!mounted || pausedRef.current) return;
          if (decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;
          onScanSuccessRef.current(decodedText);
          setTimeout(() => {
            lastScannedRef.current = '';
          }, 2500);
        },
        () => {
          // Abaikan frame kosong saat belum ada QR di depan kamera
        }
      )
      .then(() => {
        if (mounted) setInitializing(false);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setInitializing(false);
          const msg =
            err instanceof Error
              ? err.message
              : 'Izin akses kamera ditolak atau perangkat tidak memiliki kamera.';
          onCameraErrorRef.current(msg);
        }
      });

    return () => {
      mounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-2 border-[#D2F865]/50 bg-black shadow-lg">
        {initializing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 text-xs font-medium text-[#9A9AA6]">
            Mengaktifkan kamera...
          </div>
        )}
        <div
          id={containerId}
          className="h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
        />
      </div>
      <p className="mt-2.5 text-center text-[11px] font-medium text-[#9E9EB0]">
        Arahkan kode QR tiket ke dalam kotak pemindai
      </p>
    </div>
  );
}
