# 📋 Atomic Implementation Tasks & Traceability: Mozapass (`/docs/tasks.md`)

- **Versi Dokumen:** 1.0.0
- **Tanggal Pembuatan:** 2026-11-14
- **Input Hulu:** `/docs/prd.md`, `/docs/design.md`, `/docs/tech-stack.md`, `/docs/database-schema.md`, `/docs/api-spec.md`
- **Status Progress:** `23 / 23 Tasks Selesai (100%)`

---

## 1. Ringkasan Progress per Fase

| Fase | Fokus Utama | Rentang Task | Jumlah Task | Status |
|---|---|---|---|---|
| **Fase 1** | Pondasi Project, Skema Database + Constraint SQL, Seed Aman, Core Security & QR Crypto | `T-101` – `T-104` | 4 | `[x] 4/4` |
| **Fase 2** | Design System Bento/Lime, App Shell Navigasi per Role, Autentikasi & RBAC Guard | `T-201` – `T-203` | 3 | `[x] 3/3` |
| **Fase 3** | CRUD Acara & Kategori Tiket Organizer + Katalog & Detail Acara Publik | `T-301` – `T-304` | 4 | `[x] 4/4` |
| **Fase 4** | Mesin Anti-Oversell (+ Test), Job Kedaluwarsa, Simulator Bayar, Midtrans Webhook (+ Test), & E-Ticket | `T-401` – `T-406` | 6 | `[x] 6/6` |
| **Fase 5** | Penugasan Staff, Kamera Scanner Check-in Atomik, Bento Dashboard, CSV & Admin Moderasi | `T-501` – `T-504` | 4 | `[x] 4/4` |
| **Fase 6** | Suite E2E/Cross-Feature Concurrency QA (Double Scan, Late Payment `E-002`) & Kesiapan Rilis | `T-601` – `T-602` | 2 | `[x] 2/2` |

> **Total Task:** 23 Tiket Atomik (`T-101` s/d `T-602`). Setiap task menyentuh **maksimal ≤ 5 file**, dapat diverifikasi mandiri dengan perintah test/lint/type-check, dan wajib di-commit terpisah (`feat(T-xxx): ...`).

---

## 2. Fase 1: Pondasi Project, Database & Utilitas Keamanan

### `[x]` `T-101` — Inisialisasi Next.js, TypeScript Strict, Vitest & Variabel Lingkungan
- **Depends On:** *(Tidak ada)*
- **Refs:** `NFR-003`, `NFR-004`, `NFR-005`, `A-006`, `A-009`
- **Files (5):**
  1. `package.json`
  2. `tsconfig.json`
  3. `vitest.config.ts`
  4. `.env.example`
  5. `src/lib/format.ts`
- **Deskripsi:** Mengonfigurasi project Next.js App Router dengan TypeScript (`strict: true`), script CLI baku (`dev`, `build`, `lint`, `type-check`, `test`, `db:migrate`, `db:seed`), template `.env.example` (termasuk `ENABLE_PAYMENT_SIMULATOR="false"`), serta helper format Rupiah integer (`BR-001`) dan waktu UTC ISO 8601 (`NFR-005`).
- **Tests:** `tests/unit/format.test.ts` — memverifikasi pemformatan integer Rupiah dan konversi tanggal UTC.
- **Acceptance Criteria:**
  - Semua script baku di `package.json` sesuai dengan `/docs/tech-stack.md` Bagian 6.1.
  - `npm run type-check` dan `npm run test` berjalan hijau tanpa error.

### `[x]` `T-102` — Skema Prisma, Migrasi Constraint Anti-Oversell SQL & Seed Data Aman
- **Depends On:** `T-101`
- **Refs:** `BR-001`, `BR-002`, `BR-011`, `NFR-001`, `A-010`
- **Files (4):**
  1. `prisma/schema.prisma`
  2. `prisma/migrations/0001_init/migration.sql`
  3. `prisma/seed.ts`
  4. `src/lib/db.ts`
- **Deskripsi:** Mengimplementasikan skema Prisma lengkap (7 tabel, tanpa `OrderItem` sesuai `A-010`, termasuk `version` pada `orders` dan `check_in_method` pada `tickets`), menambahkan SQL constraint `CHECK ("sold_count" + "reserved_count" <= "total_quota")` serta partial unique index `idx_orders_one_active_pending_per_buyer_event`, dan membuat script `seed.ts` (4 akun demo, 2 acara, 1 tiket `VALID` kode `MOZA-DEMO-0001` siap scan).
- **Tests:** Menjalankan `npm run db:migrate` dan `npm run db:seed` serta memastikan `seed.ts` melempar error jika `NODE_ENV=production`.
- **Acceptance Criteria:**
  - Constraint PostgreSQL menolak langsung `UPDATE ticket_categories SET sold_count = total_quota + 1`.
  - Seed menolak berjalan saat `NODE_ENV=production` dan berhasil membuat 4 role demo + tiket `MOZA-DEMO-0001` di mode dev.

### `[x]` `T-103` — Core Error Envelope, Structured Logger & Kriptografi QR HMAC-SHA256
- **Depends On:** `T-101`
- **Refs:** `BR-006`, `NFR-004`, `NFR-006`, `A-005`
- **Files (4):**
  1. `src/lib/errors.ts`
  2. `src/lib/logger.ts`
  3. `src/lib/qr-crypto.ts`
  4. `tests/unit/qr-crypto.test.ts`
