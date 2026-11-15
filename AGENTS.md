# 🤖 AGENTS.md — Sistem Instruksi AI Coding Agent (Mozapass)

- **Tanggal Pembuatan:** 2026-11-14 | **Versi:** 1.0.0

## 1. Project Overview & Source of Truth
**Mozapass** adalah platform web ticketing acara (Next.js App Router, mobile-first & APK-ready) dengan jaminan anti-oversell (`FOR UPDATE` + DB `CHECK`), webhook pembayaran idempotent, dan check-in QR bertanda tangan HMAC-SHA256. Seluruh spesifikasi dikunci di folder `/docs` dan wajib dirujuk berdasarkan ID.

| Path Dokumen | Fungsi & Isi Utama | Prefix ID |
|---|---|---|
| `/docs/prd.md` | Logika bisnis, 4 role RBAC, fitur, state machine, edge case, asumsi | `F-`, `BR-`, `ST-`, `E-`, `NFR-`, `A-` |
| `/docs/design.md` | Design tokens, pemetaan badge status, navigasi per role, inventaris layar | `S-001` s/d `S-013` |
| `/docs/tech-stack.md` | Stack terkunci, kontrak JSON/error, perintah CLI, pohon folder | - |
| `/docs/database-schema.md` | Skema Prisma, enum, constraint SQL anti-oversell, query atomik, seed | - |
| `/docs/api-spec.md` | Katalog endpoint `/api/v1/*`, matriks role, payload, error per endpoint | `EP-001` s/d `EP-024` |
| `/docs/tasks.md` | Antrean 23 tiket atomik beserta dependensi, file, test, dan acceptance | `T-101` s/d `T-602` |

**Hierarki Konflik:** `prd.md > database-schema.md > api-spec.md > tech-stack.md > design.md > tasks.md`. Jika ditemukan konflik antar-dokumen atau dengan kode: **BERHENTI**, laporkan ke user, dan jangan memilih sendiri.

## 2. Aturan Emas Perilaku Agent
1. **Tanya, Jangan Mengarang:** Jika spesifikasi ambigu atau belum diatur di `/docs`, berhenti dan ajukan pertanyaan atau `DOC-CHANGE-REQUEST`. Dilarang menebak nama tabel, kolom, endpoint, status, atau aturan bisnis.
2. **Dokumen `/docs` Read-Only:** Dilarang mengubah file di `/docs/*` kecuali mencentang `[x]` dan memperbarui angka progress di `/docs/tasks.md`. Perubahan spesifikasi wajib melalui format `DOC-CHANGE-REQUEST` (dokumen, bagian/ID, masalah, usulan perbaikan) dan menunggu persetujuan user.
3. **Satu Task per Sesi:** Kerjakan hanya 1 ID task (`T-xxx`) yang diminta. Dilarang merombak/refactor file di luar daftar `Files` pada task tersebut; catat temuan di luar lingkup sebagai saran di akhir laporan.
4. **Rencana Dulu:** Sebelum menulis kode, periksa apakah seluruh task di `Depends On` sudah `[x]`. Jika belum, berhenti. Tulis rencana singkat (file yang disentuh, risiko) sebelum eksekusi.
5. **Kode Bersih:** Dilarang meninggalkan `// TODO`, kode mati (commented-out code), `console.log` debug liar, atau data dummy hardcoded di kode produksi.

