# 🎟️ Mozapass — Platform Ticketing Acara & Check-in QR Anti-Oversell

**Mozapass** adalah platform manajemen acara dan penjualan E-Ticket ber-QR code (*fullstack web ticketing*, *mobile-first* & *APK-ready*) yang dirancang dengan ketahanan transaksi setara sistem produksi:

- **Jaminan Anti-Oversell Berlapis:** Kombinasi *row-level locking* PostgreSQL (`SELECT ... FOR UPDATE` di dalam `prisma.$transaction`) dan constraint level database `CHECK ("sold_count" + "reserved_count" <= "total_quota")`.
- **Reservasi Kuota 15 Menit & Optimistic Concurrency:** Pembebasan kuota otomatis (*lazy cleanup* + *version guard*) yang bebas *race condition* dengan webhook pembayaran.
- **Webhook Pembayaran Idempotent & Simulator Demo:** Verifikasi signature `SHA-512` Midtrans, deduplikasi `UNIQUE (provider, external_id)` di `payment_webhook_logs`, pemulihan *late payment*, serta tombol simulasi pembayaran instan untuk demo portofolio.
- **E-Ticket Boarding Pass & Single Check-in Atomik:** Payload QR `MOZA.<ticketCode>.<hmac16>` bertanda tangan `HMAC-SHA256` (*timing-safe*), isolasi acara per panitia, pemindaian kamera `html5-qrcode`, dan fallback input manual ber-*rate-limit*.
- **Laporan Kehadiran Siap Cetak:** Laporan peserta dengan ringkasan KPI, tampilan **Cetak / Simpan PDF** bersih format A4, serta **Ekspor CSV** kompatibel langsung dengan Microsoft Excel (`UTF-8 BOM` + `sep=,`).

---

## 🏗️ Tech Stack

- **Framework:** Next.js 14.2+ (App Router, TypeScript `strict: true`)
- **Database & ORM:** PostgreSQL 16 (Neon Serverless) + Prisma ORM 5.x
- **Autentikasi & RBAC:** Dual-Mode JWT (`jose` — HttpOnly Cookie & `Authorization: Bearer`) + `bcryptjs` untuk 4 Role (`BUYER`, `ORGANIZER`, `STAFF`, `ADMIN`)
- **UI & Design System:** Tailwind CSS — *Tactile Bento Productivity* (`#F7F7FA` Canvas, `#FFFFFF` Calm Checkout Surface, `#181824` Dark Anchor, `#D2F865` Lime Accent)
- **Testing:** Vitest (17 Test Files, 64 Tests — Unit, Integrasi, & Simulasi Konkurensi)

---

## ⚡ Fitur Demo Portofolio (1-Klik Uji Role)

Untuk memudahkan reviewer/recruiter mencoba seluruh fitur tanpa registrasi berulang, tersedia **Live Showcase Role Switcher** di header atas (`NEXT_PUBLIC_ENABLE_DEMO_BAR="true"`):

| Role | Email Demo | Password | Fitur Utama |
|---|---|---|---|
| **BUYER** | `buyer@mozapass.local` | `MozaPass2026!` | Jelajah katalog, pesan tiket, checkout countdown 15 menit, & Boarding Pass QR |
| **ORGANIZER** | `organizer@mozapass.local` | `MozaPass2026!` | Bento Dashboard analitik, CRUD acara & kategori, Laporan PDF/CSV, & kelola Staff |
| **STAFF** | `staff@mozapass.local` | `MozaPass2026!` | Gate Scanner kamera QR & Input Kode Manual di pintu masuk |
| **ADMIN** | `admin@mozapass.local` | `MozaPass2026!` | Moderasi acara publik (`SUSPEND` / `RESTORE`) & persetujuan Organizer |

### 🎫 Kode Tiket Siap Uji di Scanner
- **Kode Tiket Demo (`VALID`):** `MOZA-DEMO-0001`
- **Acara:** *Mozapass Tech & Music Fest 2026*
- **Cara Uji:** Klik **STAFF** pada bar *Uji Role* → pilih acara *Mozapass Tech & Music Fest 2026* → pilih **Input Manual** → masukkan `MOZA-DEMO-0001`. Scan pertama menghasilkan **Hijau (VALID)**, dan scan kedua pada tiket yang sama otomatis ditolak **Merah (`409 TICKET_ALREADY_USED`)**.

---

## 🚀 Cara Menjalankan di Lokal

1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment (`.env`):**
   Salin `.env.example` ke `.env` dan isi `DATABASE_URL`, `JWT_SECRET`, serta `QR_SECRET_KEY`:
   ```bash
   cp .env.example .env
   ```

3. **Jalankan Migrasi & Seed Data Demo:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

---

## ☁️ Deploy ke Vercel

1. Import repository ini di [vercel.com](https://vercel.com).
2. Masukkan Environment Variables dari `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `QR_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ENABLE_DEMO_BAR=true`, `ENABLE_PAYMENT_SIMULATOR=true`).
3. Klik **Deploy** (`postinstall: prisma generate` sudah otomatis terkonfigurasi di `package.json`).

---

## 🧪 Perintah Verifikasi & Pengujian

```bash
npm run type-check   # Verifikasi TypeScript strict
npm run lint         # Verifikasi ESLint Next.js
npm run test         # Jalankan seluruh 17 file test (64 test)
npm run build        # Build produksi Next.js
```

---

## 📂 Dokumen Spesifikasi

- [PRD & Logika Bisnis](./docs/prd.md)
- [Design System & Layar UI](./docs/design.md)
- [Tech Stack & Arsitektur](./docs/tech-stack.md)
- [Skema Database & Constraint SQL](./docs/database-schema.md)
- [Spesifikasi Kontrak API](./docs/api-spec.md)
- [Daftar Task Atomik](./docs/tasks.md)