- **Deskripsi:** Membuat kelas `AppError` beserta pembungkus response JSON standar (`{ success, data, meta }` / `{ success: false, error }`) untuk seluruh 19 kode error di `tech-stack.md`, structured JSON logger yang menyensor field sensitif (`NFR-006`), serta generator & timing-safe verifier payload QR `MOZA.<ticketCode>.<hmac16>` (`BR-006`).
- **Tests:** `tests/unit/qr-crypto.test.ts` — menguji pembuatan payload QR, verifikasi signature valid, penolakan manipulasi 1 karakter (`QR_SIGNATURE_INVALID`), dan penolakan `eventId` berbeda.
- **Acceptance Criteria:**
  - `verifyQrPayload` menggunakan `crypto.timingSafeEqual` dan lulus seluruh unit test.
  - Logger tidak pernah mencetak `password`, `token`, atau `secret`.

### `[x]` `T-104` — Helper Autentikasi Dual-Mode JWT (`jose`), Bcrypt & Guard RBAC/Version
- **Depends On:** `T-102`, `T-103`
- **Refs:** `F-001`, `NFR-003`, `NFR-004`, `A-007`
- **Files (4):**
  1. `src/lib/auth.ts`
  2. `src/lib/rate-limit.ts`
  3. `src/schemas/auth.schema.ts`
  4. `tests/unit/auth-rbac.test.ts`
- **Deskripsi:** Mengimplementasikan pembuatan & verifikasi JWT (`jose`) yang membaca token dari cookie `mozapass_token` atau header `Authorization: Bearer`, pengecekan header `X-App-Version` (`APP_UPDATE_REQUIRED` `426`), helper guard role (`requireRole(['ORGANIZER', ...])`), serta in-memory sliding-window rate limiter untuk proteksi login dan input manual scanner (`E-005`).
- **Tests:** `tests/unit/auth-rbac.test.ts` — menguji token valid/expired, penolakan role (`FORBIDDEN_ROLE`), pengecekan `APP_UPDATE_REQUIRED`, dan rate limiter (`RATE_LIMITED`).
- **Acceptance Criteria:**
  - Klien dengan Cookie maupun header Bearer dapat diautentikasi dengan fungsi yang sama.
  - Role yang tidak sesuai ditolak dengan HTTP `403 FORBIDDEN_ROLE`.

---

## 3. Fase 2: Design System, App Shell Navigasi & Fitur Autentikasi

### `[x]` `T-201` — Konfigurasi Design Tokens & Komponen UI Dasar (Bento & Calm Checkout Ready)
- **Depends On:** `T-101`
- **Refs:** `NFR-003`, `design.md` (Bagian 1, 2, 3, 6)
- **Files (5):**
  1. `tailwind.config.ts`
  2. `src/app/globals.css`
  3. `src/components/ui/Button.tsx`
  4. `src/components/ui/BentoCard.tsx`
  5. `src/components/ui/StatusBadge.tsx`
- **Deskripsi:** Menerapkan token warna (`--bg-canvas: #F7F7FA`, `--bg-surface: #FFFFFF`, `--bg-dark-anchor: #181824`, `--accent-lime: #D2F865` dengan teks `#181824` kontras tinggi WCAG AAA, serta pastel `#FCE8D5`, `#EAE4FC`, `#E6F9D5`, `#FDE2E4`), font `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`), komponen tombol kapsul (`rounded-full`), Bento Card (`rounded-2xl`), Skeleton Loader, dan `StatusBadge` untuk seluruh enum `EventStatus`, `OrderStatus`, dan `TicketStatus` (`VALID`, `USED`, `VOID`).
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Tidak ada gradasi ungu/biru generik; tombol `--accent-lime` selalu menggunakan teks gelap `#181824` agar kontras sangat jelas dan tenang dibaca.
  - `StatusBadge` memetakan 100% status sesuai tabel di `/docs/design.md` Bagian 3.

### `[x]` `T-202` — Endpoint API Autentikasi (`EP-001` s/d `EP-004`) & Layar Login/Register (`S-001`, `S-002`)
- **Depends On:** `T-104`, `T-201`
- **Refs:** `F-001`, `EP-001`, `EP-002`, `EP-003`, `EP-004`, `S-001`, `S-002`
- **Files (5):**
  1. `src/services/auth.service.ts`
  2. `src/app/api/v1/auth/register/route.ts`
  3. `src/app/api/v1/auth/login/route.ts`
  4. `src/app/api/v1/auth/me/route.ts`
  5. `src/app/(public)/login/page.tsx` *(beserta `/register/page.tsx`)*
- **Deskripsi:** Mengimplementasikan service & endpoint registrasi (pilihan role `BUYER` atau `ORGANIZER`), login ber-rate-limit, logout (`/api/v1/auth/logout`), dan profil sesi aktif (`/api/v1/auth/me`), serta halaman UI Login (`S-001`) dan Registrasi (`S-002`) dengan 4 state UI.
- **Tests:** `tests/integration/auth-api.test.ts` — menguji registrasi `BUYER` & `ORGANIZER`, penolakan registrasi langsung sebagai `ADMIN`, login sukses/gagal, dan proteksi `/api/v1/auth/me`.
- **Acceptance Criteria:**
  - Registrasi duplikat email ditolak (`400 VALIDATION_ERROR`).
  - Login berhasil mengatur HTTP-Only cookie dan mengarahkan pengguna sesuai rolenya.