## 3. Tech Stack & Struktur Folder Terkunci
- **Stack Dikunci (`/docs/tech-stack.md`):** Node.js `>=20` + `npm`, Next.js `15.x`/`14.2+` (App Router), React `19`/`18`, TypeScript `5.x` (`strict: true`), Tailwind CSS, PostgreSQL `16`, Prisma ORM `6.x`/`5.x`, `zod 3.x`, `jose 5.x`, `bcryptjs 2.x`, Node `crypto` (`HMAC-SHA256`), `qrcode`, `html5-qrcode`, `nodemailer`, `vitest`.
- **Larangan Dependency Baru:** Dilarang menjalankan `npm install <paket-baru>` di luar daftar `/docs/tech-stack.md` Bagian 2 tanpa izin eksplisit user.
- **Penempatan File Wajib (`/docs/tech-stack.md` Bagian 8):**
  - Halaman UI & Route Handlers: `src/app/(public|buyer|organizer|scanner|admin)` & `src/app/api/v1/**/route.ts`.
  - Komponen UI: `src/components/{ui,layout,events,orders,tickets,scanner}/*.tsx` (`PascalCase.tsx`).
  - Logika Bisnis & Transaksi DB: `src/services/*.service.ts` (Route handler dilarang berisi query transaksi kompleks).
  - Validasi Input: `src/schemas/*.schema.ts` | Utilitas Inti: `src/lib/*.ts` | Test: `tests/{unit,integration}/*.test.ts`.

## 4. Standar Koding, Format Data & Type Safety
- **Tanpa `any`:** TypeScript wajib `strict: true`; dilarang memakai `any` atau `@ts-ignore`.
- **Validasi & Kontrak API:** Semua input request wajib divalidasi dengan `zod`. Semua respons `/api/v1/*` wajib memakai amplop `{ success: true, data, meta? }` atau `{ success: false, error: { code, message, details? } }` dengan 19 kode error baku di `/docs/tech-stack.md` Bagian 3.4.
- **Uang & Waktu (`BR-001`, `NFR-005`):** Harga/nominal wajib `integer` Rupiah penuh (tanpa float/desimal). Waktu wajib disimpan dan dikirim dalam **UTC ISO 8601** (`TIMESTAMPTZ`).
- **Environment Variable:** Dilarang hardcode secret atau URL; baca dari `process.env` dan perbarui `.env.example` setiap menambah key baru.

## 5. RBAC, Isolasi Data & Guardrail Bisnis Kritis
| Kode Role | Hak Akses Utama | Larangan Keras (Wajib Ditolak di Server `403`) |
|---|---|---|
| `BUYER` | Buat order, bayar, lihat tiket & QR milik sendiri (`buyerId == user.id`). | Akses order/tiket `BUYER` lain; buat acara; akses scanner/dashboard. |
| `ORGANIZER` | CRUD acara & kategori sendiri (`organizerId == user.id`), kelola `STAFF`, lihat laporan & CSV acara sendiri. | Lihat/ubah/ekspor data acara milik `ORGANIZER` lain (`FORBIDDEN_OWNERSHIP`). |
| `STAFF` | Akses daftar acara tugas & scan check-in pada `eventId` yang terdaftar di `event_staff`. | Scan tiket acara yang tidak ditugaskan (`BR-009`); ubah acara; lihat laporan uang/CSV. |
| `ADMIN` | Moderasi acara (`PUBLISHED` ↔ `SUSPENDED`, `ST-004`/`ST-005`). | Ubah harga/kuota penyelenggara atau melakukan check-in tiket peserta. |

- **Anti-Oversell (`BR-002`, `A-010`):** Satu order memuat 1 kategori tiket. Checkout wajib di dalam `prisma.$transaction` dengan `SELECT ... FOR UPDATE` pada `ticket_categories`, menjaga `sold_count + reserved_count <= total_quota`, dan membatasi maks 1 order `PENDING` aktif per pembeli per acara (`BR-011`).
- **Optimistic Lock & Idempotensi (`BR-008`, `ST-007`, `ST-008`):** Perubahan status `orders` wajib memeriksa dan menaikkan kolom `version`. Webhook Midtrans (`EP-011`) dan Simulator (`EP-012`, aktif hanya jika `ENABLE_PAYMENT_SIMULATOR === 'true'`, selain itu return `404`) wajib melewati service `markOrderAsPaid` yang sama dan mencatat ke `payment_webhook_logs` (`UNIQUE(provider, external_id)`).
- **Single Check-in Atomik (`BR-006`, `BR-007`, `EP-017`):** Verifikasi HMAC QR (`crypto.timingSafeEqual`) atau gunakan rate-limit + log `check_in_method = 'MANUAL'` untuk input kode manual (`E-005`). Eksekusi `UPDATE tickets SET status = 'USED', checked_in_at = NOW(), checked_in_by_id = $2, check_in_method = $3 WHERE id = $1 AND event_id = $4 AND status = 'VALID'`.
- **Keamanan Log & Seed:** Dilarang mencatat password, token, atau secret key ke log (`NFR-006`). `prisma/seed.ts` wajib menolak jalan jika `NODE_ENV === 'production'`.

