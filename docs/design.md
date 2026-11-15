# 🎨 Design System & UI/UX Specification: Mozapass (`/docs/design.md`)

- **Versi Dokumen:** 2.0.0 *(Diperbarui ke Referensi Visual "Learnify Tactile Bento UI")*
- **Tanggal Pembaruan:** 2026-11-14
- **Input Hulu:** `/docs/prd.md` (v1.0.0)
- **Arah Visual:** *Learnify-Inspired Tactile Bento UI* — Bingkai App Shell Gelap (`#1E1E24`) dengan Left Icon Rail, Kanvas Putih Bersih (`#FFFFFF` / `#F7F7FA`), Kartu Pastel Ber-border Tegas (`1.5px solid #181824`) dalam 3 Warna Utama (Warm Yellow `#FFE37E`, Soft Lavender `#DEC9FF`, Soft Sky Blue `#C6EAFF`), Progress Bar Kuota, Avatar Stack Peserta (`+120`), Tabel Bernomor (`01..N`), dan Dark Charcoal Spotlight Card (`#232329`).

---

## 1. Filosofi Desain & Aturan Anti AI-Slop (Konsisten 100% dengan Referensi Learnify)

Desain **Mozapass** mengikuti secara ketat anatomi dan proporsi visual dari gambar referensi **Learnify**:
1. **Outer Dark App Frame + Left Icon Rail (`#1E1E24`):** Seluruh aplikasi dibingkai oleh shell gelap membulat (`rounded-[28px]`) dengan navigasi vertikal berbasis ikon ramping di sisi kiri (*icon rail*). Ikon menu yang sedang aktif memiliki kotak sorot berwarna **Warm Yellow (`#FFD84D` / `#FFE37E`)** atau **Electric Lime (`#D2F865`)** dengan ikon gelap `#181824`.
2. **Tactile Pastel Bento Cards dengan Border Hitam Tipis (`1.5px solid #181824`):**
   - Kartu utama pada baris atas menggunakan warna pastel solid yang hangat dan kontras: **Warm Yellow (`#FFE37E`)**, **Soft Lavender (`#DEC9FF`)**, dan **Soft Sky Blue (`#C6EAFF`)**.
   - Setiap kartu wajib memiliki: (a) **Pill Kategori** di kiri atas, (b) **Ikon Bookmark/Status** di kanan atas, (c) **Judul Tegas (`#181824`)**, (d) **Horizontal Progress Bar** untuk menampilkan kuota tiket terjual (`Terjual 85/100 tiket`), (e) **Tumpukan Avatar Bulat (`+120`)** di kiri bawah, dan (f) **Tombol CTA Kapsul/Rounded** di kanan bawah (`#F05A36` Coral Orange atau `#D2F865` Electric Lime berteks `#181824`).
3. **Bottom Split Layout (Wide Numbered List Card + Dark Spotlight Card):**
   - **Sisi Kiri (8 Kolom):** Kartu putih bersih (`#FFFFFF`, border `1.5px solid #E4E4EC`, radius `20px`) berisi daftar baris bernomor (`01.`, `02.`, `03.`, `04.`) dengan avatar penyelenggara/peserta di kolom tengah dan durasi/harga di kolom kanan.
   - **Sisi Kanan (4 Kolom):** **Dark Charcoal Spotlight Card (`#232329`)** berteks putih dengan pill kategori kuning (`#FFE37E`), judul besar, tumpukan avatar peserta, dan tombol CTA penuh di bagian bawah.
4. **Larangan Keras Visual (Anti AI-Slop):**
   - Dilarang menggunakan gradasi ungu-biru neon (`linear-gradient` indigo/purple/pink).
   - Semua angka nominal Rupiah, sisa kuota, dan hitung mundur wajib menggunakan `font-variant-numeric: tabular-nums`.

---

## 2. Design Tokens (CSS Variables / Tailwind Config)

### 2.1 Palet Warna (Color Tokens)

