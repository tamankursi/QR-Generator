# QR Code Generator dengan Aktivasi PIN

Aplikasi web fullstack untuk pembuatan batch QR code "kosong" (siap cetak/tempel), yang kemudian dapat diaktivasi kapan saja secara aman menggunakan **PIN rahasia** untuk mengarahkan pengguna ke link tujuan (URL).

---

## 🚀 Fitur Utama

1. **Batch QR Generator Wajib PIN (1-20 QR)**:
   - Generate hingga 20 QR code baru dengan otentikasi **PIN 6-digit**.
   - Input PIN divalidasi ketat di server-side (`POST /api/generate`).
   - Status awal setiap QR adalah `kosong`.
   - Menggunakan format URL scan unik: `${BASE_URL}/q/{id}`.
2. **Sistem Tab: Kosong vs Aktif**:
   - Tab 1: **"Kosong"** (default) — menampilkan semua QR yang belum diaktivasi dengan counter jumlah.
   - Tab 2: **"Aktif"** — menampilkan QR yang sudah aktif terhubung ke URL tujuan.
   - Otomatis berpindah ke tab "Kosong" setelah generate QR baru selesai.
   - Dilengkapi empty state informatif jika tab belum memiliki data.
3. **Fitur Hapus QR Permanen dengan PIN**:
   - Tombol "Hapus" (ikon tempat sampah merah) pada setiap kartu QR di kedua tab.
   - Modal konfirmasi dengan validasi PIN server-side (`POST /api/delete`).
   - Hard delete permanen dari database Supabase (QR yang dihapus akan menampilkan halaman 404 saat di-scan).
4. **Nama Bisnis pada Kartu QR & Aktivasi (Baru)**:
   - Kolom `business_name` (opsional, maks. 100 karakter) diisi saat aktivasi pertama dan bersifat permanen.
   - Ditampilkan dengan jelas di setiap kartu QR di atas label link tujuan (`NAMA BISNIS:`).
   - Jika belum diisi, menampilkan tanda strip `-` berwarna abu-abu.
5. **Preview & Download Berkualitas**:
   - Tampilan preview hitam-putih kontras tinggi (256x256).
   - Tombol **Download PNG** individual per QR code.
   - Tombol **Download Semua (ZIP)** untuk mengunduh seluruh QR code sekaligus (gambar resolusi tinggi 512x512 + manifest teks).
