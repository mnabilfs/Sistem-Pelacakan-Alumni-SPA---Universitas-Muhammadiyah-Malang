import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
=============================================
🌍 Backend Proxy Terhubung! 
=> Menggunakan Open API: pddikti.rone.dev
Port: ${PORT}
=============================================
  `);
});