### `[x]` `T-203` — App Shell & Navigasi Terisolasi per Role (Desktop Dark Sidebar & Mobile Bottom Nav)
- **Depends On:** `T-201`, `T-202`
- **Refs:** `F-001`, `NFR-003`, `design.md` (Bagian 4)
- **Files (4):**
  1. `src/components/layout/DarkSidebar.tsx`
  2. `src/components/layout/BuyerBottomNav.tsx`
  3. `src/components/layout/TopHeader.tsx`
  4. `src/components/layout/OfflineBanner.tsx`
- **Deskripsi:** Membangun Floating Dark Sidebar (`#181824` dengan active pill `--accent-lime` `#D2F865` sesuai referensi visual) untuk `ORGANIZER` dan `ADMIN`, Bottom Navigation Bar mobile-first untuk `BUYER`, header gelap khusus `STAFF` scanner, serta banner deteksi offline (`navigator.onLine`).
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Menu navigasi yang tampil mengikuti role user aktif (`BUYER`, `ORGANIZER`, `STAFF`, `ADMIN`).
  - Saat offline, banner peringatan koneksi tampil otomatis di bagian atas layar.

---

## 4. Fase 3: Manajemen Acara Organizer & Katalog Acara Publik

### `[x]` `T-301` — Service & Skema Validasi Acara + Kategori Tiket (`BR-001`, `BR-004`, `BR-010`, `ST-001`..`ST-003`)
- **Depends On:** `T-102`, `T-104`
- **Refs:** `F-002`, `F-003`, `BR-001`, `BR-004`, `BR-010`, `ST-001`, `ST-002`, `ST-003`, `ST-013`
- **Files (3):**
  1. `src/schemas/event.schema.ts`
  2. `src/services/event.service.ts`
  3. `tests/unit/event-rules.test.ts`
- **Deskripsi:** Mengimplementasikan logika domain pembuatan/edit acara oleh `ORGANIZER`, pengelolaan kategori tiket (harga integer Rupiah `BR-001`, kuota, `maxPerOrder`, jadwal jual `BR-004`), penguncian harga & penghapusan kategori yang sudah memiliki transaksi (`soldCount > 0` atau `reservedCount > 0` → `CATEGORY_LOCKED`, `BR-010`), serta guard transisi status `DRAFT` → `PUBLISHED` (`ST-001`), `ENDED` (`ST-002`), dan `CANCELLED` (`ST-003` + void tiket `ST-013`).
- **Tests:** `tests/unit/event-rules.test.ts` — menguji `BR-010` (`CATEGORY_LOCKED`), `ST-001` (gagal publish jika belum ada kategori tiket), dan isolasi kepemilikan `organizerId`.
- **Acceptance Criteria:**
  - Percobaan mengubah harga atau menurunkan kuota di bawah `soldCount + reservedCount` melempar `422 CATEGORY_LOCKED`.
  - Seluruh unit test aturan acara hijau.

### `[x]` `T-302` — Endpoint API Acara Organizer (`EP-019`..`EP-021`) & Publik (`EP-005`, `EP-006`)
- **Depends On:** `T-301`
- **Refs:** `F-002`, `F-003`, `EP-005`, `EP-006`, `EP-019`, `EP-020`, `EP-021`
- **Files (4):**
  1. `src/app/api/v1/events/route.ts`
  2. `src/app/api/v1/events/[slug]/route.ts`
  3. `src/app/api/v1/organizer/events/route.ts`
  4. `src/app/api/v1/organizer/events/[id]/route.ts`
- **Deskripsi:** Menghubungkan `event.service.ts` ke Route Handlers publik (hanya menampilkan acara `PUBLISHED` dengan pencarian & paginasi) dan Route Handlers khusus `ORGANIZER` (CRUD acara & kategori milik sendiri).
- **Tests:** `npm run type-check`, `npm run lint`, dan `npm run test`.
- **Acceptance Criteria:**
  - `ORGANIZER` A tidak bisa mengubah acara milik `ORGANIZER` B (`403 FORBIDDEN_OWNERSHIP`).
  - Acara berstatus `DRAFT` atau `SUSPENDED` tidak muncul di `GET /api/v1/events`.

### `[x]` `T-303` — Layar Manajemen Acara & Kategori Tiket Organizer (`S-010`)
- **Depends On:** `T-203`, `T-302`
- **Refs:** `F-003`, `BR-010`, `ST-001`..`ST-003`, `S-010`
- **Files (3):**
  1. `src/app/organizer/events/page.tsx`
  2. `src/app/organizer/events/new/page.tsx`
  3. `src/app/organizer/events/[id]/edit/page.tsx`
