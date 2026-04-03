-- Jalankan ini jika tabel tracking_evidences belum lengkap
-- (Run di Supabase Dashboard → SQL Editor)

DROP TABLE IF EXISTS tracking_evidences;

CREATE TABLE tracking_evidences (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  nim TEXT,
  nama TEXT,
  pddikti_status TEXT,
  confidence_score REAL,
  match_status TEXT,
  verified_by TEXT,
  notes TEXT,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_evidence_nim ON tracking_evidences(nim);
ALTER TABLE tracking_evidences DISABLE ROW LEVEL SECURITY;
