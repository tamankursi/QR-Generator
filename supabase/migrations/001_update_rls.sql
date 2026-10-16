-- =========================================================================
-- MIGRATION: 001_update_rls.sql
-- Memperbarui RLS Policy: Hapus INSERT anonim, semua mutasi lewat Service Role
-- =========================================================================

-- 1. Hapus policy INSERT untuk publik/anon
DROP POLICY IF EXISTS "Public can insert new qr codes" ON public.qr_codes;

-- 2. Pastikan RLS tetap aktif
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT: Publik tetap boleh membaca status dan link untuk scan QR
DROP POLICY IF EXISTS "Public can view qr codes" ON public.qr_codes;
CREATE POLICY "Public can view qr codes"
    ON public.qr_codes
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- CATATAN KEAMANAN:
-- Karena tidak ada policy INSERT, UPDATE, dan DELETE untuk anon/authenticated,
-- maka SEMUA operasi penambahan (generate), pembaruan (aktivasi & edit), 
-- serta penghapusan (delete) HANYA BISA DILAKUKAN oleh server-side API
-- menggunakan SUPABASE_SERVICE_ROLE_KEY (yang secara otomatis membypass RLS).
