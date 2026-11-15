'use client';

import React, { useEffect, useState } from 'react';

/**
 * Menampilkan banner peringatan saat perangkat kehilangan koneksi internet (NFR-003, F-013).
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-[#DC2626] px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-white shadow-md"
    >
      ⚠️ Koneksi internet terputus. Pemesanan tiket, pembayaran, dan validasi check-in QR
      membutuhkan koneksi internet aktif.
    </div>
  );
}
