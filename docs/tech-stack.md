# ⚙️ Architecture & Tech Stack Specification: Mozapass (`/docs/tech-stack.md`)

- **Versi Dokumen:** 1.0.0
- **Tanggal Pembuatan:** 2026-11-14
- **Input Hulu:** `/docs/prd.md` (v1.0.0), `/docs/design.md` (v1.0.0)
- **Asumsi Terkait:** `A-001` s/d `A-009`

---

## 1. Arsitektur Sistem (High-Level Architecture)

Mozapass menggunakan arsitektur **Modular Monolith berbasis Next.js App Router** dengan pemisahan tegas antara **Presentation Layer (React Server/Client Components)**, **API Route Handlers (`/api/v1/*`)**, dan **Domain/Service Layer (`src/services/*`)**.

```mermaid
flowchart LR
    subgraph Clients["Klien (Mobile-First Web / PWA / Future APK)"]
        BuyerUI["Buyer Web UI (S-001..S-007)"]
        OrgUI["Organizer Bento Dashboard (S-009..S-012)"]
        ScannerUI["Staff Camera Scanner (S-008)"]
    end

    subgraph NextApp["Mozapass Server (Next.js App Router)"]
        API["REST API Route Handlers (/api/v1/*)"]
        Services["Domain Services (Order, Ticket, Event, Auth)"]
        Validator["Zod Schema Validation + RBAC Guard"]
    end

    subgraph External["Infrastruktur & Pihak Ketiga"]
        PG[("PostgreSQL 16 (ACID + Row Locking)")]
        Midtrans["Midtrans Snap Sandbox API"]
        SMTP["SMTP / Resend Email Service"]
    end

    BuyerUI & OrgUI & ScannerUI -->|HTTPS JSON| API
    API --> Validator --> Services
    Services -->|Prisma Interactive Tx + FOR UPDATE| PG
    Services -->|Create Snap Token| Midtrans
    Midtrans -->|Signed Webhook HTTP POST| API
    Services -->|Send QR Ticket Email| SMTP
```

### Mengapa Arsitektur Ini Dipilih:
1. **API-First (`/api/v1/*`) untuk Kesiapan APK (`NFR-003`):** Seluruh mutasi dan query bisnis terekspos melalui endpoint REST JSON standar di `/api/v1/*`. Saat Mozapass dikembangkan menjadi APK Android (Flutter/React Native/Capacitor), aplikasi mobile cukup memanggil endpoint `/api/v1/*` yang sama tanpa menulis ulang backend.
2. **ACID & Row-Level Locking (`NFR-001`, `BR-002`):** PostgreSQL dengan transaksi interaktif Prisma menjamin operasi penguncian kuota (`SELECT ... FOR UPDATE`) dan check-in QR (`UPDATE ... WHERE status = 'VALID'`) bebas *race condition*.
3. **Zero-Cost Portfolio Deployment (`A-009`):** Dapat dijalankan di lokal dengan 1 perintah dan di-deploy gratis ke **Vercel** + **Neon / Supabase PostgreSQL**.

---

## 2. Daftar Teknologi yang Dikunci (Locked Tech Stack)

Agent dilarang menambahkan library di luar daftar ini tanpa persetujuan eksplisit.

