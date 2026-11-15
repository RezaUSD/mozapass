import type { Metadata } from 'next';
import '@/app/globals.css';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export const metadata: Metadata = {
  title: 'Mozapass — Platform Tiket Acara Anti-Oversell & QR Kriptografis',
  description:
    'Pesan tiket acara online dengan jaminan kuota anti-oversell, pembayaran idempotent, dan check-in QR HMAC-SHA256.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F7F7FA] text-[#181824] antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