- **Deskripsi:** Membangun UI daftar acara `ORGANIZER`, form pembuatan acara baru, editor kategori tiket dinamis (menampilkan indikator kunci pada field harga jika sudah ada tiket terjual/ditahan sesuai `BR-010`), dan tombol aksi transisi status (`Publikasikan`, `Akhiri`, `Batalkan`).
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Memiliki 4 kondisi UI (Loading Skeleton, Empty State, Error, Success).
  - Semua harga ditampilkan dalam format Rupiah (`tabular-nums`) dan dikirim sebagai integer.

### `[x]` `T-304` — Layar Katalog Publik (`S-003`) & Detail Acara + Pemilih Tiket (`S-004`)
- **Depends On:** `T-203`, `T-302`
- **Refs:** `F-002`, `BR-001`, `BR-004`, `NFR-002`, `S-003`, `S-004`
- **Files (4):**
  1. `src/app/(public)/page.tsx`
  2. `src/app/(public)/events/[slug]/page.tsx`
  3. `src/components/events/EventCard.tsx`
  4. `src/components/events/CategorySelector.tsx`
- **Deskripsi:** Membangun halaman eksplorasi acara publik (`S-003`) dengan pencarian kata kunci dan kartu Bento, serta halaman detail acara (`S-004`) yang menampilkan daftar kategori tiket, sisa kuota real-time, status jendela penjualan (`Belum Mulai` / `Tersedia` / `Habis` / `Berakhir`), pemilih kuantitas (`1..maxPerOrder` untuk 1 kategori terpilih sesuai `A-010`), dan sticky bottom bar menuju checkout.
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Kategori di luar jendela jual (`BR-004`) atau sisa kuota `0` otomatis menonaktifkan tombol pilih.
  - Tampilan responsif rapi di layar mobile `360px` maupun desktop.

---

## 5. Fase 4: Mesin Anti-Oversell, Kedaluwarsa, Simulator, Webhook & E-Ticket

> **Urutan Kritis Fase 4:** Test konkurensi anti-oversell ditulis langsung bersama checkout (`T-401`), disusul job kedaluwarsa (`T-402`), lalu simulator pembayaran (`T-403`) sebelum integrasi Midtrans & test idempotensi webhook (`T-404`).

### `[x]` `T-401` — Mesin Checkout Anti-Oversell (`FOR UPDATE`), API Order (`EP-007`..`EP-010`) & Test Konkurensi Race Condition
- **Depends On:** `T-302`
- **Refs:** `F-004`, `BR-001`, `BR-002`, `BR-003`, `BR-004`, `BR-011`, `ST-006`, `ST-009`, `E-001`, `A-001`, `A-010`, `EP-007`, `EP-008`, `EP-009`, `EP-010`
- **Files (5):**
  1. `src/schemas/order.schema.ts`
  2. `src/services/order.service.ts`
  3. `src/app/api/v1/orders/route.ts`
  4. `src/app/api/v1/orders/[id]/route.ts` *(beserta `/cancel/route.ts`)*
  5. `tests/integration/order-anti-oversell.test.ts`
- **Deskripsi:** Mengimplementasikan pembuatan order `PENDING` dengan row-level locking `SELECT ... FOR UPDATE` pada baris `ticket_categories`, validasi `soldCount + reservedCount + quantity <= totalQuota` (`BR-002`), pencegahan >1 order `PENDING` aktif per pembeli di acara yang sama (`BR-011`), set `expiresAt = NOW() + 15m` (`BR-003`), serta pembatalan manual oleh pembeli (`ST-009`) yang mengembalikan `reservedCount`.
- **Tests (Wajib di Task Ini):** `tests/integration/order-anti-oversell.test.ts` — menjalankan simulasi konkuren (`Promise.all`) 5 pembeli memperebutkan sisa 1 kuota tiket terakhir (`E-001`): memastikan tepat 1 berhasil `PENDING`, 4 ditolak `QUOTA_EXCEEDED`, dan `soldCount + reservedCount` tidak pernah melebihi `totalQuota`.
- **Acceptance Criteria:**
  - Test konkurensi `order-anti-oversell.test.ts` lulus 100% (`0` oversell).
  - Pembatalan order (`EP-010`) langsung memulihkan `reservedCount` dan menaikkan `version` order.

### `[x]` `T-402` — Job & Lazy Cleanup Kedaluwarsa Reservasi (`ST-008`, `E-007`) + Penanganan Late Payment (`E-002`)
- **Depends On:** `T-401`
- **Refs:** `BR-003`, `ST-008`, `E-002`, `E-007`, `NFR-006`, `EP-006`, `EP-007`, `EP-009`
- **Files (3):**
  1. `src/services/expiration.service.ts`
  2. `src/services/order.service.ts`
  3. `tests/integration/order-expiration.test.ts`
- **Deskripsi:** Mengimplementasikan fungsi `releaseExpiredOrders(eventId?)` di `expiration.service.ts` yang otomatis dipanggil sebelum pembacaan kuota (`EP-006`), saat detail order dibuka (`EP-009`), dan sebelum checkout baru (`EP-007`). Mengubah order `PENDING` yang melewati `expiresAt` menjadi `EXPIRED` dengan guard optimistic lock `WHERE status = 'PENDING' AND version = :v`, mengurangi `reservedCount`, serta menyediakan logika pemulihan aman jika pembayaran masuk tepat setelah status menjadi `EXPIRED` (`E-002`).
- **Tests:** `tests/integration/order-expiration.test.ts` — menguji pelepasan kuota otomatis saat `expiresAt` terlewati dan memastikan jika transisi `PAID` dan job `EXPIRED` berjalan bersamaan, `reservedCount` tidak pernah dikurangi dua kali (berkat guard `version`).
- **Acceptance Criteria:**
  - Kuota yang ditahan order `EXPIRED` otomatis kembali dan bisa dibeli user lain tanpa menunggu cron lambat (`E-007`).
  - Guard `version` mencegah korupsi `reservedCount` saat terjadi balapan antara job expire dan pembayaran.

