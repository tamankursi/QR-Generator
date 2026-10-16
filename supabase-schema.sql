-- =========================================================================
-- SUPABASE SCHEMA & MIGRATION: QR Code Generator dengan Aktivasi PIN
-- =========================================================================
-- Eksekusi skrip ini di SQL Editor Supabase project Anda.

-- >>> JIKA DATABASE SUDAH ADA SEBELUMNYA, JALANKAN MIGRATION INI: <<<
-- ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS business_name text NULL;

-- 1. Buat ekstensi pgcrypto untuk gen_random_uuid jika belum aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel qr_codes (Fresh Install)
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'kosong' CHECK (status IN ('kosong', 'aktif')),
    business_name TEXT NULL,
    target_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    activated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indeks untuk query performa
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON public.qr_codes(created_at DESC);

-- 4. Trigger otomatis untuk update kolom updated_at saat baris diubah
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER set_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Aktifkan Row Level Security (RLS)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- 6. Hapus policy lama jika ada untuk idempotensi
DROP POLICY IF EXISTS "Public can view qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Public can insert new qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Disable direct client updates" ON public.qr_codes;

-- 7. Policy SELECT: Publik boleh membaca status dan link untuk scan QR
CREATE POLICY "Public can view qr codes"
    ON public.qr_codes
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 8. Aturan Keamanan Mutasi (INSERT, UPDATE, DELETE):
-- Mulai versi update PIN untuk generate & hapus:
-- Semua operasi INSERT, UPDATE, dan DELETE HANYA diizinkan melalui server-side API
-- menggunakan SUPABASE_SERVICE_ROLE_KEY yang melewati RLS (bypasses RLS).
-- Klien anonim/frontend TIDAK memiliki akses mutasi langsung ke database.
