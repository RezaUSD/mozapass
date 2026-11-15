# 🔌 REST API Contract & Specification: Mozapass (`/docs/api-spec.md`)

- **Versi Dokumen:** 1.0.0
- **Tanggal Pembuatan:** 2026-11-14
- **Input Hulu:** `/docs/prd.md`, `/docs/design.md`, `/docs/tech-stack.md`, `/docs/database-schema.md`
- **Base Path:** `/api/v1`

---

## 1. Konvensi Global & Kontrak Klien (Web & APK)

1. **Autentikasi Dual-Mode (`A-007`, `NFR-003`):**
   - Klien Web mengirim/menerima JWT melalui HTTP-Only Cookie `mozapass_token`.
   - Klien Mobile/APK masa depan mengirim JWT melalui header `Authorization: Bearer <token>`.
   - Jika klien mengirim header `X-App-Version` di bawah `MIN_SUPPORTED_APP_VERSION`, server menolak dengan HTTP `426 Upgrade Required` (`APP_UPDATE_REQUIRED`).
2. **Format Data Baku (`BR-001`, `NFR-005`):**
   - Semua nominal harga/uang bertipe **integer Rupiah** (mis. `150000`).
   - Semua waktu bertipe **string UTC ISO 8601** (mis. `"2026-11-14T08:00:00.000Z"`).
   - Penamaan field JSON menggunakan `camelCase` yang berkorespondensi 1-ke-1 dengan model Prisma di `/docs/database-schema.md`.
3. **Format Amplop JSON Standar (`tech-stack.md` Bagian 3):**
   - **Sukses:** `{ "success": true, "data": { ... }, "meta": { ... } }`
   - **Gagal:** `{ "success": false, "error": { "code": "...", "message": "...", "details": { ... } } }`

---

## 2. Katalog Endpoint & Matriks Otorisasi Role (`EP-001` s/d `EP-024`)