| Lapisan | Teknologi / Library | Versi Mayor | Kegunaan & Alasan Pemilihan |
|---|---|---|---|
| **Runtime & Package Manager** | Node.js + `npm` | Node `>=20.x`, npm `>=10.x` | Standar stabil, kompatibel penuh di Windows/Linux/Vercel (`A-009`). |
| **Fullstack Framework** | `next` (App Router) + `react` | Next `15.x` (atau `14.2.x`), React `19.x`/`18.x` | SSR untuk halaman publik (`NFR-002`), Route Handlers untuk REST API `/api/v1/*`. |
| **Bahasa Pemrograman** | `typescript` | `5.x` (`strict: true`) | Type-safety penuh dari database hingga UI; tanpa `any`. |
| **Styling & UI** | `tailwindcss` + `lucide-react` | Tailwind `3.4.x` / `4.x`, Lucide `0.x` | Implementasi Design Tokens (`#F7F7FA`, `#181824`, `#D2F865`, pastel) dari `design.md`. |
| **Database Utama** | PostgreSQL | `16.x` | RDBMS dengan dukungan transaksi ACID, `FOR UPDATE`, dan constraint ketat (`NFR-001`). |
| **ORM & Migrasi** | `prisma` & `@prisma/client` | `6.x` / `5.x` | Skema deklaratif, type-safe query, dan `$transaction` interaktif. |
| **Validasi Skema** | `zod` | `3.x` | Validasi seluruh request body, query params, dan payload webhook (`NFR-004`). |
| **Autentikasi & Password** | `jose` + `bcryptjs` | `jose 5.x`, `bcryptjs 2.x` | Pembuatan & verifikasi JWT stateless (mendukung HTTP-Only Cookie di Web dan `Authorization: Bearer` di APK, `A-007`). |
| **Kriptografi QR Code** | Node.js built-in `crypto` (`HMAC-SHA256`) | Built-in | Penandatanganan dan verifikasi cepat payload tiket QR (`BR-006`, `A-005`). |
| **Generator & Scanner QR** | `qrcode` + `html5-qrcode` | `qrcode 1.5.x`, `html5-qrcode 2.3.x` | Render QR code di tiket pembeli (`S-007`) & pemindaian kamera belakang di browser mobile (`S-008`, `A-008`). |
| **Payment Gateway** | Midtrans Snap REST API (`fetch` / `midtrans-client`) | REST v1 / Sandbox | Pembuatan transaksi pembayaran dan verifikasi signature webhook `SHA512` (`F-005`, `A-003`). |
| **Email Service** | `nodemailer` | `6.x` | Pengiriman email tiket ber-QR via SMTP (Resend/Gmail/Mailpit) dengan fallback aman (`F-006`, `E-006`). |
| **Testing Framework** | `vitest` + `@vitejs/plugin-react` | `2.x` / `3.x` | Unit & integration test cepat untuk logika anti-oversell, webhook idempotent, dan check-in (`A-009`). |

---

## 3. Kontrak Umum API, Format Data & Standar Error

Seluruh endpoint di `/api/v1/*` (yang dirinci di `/docs/api-spec.md`) wajib mematuhi kontrak berikut:

### 3.1 Konvensi Format Data Global
- **Mata Uang (`BR-001`, `NFR-005`):** Bilangan bulat (`integer`) Rupiah penuh (contoh: `150000`). Dilarang mengirim float atau string berformat `"Rp 150.000"` di dalam payload JSON (pemformatan `"Rp 150.000"` hanya dilakukan di layer UI dengan `Intl.NumberFormat('id-ID')`).
- **Waktu & Tanggal (`NFR-005`):** String **UTC ISO 8601** (contoh: `"2026-11-14T04:00:00.000Z"`).
- **ID Entitas:** Menggunakan **UUID v4** (atau `cuid`) bertipe string; untuk kode tiket yang dibaca manusia/input manual (`E-005`) menggunakan format `MOZA-XXXX-XXXX` (huruf kapital & angka).

### 3.2 Amplop Response Sukses (HTTP `200`, `201`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```
*(Objek `meta` bersifat opsional, wajib ada pada endpoint daftar/list ber-paginasi).*