6. **Aktivasi Aman dengan PIN (`/q/[id]`)**:
   - Saat QR kosong di-scan: form aktivasi berurutan rapi:
     1. **Nama Bisnis** (opsional, max 100 karakter)
     2. **Link Tujuan** (wajib, harus berawalan http:// atau https://)
     3. **PIN Keamanan** (wajib, 6-digit)
   - **PIN diverifikasi 100% di server-side** (tidak pernah diekspos di JavaScript client).
   - Setelah sukses diaktivasi, QR berubah status menjadi `aktif` dan langsung me-redirect pengunjung ke link tujuan.
7. **Direct Server-Side Redirect (HTTP 302)**:
   - Saat QR yang sudah berstatus `aktif` di-scan, server langsung melakukan redirect HTTP 302 ke `target_url` tanpa menampilkan form aktivasi lagi.
8. **Edit Link Tujuan**:
   - Pemilik dapat mengedit URL tujuan pada QR yang sudah aktif kapan pun melalui modal "Edit Link" dengan memasukkan PIN.
9. **Proteksi Keamanan Berlapis**:
   - Rate limiting pada endpoint `/api/activate` (maksimal 10 request/menit per IP) untuk mencegah brute-force PIN.
   - Sanitasi dan validasi protokol URL ketat (hanya `http://` dan `https://`; menolak keras `javascript:`, `data:`, `file:`, dll).
   - Row Level Security (RLS) di database Supabase: SELECT publik diizinkan, sedangkan seluruh mutasi (INSERT, UPDATE, DELETE) dikunci rapat hanya via `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🛠️ Tech Stack

- **Framework**: Express.js + Vite React 19 / Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) + In-memory fallback untuk preview instan
- **QR Engine**: `qrcode` (npm)
- **ZIP Packaging**: `jszip` + `file-saver`
- **Keamanan**: Server-side PIN verification & Memory Rate Limiter

---

## 📋 Langkah Setup Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project baru.
2. Masuk ke menu **SQL Editor** di sidebar kiri.
3. Buka file `supabase-schema.sql` di repositori ini, salin seluruh kodenya, lalu tempelkan ke SQL Editor Supabase.
4. Klik **Run** untuk membuat tabel `qr_codes`, fungsi trigger `updated_at`, indeks, dan aturan Row Level Security (RLS).
5. Masuk ke **Project Settings -> API** untuk mengambil kredensial berikut:
   - `Project URL` -> masukkan ke `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key -> masukkan ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key -> masukkan ke `SUPABASE_SERVICE_ROLE_KEY` *(Wajib dijaga kerahasiaannya, jangan pernah bagikan ke publik)*

> 💡 **Untuk Update Project yang Sudah Ada**: Jika Anda sebelumnya sudah membuat tabel `qr_codes`, jalankan skrip migrasi berikut di SQL Editor Supabase secara berurutan:
> 1. `supabase/migrations/001_update_rls.sql` (update RLS policy service role)
> 2. `supabase/migrations/002_add_business_name.sql` (tambah kolom business_name)

---

## ⚙️ Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Isi variabel environment:

```env
# URL & Kunci Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# PIN Rahasia Aktivasi (default: 140405)
ACTIVATION_PIN=140405

# Base URL aplikasi Anda
NEXT_PUBLIC_BASE_URL=https://my-qr-app.vercel.app
APP_URL=https://my-qr-app.vercel.app

# Port server lokal
PORT=3000
```

> ⚠️ **Catatan Keamanan**: Pastikan `SUPABASE_SERVICE_ROLE_KEY` dan `ACTIVATION_PIN` tidak pernah di-commit ke repositori publik atau ditaruh di kode client component.

---

## 💻 Menjalankan Aplikasi Secara Lokal

1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
3. Buka browser di [http://localhost:3000](http://localhost:3000).

Untuk menjalankan unit test logika validasi & keamanan:
```bash
npm run test
```

---

## 🌐 Deploy ke Vercel

1. Push repositori ini ke GitHub pribadi Anda.
2. Buka [Vercel](https://vercel.com/) dan klik **Add New... -> Project**.
3. Import repositori GitHub Anda.
4. Pada bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ACTIVATION_PIN` (misal: `140405`)
   - `NEXT_PUBLIC_BASE_URL` (URL domain Vercel Anda, contoh `https://qr-app.vercel.app`)
5. Klik **Deploy**.

---

## 📖 Cara Penggunaan

1. **Membuat QR Code Fisik**:
   - Tentukan jumlah QR (misal 10) dengan slider/angka di form utama.
   - Klik **Generate QR**.
   - Klik **Download Semua (ZIP)** untuk menyimpan seluruh file gambar QR dalam satu arsip ZIP.
   - Cetak QR code dan tempel pada kartu, meja, atau kemasan produk Anda.
2. **Mengaktifkan QR Code**:
   - Scan QR code fisik dengan kamera HP Anda, atau klik link `/q/{id}` di aplikasi.
   - Karena statusnya masih `kosong`, halaman aktivasi akan terbuka.
   - Masukkan link tujuan (misal: `https://instagram.com/tokoanda`).
   - Masukkan PIN rahasia Anda (`140405`).
   - Klik **Aktivasi QR Code**. Status berubah menjadi `aktif`.
3. **Scan Setelah Aktif**:
   - Setiap orang yang memindai QR code tersebut akan langsung diarahkan (HTTP 302 redirect) ke link tujuan tanpa perlu memasukkan PIN.
4. **Mengubah Link Tujuan**:
   - Jika ingin mengganti promo/tautan, buka halaman utama, cari kartu QR yang aktif, klik **Edit Link**.
   - Masukkan link baru dan PIN rahasia Anda, lalu klik **Simpan Perubahan**.