| Token | Nilai Hex | Penggunaan Utama | Aturan Kontras Teks |
|---|---|---|---|
| `--bg-outer-shell` | `#1E1E24` | Bingkai luar aplikasi & Left Icon Rail Sidebar. | Ikon putih `#FFFFFF` / aktif `#FFD84D` |
| `--bg-canvas` | `#F7F7FA` | Latar kanvas dalam (Workspace container). | Teks utama `#181824` |
| `--bg-surface` | `#FFFFFF` | Latar kartu tabel bernomor (`01..05`), form, dan halaman tenang Checkout (`S-005`). | Teks utama `#181824` |
| `--bg-dark-anchor` | `#232329` / `#181824` | Dark Spotlight Card (kanan bawah), Header Boarding Pass QR, & Layar Scanner `STAFF`. | Teks putih `#FFFFFF` |
| `--card-yellow` | `#FFE37E` | Kartu Bento Pastel 1 (Konser / Pendapatan / Early Bird) & Sorot Ikon Sidebar Aktif. | **Wajib teks gelap `#181824`** |
| `--card-lavender` | `#DEC9FF` | Kartu Bento Pastel 2 (Teknologi / Kuota Tiket / VIP Pass). | **Wajib teks gelap `#181824`** |
| `--card-sky` | `#C6EAFF` | Kartu Bento Pastel 3 (Workshop / Kehadiran Check-in / Kategori Reguler). | **Wajib teks gelap `#181824`** |
| `--pastel-mint` | `#E6F9D5` | Badge status sukses (`PAID`, `PUBLISHED`, `VALID`). | Teks `#1E5E2A` |
| `--pastel-rose` | `#FDE2E4` | Badge status gagal/batal/terpakai (`EXPIRED`, `CANCELLED`, `VOID`). | Teks `#8A1C24` |
| `--accent-coral` | `#F05A36` | Tombol CTA aksen pada kartu & Dark Spotlight Card (sesuai tombol `"Continue"` / `"More details"` referensi). | Teks putih `#FFFFFF` |
| `--accent-lime` | `#D2F865` | Aksen CTA utama alternatif / badge aktif (`VALID`, tombol Checkout). | **Wajib teks gelap `#181824`** |
| `--border-tactile` | `#181824` | Border kartu pastel & pill kategori (`1.5px solid #181824`). | - |
| `--border-subtle` | `#E4E4EC` | Garis pemisah baris tabel bernomor & kartu putih. | - |
| `--text-primary` | `#181824` | Judul kartu, nominal Rupiah, teks utama. | - |
| `--text-secondary` | `#6E6E82` | Subjudul, nama pengajar/penyelenggara, label kolom tabel. | - |
| `--semantic-success` | `#16A34A` | Indikator scan QR valid (`ST-012` Berhasil). | - |
| `--semantic-warning` | `#D97706` | Indikator hitung mundur checkout `< 3 menit`. | - |
| `--semantic-danger` | `#DC2626` | Indikator scan QR ditolak (`USED` / palsu) & pesan error form. | - |

### 2.2 Tipografi & Geometri
- **Font Heading & UI:** `Plus Jakarta Sans` (`600 SemiBold`, `700 Bold`, `800 ExtraBold`).
- **Font Monospace (Kode Tiket, Harga, & Timer):** `JetBrains Mono` (`tabular-nums`).
- **Radius Sudut:**
  - Outer App Container: `28px` (`rounded-[28px]`)
  - Tactile Bento Card & Spotlight Card: `20px` (`rounded-[20px]`) dengan `border-[1.5px] border-[#181824]`
  - Category Filter Pill & Search Bar: `9999px` (`rounded-full`)
  - CTA Button & Active Sidebar Icon Box: `12px` (`rounded-xl`)

---

## 3. Pemetaan Badge Status (Selaras dengan State Machine `prd.md`)

### 3.1 Status Acara (`EventStatus`)
| Status | Warna Latar | Warna Teks | Label UI |
|---|---|---|---|
| `DRAFT` | `#ECECF2` | `#4A4A5A` | Draf |
| `PUBLISHED` | `#E6F9D5` | `#1E5E2A` | Tayang |
| `ENDED` | `#DEC9FF` | `#3F2E7E` | Selesai |
| `CANCELLED` | `#FDE2E4` | `#8A1C24` | Dibatalkan |
| `SUSPENDED` | `#181824` | `#FDE2E4` | Ditangguhkan Admin |

### 3.2 Status Pesanan (`OrderStatus`)
| Status | Warna Latar | Warna Teks | Label UI |
|---|---|---|---|
| `PENDING` | `#FFE37E` | `#7C3E14` | Menunggu Pembayaran |
| `PAID` | `#E6F9D5` | `#1E5E2A` | Lunas |
| `EXPIRED` | `#ECECF2` | `#6E6E82` | Kedaluwarsa |
| `CANCELLED` | `#FDE2E4` | `#8A1C24` | Dibatalkan |
| `FAILED` | `#FDE2E4` | `#8A1C24` | Pembayaran Gagal |

### 3.3 Status Tiket (`TicketStatus`)
| Status | Warna Latar | Warna Teks | Label UI |
|---|---|---|---|
| `VALID` | `#D2F865` | `#181824` | Aktif / Siap Scan |
| `USED` | `#DEC9FF` | `#3F2E7E` | Sudah Check-in |
| `VOID` | `#FDE2E4` | `#8A1C24` | Tidak Berlaku (Void) |

---

## 4. Arsitektur Navigasi Konsisten per Role (App Shell Learnify)

