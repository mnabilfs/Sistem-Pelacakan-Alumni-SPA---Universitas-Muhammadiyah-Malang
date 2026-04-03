import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;
async function setupDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
}
setupDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/pddikti/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Parameter "q" (Nama/NIM) diperlukan' });

  const queryLower = query.toLowerCase().trim();
  const isNimMode = /^\d+$/.test(queryLower);
  
  // Agar pencarian nama yang umum (misal "anis") tidak memakan limit 100 data 
  // dari API untuk universitas lain, kita tambahkan kata kunci universitas.
  // Tapi jika query adalah NIM (angka), kita kirim murni karena PDDikti lebih akurat untuk NIM.
  const roneQuery = isNimMode ? queryLower : `${queryLower} muhammadiyah malang`;

  // Log ke terminal server agar user tahu API rone.dev yang dipakai
  console.log(`[RONE API Proxy] Memproses Pencarian Asli: "${query}" => Dikirim ke Rone API: "${roneQuery}"`);
  
  try {
    const response = await fetch(`https://api-pddikti.rone.dev/search/mhs/${encodeURIComponent(roneQuery)}`);
    if (!response.ok) throw new Error(`Rone Dev Error: ${response.status}`);
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = []; // jika bukan json (error response html, dsb)
    }

    if (!Array.isArray(data)) data = [];
    
    // Mapping format sesuai kebutuhan UI Frontend
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

    // 1. Filter Universitasnya (Hanya UMM)
    const ummFiltered = mappedResults.filter(r => r.pt && r.pt.toLowerCase().includes('muhammadiyah malang'));
    
    // 2. Lakukan pengecekan ketat (Strict Includes) sesuai permintaan user 
    // karena algoritma API Rone mengembalikan banyak data fuzzy/berdekatan 
    // yang tidak ada kaitannya dengan persisnya input (khususnya untuk NIM).
    const finalResults = ummFiltered.filter(r => {
      const matchNama = r.nama.toLowerCase().includes(queryLower);
      const matchNim = r.nim.toLowerCase().includes(queryLower);
      return matchNama || matchNim;
    });
    
    // --- 3. Filter Hanya Alumni (Lulus) ---
    // Karena API Search Rone tidak menyertakan status akademik, kita harus menarik
    // API Detail untuk tiap kandidat yang lolos filter presisi batas maksimum (misal 15 teratas).
    const candidatesForDetail = finalResults.slice(0, 15);
    const graduatedResults = [];
    
    console.log(`[RONE API Proxy] Mengecek status kelulusan untuk ${candidatesForDetail.length} kandidat...`);
    
    await Promise.all(candidatesForDetail.map(async (mhs) => {
      try {
        const dRes = await fetch(`https://api-pddikti.rone.dev/mhs/detail/${encodeURIComponent(mhs.id)}`);
        if (dRes.ok) {
           const dJson = await dRes.json();
           const lowerStatus = dJson.status_saat_ini ? dJson.status_saat_ini.toLowerCase() : "";
           
           // Filter HANYA yang LULUS
           if (lowerStatus.includes('lulus')) {
             graduatedResults.push({
               ...mhs,
               statusAkhir: "Lulus",
               jenjang: dJson.jenjang || mhs.jenjang,
               tahunMasuk: dJson.tanggal_masuk ? dJson.tanggal_masuk.split('-')[0] : "-"
             });
           }
        }
      } catch (err) {
         // Abaikan error individu agar tak memecah promise lain
      }
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

    const detailMapping = {
      nama: data.nama || '',
      nim: data.nim || '',
      pt: data.nama_pt || '',
      prodi: data.prodi || '',
      jenjang: data.jenjang || '',
      statusAkhir: statusFinal,
    };

    res.json(detailMapping);

  } catch (err) {
    console.error('[Error Rone Detail]', err);
    res.status(500).json({ error: String(err) });
  }
});

// --- NEW SQLITE ENDPOINTS ---

app.get('/api/master', async (req, res) => {
  try {
    const search = req.query.q || '';
    const prodi = req.query.prodi || '';
    const offset = parseInt(req.query.offset) || 0;
    
    let baseQuery = `
      FROM alumni_master m 
      LEFT JOIN tracking_evidences e ON TRIM(m.nim) = TRIM(e.nim) 
      WHERE 1=1
    `;
    let params = [];
    if (search) {
      baseQuery += ' AND (m.nama LIKE ? OR m.nim LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (prodi) {
      baseQuery += ' AND m.program_studi LIKE ?';
      params.push(`%${prodi}%`);
    }

    // Get total count
    const countResult = await db.get(`SELECT COUNT(*) as total ${baseQuery}`, params);
    
    // Get paginated data
    const query = `
      SELECT m.nim, m.nama, m.program_studi as prodi, m.fakultas, m.tahun_masuk, m.tanggal_lulus,
             e.matchStatus, e.confidenceScore, e.pddiktiStatus
      ${baseQuery}
      LIMIT 100 OFFSET ?
    `;
    params.push(offset);
    
    const results = await db.all(query, params);
    res.json({ data: results, total: countResult.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/:nim', async (req, res) => {
  try {
    const nim = req.params.nim;
    const result = await db.get('SELECT * FROM alumni_master WHERE nim = ?', [nim]);
    if (result) res.json(result);
    else res.status(404).json({ error: 'Data not found in Master Alumni' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evidence', async (req, res) => {
  try {
    const results = await db.all('SELECT * FROM tracking_evidences ORDER BY timestamp DESC');
    res.json(results.map(r => ({
      ...r,
      rawData: r.rawData ? JSON.parse(r.rawData) : null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evidence/:nim', async (req, res) => {
  try {
    const nim = req.params.nim;
    const result = await db.get('SELECT * FROM tracking_evidences WHERE nim = ?', [nim]);
    if (result) {
      res.json({
        ...result,
        rawData: result.rawData ? JSON.parse(result.rawData) : null
      });
    } else {
      res.status(404).json({ error: 'Evidensi not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evidence', async (req, res) => {
  try {
    const { pddiktiData, localData, verificationResult } = req.body;
    const id = `ev-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    await db.run(
      `INSERT INTO tracking_evidences (id, timestamp, nim, nama, pddiktiStatus, confidenceScore, matchStatus, verifiedBy, notes, rawData) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        timestamp,
        (pddiktiData.nim || '').trim(),
        (pddiktiData.nama || '').trim(),
        pddiktiData.statusAkhir,
        verificationResult.confidenceScore,
        verificationResult.status,
        verificationResult.verifiedBy || "SYSTEM_AUTO",
        verificationResult.notes || "",
        JSON.stringify({ pddikti: pddiktiData, local: localData })
      ]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/evidence/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.run('DELETE FROM tracking_evidences WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/master/:nim', async (req, res) => {
  try {
    const nim = req.params.nim;
    await db.run('DELETE FROM alumni_master WHERE nim = ?', [nim]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;

// Vercel Serverless environment variables flag
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
=============================================
🌍 Backend Proxy Terhubung! 
=> Menggunakan Open API: pddikti.rone.dev
Port: ${PORT}
=============================================
    `);
  });
}

export default app;
