import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Setup ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// ─── PDDikti Proxy (tidak berubah) ─────────────────────────────────────────────

app.get('/api/pddikti/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Parameter "q" (Nama/NIM) diperlukan' });

  const queryLower = query.toLowerCase().trim();
  const isNimMode = /^\d+$/.test(queryLower);
  const roneQuery = isNimMode ? queryLower : `${queryLower} muhammadiyah malang`;

  console.log(`[RONE API Proxy] Memproses Pencarian Asli: "${query}" => Dikirim ke Rone API: "${roneQuery}"`);
  
  try {
    const response = await fetch(`https://api-pddikti.rone.dev/search/mhs/${encodeURIComponent(roneQuery)}`);
    if (!response.ok) throw new Error(`Rone Dev Error: ${response.status}`);
    
    let data;
    try { data = await response.json(); } catch (e) { data = []; }
    if (!Array.isArray(data)) data = [];
    
    const mappedResults = data.map(mhs => ({
      id: mhs.id,
      link_detail: mhs.id,
      nama: mhs.nama,
      nim: mhs.nim,
      pt: mhs.nama_pt,
      prodi: mhs.nama_prodi,
      jenjang: "S1",
      statusAkhir: "Perlu Cek Detail",
      tahunMasuk: "-"
    }));

    const ummFiltered = mappedResults.filter(r => r.pt && r.pt.toLowerCase().includes('muhammadiyah malang'));
    const finalResults = ummFiltered.filter(r => {
      const matchNama = r.nama.toLowerCase().includes(queryLower);
      const matchNim = r.nim.toLowerCase().includes(queryLower);
      return matchNama || matchNim;
    });
    
    const candidatesForDetail = finalResults.slice(0, 15);
    const graduatedResults = [];
    
    console.log(`[RONE API Proxy] Mengecek status kelulusan untuk ${candidatesForDetail.length} kandidat...`);
    
    await Promise.all(candidatesForDetail.map(async (mhs) => {
      try {
        const dRes = await fetch(`https://api-pddikti.rone.dev/mhs/detail/${encodeURIComponent(mhs.id)}`);
        if (dRes.ok) {
           const dJson = await dRes.json();
           const lowerStatus = dJson.status_saat_ini ? dJson.status_saat_ini.toLowerCase() : "";
           if (lowerStatus.includes('lulus')) {
             graduatedResults.push({
               ...mhs,
               statusAkhir: "Lulus",
               jenjang: dJson.jenjang || mhs.jenjang,
               tahunMasuk: dJson.tanggal_masuk ? dJson.tanggal_masuk.split('-')[0] : "-"
             });
           }
        }
      } catch (err) { /* abaikan error individu */ }
    }));
    
    console.log(`[RONE API Proxy] Berhasil menyaring ${graduatedResults.length} Alumni (Lulus).`);
    res.json(graduatedResults);

  } catch (err) {
    console.error('[Error Rone API Search]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pddikti/detail', async (req, res) => {
  const id = req.query.link;
  if (!id) return res.status(400).json({ error: 'Parameter link (ID Mahasiswa base64) dibutuhkan' });

  console.log(`[RONE API Proxy] Ekstrak Detail Profil ID: ${id}`);

  try {
    const response = await fetch(`https://api-pddikti.rone.dev/mhs/detail/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(`API Rone Detail Error`);
    
    const data = await response.json();

    let statusFinal = "Aktif";
    if (data.status_saat_ini) {
      const lowerStatus = data.status_saat_ini.toLowerCase();
      if (lowerStatus.includes('lulus')) statusFinal = "Lulus";
      else if (lowerStatus.includes('diri') || lowerStatus.includes('keluar')) statusFinal = "Mengundurkan Diri";
      else if (lowerStatus.includes('transfer') || lowerStatus.includes('pindah')) statusFinal = "Pindahan/Transfer";
      else if (lowerStatus.includes('aktif')) statusFinal = "Aktif";
      else statusFinal = data.status_saat_ini;
    }

    res.json({
      nama: data.nama || '',
      nim: data.nim || '',
      pt: data.nama_pt || '',
      prodi: data.prodi || '',
      jenjang: data.jenjang || '',
      statusAkhir: statusFinal,
    });

  } catch (err) {
    console.error('[Error Rone Detail]', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── Alumni Master Endpoints (Supabase) ────────────────────────────────────────

app.get('/api/master', async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const prodi  = (req.query.prodi || '').trim();
    const offset = parseInt(req.query.offset) || 0;

    // Query alumni_master dengan filter dan pagination
    let query = supabase
      .from('alumni_master')
      .select('nim, nama, program_studi, fakultas, tahun_masuk, tanggal_lulus', { count: 'exact' });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,nim.ilike.%${search}%`);
    }
    if (prodi) {
      query = query.ilike('program_studi', `%${prodi}%`);
    }

    const { data: alumniData, count, error } = await query.range(offset, offset + 99);
    if (error) throw error;

    // Ambil evidences untuk NIMs yang ditemukan (JOIN dalam JS)
    let evidencesMap = {};
    if (alumniData && alumniData.length > 0) {
      const nims = alumniData.map(a => a.nim.trim());
      const { data: evData } = await supabase
        .from('tracking_evidences')
        .select('nim, match_status, confidence_score, pddikti_status')
        .in('nim', nims);

      if (evData) {
        evData.forEach(e => { evidencesMap[e.nim.trim()] = e; });
      }
    }

    // Merge & mapping ke format frontend (camelCase)
    const results = (alumniData || []).map(m => {
      const ev = evidencesMap[m.nim.trim()] || {};
      return {
        nim: m.nim,
        nama: m.nama,
        prodi: m.program_studi,
        fakultas: m.fakultas,
        tahun_masuk: m.tahun_masuk,
        tanggal_lulus: m.tanggal_lulus,
        matchStatus: ev.match_status || null,
        confidenceScore: ev.confidence_score || null,
        pddiktiStatus: ev.pddikti_status || null,
      };
    });

    res.json({ data: results, total: count || 0 });
  } catch (err) {
    console.error('[master]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/:nim', async (req, res) => {
  try {
    const nim = req.params.nim.trim();
    const { data, error } = await supabase
      .from('alumni_master')
      .select('*')
      .eq('nim', nim)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Data not found in Master Alumni' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/master/:nim', async (req, res) => {
  try {
    const nim = req.params.nim.trim();
    const { error } = await supabase.from('alumni_master').delete().eq('nim', nim);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tracking Evidence Endpoints (Supabase) ────────────────────────────────────

app.get('/api/evidence', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracking_evidences')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Map snake_case → camelCase untuk kompatibilitas frontend
    const mapped = (data || []).map(r => ({
      ...r,
      pddiktiStatus: r.pddikti_status,
      confidenceScore: r.confidence_score,
      matchStatus: r.match_status,
      verifiedBy: r.verified_by,
      rawData: r.raw_data ? (() => { try { return JSON.parse(r.raw_data); } catch { return null; } })() : null,
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evidence/:nim', async (req, res) => {
  try {
    const nim = req.params.nim.trim();
    const { data, error } = await supabase
      .from('tracking_evidences')
      .select('*')
      .eq('nim', nim)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Evidensi not found' });

    res.json({
      ...data,
      pddiktiStatus: data.pddikti_status,
      confidenceScore: data.confidence_score,
      matchStatus: data.match_status,
      verifiedBy: data.verified_by,
      rawData: data.raw_data ? (() => { try { return JSON.parse(data.raw_data); } catch { return null; } })() : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evidence', async (req, res) => {
  try {
    const { pddiktiData, localData, verificationResult } = req.body;
    const id = `ev-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const cleanNim = (pddiktiData.nim || '').trim();

    // Hapus data lama berdasar NIM agar tidak duplikat
    if (cleanNim) {
      await supabase.from('tracking_evidences').delete().eq('nim', cleanNim);
    }

    const { error } = await supabase.from('tracking_evidences').insert({
      id,
      timestamp,
      nim: cleanNim,
      nama: (pddiktiData.nama || '').trim(),
      pddikti_status: pddiktiData.statusAkhir || '',
      confidence_score: verificationResult.confidenceScore || 0,
      match_status: verificationResult.status || '',
      verified_by: verificationResult.verifiedBy || 'SYSTEM_AUTO',
      notes: verificationResult.notes || '',
      raw_data: JSON.stringify({ pddikti: pddiktiData, local: localData }),
    });

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    console.error('[post evidence]', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/evidence/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('tracking_evidences').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Server Start ──────────────────────────────────────────────────────────────

const PORT = 3001;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
=============================================
🌍 Backend Proxy Terhubung! 
=> Database: Supabase PostgreSQL
=> PDDikti: pddikti.rone.dev
Port: ${PORT}
=============================================
    `);
  });
}

export default app;