Seluruh halaman (`S-001` s/d `S-013`) menggunakan **App Shell yang konsisten**:
- **Desktop (`>= 1024px`):** Bingkai gelap `#1E1E24` dengan **Left Icon Rail Sidebar** (lebar `72px` untuk mode ikon atau dapat diperluas) + kanvas utama putih `#FFFFFF`/`#F7F7FA` bersudut `28px`. Di bagian atas kanvas selalu ada **Top Bar** (`"Welcome to Mozapass"`, Search Bar bundar di tengah, Notifikasi & Profil User di kanan).
- **Mobile & APK (`< 1024px`):** Header ringkas di atas + **Bottom Navigation Bar** berlatar `#1E1E24` dengan kotak ikon aktif berwarna kuning `#FFE37E` / lime `#D2F865`.

---

## 5. Inventaris Lengkap 13 Layar (`S-001` s/d `S-013`)

Setiap layar wajib menangani **4 Kondisi UI** (*Loading Skeleton*, *Empty State*, *Error State*, dan *Success State*):

| ID Layar | Nama Layar & Route | Role Akses | Komponen Utama (Gaya Learnify Tactile Bento) |
|---|---|---|---|
| **`S-001`** | **Halaman Login** (`/login`) | Publik | Split Bento di dalam kanvas putih: Kiri adalah **Dark Spotlight Card (`#232329`)** dengan badge kuning `"Anti-Oversell Ticketing"`, avatar stack pengguna, & 4 tombol Demo Quick Login; Kanan adalah kartu form putih ber-border `1.5px #181824`. |
| **`S-002`** | **Halaman Registrasi** (`/register`) | Publik | Form pendaftaran dengan 2 kartu pilihan Role bergaya Tactile Pastel: Kartu Kuning `#FFE37E` (`BUYER - Pembeli Tiket`) dan Kartu Lavender `#DEC9FF` (`ORGANIZER - Penyelenggara Acara`). |
| **`S-003`** | **Katalog & Jelajah Acara** (`/`) | Publik, `BUYER` | **Persis gambar referensi Learnify:** Header `"Jelajah Acara"` + filter pill (`Semua Acara` hitam aktif, `Konser`, `Teknologi`, `Workshop`). Baris atas: **3 Kartu Acara Pastel** (`#FFE37E`, `#DEC9FF`, `#C6EAFF`) lengkap dengan pill kategori, progress bar kuota terjual, avatar stack `+120`, & tombol `"Pesan"`. Baris bawah: Kiri **Kartu Tabel Putih Bernomor (`01..05`)** `"Jadwal Acara Mendatang"`; Kanan **Dark Spotlight Card (`#232329`)** `"Acara Paling Diminati"`. |
| **`S-004`** | **Detail Acara & Pilih Tiket** (`/events/[slug]`) | Publik, `BUYER` | Baris atas: Dark Event Header Card (`#232329`) + Kartu Kuota Live (`#FFE37E`). Baris tengah: **3 Kartu Kategori Tiket Pastel** (`#FFE37E` Early Bird, `#DEC9FF` VIP Pass, `#C6EAFF` Reguler) dengan progress bar sisa kuota & stepper kuantitas `[- 2 +]`. Bawah: Sticky Checkout Bar. |
| **`S-005`** | **Checkout & Hitung Mundur 15m** (`/orders/[orderId]/checkout`) | `BUYER` | **Permukaan Putih Bersih & Tenang (`#FFFFFF`)** dengan teks `#181824` kontras tinggi. Banner atas kuning hangat `#FFE37E` ber-border `1.5px #181824` menampilkan hitung mundur `15:00` (`tabular-nums`). Kiri: Rincian item bernomor `01..03`. Kanan: Dark Payment Card (`#232329`) dengan tombol `"Bayar via Midtrans"`, `"⚡ Simulasi Bayar Lunas (Mode Demo)"`, dan `"Batalkan Pesanan"`. |
| **`S-006`** | **Daftar Pesanan Saya** (`/my-orders`) | `BUYER` | Baris atas: Filter pill (`Semua`, `Menunggu Bayar`, `Lunas`, `Kedaluwarsa`). Kartu putih berisi daftar bernomor `01..N` pesanan pembeli dengan badge status, nominal Rupiah `tabular-nums`, dan tombol `"Lanjut Bayar"` atau `"Lihat Tiket"`. |
| **`S-007`** | **E-Ticket QR Boarding Pass** (`/my-tickets`, `/my-tickets/[ticketId]`) | `BUYER` | Kartu Boarding Pass ber-border `1.5px #181824` dengan lekukan tiket (*perforated notch*): sisi info acara berwarna pastel (`#FFE37E` / `#DEC9FF`) atau gelap (`#232329`), sisi kanan/bawah putih bersih (`#FFFFFF`) memuat **QR Code `HMAC-SHA256`**, kode manual monospace `MOZA-DEMO-0001`, badge status (`VALID`/`USED`), & tombol `"Kirim Ulang Email"`. |
| **`S-008`** | **Kamera Scanner & Input Manual** (`/scanner`, `/scanner/[eventId]`) | `STAFF`, `ORGANIZER` | Mode fokus pintu masuk berlatar `#1E1E24`. Kartu atas kuning `#FFE37E` menampilkan progress bar kehadiran real-time (`142/150 Hadir`). Tengah: Viewfinder kamera `html5-qrcode` + tab **Input Kode Manual (`E-005`)**. Bawah: Result Sheet kontras tinggi (Hijau `#16A34A` untuk `VALID`, Merah `#DC2626` untuk `TICKET_ALREADY_USED` / `QR_SIGNATURE_INVALID`). |
| **`S-009`** | **Dashboard Bento Organizer** (`/organizer/dashboard`) | `ORGANIZER` | **Persis struktur gambar referensi Learnify:** Baris atas: **3 Kartu Metrik Pastel** (`#FFE37E` Total Pendapatan Rupiah, `#DEC9FF` Tiket Terjual vs Kuota, `#C6EAFF` Kehadiran Check-in) dengan progress bar & avatar stack. Baris bawah kiri (8 kolom): Kartu putih daftar performa acara bernomor `01..N` + grafik penjualan 7 hari. Baris bawah kanan (4 kolom): **Dark Spotlight Card (`#232329`)** untuk aksi cepat `"+ Buat Acara Baru"`. |
| **`S-010`** | **Manajemen & CRUD Acara** (`/organizer/events`, `/new`, `/[id]/edit`) | `ORGANIZER` | Daftar acara milik `ORGANIZER` + form buat/edit acara dan kartu kategori tiket (`#FFE37E`, `#DEC9FF`, `#C6EAFF`). Menampilkan indikator kunci otomatis (`🔒 Harga Terkunci - BR-010`) jika kategori sudah memiliki `soldCount > 0` atau `reservedCount > 0`. |
| **`S-011`** | **Daftar Peserta & Ekspor CSV** (`/organizer/events/[id]/attendees`) | `ORGANIZER` | Kartu tabel putih bernomor `01..N` menampilkan seluruh pemegang tiket (`MOZA-XXXX`, Nama, Email, Kategori, Harga, Status `VALID`/`USED`, Jam & Petugas Check-in) dilengkapi pencarian, filter pill, dan tombol utama `"⬇ Ekspor CSV Peserta"`. |
| **`S-012`** | **Manajemen Panitia Scanner** (`/organizer/events/[id]/staff`) | `ORGANIZER` | Kiri: Tabel bernomor `01..N` daftar panitia (`STAFF`) yang ditugaskan di acara tersebut beserta tombol `"Cabut Akses"`. Kanan: Dark Card (`#232329`) form tambah panitia berdasarkan email (`BR-009`). |
| **`S-013`** | **Panel Moderasi Admin** (`/admin/events`) | `ADMIN` | Baris atas: 3 kartu ringkasan status (`#FFE37E` Acara Tayang, `#DEC9FF` Total Acara, `#FDE2E4` Acara Ditangguhkan). Baris bawah kiri: Tabel bernomor `01..N` seluruh acara dengan tombol `"Suspend Acara"` (`ST-004`) / `"Pulihkan"` (`ST-005`). Kanan: Dark Audit Card (`#232329`). |

