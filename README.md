# 🎟️ Mozapass — Platform Web Ticketing Acara & Check-in QR Anti-Oversell

**Mozapass** adalah platform manajemen acara dan penjualan E-Ticket ber-QR code (*fullstack web ticketing*, *mobile-first* & *APK-ready*) yang dirancang dengan ketahanan transaksi setara sistem produksi:
- **Jaminan Anti-Oversell Berlapis (`BR-002`, `E-001`):** Kombinasi *row-level locking* PostgreSQL (`SELECT ... FOR UPDATE` di dalam `prisma.$transaction`) dan constraint level database `CHECK ("sold_count" + "reserved_count" <= "total_quota")`.
- **Reservasi Kuota 15 Menit & Optimistic Concurrency (`BR-003`, `ST-008`, `E-007`):** Pembebasan kuota otomatis (*lazy cleanup* + *version guard*) yang bebas *race condition* dengan webhook pembayaran.
- **Webhook Pembayaran Idempotent & Simulator Terkendali (`BR-008`, `EP-011`, `EP-012`):** Verifikasi signature `SHA-512` Midtrans, deduplikasi `UNIQUE (provider, external_id)` di `payment_webhook_logs`, pemulihan *late payment* (`E-002`), dan tombol simulator bayar instan untuk demo portofolio.
- **E-Ticket Boarding Pass & Single Check-in Atomik (`BR-006`, `BR-007`, `EP-017`):** Payload QR `MOZA.<ticketCode>.<hmac16>` bertanda tangan `HMAC-SHA256` (*timing-safe*), isolasi acara per panitia (`BR-009`), pemindaian kamera `html5-qrcode`, dan fallback input manual ber-*rate-limit* (`E-005`).

---

## 🏗️ Tech Stack Terkunci

- **Framework:** Next.js 14.2+ (App Router, Fullstack TypeScript `strict: true`)
- **Database & ORM:** PostgreSQL 16 (Neon Serverless) + Prisma ORM 5.x
- **Autentikasi & RBAC:** Dual-Mode JWT (`jose` — HttpOnly Cookie & `Authorization: Bearer`) + `bcryptjs` untuk 4 Role (`BUYER`, `ORGANIZER`, `STAFF`, `ADMIN`)
- **UI & Design System:** Tailwind CSS — *Tactile Bento Productivity* (`#F7F7FA` Canvas, `#FFFFFF` Calm Checkout Surface, `#181824` Dark Anchor, `#D2F865` High-Contrast Lime Accent dengan teks gelap `#181824`)
- **Testing:** Vitest (16 Test Files — Unit, Integrasi, & Simulasi Konkurensi)

---

## 🚀 Cara Menjalankan di Lokal

1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment (`.env`):**
   Salin `.env.example` ke `.env` dan isi URL PostgreSQL Anda:
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

## 🔐 Akun Demo (Hasil `npm run db:seed`)

Seluruh akun demo di bawah ini menggunakan password yang sama: **`MozaPass2026!`**

| Role | Email | Kegunaan Pengujian |
|---|---|---|
| **BUYER** | `buyer@mozapass.local` | Membeli tiket, menguji Countdown Checkout 15 menit, & melihat Boarding Pass QR |
| **ORGANIZER** | `organizer@mozapass.local` | Melihat Bento Dashboard (`S-009`), CRUD Acara, Ekspor CSV Peserta, & Kelola Staff |
| **STAFF** | `staff@mozapass.local` | Membuka Kamera Scanner (`S-008`) & memindai kode tiket di pintu masuk |
| **ADMIN** | `admin@mozapass.local` | Moderasi acara publik (`SUSPEND` / `RESTORE` di `/admin/events`) |

### 🎫 Kode Tiket Siap Scan untuk Pengujian Cepat (`S-008`)
- **Kode Tiket Demo (`VALID`):** `MOZA-DEMO-0001`
- **Acara:** *Nusantara Indie Soundscape 2026*
- **Cara Uji:** Login sebagai `staff@mozapass.local` → buka `/scanner` → pilih acara *Nusantara Indie Soundscape 2026* → pilih tab **Input Kode Manual** → masukkan `MOZA-DEMO-0001`. Scan pertama akan menghasilkan **Hijau (VALID)**, dan scan kedua pada tiket yang sama akan langsung ditolak **Merah (`409 TICKET_ALREADY_USED`)** lengkap dengan jam dan nama petugas scan pertama.

---

## 🧪 Perintah Verifikasi & Pengujian Otomatis

```bash
npm run type-check   # Verifikasi TypeScript strict (0 error)
npm run lint         # Verifikasi ESLint Next.js (0 warning/error)
npm run test         # Jalankan seluruh 16 suite unit & integration/concurrency test
npm run build        # Build produksi Next.js
```

---

## 📂 Dokumen Spesifikasi (Single Source of Truth)

- [PRD & Logika Bisnis](file:///c:/Project/mozapass/docs/prd.md)
- [Design System & Layar UI](file:///c:/Project/mozapass/docs/design.md)
- [Tech Stack & Arsitektur](file:///c:/Project/mozapass/docs/tech-stack.md)
- [Skema Database & Constraint SQL](file:///c:/Project/mozapass/docs/database-schema.md)
- [Spesifikasi Kontrak API](file:///c:/Project/mozapass/docs/api-spec.md)
- [Daftar 23 Task Atomik](file:///c:/Project/mozapass/docs/tasks.md)