### `[x]` `T-403` — Service Bersama `markOrderAsPaid`, Penerbitan Tiket QR (`ST-011`) & Endpoint Simulator Bayar (`EP-012`)
- **Depends On:** `T-103`, `T-402`
- **Refs:** `F-005`, `F-006`, `F-011`, `BR-005`, `BR-006`, `BR-008`, `ST-007`, `ST-011`, `E-002`, `EP-012`
- **Files (4):**
  1. `src/services/payment.service.ts`
  2. `src/services/ticket.service.ts`
  3. `src/app/api/v1/orders/[id]/simulate-pay/route.ts`
  4. `tests/integration/payment-simulator.test.ts`
- **Deskripsi:** Membangun fungsi inti `markOrderAsPaid` yang digunakan bersama oleh Simulator, Tiket Gratis Rp 0 (`F-011`), dan Webhook Midtrans: mencatat log di `payment_webhook_logs` (`UNIQUE (provider, external_id)`), mengubah order menjadi `PAID` (`ST-007`), memindahkan `reservedCount` ke `soldCount`, dan menerbitkan `N` tiket berstatus `VALID` lengkap dengan `ticketCode` unik & `qrSignature` HMAC-SHA256 (`ST-011`). Membungkusnya di endpoint `POST /api/v1/orders/:id/simulate-pay` (`EP-012`) yang dikunci oleh `ENABLE_PAYMENT_SIMULATOR === 'true'` dan kepemilikan `BUYER`.
- **Tests:** `tests/integration/payment-simulator.test.ts` — memastikan `EP-012` mengembalikan `404` jika `ENABLE_PAYMENT_SIMULATOR !== 'true'`, menolak `BUYER` lain (`403`), dan saat aktif berhasil menerbitkan `N` tiket `VALID` serta mencatat `provider = 'SIMULATOR'` di `payment_webhook_logs`.
- **Acceptance Criteria:**
  - Alur `Order PENDING` → `Simulate Pay` → `Order PAID` → `N Tiket VALID Terbit` berjalan end-to-end dan teruji otomatis sebelum integrasi Midtrans dipasang.

### `[x]` `T-404` — Integrasi Midtrans Snap Sandbox, Endpoint Webhook (`EP-011`) & Test Idempotensi Webhook (`E-003`)
- **Depends On:** `T-403`
- **Refs:** `F-005`, `BR-008`, `ST-007`, `ST-010`, `E-002`, `E-003`, `A-003`, `EP-011`
- **Files (4):**
  1. `src/lib/midtrans.ts`
  2. `src/app/api/v1/webhooks/midtrans/route.ts`
  3. `src/services/order.service.ts` *(integrasi pembuatan Snap token)*
  4. `tests/integration/webhook-idempotency.test.ts`
- **Deskripsi:** Mengintegrasikan pembuatan `snapToken` Midtrans Sandbox saat checkout berbayar, serta endpoint `POST /api/v1/webhooks/midtrans` (`EP-011`) yang memverifikasi signature `SHA512(order_id + status_code + gross_amount + SERVER_KEY)` dan memanggil `markOrderAsPaid` (untuk `settlement`/`capture`) atau memulihkan kuota (untuk `expire`/`cancel`/`deny`).
- **Tests (Wajib di Task Ini):** `tests/integration/webhook-idempotency.test.ts` — mengirim 5 payload webhook `settlement` identik secara paralel (`E-003`) dan memverifikasi bahwa semua merespons `200 OK`, status order `PAID`, namun jumlah tiket yang diterbitkan di tabel `tickets` tepat sejumlah `quantity` (tidak berlipat 5x), serta menolak signature palsu dengan `401 WEBHOOK_SIGNATURE_INVALID`.
- **Acceptance Criteria:**
  - Test idempotensi webhook paralel lulus 100%.
  - Webhook dengan signature tidak valid dicatat di `payment_webhook_logs` (`signatureValid: false`) dan ditolak `401`.

### `[x]` `T-405` — Layar Checkout Tenang & Hitung Mundur (`S-005`) serta Daftar Pesanan Pembeli (`S-006`)
- **Depends On:** `T-203`, `T-404`
- **Refs:** `F-004`, `F-005`, `BR-003`, `S-005`, `S-006`
- **Files (4):**
  1. `src/app/(buyer)/orders/[orderId]/checkout/page.tsx`
  2. `src/app/(buyer)/my-orders/page.tsx`
  3. `src/components/orders/CountdownBanner.tsx`
  4. `src/components/orders/CheckoutSummary.tsx`