---

## 6. Prompt Siap-Tempel untuk Google Stitch (`stitch.withgoogle.com`)

Tempelkan **Master Design System Prompt** di bawah ini bersama prompt masing-masing layar ke Google Stitch agar seluruh 13 layar memiliki desain dan aset yang 100% seragam dengan gambar referensi **Learnify**:

### 6.0 Master Design System Prompt (Aturan Global Semua Layar)
```text
DESIGN SYSTEM RULES ("MOZAPASS TACTILE BENTO UI" - Strictly matching the Learnify Reference Image):
- App Shell: Outer dark charcoal frame (#1E1E24) wrapping a large rounded-3xl (#FFFFFF) main workspace container. Left vertical icon-rail sidebar (#1E1E24) with minimalist line icons and an active rounded-xl highlight box in Warm Yellow (#FFD84D) with a dark icon (#181824).
- Top Bar inside Workspace: Left greeting "Welcome to Mozapass" (with "Mozapass" in warm coral #F05A36), center rounded-full search input with a coral search button on its right edge, and right notification bell + user avatar & handle.
- Card Style: Tactile Bento Cards with 20px border-radius and a crisp 1.5px solid dark charcoal border (#181824).
- Pastel Card Palette:
  1) Warm Amber/Yellow Card (#FFE37E)
  2) Soft Lavender Purple Card (#DEC9FF)
  3) Soft Sky Blue Card (#C6EAFF)
  4) Crisp White List/Table Card (#FFFFFF with 1.5px border #E4E4EC)
  5) Dark Charcoal Spotlight Card (#232329 with white text)
- Card Anatomy: Top-left rounded-full category pill (solid dark #181824 with white text or yellow/lavender pill with 1px dark border), top-right bookmark/status icon, bold Plus Jakarta Sans title (#181824), horizontal quota progress bar ("Progress / Kuota: 120/150 tiket"), overlapping circular attendee avatars with a "+120" counter badge at bottom-left, and a rounded-xl Coral Orange (#F05A36) or Electric Lime (#D2F865) CTA button at bottom-right.
- Typography: Plus Jakarta Sans (Bold/ExtraBold for headings), JetBrains Mono (tabular-nums for all Rupiah prices, quota counters, and countdown timers). No generic purple/indigo neon gradients.
```