### 3.3 Amplop Response Error (HTTP `4xx`, `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Maaf, sisa kuota kategori tiket ini tidak mencukupi.",
    "details": {}
  }
}
```

### 3.4 Kamus Kode Error Baku (Standard Error Codes)
Kode error berikut dikunci dan wajib konsisten dengan `api-spec.md`:

| Kode Error | HTTP Status | Kondisi Pemicu (Ref PRD) |
|---|---|---|
| `VALIDATION_ERROR` | `400` | Input form/JSON gagal validasi skema Zod. |
| `UNAUTHORIZED` | `401` | Belum login atau token JWT tidak valid/kedaluwarsa. |
| `FORBIDDEN_ROLE` | `403` | Role pengguna tidak diizinkan mengakses endpoint (`RBAC`). |
| `FORBIDDEN_OWNERSHIP` | `403` | Mencoba mengakses pesanan/acara/scanner milik orang lain (`BR-009`). |
| `NOT_FOUND` | `404` | Acara, kategori, pesanan, atau tiket tidak ditemukan. |
| `QUOTA_EXCEEDED` | `409` | Kuota tiket habis atau sedang ditahan pembeli lain (`BR-002`, `E-001`). |
| `ACTIVE_ORDER_EXISTS` | `409` | Pembeli masih memiliki pesanan `PENDING` aktif di acara yang sama (`BR-011`). |
| `SALE_WINDOW_CLOSED` | `422` | Pembelian di luar jadwal `sale_start_at` – `sale_end_at` atau acara tidak `PUBLISHED` (`BR-004`). |
| `MAX_ORDER_LIMIT_EXCEEDED` | `422` | Jumlah tiket melebihi `max_per_order` kategori (`BR-004`). |
| `CATEGORY_LOCKED` | `422` | Mencoba menghapus atau mengubah harga kategori yang sudah memiliki transaksi (`BR-010`). |
| `INVALID_STATE_TRANSITION` | `422` | Transisi status melanggar aturan `ST-001` s/d `ST-013`. |
| `ORDER_EXPIRED` | `410` | Mencoba membayar pesanan yang sudah melewati `expires_at` 15 menit (`BR-003`, `ST-008`). |
| `QR_SIGNATURE_INVALID` | `422` | Tanda tangan HMAC QR code tidak cocok / terindikasi palsu (`BR-006`). |
| `TICKET_ALREADY_USED` | `409` | Tiket sudah pernah di-check-in sebelumnya (`BR-007`, `E-004`). |
| `TICKET_WRONG_EVENT` | `422` | Tiket berasal dari acara berbeda dengan acara yang sedang dibuka scanner (`BR-009`). |
| `WEBHOOK_SIGNATURE_INVALID` | `401` | Signature notifikasi Midtrans tidak valid (`BR-008`, `NFR-004`). |
| `RATE_LIMITED` | `429` | Terlalu banyak percobaan request (misal brute-force login atau input manual `ticket_code` pada scanner, `E-005`). |
| `APP_UPDATE_REQUIRED` | `426` | Versi klien APK di bawah versi minimum yang didukung server. |
| `INTERNAL_ERROR` | `500` | Kesalahan tak terduga di sisi server. |

---

## 4. Pola Teknis Kritis: Anti-Oversell, Webhook & QR

1. **Pola Anti-Oversell (`BR-002`, `E-001`, `E-007`):**
   - Sebelum memeriksa kuota di dalam `prisma.$transaction`, jalankan *lazy expiration cleanup* (`E-007`): bebaskan semua order `PENDING` pada kategori tersebut yang `expires_at < NOW()` menjadi `EXPIRED` dan kurangi `reserved_count`-nya.
   - Kunci baris kategori tiket dengan raw query di dalam transaksi:
     `SELECT id, total_quota, sold_count, reserved_count FROM ticket_categories WHERE id = $1 FOR UPDATE`
   - Verifikasi `sold_count + reserved_count + requested_qty <= total_quota`. Jika gagal, lempar `QUOTA_EXCEEDED`.
2. **Pola Webhook Idempotent (`BR-008`, `E-002`, `E-003`):**
   - Verifikasi `signature_key === SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`.
   - Kunci baris `orders` dengan `FOR UPDATE`. Jika `order.status === 'PAID'`, langsung kembalikan `200 OK` (idempotent).
   - Jika `order.status === 'PENDING'` dan webhook `settlement`/`capture`, ubah ke `PAID`, pindahkan `reserved_count` ke `sold_count`, dan buat `N` baris `tickets` di dalam transaksi yang sama. Pengiriman email dilakukan *setelah* commit transaksi di blok `try/catch` terpisah agar kegagalan SMTP tidak membatalkan status `PAID` (`E-006`).
3. **Pola Tanda Tangan QR (`BR-006`, `A-005`):**
   - Fungsi murni `generateQrPayload(ticketCode, eventId, secret)` menghasilkan `MOZA.${ticketCode}.${hmacSha256(ticketCode + ':' + eventId, secret).slice(0, 16).toUpperCase()}`.
   - Verifikasi menggunakan `crypto.timingSafeEqual` untuk mencegah *timing attack*.

---

## 5. Spesifikasi Mobile-First, PWA & Kesiapan APK (`NFR-003`)

Walaupun rilis pertama berbasis Web Next.js, arsitektur disiapkan untuk transisi mulus ke APK:
1. **Dual-Mode Auth (`A-007`):** Middleware/helper autentikasi membaca token dari cookie `mozapass_token` (untuk Web) **atau** header `Authorization: Bearer <token>` (untuk klien APK masa depan).
2. **Version Gate Header (`APP_UPDATE_REQUIRED`):** Jika request menyertakan header `X-App-Version` (saat diakses dari APK), server memeriksa terhadap `MIN_SUPPORTED_APP_VERSION`.
3. **Penanganan Kamera & Offline di Klien (`E-005`, `F-013`):**
   - Komponen scanner (`S-008`) meminta `facingMode: "environment"` (kamera belakang HP). Jika izin ditolak (`NotAllowedError`) atau perangkat tidak punya kamera (`NotFoundError`), UI otomatis membuka tab **Input Kode Tiket Manual**.
   - Jika koneksi internet terputus (`navigator.onLine === false`), tampilkan banner peringatan jelas di bagian atas layar bahwa check-in dan pembayaran membutuhkan koneksi internet aktif.

---

## 6. Strategi Testing & Perintah Baku

### 6.1 Perintah CLI Baku (Wajib Sama di `package.json` & `AGENTS.md`)
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development Next.js. |
| `npm run build` | Membangun aplikasi untuk produksi (`next build`). |
| `npm run lint` | Menjalankan pemeriksaan ESLint (`next lint`). |
| `npm run type-check` | Menjalankan pemeriksaan tipe TypeScript (`tsc --noEmit`). |
| `npm run test` | Menjalankan seluruh test suite Vitest satu kali (`vitest run`). |
| `npm run db:migrate` | Menjalankan migrasi database Prisma (`prisma migrate dev`). |
| `npm run db:seed` | Mengisi data awal aman (`prisma db seed`). |

### 6.2 Cakupan Test Wajib
1. **Unit Test (`tests/unit/*.test.ts`):**
   - Pembuatan dan verifikasi tanda tangan HMAC QR (`BR-006`), termasuk deteksi manipulasi karakter.
   - Validasi jendela penjualan & batas beli (`BR-004`), perhitungan harga integer (`BR-001`), dan verifikasi signature webhook Midtrans (`BR-008`).
2. **Integration / Concurrency Service Test (`tests/integration/*.test.ts`):**
   - Simulasi race condition 2 pembeli memperebutkan 1 tiket terakhir (`E-001`, `BR-002`) → tepat 1 berhasil `PENDING`, 1 gagal `QUOTA_EXCEEDED`.
   - Pemulihan kuota otomatis saat reservasi kedaluwarsa 15 menit (`BR-003`, `ST-008`, `E-007`).
   - Idempotensi webhook dikirim 3x berturut-turut (`E-003`, `ST-007`) → jumlah tiket terbit tetap `N`, bukan `3N`.
   - Single check-in (`BR-007`, `ST-012`, `E-004`) → scan kedua menghasilkan `TICKET_ALREADY_USED`, dan scan oleh `STAFF` acara lain menghasilkan `FORBIDDEN_OWNERSHIP` / `TICKET_WRONG_EVENT` (`BR-009`).

---

## 7. Observability, Logging & Variabel Lingkungan (`.env.example`)

### 7.1 Aturan Logging (`NFR-006`)
Gunakan logger terstruktur (`src/lib/logger.ts`) berformat JSON satu baris untuk setiap event domain penting:
- `ORDER_CREATED`, `ORDER_PAID`, `ORDER_EXPIRED`, `WEBHOOK_DUPLICATE_IGNORED`, `OVERBOOK_PAYMENT_ALERT` (`E-002`), `TICKET_CHECKED_IN`, `TICKET_CHECKIN_REJECTED`.
- **Dilarang keras** mencatat `password`, `password_hash`, `JWT_SECRET`, `QR_SECRET_KEY`, `MIDTRANS_SERVER_KEY`, atau token sesi ke dalam log.

### 7.2 Template `.env.example` Wajib
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mozapass?schema=public"

# Security & Auth (Minimal 32 karakter acak)
JWT_SECRET="replace-with-32-char-random-jwt-secret-key"
QR_SECRET_KEY="replace-with-32-char-random-qr-hmac-secret"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESERVATION_HOLD_MINUTES="15"
MIN_SUPPORTED_APP_VERSION="1.0.0"
ENABLE_PAYMENT_SIMULATOR="false"

# Midtrans Sandbox Configuration
MIDTRANS_IS_PRODUCTION="false"
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxxxxxxxxxx"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxxxxxxxxxx"

# Email / SMTP Configuration
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-pass"
EMAIL_FROM="Mozapass <noreply@mozapass.local>"
```

---

## 8. Struktur Folder Kanonis (Canonical Folder Tree)

Setiap file baru wajib ditempatkan sesuai peta direktori berikut:

```text
mozapass/
├── AGENTS.md
├── .agents/
│   └── workflows/
├── docs/
│   ├── prd.md
│   ├── design.md
│   ├── tech-stack.md
│   ├── database-schema.md
│   ├── api-spec.md
│   └── tasks.md
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (public)/              # S-001, S-002, S-003, S-004
│   │   ├── (buyer)/               # S-005, S-006, S-007
│   │   ├── organizer/             # S-009, S-010, S-011, S-012
│   │   ├── scanner/               # S-008
│   │   ├── admin/                 # S-013
│   │   └── api/
│   │       └── v1/                # Seluruh endpoint REST EP-xxx
│   ├── components/
│   │   ├── ui/                    # Komponen dasar (Button pill Lime, BentoCard, Badge, Skeleton)
│   │   ├── layout/                # DarkSidebar (#181824), BuyerBottomNav, TopHeader
│   │   ├── events/                # EventCard, CategorySelector
│   │   ├── orders/                # CountdownBanner, CheckoutSummary
│   │   ├── tickets/               # BoardingPassCard, QrCodeDisplay
│   │   └── scanner/               # CameraQrScanner, ScanResultSheet, ManualCodeForm
│   ├── lib/
│   │   ├── db.ts                  # Singleton PrismaClient
│   │   ├── auth.ts                # JWT sign/verify (jose) & RBAC guard helper
│   │   ├── qr-crypto.ts           # HMAC-SHA256 generator & verifier (BR-006)
│   │   ├── midtrans.ts            # Snap token & SHA512 webhook signature verifier
│   │   ├── mailer.ts              # Pengirim email tiket QR dengan fallback aman (E-006)
│   │   ├── errors.ts              # Kelas AppError & helper response JSON standar
│   │   ├── logger.ts              # Structured logger (NFR-006)
│   │   └── format.ts              # Formatter Rupiah & tanggal lokal
│   ├── schemas/                   # Skema validasi Zod (auth, event, order, scanner)
│   └── services/                  # Logika bisnis murni & transaksi DB
│       ├── auth.service.ts
│       ├── event.service.ts
│       ├── order.service.ts       # Anti-oversell FOR UPDATE, hold timer, webhook
│       ├── ticket.service.ts      # Check-in atomik & penerbitan tiket
│       └── report.service.ts      # Statistik bento dashboard & generator CSV
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 9. Konvensi Koding & Penamaan

1. **Penamaan File:**
   - Komponen React: `PascalCase.tsx` (mis. `BoardingPassCard.tsx`, `DarkSidebar.tsx`).
   - Service, Schema, & Lib: `kebab-case.ts` atau `*.service.ts` / `*.schema.ts` (mis. `order.service.ts`, `qr-crypto.ts`).
2. **Penamaan Variabel & Fungsi:** `camelCase` untuk variabel/fungsi, `UPPER_SNAKE_CASE` untuk konstanta dan kode error, `PascalCase` untuk tipe/interface TypeScript.
3. **Aturan Route Handler:** Route Handler di `src/app/api/v1/**/route.ts` hanya bertugas: (1) autentikasi & cek role, (2) validasi input dengan Zod, (3) memanggil fungsi di `src/services/*`, dan (4) membungkus return ke format JSON standar. Dilarang menulis query Prisma kompleks langsung di dalam komponen UI atau Route Handler.

---

## ✅ Quality Gate Report
- **✅ Lulus — Kesesuaian PRD & NFR:** Seluruh kebutuhan `NFR-001` s/d `NFR-006`, pola transaksi anti-oversell (`FOR UPDATE`), idempotensi webhook Midtrans, dan tanda tangan HMAC QR telah memiliki spesifikasi teknis dan pola implementasi yang jelas.
- **✅ Lulus — Kesiapan Web, PWA & APK:** Kontrak REST API `/api/v1/*`, kamus error baku, dual-mode JWT auth (Cookie + Bearer), dan penanganan kamera/offline telah dikunci.
- **⚠️ Catatan:** Pilihan teknologi default telah dicatat juga sebagai asumsi resmi `A-006` s/d `A-009` di `/docs/prd.md` agar 100% sinkron.