- **Deskripsi:** Membangun halaman Checkout (`S-005`) dengan permukaan putih bersih yang tenang (`#FFFFFF` di atas `#F7F7FA`) dan kontras teks gelap `#181824` yang sangat jelas dibaca, banner hitung mundur 15 menit (`tabular-nums`), tombol utama `Bayar Sekarang` (membuka Midtrans Snap), tombol `Simulasi Bayar Lunas (Mode Demo)` (hanya tampil jika `simulatorEnabled: true`), tombol `Batalkan Pesanan` (`EP-010`), serta halaman riwayat `Pesanan Saya` (`S-006`).
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Saat hitung mundur mencapai `00:00`, tampilan otomatis beralih ke status `EXPIRED` tanpa perlu reload manual.
  - Kontras warna pada halaman checkout tenang, bersih, dan seluruh nominal/timer menggunakan `tabular-nums`.

### `[x]` `T-406` — Layanan Email Tiket QR (`E-006`), Endpoint Tiket (`EP-013`..`EP-015`) & UI E-Ticket Boarding Pass (`S-007`)
- **Depends On:** `T-403`, `T-405`
- **Refs:** `F-006`, `BR-006`, `E-005`, `E-006`, `EP-013`, `EP-014`, `EP-015`, `S-007`
- **Files (5):**
  1. `src/lib/mailer.ts`
  2. `src/app/api/v1/tickets/route.ts`
  3. `src/app/api/v1/tickets/[id]/route.ts` *(beserta `/resend-email/route.ts`)*
  4. `src/app/(buyer)/my-tickets/page.tsx` *(beserta `/[ticketId]/page.tsx`)*
  5. `src/components/tickets/BoardingPassCard.tsx`
- **Deskripsi:** Mengimplementasikan pengiriman email E-Ticket ber-QR dengan isolasi `try/catch` agar error SMTP tidak pernah menggagalkan transaksi pembayaran (`E-006`), endpoint daftar & detail tiket milik `BUYER` + kirim ulang email (`EP-015`), serta komponen `BoardingPassCard` (`S-007`) yang menampilkan QR Code kontras tinggi (`qrcode`), kode teks monospace `MOZA-XXXX-XXXX` untuk input manual (`E-005`), dan badge status (`VALID` / `USED` / `VOID`).
- **Tests:** `tests/unit/mailer-fallback.test.ts` — memastikan kegagalan koneksi SMTP ditangkap dengan aman dan dicatat ke log tanpa melempar unhandled exception.
- **Acceptance Criteria:**
  - `BUYER` hanya dapat melihat tiket miliknya sendiri (`403 FORBIDDEN_OWNERSHIP` jika mengakses tiket orang lain).
  - QR code pada `BoardingPassCard` memuat string `MOZA.<ticketCode>.<hmac16>` yang siap dipindai kamera.

---

## 6. Fase 5: Penugasan Panitia, Kamera Scanner Check-in, Dashboard Bento & Admin

### `[x]` `T-501` — Manajemen Penugasan Panitia Scanner (`EP-023` & Layar `S-012`)
- **Depends On:** `T-303`
- **Refs:** `F-007`, `BR-009`, `EP-023`, `S-012`
- **Files (3):**
  1. `src/services/staff.service.ts`
  2. `src/app/api/v1/organizer/events/[id]/staff/route.ts`
  3. `src/app/organizer/events/[id]/staff/page.tsx`
- **Deskripsi:** Mengimplementasikan penambahan dan pencabutan akses panitia (`STAFF`) berdasarkan email ke tabel `event_staff` untuk acara milik `ORGANIZER`, beserta halaman UI pengelola panitia (`S-012`).
- **Tests:** `tests/integration/staff-assignment.test.ts` — memastikan hanya `ORGANIZER` pemilik acara yang dapat menambah/menghapus `STAFF` di acara tersebut.
- **Acceptance Criteria:**
  - Penugasan duplikat user yang sama di satu acara ditolak dengan rapi.
  - `STAFF` yang dicabut aksesnya langsung kehilangan hak akses check-in di acara tersebut.

### `[x]` `T-502` — Endpoint Check-in Atomik (`EP-016`, `EP-017`) & Test Anti-Passback / Isolasi Acara
- **Depends On:** `T-403`, `T-501`
- **Refs:** `F-008`, `BR-006`, `BR-007`, `BR-009`, `ST-012`, `E-004`, `E-005`, `EP-016`, `EP-017`
- **Files (4):**
  1. `src/schemas/scanner.schema.ts`
  2. `src/app/api/v1/scanner/events/route.ts`
  3. `src/app/api/v1/scanner/check-in/route.ts`
  4. `tests/integration/scanner-checkin.test.ts`