### 6.1 Prompt Stitch — Layar `S-003`: Katalog & Jelajah Acara Publik (Halaman Utama)
```text
Create a desktop web application screen for "Mozapass" Event Discovery Catalog (Screen S-003), matching the exact layout and tactile aesthetic of the Learnify reference image:
- Outer dark charcoal frame (#1E1E24) with a left vertical icon-rail navigation bar (Grid, Ticket active in #FFD84D yellow box, Orders, Scanner, Settings, Logout) and a large rounded-3xl white main canvas (#FFFFFF).
- Top Bar: Left greeting "Welcome to Mozapass", center rounded-full search input ("Cari konser, konferensi, kota...") with a coral orange search icon button (#F05A36), and right user profile ("Budi Pembeli • @budi_buyer") with notification bell.
- Section 1 Header: "Jelajah Acara" on the left, and horizontal category filter pills on the right ("Semua Acara" active in solid black #181824 with white text, followed by outlined pills "Konser Musik", "Teknologi & AI", "Workshop").
- Top Bento Row (3 Colored Event Cards side-by-side with 1.5px solid #181824 borders):
  1) Card 1 in Warm Yellow (#FFE37E): Black pill "Konser Musik", bookmark icon, title "Nusantara Indie Soundscape 2026", quota progress bar "Terjual 85/100 tiket", avatar stack "+85", and coral CTA button "Pesan Tiket".
  2) Card 2 in Soft Lavender (#DEC9FF): Yellow pill "Teknologi & AI", bookmark icon, title "Mozapass Tech & Distributed System Fest", quota progress bar "Terjual 140/150 tiket", avatar stack "+140", and coral CTA button "Pesan Tiket".
  3) Card 3 in Soft Sky Blue (#C6EAFF): Lavender pill "Workshop", bookmark icon, title "Design System & Bento UI Masterclass", quota progress bar "Terjual 18/25 tiket", avatar stack "+18", and coral CTA button "Pesan Tiket".
- Bottom Split Row (2 Columns: Wide Left Table Card + Right Dark Spotlight Card):
  - Left Wide White Card ("Jadwal Acara Mendatang" + coral link "Lihat semua acara"): Clean numbered rows ("01. Nusantara Indie Soundscape — Senayan Jakarta", "02. Konferensi Arsitektur Sistem — Bandung", "03. Startup Pitching Night — Kuningan", "04. Indie Film Screening — Kemang") with organizer circular avatar & name in the middle column, and price/date ("Rp 150.000") on the right.
  - Right Dark Charcoal Spotlight Card (#232329): Subtitle "Acara paling diminati minggu ini", yellow badge "VIP Presale Dibuka", bold white title "Mozapass Tech & Music Fest 2026: Main Stage Pass", avatar stack "Sudah dipesan +320 orang", and a full-width bottom coral CTA button "Lihat Detail".
```

### 6.2 Prompt Stitch — Layar `S-001` & `S-002`: Login & Registrasi Role Selection
```text
Create a split-view web authentication screen for "Mozapass" covering Login (S-001) and Register Role Selection (S-002) in the Learnify Tactile Bento style:
- Outer dark charcoal frame (#1E1E24) wrapping a rounded-3xl white workspace (#FFFFFF).
- Left Side (5 columns): Dark Charcoal Spotlight Card (#232329) with warm yellow pill badge "Anti-Oversell Ticketing", bold white headline "Satu Platform untuk Tiket Acara & Check-in QR Kriptografis", overlapping attendee avatars "+1.2k Pengguna", and a "Demo Quick Login" box containing 4 clickable role pills (BUYER, ORGANIZER, STAFF, ADMIN).
- Right Side (7 columns): Clean white Bento Form Card with 1.5px solid #181824 border. Shows "Masuk / Daftar Mozapass", email & password inputs with 12px radius, and 2 tactile Role Selection cards (Warm Yellow #FFE37E for "Pembeli Tiket / Buyer" and Soft Lavender #DEC9FF for "Penyelenggara / Organizer" with 1.5px #181824 borders), finished with a full-width coral orange (#F05A36) CTA button "Masuk ke Workspace".
```