| ID | Method & Path | Role Diizinkan | Aturan Kepemilikan (Ownership Guard) | Layar Terkait | Fitur / State / Rule PRD |
|---|---|---|---|---|---|
| `EP-001` | `POST /api/v1/auth/register` | Publik | - | `S-002` | `F-001` (Pilih `BUYER` / `ORGANIZER`) |
| `EP-002` | `POST /api/v1/auth/login` | Publik | Rate-limited per IP/Email | `S-001` | `F-001` |
| `EP-003` | `POST /api/v1/auth/logout` | Semua Role Login | Sesi sendiri | Semua Layar | `F-001` |
| `EP-004` | `GET /api/v1/auth/me` | Semua Role Login | Profil sendiri | Semua Layar | `F-001` |
| `EP-005` | `GET /api/v1/events` | Publik | Hanya acara `PUBLISHED` | `S-003` | `F-002`, `E-007` |
| `EP-006` | `GET /api/v1/events/:slug` | Publik | Hanya acara `PUBLISHED` (atau pemilik/admin) | `S-004` | `F-002`, `BR-001`, `BR-004`, `E-007` |
| `EP-007` | `POST /api/v1/orders` | `BUYER` | Order atas nama `buyerId = user.id` | `S-004`, `S-005` | `F-004`, `F-005`, `F-011`, `BR-001`..`BR-004`, `BR-011`, `ST-006`, `ST-007`, `E-001`, `E-007`, `A-010` |
| `EP-008` | `GET /api/v1/orders` | `BUYER` | Hanya `orders.buyer_id == user.id` | `S-006` | `F-004` |
| `EP-009` | `GET /api/v1/orders/:id` | `BUYER` | Wajib `order.buyer_id == user.id` | `S-005`, `S-006` | `F-004`, `BR-003`, `ST-008` |
| `EP-010` | `POST /api/v1/orders/:id/cancel` | `BUYER` | Wajib `order.buyer_id == user.id` | `S-005`, `S-006` | `F-004`, `ST-009` |
| `EP-011` | `POST /api/v1/webhooks/midtrans` | Sistem (Midtrans) | Verifikasi signature `SHA512` (`BR-008`) | `S-005`, `S-006` | `F-005`, `F-006`, `BR-005`, `BR-008`, `ST-007`, `ST-008`, `ST-010`, `ST-011`, `E-002`, `E-003`, `E-006` |
| `EP-012` | `POST /api/v1/orders/:id/simulate-pay` | `BUYER` | Wajib `ENABLE_PAYMENT_SIMULATOR=true` & `order.buyer_id == user.id` | `S-005` | `F-005`, `BR-008`, `ST-007`, `ST-011` |
| `EP-013` | `GET /api/v1/tickets` | `BUYER` | Hanya tiket dari `order.buyer_id == user.id` | `S-007` | `F-006` |
| `EP-014` | `GET /api/v1/tickets/:id` | `BUYER` | Wajib `ticket.order.buyer_id == user.id` | `S-007` | `F-006`, `BR-006`, `A-005` |
| `EP-015` | `POST /api/v1/tickets/:id/resend-email` | `BUYER` | Wajib `ticket.order.buyer_id == user.id` | `S-007` | `F-006`, `E-006` |
| `EP-016` | `GET /api/v1/scanner/events` | `STAFF`, `ORGANIZER` | Acara di `event_staff` (`STAFF`) atau `organizer_id` (`ORGANIZER`) | `S-008` | `F-008`, `BR-009` |
| `EP-017` | `POST /api/v1/scanner/check-in` | `STAFF`, `ORGANIZER` | Wajib ditugaskan di `eventId` (`BR-009`) + Rate Limit | `S-008` | `F-008`, `BR-006`, `BR-007`, `BR-009`, `ST-012`, `E-004`, `E-005` |
| `EP-018` | `GET /api/v1/organizer/dashboard` | `ORGANIZER` | Hanya metrik acara `organizer_id == user.id` | `S-009` | `F-009`, `BR-001` |
| `EP-019` | `GET /api/v1/organizer/events` | `ORGANIZER` | Hanya acara `organizer_id == user.id` | `S-010` | `F-003` |
| `EP-020` | `POST /api/v1/organizer/events` | `ORGANIZER` | Membuat acara dengan `organizer_id = user.id` | `S-010` | `F-003`, `BR-001`, `BR-004` |
| `EP-021` | `PATCH /api/v1/organizer/events/:id` | `ORGANIZER` | Wajib `event.organizer_id == user.id` | `S-010` | `F-003`, `BR-010`, `ST-001`..`ST-003`, `ST-013` |
| `EP-022` | `GET /api/v1/organizer/events/:id/attendees` | `ORGANIZER` | Wajib `event.organizer_id == user.id` (JSON & `?format=csv`) | `S-011` | `F-009`, `BR-001` |
| `EP-023` | `POST` & `DELETE /api/v1/organizer/events/:id/staff` | `ORGANIZER` | Wajib `event.organizer_id == user.id` | `S-012` | `F-007`, `BR-009` |
| `EP-024` | `GET` & `PATCH /api/v1/admin/events` | `ADMIN` | Seluruh acara (khusus moderasi `SUSPENDED` / `PUBLISHED`) | `S-013` | `F-010`, `ST-004`, `ST-005` |

---

## 3. Spesifikasi Detail per Endpoint

### 3.1 Grup Autentikasi (`/api/v1/auth/*`)

