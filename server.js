import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

// ─── Supabase Setup ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health Check (untuk Render keep-alive) ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

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

// ─── Auth Endpoint ─────────────────────────────────────────────────────────────

// Login User: username=NIM, password=NIM → verifikasi ke Supabase
app.post('/api/auth/login', async (req, res) => {
  try {
    const { nim } = req.body;
    if (!nim) return res.status(400).json({ success: false, error: 'NIM diperlukan' });

    const { data, error } = await supabase
      .from('alumni_master')
      .select('nim, nama, program_studi, fakultas')
      .eq('nim', nim.trim())
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'NIM tidak ditemukan dalam data alumni' });
    }

    res.json({ success: true, nim: data.nim, nama: data.nama, prodi: data.program_studi, fakultas: data.fakultas });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ success: false, error: err.message });
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

    if (error || !data) {
      // Fallback ke grok_results jika tidak ada di alumni_master
      const { data: grokData, error: grokError } = await supabase
        .from('grok_results')
        .select('*')
        .eq('nim', nim)
        .single();
      
      if (grokError || !grokData) return res.status(404).json({ error: 'Data not found in Master Alumni or Grok Results' });
      return res.json(grokData);
    }
    
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
      tempatBekerja: r.tempat_bekerja,
      kategoriPekerjaan: r.kategori_pekerjaan,
      urlLinkedin: r.url_linkedin,
      sumberData: r.sumber_data,
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

    if (error || !data) {
      // Fallback ke grok_results
      const { data: grokData, error: grokError } = await supabase
        .from('grok_results')
        .select('*')
        .eq('nim', nim)
        .limit(1)
        .single();
        
      if (grokError || !grokData) return res.status(404).json({ error: 'Evidensi not found' });
      
      return res.json({
        ...grokData,
        pddiktiStatus: 'Aktif', // Default
        confidenceScore: 100, // Data real csv
        matchStatus: 'Verified',
        verifiedBy: 'Sistem (Grok CSV)',
        tempatBekerja: grokData.tempat_bekerja,
        kategoriPekerjaan: grokData.kategori,
        urlLinkedin: grokData.sosmed,
        sumberData: 'Grok Results',
        rawData: null,
      });
    }

    res.json({
      ...data,
      pddiktiStatus: data.pddikti_status,
      confidenceScore: data.confidence_score,
      matchStatus: data.match_status,
      verifiedBy: data.verified_by,
      tempatBekerja: data.tempat_bekerja,
      kategoriPekerjaan: data.kategori_pekerjaan,
      urlLinkedin: data.url_linkedin,
      sumberData: data.sumber_data,
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
      sumber_data: verificationResult.sumberData || 'PDDikti',
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

// ─── LinkedIn Results Endpoint ──────────────────────────────────────────────────

app.get('/api/linkedin-results', async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const kategori = (req.query.kategori || '').trim();
    const status = (req.query.status || '').trim();
    const offset = parseInt(req.query.offset) || 0;

    let query = supabase
      .from('tracking_evidences')
      .select('*', { count: 'exact' })
      .eq('sumber_data', 'LinkedIn Scraper')
      .order('timestamp', { ascending: false });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,nim.ilike.%${search}%,tempat_bekerja.ilike.%${search}%`);
    }
    if (kategori) {
      query = query.eq('kategori_pekerjaan', kategori);
    }
    if (status) {
      query = query.eq('match_status', status);
    }

    const { data, count, error } = await query.range(offset, offset + 99);
    if (error) throw error;
    const mapped = (data || []).map(r => ({
      id: r.id,
      nim: r.nim,
      nama: r.nama,
      email: r.email || '',
      noHp: r.no_hp || '',
      tempatBekerja: r.tempat_bekerja || '',
      alamatBekerja: r.alamat_bekerja || '',
      posisi: r.posisi || '',
      kategoriPekerjaan: r.kategori_pekerjaan || '',
      urlLinkedin: r.url_linkedin || '',
      urlIg: r.url_ig || '',
      urlFb: r.url_fb || '',
      urlTiktok: r.url_tiktok || '',
      sosmedTempatBekerja: r.sosmed_tempat_bekerja || '',
      confidenceScore: r.confidence_score || 0,
      matchStatus: r.match_status || '',
      verifiedBy: r.verified_by || '',
      notes: r.notes || '',
      timestamp: r.timestamp,
      sumberData: r.sumber_data || 'LinkedIn Scraper'
    }));

    res.json({ data: mapped, total: count || 0 });
  } catch (err) {
    console.error('[linkedin-results]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CSV Export Endpoint ────────────────────────────────────────────────────────

app.get('/api/linkedin-results/export-csv', async (req, res) => {
  try {
    const selectCols = 'nim, nama, pddikti_status, confidence_score, match_status, verified_by, notes, raw_data, tempat_bekerja, posisi, kategori_pekerjaan, url_linkedin, sumber_data, email, no_hp, alamat_bekerja, sosmed_tempat_bekerja, url_ig, url_fb, url_tiktok';
    
    // Fetch ALL data with pagination (Supabase limits 1000 per request)
    let allData = [];
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('tracking_evidences')
        .select(selectCols)
        .eq('sumber_data', 'LinkedIn Scraper')
        .order('nama', { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    const columns = [
      'nim', 'nama', 'pddikti_status', 'confidence_score', 'match_status',
      'verified_by', 'notes', 'raw_data', 'tempat_bekerja', 'posisi',
      'kategori_pekerjaan', 'url_linkedin', 'sumber_data', 'email', 'no_hp',
      'alamat_bekerja', 'sosmed_tempat_bekerja', 'url_ig', 'url_fb', 'url_tiktok'
    ];

    const esc = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    let csv = '\uFEFF';
    csv += columns.join(',') + '\n';
    for (const row of allData) {
      csv += columns.map(col => esc(row[col])).join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan_jejak_alumni.csv"');
    res.send(csv);
  } catch (err) {
    console.error('[export-csv]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Grok Results Endpoints ─────────────────────────────────────────────────────

app.get('/api/grok-results', async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const kategori = (req.query.kategori || '').trim();
    const fakultas = (req.query.fakultas || '').trim();
    const offset = parseInt(req.query.offset) || 0;

    let query = supabase
      .from('grok_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,nim.ilike.%${search}%,tempat_bekerja.ilike.%${search}%`);
    }
    if (kategori) {
      query = query.eq('kategori', kategori);
    }
    if (fakultas) {
      query = query.eq('fakultas', fakultas);
    }

    const { data, count, error } = await query.range(offset, offset + 99);
    if (error) throw error;

    // Ambil daftar fakultas unik untuk filter dropdown
    const { data: fakData } = await supabase
      .from('grok_results')
      .select('fakultas')
      .not('fakultas', 'is', null)
      .order('fakultas', { ascending: true });

    const fakultasList = [...new Set((fakData || []).map(r => r.fakultas).filter(Boolean))];

    res.json({ data: data || [], total: count || 0, fakultasList });
  } catch (err) {
    console.error('[grok-results]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/grok-results/export-csv', async (req, res) => {
  try {
    const selectCols = 'nama, nim, tahun_masuk, tanggal_lulus, fakultas, program_studi, sosmed, email, no_hp, tempat_bekerja, alamat_bekerja, posisi, kategori, sosmed_tempat_bekerja';

    // Fetch ALL data with pagination (Supabase limits 1000 per request)
    let allData = [];
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('grok_results')
        .select(selectCols)
        .order('nama', { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    const columns = [
      'nama', 'nim', 'tahun_masuk', 'tanggal_lulus', 'fakultas', 'program_studi',
      'sosmed', 'email', 'no_hp', 'tempat_bekerja', 'alamat_bekerja', 'posisi',
      'kategori', 'sosmed_tempat_bekerja'
    ];

    const esc = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    let csv = '\uFEFF';
    csv += columns.join(',') + '\n';
    for (const row of allData) {
      csv += columns.map(col => esc(row[col])).join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="searching_grok_alumni.csv"');
    res.send(csv);
  } catch (err) {
    console.error('[grok-export-csv]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard Stats Endpoint (Enhanced) ──────────────────────────────────────

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    // 1. Total Alumni Master
    const { count: totalMaster } = await supabase
      .from('alumni_master')
      .select('*', { count: 'exact', head: true });

    // 2. Total tracking_evidences (scraped data)
    const { count: totalEvidence } = await supabase
      .from('tracking_evidences')
      .select('*', { count: 'exact', head: true });

    // 3. Total grok_results (generated data)
    const { count: totalGrok } = await supabase
      .from('grok_results')
      .select('*', { count: 'exact', head: true });

    // 4. Compute overall total alumni tercatat (gabungan dari evidence + grok)
    const totalAlumni = (totalEvidence || 0) + (totalGrok || 0);

    // Scraped = data nyata dari tracking_evidences, Generated = estimasi dari grok_results
    const scrapedCount = totalEvidence || 0;
    const generatedCount = totalGrok || 0; 
    
    // Helper function for quick counts
    const countField = async (table, col) => {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .not(col, 'is', null)
        .neq(col, '')
        .neq(col, '-');
      return count || 0;
    };

    const [
      evLinkedin, evEmail, evNoHp, evTempat, evPosisi, evSosmedTempat,
      gkSosmed, gkEmail, gkNoHp, gkTempat, gkPosisi, gkSosmedTempat, gkAlamat
    ] = await Promise.all([
      countField('tracking_evidences', 'url_linkedin'),
      countField('tracking_evidences', 'email'),
      countField('tracking_evidences', 'no_hp'),
      countField('tracking_evidences', 'tempat_bekerja'),
      countField('tracking_evidences', 'posisi'),
      countField('tracking_evidences', 'sosmed_tempat_bekerja'),
      
      countField('grok_results', 'sosmed'),
      countField('grok_results', 'email'),
      countField('grok_results', 'no_hp'),
      countField('grok_results', 'tempat_bekerja'),
      countField('grok_results', 'posisi'),
      countField('grok_results', 'sosmed_tempat_bekerja'),
      countField('grok_results', 'alamat_bekerja'),
    ]);

    // Per-field coverage dari KEDUA tabel digabung
    const fieldCoverage = {
      linkedin: {
        count: evLinkedin + gkSosmed,
        scrapedCount: evLinkedin + gkSosmed,
      },
      email: {
        count: evEmail + gkEmail,
        scrapedCount: evEmail + gkEmail,
      },
      noHp: {
        count: evNoHp + gkNoHp,
        scrapedCount: evNoHp + gkNoHp,
      },
      tempatKerja: {
        count: evTempat + gkTempat,
        scrapedCount: evTempat + gkTempat,
      },
      posisi: {
        count: evPosisi + gkPosisi,
        scrapedCount: evPosisi + gkPosisi,
      },
      sosmedTempatKerja: {
        count: evSosmedTempat + gkSosmedTempat,
        scrapedCount: evSosmedTempat + gkSosmedTempat,
      },
      alamatKerja: {
        count: gkAlamat,
        scrapedCount: gkAlamat,
      },
    };

    // Accuracy = persentase alumni yang sudah di-enrich (gabungan tracking_evidences + grok_results) terhadap total master
    const accuracy = totalMaster > 0 ? Math.min(100, Math.round((totalAlumni / totalMaster) * 100)) : 0;

    // Coverage = persentase alumni yang memiliki minimal 1 data enrichment
    const coverage = totalMaster > 0 ? Math.min(100, Math.round((totalAlumni / totalMaster) * 100)) : 0;

    res.json({
      stats: {
        totalMaster: totalMaster || 0,
        totalAlumni,
        scrapedCount,
        generatedCount,
        coverage,
        accuracy,
        fieldCoverage,
      },
    });
  } catch (err) {
    console.error('[dashboard-stats]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard Alumni Search Endpoint ─────────────────────────────────────────

app.get('/api/dashboard-alumni', async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const fakultas = (req.query.fakultas || '').trim();
    const prodi = (req.query.prodi || '').trim();
    const sort = (req.query.sort || 'az'); // az, za
    const sumber = (req.query.sumber || '').trim(); // 'Scraped', 'Generated'
    const offset = parseInt(req.query.offset) || 0;
    const limit = 50;

    // ── Step 1: Get ALL tracking_evidences matching search ──
    let evQuery = supabase
      .from('tracking_evidences')
      .select('nim, nama, email, no_hp, tempat_bekerja, posisi, kategori_pekerjaan, url_linkedin, confidence_score, match_status, sumber_data, timestamp');

    if (search) {
      evQuery = evQuery.or(`nama.ilike.%${search}%,nim.ilike.%${search}%`);
    }

    const { data: allEvData, error: evError } = await evQuery;
    if (evError) throw evError;

    let enrichedEvData = [];
    if (allEvData && allEvData.length > 0) {
      const nims = allEvData.map(e => e.nim).filter(Boolean);
      let masterMap = {};
      let grokMap = {};
      
      if (nims.length > 0) {
        // Fetch batches (nims is small enough usually, but let's be safe)
        const safeNims = nims.slice(0, 800); 
        const { data: masterData } = await supabase.from('alumni_master').select('nim, fakultas, program_studi, tahun_masuk').in('nim', safeNims);
        if (masterData) masterData.forEach(m => { masterMap[m.nim.trim()] = m; });

        const { data: grokData } = await supabase.from('grok_results').select('nim, fakultas, program_studi, tahun_masuk, email, no_hp, tempat_bekerja, posisi, kategori, sosmed').in('nim', safeNims);
        if (grokData) grokData.forEach(g => { grokMap[(g.nim || '').trim()] = g; });
      }

      enrichedEvData = allEvData.map(ev => {
        const master = masterMap[(ev.nim || '').trim()] || {};
        const grok = grokMap[(ev.nim || '').trim()] || {};
        
        const evFields = [ev.email, ev.no_hp, ev.tempat_bekerja, ev.posisi, ev.url_linkedin];
        const evFilled = evFields.filter(v => v && v.trim && v.trim() !== '' && v.trim() !== '-').length;
        const evScore = Math.min(100, Math.round((evFilled / 5) * 100));

        let sources = [{ score: evScore, sumber: 'Scraped' }];

        if (Object.keys(grok).length > 0) {
          const gkFields = [grok.email, grok.no_hp, grok.tempat_bekerja, grok.posisi, grok.sosmed];
          const gkFilled = gkFields.filter(v => v && v.trim && v.trim() !== '' && v.trim() !== '-').length;
          const gkScore = Math.min(100, Math.round((gkFilled / 5) * 100));
          sources.push({ score: gkScore, sumber: 'Generated' });
        }

        // Keep the old enrichScore and sumber for backwards compatibility just in case
        const enrichScore = Math.max(...sources.map(s => s.score));

        return {
          nim: ev.nim,
          nama: ev.nama,
          fakultas: master.fakultas || grok.fakultas || '',
          programStudi: master.program_studi || grok.program_studi || '',
          tahunMasuk: master.tahun_masuk || grok.tahun_masuk || '',
          tempatBekerja: ev.tempat_bekerja || grok.tempat_bekerja || '',
          posisi: ev.posisi || grok.posisi || '',
          enrichScore,
          sumber: 'Scraped',
          sources,
          confidenceScore: ev.confidence_score || 0,
        };
      });
    }

    // Apply JS filters for fakultas & prodi
    if (fakultas) {
      enrichedEvData = enrichedEvData.filter(r => r.fakultas && r.fakultas.toLowerCase().includes(fakultas.toLowerCase()));
    }
    if (prodi) {
      enrichedEvData = enrichedEvData.filter(r => r.programStudi && r.programStudi.toLowerCase().includes(prodi.toLowerCase()));
    }

    // Sort JS array
    enrichedEvData.sort((a, b) => {
      if (sort === 'az') return a.nama.localeCompare(b.nama);
      return b.nama.localeCompare(a.nama);
    });

    const existingNims = enrichedEvData.map(r => r.nim).filter(Boolean);
    
    // Apply JS filter for sumber
    if (sumber === 'Generated') {
      enrichedEvData = []; // Clear Scraped data if filter is Generated
    }

    const evCount = enrichedEvData.length;

    // ── Step 2: Get grok_results count & data ──
    let grokQuery = supabase.from('grok_results')
      .select('nim, nama, fakultas, program_studi, tahun_masuk, email, no_hp, tempat_bekerja, posisi, kategori, sosmed, sosmed_tempat_bekerja', { count: 'exact' });

    if (search) {
      grokQuery = grokQuery.or(`nama.ilike.%${search}%,nim.ilike.%${search}%`);
    }
    if (fakultas) {
      grokQuery = grokQuery.ilike('fakultas', `%${fakultas}%`);
    }
    if (prodi) {
      grokQuery = grokQuery.ilike('program_studi', `%${prodi}%`);
    }
    
    if (sumber !== 'Generated' && existingNims.length > 0) {
      const safeNims = existingNims.slice(0, 300); // limit to prevent URL length issues
      grokQuery = grokQuery.not('nim', 'in', `(${safeNims.join(',')})`);
    }

    grokQuery = grokQuery.order('nama', { ascending: sort !== 'za' });

    const formatGrok = g => {
      const enrichFields = [g.email, g.no_hp, g.tempat_bekerja, g.posisi, g.sosmed];
      const filled = enrichFields.filter(v => v && v.trim && v.trim() !== '' && v.trim() !== '-').length;
      const enrichScore = Math.min(100, Math.round((filled / 5) * 100));
      return {
        nim: g.nim,
        nama: g.nama,
        fakultas: g.fakultas || '',
        programStudi: g.program_studi || '',
        tahunMasuk: g.tahun_masuk || '',
        tempatBekerja: g.tempat_bekerja || '',
        posisi: g.posisi || '',
        enrichScore,
        sumber: 'Generated', // Label expected by UI
        sources: [{ score: enrichScore, sumber: 'Generated' }],
        confidenceScore: enrichScore,
      };
    };

    let finalResults = [];
    let totalCount = evCount;

    // If filter is 'Scraped', we don't need grok_results
    if (sumber === 'Scraped') {
      finalResults = enrichedEvData.slice(offset, offset + limit);
      totalCount = evCount;
    } else {
      if (offset < evCount) {
        // Mengambil data dari array A (tracking_evidences)
        const slicedA = enrichedEvData.slice(offset, offset + limit);
        finalResults.push(...slicedA);
        
        const neededFromB = limit - slicedA.length;
        if (neededFromB > 0) {
          const { data: gData, count: gCount } = await grokQuery.range(0, neededFromB - 1);
          if (gData) finalResults.push(...gData.map(formatGrok));
          totalCount = evCount + (gCount || 0);
        } else {
          // Ambil count saja
          const { count: gCount } = await grokQuery.range(0, 0);
          totalCount = evCount + (gCount || 0);
        }
      } else {
        // Hanya mengambil dari array B (grok_results)
        const grokOffset = offset - evCount;
        const { data: gData, count: gCount } = await grokQuery.range(grokOffset, grokOffset + limit - 1);
        if (gData) finalResults.push(...gData.map(formatGrok));
        totalCount = evCount + (gCount || 0);
      }
    }

    // Get unique fakultas & prodi lists for filter dropdowns
    const { data: fakData } = await supabase.from('alumni_master').select('fakultas').not('fakultas', 'is', null);
    const { data: prodiData } = await supabase.from('alumni_master').select('program_studi').not('program_studi', 'is', null);

    const fakultasList = [...new Set((fakData || []).map(r => r.fakultas).filter(Boolean))].sort();
    const prodiList = [...new Set((prodiData || []).map(r => r.program_studi).filter(Boolean))].sort();

    res.json({
      data: finalResults,
      total: totalCount,
      fakultasList,
      prodiList,
    });
  } catch (err) {
    console.error('[dashboard-alumni]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard Alumni Detail Endpoint ─────────────────────────────────────────

app.get('/api/dashboard-alumni-detail/:nim', async (req, res) => {
  try {
    const nim = req.params.nim.trim();

    // Fetch from all 3 tables in parallel
    const [masterRes, evRes, grokRes] = await Promise.all([
      supabase.from('alumni_master').select('*').eq('nim', nim).limit(1).single(),
      supabase.from('tracking_evidences').select('*').eq('nim', nim).order('timestamp', { ascending: false }).limit(1).single(),
      supabase.from('grok_results').select('*').eq('nim', nim).limit(1).single(),
    ]);

    const master = masterRes.data || null;
    const ev = evRes.data || null;
    const grok = grokRes.data || null;

    if (!master && !ev && !grok) {
      return res.status(404).json({ error: 'Alumni tidak ditemukan' });
    }

    // Build scraped detail (from tracking_evidences)
    let scraped = null;
    if (ev) {
      scraped = {
        nama: ev.nama,
        nim: ev.nim,
        email: ev.email || '',
        noHp: ev.no_hp || '',
        tempatBekerja: ev.tempat_bekerja || '',
        alamatBekerja: ev.alamat_bekerja || '',
        posisi: ev.posisi || '',
        kategoriPekerjaan: ev.kategori_pekerjaan || '',
        urlLinkedin: ev.url_linkedin || '',
        urlIg: ev.url_ig || '',
        urlFb: ev.url_fb || '',
        urlTiktok: ev.url_tiktok || '',
        sosmedTempatBekerja: ev.sosmed_tempat_bekerja || '',
        confidenceScore: ev.confidence_score || 0,
        matchStatus: ev.match_status || '',
        verifiedBy: ev.verified_by || '',
        notes: ev.notes || '',
        timestamp: ev.timestamp,
        sumberData: ev.sumber_data || 'LinkedIn Scraper',
      };
    }

    // Build generated detail (from grok_results)
    let generated = null;
    if (grok) {
      generated = {
        nama: grok.nama,
        nim: grok.nim,
        email: grok.email || '',
        noHp: grok.no_hp || '',
        tempatBekerja: grok.tempat_bekerja || '',
        alamatBekerja: grok.alamat_bekerja || '',
        posisi: grok.posisi || '',
        kategori: grok.kategori || '',
        sosmed: grok.sosmed || '',
        sosmedTempatBekerja: grok.sosmed_tempat_bekerja || '',
        fakultas: grok.fakultas || '',
        programStudi: grok.program_studi || '',
        tahunMasuk: grok.tahun_masuk || '',
        tanggalLulus: grok.tanggal_lulus || '',
      };
    }

    // Build master info
    let masterInfo = null;
    if (master) {
      masterInfo = {
        nama: master.nama,
        nim: master.nim,
        fakultas: master.fakultas || '',
        programStudi: master.program_studi || '',
        tahunMasuk: master.tahun_masuk || '',
        tanggalLulus: master.tanggal_lulus || '',
      };
    }

    res.json({
      master: masterInfo,
      scraped,
      generated,
    });
  } catch (err) {
    console.error('[dashboard-alumni-detail]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Tracking Stream Endpoint (SSE) ──────────────────────────────────────────

// Global State untuk Background Job
let activeProcess = null;
let logCache = [];
let isJobRunning = false;
let activeClients = []; // Daftar client SSE yang sedang terhubung

// Fungsi broadcast ke semua client
const broadcastEvent = (data) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  activeClients.forEach(client => client.write(message));
};

app.get('/api/track/stream', (req, res) => {
  // Setup Headers untuk SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Daftarkan client baru
  activeClients.push(res);

  // Jika job sudah berjalan, kirim log lama ke client yang baru terhubung
  if (isJobRunning && logCache.length > 0) {
    logCache.forEach(logLine => {
      res.write(`data: ${JSON.stringify({ log: logLine })}\n\n`);
    });
    // Jangan mulai proses baru jika sudah jalan
  } else if (!isJobRunning && Object.keys(req.query).length > 0) {
    // Memulai proses baru HANYA jika ada parameter (bukan cuma cek status)
    isJobRunning = true;
    logCache = []; // Bersihkan cache log lama
    
    const limit = req.query.limit;
    const nim = req.query.nim;
    const status = req.query.status;
    const workers = req.query.workers;
    
    const args = ['scraper/linkedin_scraper.py', '--headless'];
    
    if (nim) {
      args.push('--nim', nim);
    } else if (limit) {
      args.push('--limit', limit);
    } else {
      args.push('--limit', '10');
    }

    if (status) {
      args.push('--status', status);
    }

    if (workers && parseInt(workers) > 1) {
      args.push('--workers', workers);
    }

    args.unshift('-u'); // unbuffered
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' };
    
    activeProcess = spawn('python', args, { env });

    activeProcess.stdout.on('data', (data) => {
      const lines = data.toString('utf8').split('\n');
      lines.forEach(line => {
        const cleaned = line.replace(/\r/g, '').trim();
        if (cleaned) {
          logCache.push(cleaned);
          broadcastEvent({ log: cleaned });
        }
      });
    });

    activeProcess.stderr.on('data', (data) => {
      const lines = data.toString('utf8').split('\n');
      lines.forEach(line => {
        const cleaned = line.replace(/\r/g, '').trim();
        if (cleaned) {
          const warnMsg = `[WARNING/ERROR] ${cleaned}`;
          logCache.push(warnMsg);
          broadcastEvent({ log: warnMsg });
        }
      });
    });

    activeProcess.on('close', (code) => {
      isJobRunning = false;
      activeProcess = null;
      const endMsg = `[SYSTEM] Proses pelacakan selesai dengan kode ${code}.`;
      logCache.push(endMsg);
      broadcastEvent({ log: endMsg, isDone: true });
      // Setelah broadcast selesai, kita biarkan client tetap terbuka agar user bisa melihat log terakhir
    });
  } else if (!isJobRunning) {
    // Jika tidak ada job dan cuma connect polosan (cek state), beri tahu isDone
    res.write(`data: ${JSON.stringify({ log: '[SYSTEM] Idle.', isDone: true })}\n\n`);
  }

  // Jika koneksi dari klien terputus
  req.on('close', () => {
    // Hapus dari daftar client aktif
    activeClients = activeClients.filter(c => c !== res);
    // KITA TIDAK MEMATIKAN PROSES! Proses tetap berjalan di background
  });
});

// Endpoint untuk menghentikan manual
app.post('/api/track/stop', (req, res) => {
  if (isJobRunning && activeProcess) {
    activeProcess.kill();
    isJobRunning = false;
    activeProcess = null;
    const stopMsg = `[SYSTEM] Pelacakan dihentikan secara manual oleh pengguna.`;
    logCache.push(stopMsg);
    broadcastEvent({ log: stopMsg, isDone: true });
    return res.json({ success: true, message: 'Process stopped.' });
  }
  return res.json({ success: false, message: 'No process running.' });
});

// ─── Global Error Handlers ─────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

// ─── Server Start ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`
=============================================
🌍 Backend Proxy Terhubung! 
=> Database: Supabase PostgreSQL
=> PDDikti: pddikti.rone.dev
Port: ${port}
=============================================
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${port} sudah digunakan oleh proses lain!`);
      console.error(`   Solusi: Jalankan perintah berikut untuk mematikan proses lama:`);
      console.error(`   > netstat -ano | findstr :${port}`);
      console.error(`   > taskkill /PID <PID_NUMBER> /F\n`);
      console.error(`   Atau coba port lain dengan: PORT=${port + 1} node server.js\n`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });

  return server;
};

startServer(PORT);

// ─── Self-Ping Keep-Alive (Render Free Tier Anti-Sleep) ───────────────────────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // Auto-set by Render
if (RENDER_URL) {
  const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 menit
  setInterval(async () => {
    try {
      await fetch(`${RENDER_URL}/api/health`);
      console.log(`[keep-alive] Ping ${RENDER_URL}/api/health - OK`);
    } catch (err) {
      console.error('[keep-alive] Ping failed:', err.message);
    }
  }, KEEP_ALIVE_INTERVAL);
  console.log(`[keep-alive] Self-ping aktif setiap 14 menit ke ${RENDER_URL}`);
}

export default app;
