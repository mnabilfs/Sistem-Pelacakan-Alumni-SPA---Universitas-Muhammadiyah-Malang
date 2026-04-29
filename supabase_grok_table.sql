-- ============================================
-- Tabel grok_results — Jalankan di Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS grok_results (
  id            TEXT PRIMARY KEY,
  nama          TEXT NOT NULL,
  nim           TEXT,
  tahun_masuk   TEXT,
  tanggal_lulus TEXT,
  fakultas      TEXT,
  program_studi TEXT,
  sosmed        TEXT,
  email         TEXT,
  no_hp         TEXT,
  tempat_bekerja    TEXT,
  alamat_bekerja    TEXT,
  posisi            TEXT,
  kategori          TEXT,   -- PNS / Swasta / Wirausaha
  sosmed_tempat_bekerja TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_grok_results_nim ON grok_results (nim);
CREATE INDEX IF NOT EXISTS idx_grok_results_nama ON grok_results (nama);
CREATE INDEX IF NOT EXISTS idx_grok_results_kategori ON grok_results (kategori);
CREATE INDEX IF NOT EXISTS idx_grok_results_fakultas ON grok_results (fakultas);