#### `EP-001` — `POST /api/v1/auth/register`
- **Fitur & Layar:** `F-001`, `S-002`
- **Request Body:**
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "Password123!",
    "role": "BUYER"
  }
  ```
  *(Catatan: `role` pada registrasi publik hanya menerima `"BUYER"` atau `"ORGANIZER"`. Role `"STAFF"` dan `"ADMIN"` diatur melalui penugasan/seed).*
- **Response `201 Created`:** Mengatur cookie `mozapass_token` dan mengembalikan `{ user: { id, name, email, role }, token }`.
- **Error Codes:** `VALIDATION_ERROR` (`400`, email sudah terdaftar atau password `< 8` karakter).

#### `EP-002` — `POST /api/v1/auth/login`
- **Fitur & Layar:** `F-001`, `S-001`
- **Request Body:** `{ "email": "budi@example.com", "password": "Password123!" }`
- **Response `200 OK`:** `{ "success": true, "data": { "user": { "id": "...", "name": "...", "email": "...", "role": "BUYER" }, "token": "eyJhbG..." } }`
- **Error Codes:** `UNAUTHORIZED` (`401`), `RATE_LIMITED` (`429`).

#### `EP-003` — `POST /api/v1/auth/logout` & `EP-004` — `GET /api/v1/auth/me`
- `EP-003`: Menghapus cookie `mozapass_token` dan mengembalikan `200 OK`.
- `EP-004`: Mengembalikan profil user aktif `{ id, name, email, role }` atau `401 UNAUTHORIZED`.

---

### 3.2 Grup Katalog Acara Publik (`/api/v1/events/*`)

#### `EP-005` — `GET /api/v1/events`
- **Fitur & Layar:** `F-002`, `S-003`
- **Query Params:** `?q=keyword&page=1&limit=12`
- **Perilaku:** Hanya mengembalikan acara berstatus `PUBLISHED`, diurutkan berdasarkan `startTime ASC`, beserta harga kategori termurah (`startingPrice` integer Rupiah) dan ketersediaan kuota.

#### `EP-006` — `GET /api/v1/events/:slug`
- **Fitur & Layar:** `F-002`, `S-004`, `E-007`
- **Perilaku:**
  1. Menjalankan *lazy expiration cleanup* (`E-007`) untuk membebaskan order `PENDING` yang sudah kedaluwarsa pada acara ini.
  2. Mengembalikan detail acara + daftar `categories` beserta `availableQuota = totalQuota - soldCount - reservedCount`, `price`, `maxPerOrder`, `saleStartAt`, `saleEndAt`.
- **Error Codes:** `NOT_FOUND` (`404` jika acara tidak ada atau berstatus `DRAFT`/`SUSPENDED` bagi publik).

---

### 3.3 Grup Pemesanan, Pembayaran & Webhook (`/api/v1/orders/*` & `/api/v1/webhooks/*`)

#### `EP-007` — `POST /api/v1/orders` (Checkout & Hold Kuota Atomik)
- **Fitur & Aturan:** `F-004`, `F-005`, `F-011`, `BR-001`..`BR-004`, `BR-011`, `ST-006`, `ST-007`, `E-001`, `E-007`, `A-010`, `S-004`, `S-005`
- **Role:** `BUYER`
- **Request Body:**
  ```json
  {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "ticketCategoryId": "660e8400-e29b-41d4-a716-446655440001",
    "quantity": 2
  }
  ```
- **Alur Transaksi Server (`order.service.ts`):**
  1. Jalankan lazy cleanup order `PENDING` yang sudah `expiresAt < NOW()` pada acara tersebut (`E-007`).
  2. Cek apakah `BUYER` masih punya order `PENDING` aktif di `eventId` ini (`BR-011`). Jika ada → tolak dengan `409 ACTIVE_ORDER_EXISTS`.
  3. Di dalam `prisma.$transaction`: kunci baris `ticket_categories` dengan `SELECT ... FOR UPDATE`.
  4. Validasi acara `PUBLISHED`, waktu server di dalam `saleStartAt..saleEndAt` (`SALE_WINDOW_CLOSED`), `1 <= quantity <= maxPerOrder` (`MAX_ORDER_LIMIT_EXCEEDED`), dan `soldCount + reservedCount + quantity <= totalQuota` (`QUOTA_EXCEEDED`, `E-001`).
  5. Tambah `reservedCount += quantity` dan buat baris `orders` berstatus `PENDING` dengan `expiresAt = NOW() + 15 minutes` (`BR-003`).
  6. Jika `totalAmount === 0` (`F-011` Tiket Gratis), langsung panggil service `markOrderAsPaid` (`ST-007` & `ST-011`). Jika `totalAmount > 0`, buat Midtrans Snap Token (`snapToken`, `paymentRedirectUrl`).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "orderCode": "ORD-20261114-9F8A1B",
      "status": "PENDING",
      "quantity": 2,
      "unitPrice": 150000,
      "totalAmount": 300000,
      "expiresAt": "2026-11-14T04:20:00.000Z",
      "snapToken": "e6218a92-xxxx-xxxx",
      "paymentRedirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/...",
      "simulatorEnabled": true
    }
  }
  ```
- **Error Codes:** `UNAUTHORIZED` (`401`), `FORBIDDEN_ROLE` (`403`), `NOT_FOUND` (`404`), `QUOTA_EXCEEDED` (`409`), `ACTIVE_ORDER_EXISTS` (`409`), `SALE_WINDOW_CLOSED` (`422`), `MAX_ORDER_LIMIT_EXCEEDED` (`422`).

#### `EP-008` — `GET /api/v1/orders` & `EP-009` — `GET /api/v1/orders/:id`
- **Role:** `BUYER` (wajib `order.buyerId === user.id`, jika bukan → `403 FORBIDDEN_OWNERSHIP`).
- **Perilaku `EP-009`:** Jika saat dibuka status masih `PENDING` tetapi `NOW() > expiresAt`, otomatis jalankan transisi `ST-008` menjadi `EXPIRED` dan pulihkan `reservedCount` sebelum mengembalikan respons ke halaman `S-005`.

#### `EP-010` — `POST /api/v1/orders/:id/cancel`
- **Fitur & State:** `F-004`, `ST-009`, `S-005`
- **Role:** `BUYER` pemilik order.
- **Perilaku:** Mengubah order `PENDING` menjadi `CANCELLED` (dengan pengecekan `version`), mengurangi `reservedCount`, dan memulihkan kuota seketika. Jika order bukan `PENDING` → `422 INVALID_STATE_TRANSITION`.

#### `EP-011` — `POST /api/v1/webhooks/midtrans` (Webhook Idempotent)
- **Fitur & Aturan:** `F-005`, `F-006`, `BR-005`, `BR-008`, `ST-007`, `ST-008`, `ST-010`, `ST-011`, `E-002`, `E-003`, `E-006`
- **Perilaku:**
  1. Hitung `SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`. Jika tidak cocok dengan `signature_key`, catat di `payment_webhook_logs` (`signatureValid: false`) dan kembalikan `401 WEBHOOK_SIGNATURE_INVALID`.
  2. Cek idempotensi di `payment_webhook_logs` berdasarkan `UNIQUE (provider: 'MIDTRANS', externalId: transaction_id + ':' + transaction_status)`. Jika sudah pernah diproses atau order sudah `PAID`, kembalikan `200 OK` (`E-003`).
  3. Untuk status `settlement` atau `capture`: panggil fungsi domain bersama `markOrderAsPaid(orderCode, 'MIDTRANS', externalId, payload)`:
     - Jika order `PENDING` → ubah ke `PAID` (`version + 1`), kurangi `reservedCount`, tambah `soldCount`, terbitkan `N` baris `tickets` berstatus `VALID` dengan `qrSignature` HMAC-SHA256 (`ST-011`).
     - Jika order sudah `EXPIRED` (`E-002` Late Webhook) → tandai `isLatePayment = true` di `payment_webhook_logs`. Jika kuota masih tersedia (`soldCount + reservedCount + quantity <= totalQuota`), pulihkan ke `PAID`, tambah `soldCount`, dan terbitkan tiket. Jika kuota sudah habis dibeli orang lain, catat log kritis `OVERBOOK_PAYMENT_ALERT` tanpa melebihi `totalQuota`.
  4. Untuk status `expire` / `cancel` / `deny`: jika order masih `PENDING`, ubah ke `EXPIRED` (`ST-008`) atau `FAILED` (`ST-010`) dan kembalikan `reservedCount`.
  5. Kirim email tiket QR secara asinkron dengan `try/catch` terpisah agar kegagalan SMTP tidak membatalkan transaksi database (`E-006`).

#### `EP-012` — `POST /api/v1/orders/:id/simulate-pay` (Simulator Pembayaran Terkendali)
- **Fitur & Aturan:** `F-005`, `BR-008`, `ST-007`, `ST-011`, `S-005`
- **Guard Keamanan Wajib:**
  1. Memeriksa `process.env.ENABLE_PAYMENT_SIMULATOR === 'true'`. Jika tidak bernilai `'true'`, **wajib langsung mengembalikan HTTP `404 Not Found` (`NOT_FOUND`)**.
  2. Memeriksa autentikasi `BUYER` dan kepemilikan `order.buyerId === user.id` (`403 FORBIDDEN_OWNERSHIP`).
  3. Memeriksa apakah order belum melewati `expiresAt` (`410 ORDER_EXPIRED`).
- **Perilaku:** Memanggil service domain **`markOrderAsPaid`** yang **sama persis** dengan webhook `EP-011` dan mencatat ke tabel `payment_webhook_logs` dengan `provider = 'SIMULATOR'` dan `externalId = 'SIM-' + order.orderCode`, sehingga alur idempotensi, mutasi kuota, dan penerbitan tiket teruji secara identik.

---

### 3.4 Grup Tiket Pembeli (`/api/v1/tickets/*`)

#### `EP-013` — `GET /api/v1/tickets` & `EP-014` — `GET /api/v1/tickets/:id`
- **Role:** `BUYER` pemilik tiket (`S-007`).
- **Response `EP-014` (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "ticketCode": "MOZA-8F92-K10A",
      "qrPayload": "MOZA.MOZA-8F92-K10A.9A4F2C1E8B7D6A5F",
      "status": "VALID",
      "attendeeName": "Budi Santoso",
      "attendeeEmail": "budi@example.com",
      "checkedInAt": null,
      "event": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Mozapass Tech & Music Fest 2026",
        "location": "Jakarta Convention Center",
        "startTime": "2026-12-10T11:00:00.000Z"
      },
      "category": {
        "name": "VIP Pass",
        "price": 350000
      }
    }
  }
  ```

#### `EP-015` — `POST /api/v1/tickets/:id/resend-email`
- **Fitur & Edge Case:** `F-006`, `E-006`, `S-007`
- **Perilaku:** Mengirim ulang email E-Ticket ber-QR ke `attendeeEmail` milik `BUYER` (dibatasi rate-limit maks 3 kali per 10 menit).

---

### 3.5 Grup Scanner & Check-in Lokasi (`/api/v1/scanner/*`)

#### `EP-016` — `GET /api/v1/scanner/events`
- **Role:** `STAFF`, `ORGANIZER` (`S-008`, `BR-009`)
- **Perilaku:** Mengembalikan daftar acara tempat user ditugaskan sebagai panitia (`event_staff`) atau sebagai pemilik (`organizer_id`), beserta statistik langsung `{ totalValidOrUsed, checkedInCount }`.

#### `EP-017` — `POST /api/v1/scanner/check-in` (Kamera QR & Fallback Manual)
- **Fitur & Aturan:** `F-008`, `BR-006`, `BR-007`, `BR-009`, `ST-012`, `E-004`, `E-005`, `S-008`
- **Role:** `STAFF` (yang terdaftar di `event_staff` untuk `eventId`) atau `ORGANIZER` (pemilik `eventId`).
- **Request Body (Menerima Salah Satu: `qrPayload` Kamera ATAU `ticketCode` Manual):**
  ```json
  {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "qrPayload": "MOZA.MOZA-8F92-K10A.9A4F2C1E8B7D6A5F",
    "ticketCode": null
  }
  ```
- **Aturan Validasi & Keamanan Berlapis:**
  1. **Otorisasi Penugasan (`BR-009`):** Pastikan pemanggil adalah `STAFF` yang ditugaskan di `eventId` tersebut atau `ORGANIZER` pemilik `eventId`. Jika bukan → tolak `403 FORBIDDEN_OWNERSHIP`.
  2. **Pembedaan Metode Input:**
     - **Jalur A (`qrPayload` diisi — Scan Kamera):** Parse format `MOZA.<ticketCode>.<sig>`, cari tiket, dan verifikasi signature HMAC-SHA256 secara *timing-safe* menggunakan `(ticketCode + ':' + ticket.eventId)` (`BR-006`). Jika signature tidak cocok → tolak `422 QR_SIGNATURE_INVALID`. Set `checkInMethod = 'QR_SCAN'`.
     - **Jalur B (`ticketCode` diisi — Input Manual `E-005`):** Karena input manual tidak membawa signature HMAC, terapkan **Rate Limiter ketat** (maks 10 percobaan per menit per petugas) untuk mencegah tebak kode (*brute-force*). Catat di structured log bahwa check-in dilakukan secara `MANUAL`. Set `checkInMethod = 'MANUAL'`.
  3. **Verifikasi Kecocokan Acara (`BR-009`):** Jika `ticket.eventId !== body.eventId`, tolak dengan `422 TICKET_WRONG_EVENT` (disertai nama acara asal tiket di `details` agar panitia bisa mengarahkan pengunjung ke pintu yang benar).
  4. **Update Atomik Anti-Passback (`BR-007`, `ST-012`, `E-004`):**
     Jalankan `UPDATE tickets SET status = 'USED', checked_in_at = NOW(), checked_in_by_id = :staffId, check_in_method = :method WHERE id = :ticketId AND event_id = :eventId AND status = 'VALID'`.
  5. **Pembedaan Respons secara Eksplisit:**
     - **Berhasil (`affected_rows === 1` → HTTP `200 OK`):**
       ```json
       {
         "success": true,
         "data": {
           "result": "VALID",
           "ticketCode": "MOZA-8F92-K10A",
           "attendeeName": "Budi Santoso",
           "categoryName": "VIP Pass",
           "checkInMethod": "QR_SCAN",
           "checkedInAt": "2026-11-14T12:10:00.000Z"
         }
       }
       ```
     - **Sudah Pernah Dipakai (`ticket.status === 'USED'` → HTTP `409 Conflict`, `TICKET_ALREADY_USED`):**
       ```json
       {
         "success": false,
         "error": {
           "code": "TICKET_ALREADY_USED",
           "message": "Tiket ini sudah pernah digunakan untuk check-in.",
           "details": {
             "ticketCode": "MOZA-8F92-K10A",
             "attendeeName": "Budi Santoso",
             "categoryName": "VIP Pass",
             "checkedInAt": "2026-11-14T11:45:12.000Z",
             "checkedInByName": "Panitia Pintu A",
             "checkInMethod": "QR_SCAN"
           }
         }
       }
       ```
     - **Tiket Acara Lain (`HTTP 422`, `TICKET_WRONG_EVENT`)**
     - **Signature Palsu (`HTTP 422`, `QR_SIGNATURE_INVALID`)**
     - **Tiket Tidak Ditemukan (`HTTP 404`, `NOT_FOUND`)**

---

### 3.6 Grup Organizer Dashboard & Manajemen Acara (`/api/v1/organizer/*`)

#### `EP-018` — `GET /api/v1/organizer/dashboard`
- **Fitur & Layar:** `F-009`, `S-009`
- **Response `200 OK`:** Mengembalikan metrik Bento Dashboard untuk seluruh acara milik `ORGANIZER`: `{ totalRevenue, totalTicketsSold, totalQuota, totalCheckedIn, dailySalesChart: [{ date, revenue, ticketsSold }], activeEvents: [...] }`.

#### `EP-019` (`GET`), `EP-020` (`POST`), `EP-021` (`PATCH /api/v1/organizer/events/:id`)
- **Fitur & Aturan:** `F-003`, `BR-001`, `BR-004`, `BR-010`, `ST-001`..`ST-003`, `ST-013`, `S-010`
- **Perilaku `EP-021`:**
  - Mendukung pembaruan detail acara, penambahan/pembaruan kategori tiket, dan aksi transisi status (`action: "PUBLISH" | "END" | "CANCEL"`).
  - Menegakkan `BR-010`: jika sebuah kategori sudah memiliki `soldCount > 0` atau `reservedCount > 0`, percobaan mengubah `price`, menghapus kategori, atau menurunkan `totalQuota < soldCount + reservedCount` ditolak dengan `422 CATEGORY_LOCKED`.

#### `EP-022` — `GET /api/v1/organizer/events/:id/attendees`
- **Fitur & Layar:** `F-009`, `S-011`
- **Query Params:** `?q=search&status=VALID|USED&format=json|csv`
- **Perilaku:** Jika `format=csv`, mengembalikan stream `text/csv` dengan header `Content-Disposition: attachment; filename="attendees-<slug>.csv"` berisi kolom: `Ticket Code,Order Code,Attendee Name,Attendee Email,Category,Price (IDR),Status,Checked In At (UTC),Check-in Method,Checked In By`.

#### `EP-023` — `POST` & `DELETE /api/v1/organizer/events/:id/staff`
- **Fitur & Aturan:** `F-007`, `BR-009`, `S-012`
- **Perilaku:** Menambahkan user berdasarkan `email` ke tabel `event_staff` untuk acara milik `ORGANIZER` (dan jika role user masih `BUYER`, mengizinkannya mengakses scanner untuk acara tersebut atau membuat akun `STAFF`), serta mencabut akses panitia dari `event_staff`.

---

### 3.7 Grup Moderasi Admin (`/api/v1/admin/*`)

#### `EP-024` — `GET /api/v1/admin/events` & `PATCH /api/v1/admin/events/:id/moderation`
- **Fitur & State:** `F-010`, `ST-004`, `ST-005`, `S-013`
- **Role:** `ADMIN`
- **Request Body (`PATCH`):** `{ "action": "SUSPEND" | "RESTORE", "moderationNote": "Melanggar ketentuan..." }`

---

## ✅ Quality Gate Report
- **✅ Lulus — Cakupan & Traceability Endpoint:** Seluruh 24 endpoint (`EP-001` s/d `EP-024`) memetakan 100% fitur `F-001` s/d `F-011`, aturan bisnis `BR-001` s/d `BR-011`, transisi `ST-001` s/d `ST-013`, edge case `E-001` s/d `E-007`, dan layar `S-001` s/d `S-013`.
- **✅ Lulus — Keamanan Check-in & Simulator:** `EP-017` (`POST /api/v1/scanner/check-in`) mengisolasi `eventId`, membedakan QR HMAC vs input manual ber-rate-limit + log audit, serta mengembalikan detail waktu check-in sebelumnya; `EP-012` (`simulate-pay`) dikunci dengan flag `ENABLE_PAYMENT_SIMULATOR=true` dan melewati service `markOrderAsPaid` yang sama dengan webhook Midtrans.
- **⚠️ Catatan:** Kolom `check_in_method` (`'QR_SCAN' | 'MANUAL'`) dan kode error `RATE_LIMITED` (`429`) juga telah disinkronkan ke `/docs/database-schema.md` dan `/docs/tech-stack.md`.