### 6.3 Prompt Stitch — Layar `S-004`: Detail Acara & Pemilih Kategori Tiket
```text
Create the "Mozapass" Event Detail & Ticket Category Selection screen (S-004) using the Learnify Tactile Bento design system:
- Outer dark charcoal frame (#1E1E24), left icon rail, and rounded-3xl white canvas (#FFFFFF).
- Top Event Banner Split: A wide Dark Charcoal Card (#232329, 8 cols) showing yellow pill "PUBLISHED • TAYANG", event title "Mozapass Tech & Music Fest 2026", date "10 Des 2026, 18:00 WIB", venue "Jakarta Convention Center", and organizer avatar "Raka Penyelenggara". On the right (4 cols), a Warm Yellow card (#FFE37E, 1.5px dark border) showing live quota progress bar ("Sisa Kuota Total: 149 / 150 Tiket") and attendee avatar stack "+149".
- Middle Section ("Pilih Kategori Tiket"): 3 tactile category cards side-by-side with 1.5px #181824 borders:
  1) Warm Yellow Card (#FFE37E): Black pill "Early Bird", title "Early Bird Festival Pass", progress bar "Terjual 1/100", price "Rp 150.000", quantity stepper "[- 2 +]".
  2) Soft Lavender Card (#DEC9FF): Yellow pill "VIP", title "VIP Front Row & Backstage", progress bar "Terjual 0/50", price "Rp 350.000", quantity stepper "[- 0 +]".
  3) Soft Sky Blue Card (#C6EAFF): Lavender pill "Komunitas", title "Student Workshop Pass", progress bar "Terjual 25/25 (Habis)", price "Gratis (Rp 0)", disabled button "Habis".
- Bottom Sticky Bar: Dark charcoal bar (#232329) with white text "2x Early Bird Pass • Total Pembayaran: Rp 300.000" (tabular-nums) and a coral orange (#F05A36) CTA button "Lanjut ke Checkout →".
```

### 6.4 Prompt Stitch — Layar `S-005`: Checkout Tenang & Hitung Mundur Reservasi 15 Menit
```text
Create the "Mozapass" Calm Ticket Checkout & 15-Minute Quota Hold Countdown screen (S-005) following the Learnify Tactile Bento aesthetic:
- Workspace background: Pure calm white (#FFFFFF) with crisp dark charcoal typography (#181824) for maximum readability and trust.
- Top Countdown Banner: Full-width Warm Yellow Bento Banner (#FFE37E) with 1.5px solid #181824 border, clock icon, text "Kuota tiket Anda sedang dikunci otomatis di database (Hold Timer)", and a large monospace tabular-nums timer pill "14:42" in solid #181824 with white text.
- Main Content Split:
  - Left Wide White Card (7 cols, 1.5px border #E4E4EC): Header "Rincian Pesanan & Penerima E-Ticket" with numbered rows ("01. Acara: Mozapass Tech & Music Fest 2026 — JCC Senayan", "02. Kategori: Early Bird Pass (2 Tiket x Rp 150.000)", "03. Penerima QR: Budi Pembeli • buyer@mozapass.local") and a highlighted total row "Total Pembayaran: Rp 300.000".
  - Right Dark Charcoal Payment Card (5 cols, #232329): Yellow badge "ORD-20261114-8F9A • MENUNGGU PEMBAYARAN", white title "Pilih Metode Penyelesaian", primary coral button (#F05A36) "Bayar Sekarang via Midtrans Snap", secondary yellow button (#FFE37E with dark text) "⚡ Simulasi Bayar Lunas (Mode Demo)", and subtle text button "Batalkan Pesanan & Kembalikan Kuota".
```

