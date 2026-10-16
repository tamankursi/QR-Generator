-- =========================================================================
-- MIGRATION: 002_add_business_name.sql
-- Menambahkan kolom business_name ke tabel qr_codes
-- =========================================================================

ALTER TABLE public.qr_codes 
ADD COLUMN IF NOT EXISTS business_name TEXT NULL;

-- Catatan:
-- Kolom business_name opsional (bisa NULL), diisi saat aktivasi pertama (maksimal 100 karakter).
-- Nilai ini bersifat permanen dan tidak dapat diedit melalui API edit link.