- **Deskripsi:** Mengimplementasikan endpoint `POST /api/v1/scanner/check-in` (`EP-017`) yang menerima `eventId` + salah satu dari `qrPayload` (diverifikasi HMAC `BR-006`) atau `ticketCode` manual (dilindungi rate-limit + log audit `checkInMethod: 'MANUAL'`, `E-005`), memeriksa penugasan panitia di `eventId` (`BR-009`), memvalidasi kecocokan acara tiket (`TICKET_WRONG_EVENT`), dan mengeksekusi update atomik `WHERE id = :id AND event_id = :eventId AND status = 'VALID'` (`BR-007`).
- **Tests:** `tests/integration/scanner-checkin.test.ts` — menguji: (1) scan pertama sukses `200 OK` (`VALID` → `USED`), (2) scan kedua gagal `409 TICKET_ALREADY_USED` beserta detail waktu & nama petugas scan pertama, (3) scan tiket acara lain gagal `422 TICKET_WRONG_EVENT`, (4) scan oleh panitia yang tidak ditugaskan gagal `403 FORBIDDEN_OWNERSHIP`, dan (5) scan QR palsu gagal `422 QR_SIGNATURE_INVALID`.
- **Acceptance Criteria:**
  - Kelima skenario di `scanner-checkin.test.ts` lulus 100%.

### `[x]` `T-503` — Layar Kamera Scanner Mobile-First & Input Manual (`S-008`)
- **Depends On:** `T-502`
- **Refs:** `F-008`, `E-005`, `NFR-002`, `NFR-003`, `S-008`
- **Files (4):**
  1. `src/app/scanner/page.tsx` *(beserta `/[eventId]/page.tsx`)*
  2. `src/components/scanner/CameraQrScanner.tsx`
  3. `src/components/scanner/ManualCodeForm.tsx`
  4. `src/components/scanner/ScanResultSheet.tsx`
- **Deskripsi:** Membangun halaman Scanner berlatar gelap penuh (`#181824`) menggunakan `html5-qrcode` (kamera belakang), counter kehadiran real-time, fallback otomatis ke `ManualCodeForm` jika izin kamera ditolak/gagal (`E-005`), serta `ScanResultSheet` berkontras tinggi (Hijau `#16A34A` untuk `VALID`, Merah `#DC2626` untuk `TICKET_ALREADY_USED` / `QR_SIGNATURE_INVALID` / `TICKET_WRONG_EVENT`).
- **Tests:** `npm run type-check` dan `npm run lint`.
- **Acceptance Criteria:**
  - Ketika izin kamera ditolak di browser, form Input Kode Manual langsung tampil tanpa membuat halaman crash (`E-005`).

### `[x]` `T-504` — Bento Dashboard Organizer (`EP-018`, `S-009`), Ekspor CSV (`EP-022`, `S-011`) & Moderasi Admin (`EP-024`, `S-013`)
- **Depends On:** `T-406`, `T-502`
- **Refs:** `F-009`, `F-010`, `BR-001`, `ST-004`, `ST-005`, `EP-018`, `EP-022`, `EP-024`, `S-009`, `S-011`, `S-013`
- **Files (5):**
  1. `src/services/report.service.ts`
  2. `src/app/api/v1/organizer/dashboard/route.ts` *(beserta `/events/[id]/attendees/route.ts`)*
  3. `src/app/organizer/dashboard/page.tsx` *(beserta `/events/[id]/attendees/page.tsx`)*
  4. `src/app/api/v1/admin/events/route.ts`
  5. `src/app/admin/events/page.tsx`
- **Deskripsi:** Mengimplementasikan agregasi metrik Bento Dashboard `ORGANIZER` (pendapatan Rupiah, tiket terjual vs kuota, tingkat kehadiran check-in, dan grafik pillar bar harian dengan bar aktif `--accent-lime` `#D2F865` sesuai gambar referensi `S-009`), tabel peserta & unduh CSV (`EP-022`, `S-011`), serta halaman Moderasi Acara oleh `ADMIN` (`ST-004` `SUSPENDED` & `ST-005` `PUBLISHED`, `S-013`).
- **Tests:** `tests/integration/report-and-admin.test.ts` — memverifikasi isolasi data laporan antar `ORGANIZER`, output format CSV, dan efek `SUSPENDED` yang menyembunyikan acara dari publik serta memblokir checkout baru.
- **Acceptance Criteria:**
  - Tombol `Ekspor CSV` mengunduh file `.csv` valid berisi seluruh tiket/peserta acara milik `ORGANIZER`.
  - `ADMIN` dapat men-suspend dan memulihkan acara (`ST-004`, `ST-005`).

---

## 7. Fase 6: Suite Konkurensi Lintas-Fitur & Verifikasi Rilis Akhir

### `[x]` `T-601` — Suite Stress Test Konkurensi Lintas-Fitur: Double Scan Serentak (`E-004`) & Late Webhook (`E-002`)
- **Depends On:** `T-404`, `T-502`
- **Refs:** `BR-002`, `BR-007`, `BR-008`, `E-001`, `E-002`, `E-003`, `E-004`, `NFR-001`
- **Files (2):**
  1. `tests/integration/concurrent-double-scan.test.ts`
  2. `tests/integration/late-webhook-recovery.test.ts`
- **Deskripsi:** Menambahkan pengujian skenario silang tingkat lanjut:
  1. **Double Scan Serentak di 2 Pintu (`E-004`):** 2 request `POST /api/v1/scanner/check-in` dieksekusi bersamaan (`Promise.all`) untuk 1 tiket `VALID` yang sama → tepat 1 mendapat `200 OK`, 1 mendapat `409 TICKET_ALREADY_USED`.
  2. **Late Webhook (`E-002`):** Order sudah berstatus `EXPIRED` (`ST-008`), lalu webhook `settlement` Midtrans masuk →(a) jika kuota masih cukup, order dipulihkan ke `PAID` dan tiket terbit dengan flag `isLatePayment = true`; (b) jika sisa kuota sudah dibeli habis oleh pembeli lain, sistem mencatat `OVERBOOK_PAYMENT_ALERT` dan tidak melanggar constraint `soldCount + reservedCount <= totalQuota`.
