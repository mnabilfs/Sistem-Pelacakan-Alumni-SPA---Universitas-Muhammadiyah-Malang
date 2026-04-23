-- ============================================
-- LinkedIn Tracking Columns — Jalankan di Supabase SQL Editor
-- ============================================

ALTER TABLE tracking_evidences ADD COLUMN IF NOT EXISTS tempat_bekerja TEXT;
ALTER TABLE tracking_evidences ADD COLUMN IF NOT EXISTS posisi TEXT;
ALTER TABLE tracking_evidences ADD COLUMN IF NOT EXISTS kategori_pekerjaan TEXT;
ALTER TABLE tracking_evidences ADD COLUMN IF NOT EXISTS url_linkedin TEXT;
ALTER TABLE tracking_evidences ADD COLUMN IF NOT EXISTS sumber_data TEXT DEFAULT 'PDDikti';