### 6.5 Prompt Stitch — Layar `S-006` & `S-007`: Daftar Pesanan Saya & E-Ticket QR Boarding Pass
```text
Create the "Mozapass" Buyer E-Tickets & Orders Workspace combining Screen S-007 (E-Ticket QR Boarding Pass) and Screen S-006 (My Orders History) in the Learnify Tactile Bento style:
- Outer dark charcoal frame (#1E1E24), left icon rail, and rounded-3xl white canvas (#FFFFFF).
- Top Section ("E-Ticket Boarding Pass Aktif - S-007"): 2 horizontal tactile Boarding Pass cards with 1.5px solid #181824 borders and perforated ticket notches:
  - Left Ticket Card: Left half in Warm Yellow (#FFE37E) showing black pill "VALID • SIAP SCAN", event title "Mozapass Tech & Music Fest 2026", date "10 Des 2026", attendee "Budi Pembeli", and button "Kirim Ulang Email"; Right stub in crisp white (#FFFFFF) showing a high-contrast QR Code and monospace manual code "MOZA-DEMO-0001".
  - Right Ticket Card: Left half in Soft Lavender (#DEC9FF) showing pill "USED • SUDAH CHECK-IN", checked-in timestamp "18:15 WIB oleh Dina Panitia".
- Bottom Section ("Riwayat Pesanan Saya - S-006"): Wide white table card with filter pills ("Semua", "Pending", "Lunas", "Kedaluwarsa") and numbered rows ("01. ORD-DEMO-0001 • Mozapass Tech Fest • 1 Tiket • Rp 150.000 • Badge LUNAS", "02. ORD-2026-8821 • Indie Soundscape • 2 Tiket • Rp 300.000 • Badge PENDING (Sisa 11:20) • Button: Bayar").
```

### 6.6 Prompt Stitch — Layar `S-008`: Kamera Scanner QR Pintu Masuk & Fallback Kode Manual (`STAFF`)
```text
Create a mobile & tablet venue entrance QR Scanner screen (S-008) for "Mozapass" Event Staff in the Learnify Tactile Bento style:
- Dark charcoal shell (#1E1E24) with high-contrast tactile cards.
- Top Row: 3 compact status cards with 1.5px #181824 borders: Warm Yellow (#FFE37E) showing "Acara Tugas: Mozapass Tech Fest 2026", Soft Sky Blue (#C6EAFF) showing live progress bar "Kehadiran Check-in: 142 / 150 Peserta", and Soft Lavender (#DEC9FF) showing "Petugas Aktif: Dina Panitia (Pintu A)".
- Middle Split:
  - Left (7 cols): Dark Camera Viewfinder Card (#232329) with mode toggle pills ("📷 Scan Kamera QR" active in #FFE37E, "⌨️ Input Kode Manual"), live camera preview with yellow targeting brackets, and manual code input box "MOZA-DEMO-0001" + coral button "Verifikasi".
  - Right (5 cols): High-Contrast Scan Result Cards showing two states:
    1) Green Success Card (#E6F9D5 with #16A34A header): "✓ TIKET VALID — SILAKAN MASUK • Budi Pembeli • Early Bird".
    2) Red Rejected Card (#FDE2E4 with #DC2626 header): "✕ DITOLAK (409 TICKET_ALREADY_USED) • Sudah dipakai pukul 18:02 WIB oleh Dina Panitia".
```

### 6.7 Prompt Stitch — Layar `S-009`: Dashboard Bento Penyelenggara (`ORGANIZER`)
```text
Create the "Mozapass" Organizer Bento Analytics Dashboard (Screen S-009), matching the exact layout and color blocks of the Learnify reference image:
- Outer dark charcoal frame (#1E1E24) with left icon-rail sidebar and rounded-3xl white main canvas (#FFFFFF).
- Top Bar: "Welcome to Mozapass" on the left, rounded-full search bar in the center, and organizer profile ("Raka Penyelenggara • @raka_org") on the right.
- Section Header: "Dashboard Penyelenggara" on the left, and filter pills on the right ("Semua Acara" active in solid #181824, "Tayang", "Draf", "Selesai").
- Top Bento Row (3 Colored Metric Cards with 1.5px solid #181824 borders):
  1) Warm Yellow Card (#FFE37E): Black pill "Pendapatan Lunas", title "Rp 48.500.000", progress bar "Target 85% tercapai", buyer avatar stack "+320", and coral button "Laporan".
  2) Soft Lavender Card (#DEC9FF): Yellow pill "Kuota Anti-Oversell", title "340 / 400 Tiket Terjual", progress bar "85% Terjual • 0 Oversell", avatar stack "+340", and coral button "Kelola".
  3) Soft Sky Blue Card (#C6EAFF): Lavender pill "Kehadiran Venue", title "285 / 340 Peserta Hadir", progress bar "83% Sudah Check-in QR", staff avatar stack "+8", and coral button "Scanner".
- Bottom Split Row:
  - Left Wide White Card (8 cols, "Daftar Acara & Tren Penjualan" + link "Lihat semua"): Clean numbered rows ("01. Mozapass Tech & Music Fest 2026 • 140/150 Tiket • Rp 21.000.000", "02. Design System Workshop Jakarta • Draf • Rp 0", "03. Indie Soundscape Senayan • 200/250 Tiket • Rp 27.500.000") with organizer/staff avatars and action buttons ("Peserta & CSV", "Panitia", "Edit").
  - Right Dark Charcoal Spotlight Card (4 cols, #232329): Subtitle "Manajemen Acara & Kuota", yellow pill "Siap Publikasi", bold white title "Buat Acara Baru & Atur Kategori Tiket Anti-Oversell", avatar stack "+4 Kategori", and full-width bottom coral CTA button "+ Buat Acara Baru".
```