- **Tests:** Menjalankan seluruh suite `npm run test`.
- **Acceptance Criteria:**
  - Kedua skenario konkuren lintas-fitur berjalan hijau tanpa race condition.

### `[x]` `T-602` — Audit Akhir Build, Type-Check, Lint & Dokumentasi Cara Menjalankan Portofolio (`README.md`)
- **Depends On:** `T-503`, `T-504`, `T-601`
- **Refs:** `NFR-002`, `NFR-003`, `NFR-004`, `NFR-006`
- **Files (2):**
  1. `README.md`
  2. `docs/tasks.md`
- **Deskripsi:** Menulis dokumentasi portofolio `README.md` (arsitektur anti-oversell, panduan menjalankan lokal, daftar 4 akun demo seed & kode tiket `MOZA-DEMO-0001`, cara menguji simulator pembayaran & webhook Midtrans), serta menjalankan verifikasi penuh `npm run lint`, `npm run type-check`, `npm run test`, dan `npm run build`.
- **Tests:** `npm run lint && npm run type-check && npm run test && npm run build`
- **Acceptance Criteria:**
  - Seluruh perintah verifikasi (`lint`, `type-check`, `test`, `build`) lulus tanpa error maupun warning kritis.
  - Tidak ada `// TODO` atau secret hardcoded di seluruh kode sumber.

---

## 8. Matriks Traceability Penuh (PRD → Design → API → Tasks)

| ID PRD | Deskripsi Singkat | Layar (`S-xxx`) | Endpoint (`EP-xxx`) | Task (`T-xxx`) |
|---|---|---|---|---|
| `F-001` | Autentikasi & RBAC 4 Role | `S-001`, `S-002` | `EP-001`..`EP-004` | `T-104`, `T-202`, `T-203` |
| `F-002` | Katalog & Detail Acara Publik | `S-003`, `S-004` | `EP-005`, `EP-006` | `T-301`, `T-302`, `T-304` |
| `F-003` | CRUD Acara & Kategori Tiket | `S-010` | `EP-019`..`EP-021` | `T-301`, `T-302`, `T-303` |
| `F-004` | Checkout, Reservasi & Hold Timer 15m | `S-004`, `S-005`, `S-006` | `EP-007`..`EP-010` | `T-401`, `T-402`, `T-405` |
| `F-005` | Pembayaran Sandbox, Simulator & Webhook | `S-005`, `S-006` | `EP-011`, `EP-012` | `T-403`, `T-404`, `T-405` |
| `F-006` | Tiket QR HMAC-SHA256 & Email Tiket | `S-007` | `EP-013`..`EP-015` | `T-103`, `T-403`, `T-406` |
| `F-007` | Manajemen Penugasan Panitia (`STAFF`) | `S-012` | `EP-023` | `T-501` |
| `F-008` | Kamera Scanner QR & Check-in Atomik | `S-008` | `EP-016`, `EP-017` | `T-502`, `T-503`, `T-601` |
| `F-009` | Bento Dashboard Organizer & Ekspor CSV | `S-009`, `S-011` | `EP-018`, `EP-022` | `T-504` |
| `F-010` | Moderasi Acara oleh Admin | `S-013` | `EP-024` | `T-504` |
| `F-011` | Tiket Gratis (Rp 0) Instant Issuance | `S-004`, `S-005` | `EP-007` | `T-401`, `T-403` |
| `BR-001`..`BR-011` | Seluruh 11 Aturan Bisnis Inti | `S-003`..`S-012` | `EP-006`..`EP-023` | `T-101`..`T-601` |
| `ST-001`..`ST-013` | Seluruh 13 Transisi State Machine | `S-005`..`S-013` | `EP-007`..`EP-024` | `T-301`, `T-401`..`T-504` |
| `E-001`..`E-007` | Seluruh 7 Skenario Edge Case | `S-004`..`S-008` | `EP-006`..`EP-017` | `T-401`..`T-406`, `T-502`, `T-503`, `T-601` |

---

## ✅ Quality Gate Report
- **✅ Lulus — Granularitas & Kemandirian Task:** Seluruh 23 task (`T-101` s/d `T-602`) menyentuh maksimal ≤ 5 file, bebas siklus dependensi, dan masing-masing memiliki perintah test/verifikasi mandiri untuk di-commit per task.
- **✅ Lulus — Urutan Prioritas Fase 4:** Test anti-oversell dijalankan langsung di `T-401`, diikuti job kedaluwarsa di `T-402`, simulator pembayaran di `T-403`, baru integrasi Midtrans & test idempotensi webhook di `T-404`.
- **⚠️ Catatan:** `T-201` dan `T-405` secara eksplisit memastikan halaman Checkout (`S-005`) menggunakan permukaan putih bersih (`#FFFFFF` di atas `#F7F7FA`) dengan teks gelap `#181824` yang tenang dan mudah dibaca.