## 6. UI/UX, Design Tokens & Kesiapan APK
- **4 Kondisi UI Wajib:** Setiap layar (`S-001` s/d `S-013`) wajib menangani Loading Skeleton, Empty State, Error State, dan Success State sesuai `/docs/design.md`.
- **Token & Kontras Visual:** Gunakan token `--bg-canvas` (`#F7F7FA`), `--bg-surface` (`#FFFFFF`), `--bg-dark-anchor` (`#181824`), dan `--accent-lime` (`#D2F865` wajib berteks gelap `#181824`). Halaman Checkout (`S-005`) wajib berlatar putih bersih yang tenang dan kontras terbaca jelas. Semua angka harga/kuota/timer wajib `tabular-nums`.
- **Badge Status:** Wajib mengikuti pemetaan enum `EventStatus`, `OrderStatus`, dan `TicketStatus` (`VALID`, `USED`, `VOID`) di `/docs/design.md` Bagian 3.
- **Kamera, Offline & APK (`NFR-003`, `E-005`):** Jika izin kamera ditolak di `S-008`, tampilkan otomatis form Input Kode Manual. Tampilkan banner saat offline (`navigator.onLine === false`). Dukung autentikasi Cookie + Bearer dan header `X-App-Version` (`426 APP_UPDATE_REQUIRED`).

## 7. Testing & Definition of Done (DoD)
- **Perintah Baku:**
  - Lint: `npm run lint`
  - Type-check: `npm run type-check`
  - Test: `npm run test`
  - Build: `npm run build`
- **Kewajiban Test:** Setiap aturan bisnis (`BR-xxx`), transisi state (`ST-xxx`), dan guard RBAC wajib memiliki test otomatis di `tests/`. Bug fix wajib diawali test yang mereproduksi bug tersebut.
- **Definition of Done:** Task hanya boleh dicentang `[x]` di `/docs/tasks.md` jika seluruh Acceptance Criteria terpenuhi, `npm run lint`, `npm run type-check`, dan `npm run test` hijau, serta angka progress di `/docs/tasks.md` diperbarui.

## 8. Git & Pelaporan
- **Format Commit:** `feat(T-xxx): deskripsi singkat` (atau `fix(T-xxx): ...`, `test(T-xxx): ...`). Satu task = satu commit logis. Dilarang commit `.env` atau secret.
- **Format Laporan Akhir Task (Maksimal 10 Baris):** (1) Ringkasan yang dibuat, (2) Daftar file yang disentuh, (3) Output ringkas `lint`, `type-check`, dan `test`, (4) Risiko/catatan, (5) Usulan commit message.

## 9. Perilaku Khusus Antigravity
1. Gunakan mode Planning untuk setiap task yang menyentuh `> 1` file: tuliskan rencana file yang disentuh, konfirmasi dependensi `[x]`, dan risiko sebelum mengeksekusi perubahan.
2. Wajib menjalankan `npm run lint`, `npm run type-check`, dan `npm run test` secara nyata di terminal dan menyertakan hasilnya (dilarang mengklaim lulus tanpa menjalankan perintah).
3. Dilarang menjalankan perintah destruktif (`rm -rf`, `git reset --hard`, `prisma migrate reset`, drop database) tanpa izin eksplisit user, serta dilarang membuka/mengubah `.env` produksi.
4. Hemat konteks: baca hanya file kode dan bagian `/docs/*` yang dirujuk di kolom `Refs` dan `Files` pada task yang sedang dikerjakan.