### 6.8 Prompt Stitch — Layar `S-010`, `S-011`, & `S-012`: CRUD Acara, Tabel Peserta CSV, & Penugasan Panitia
```text
Create the "Mozapass" Organizer Event Management, Attendee CSV Table, and Staff Assignment Workspace (Screens S-010, S-011, S-012) in the Learnify Tactile Bento style:
- Outer dark charcoal frame (#1E1E24), left icon rail, and rounded-3xl white canvas (#FFFFFF).
- Top Row (S-010 Ticket Categories with BR-010 Lock Rule): 3 tactile cards with 1.5px #181824 borders:
  1) Warm Yellow Card (#FFE37E): Black pill "🔒 Harga Terkunci (BR-010)", title "Early Bird • Rp 150.000", progress bar "Terjual 85/100 tiket", button "Ubah Kuota".
  2) Soft Lavender Card (#DEC9FF): Yellow pill "Aktif", title "VIP Pass • Rp 350.000", progress bar "Terjual 0/50 tiket", button "Edit Kategori".
  3) Soft Sky Blue Card (#C6EAFF): Dashed/tactile card "+ Tambah Kategori Tiket Baru (Harga, Kuota, Batas per Order)".
- Bottom Split Row:
  - Left Wide White Card (8 cols - S-011 Attendee List & CSV Export): Header "Daftar Peserta & Status Check-in" with a coral button "⬇ Ekspor CSV Peserta". Numbered rows ("01. MOZA-DEMO-0001 • Budi Pembeli (buyer@mozapass.local) • Early Bird • Badge VALID", "02. MOZA-8F92-K10A • Siti Aminah • VIP Pass • Badge USED (18:10 WIB oleh Dina)") with search input and filter pills ("Semua", "VALID", "USED").
  - Right Dark Charcoal Card (4 cols, #232329 - S-012 Scanner Staff Assignment): Yellow pill "Panitia Pintu Masuk (BR-009)", bold white title "Tugaskan Petugas Scanner QR", email input "staff@mozapass.local" + coral button "Tugaskan Panitia", and assigned staff list showing avatar "Dina Panitia (staff@mozapass.local)" with a "Cabut" link.
```

### 6.9 Prompt Stitch — Layar `S-013`: Panel Moderasi Admin (`ADMIN`)
```text
Create the "Mozapass" Admin Platform Moderation Workspace (Screen S-013) in the Learnify Tactile Bento style:
- Outer dark charcoal frame (#1E1E24), left icon rail, and rounded-3xl white canvas (#FFFFFF).
- Top Row: 3 tactile summary cards with 1.5px #181824 borders: Warm Yellow (#FFE37E "Acara Tayang (PUBLISHED): 14 Acara"), Soft Sky Blue (#C6EAFF "Total Penyelenggara Aktif: 6 Organizer"), and Soft Lavender (#DEC9FF "Acara Ditangguhkan (SUSPENDED): 1 Acara").
- Bottom Split Row:
  - Left Wide White Card (8 cols, "Moderasi Katalog Acara Publik"): Filter pills ("Semua", "PUBLISHED", "SUSPENDED", "DRAFT") and numbered rows ("01. Mozapass Tech & Music Fest 2026 • Organizer: Raka • Badge TAYANG • Button: Suspend Acara (ST-004)", "02. Konser Duplikat Tanpa Izin • Organizer: Demo • Badge DITANGGUHKAN • Button: Pulihkan ke Published (ST-005)").
  - Right Dark Charcoal Card (4 cols, #232329): Yellow badge "Audit Moderasi Admin", white title "Catatan Penangguhan / Pemulihan", input field for moderationNote, and coral CTA button "Terapkan Status Moderasi".
```

---

## ✅ Quality Gate Report
- **✅ Lulus — Penggantian Penuh ke Referensi Learnify:** Seluruh spesifikasi lama telah dihapus dan digantikan dengan sistem desain **Learnify Tactile Bento UI** (Outer Dark Shell `#1E1E24`, Left Icon Rail, 3 Kartu Pastel `#FFE37E` / `#DEC9FF` / `#C6EAFF` ber-border `1.5px #181824` + Progress Bar + Avatar Stack, Tabel Putih Bernomor `01..N`, dan Dark Spotlight Card `#232329`).
- **✅ Lulus — Cakupan 13 Layar (`S-001` s/d `S-013`):** Seluruh 13 layar memiliki spesifikasi komponen dan prompt Google Stitch yang konsisten 100%.
