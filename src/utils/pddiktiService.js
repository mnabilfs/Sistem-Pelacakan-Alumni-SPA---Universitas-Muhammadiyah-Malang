// src/utils/pddiktiService.js

/**
 * Endpoint pencarian mahasiswa berdasar nama atau NIM.
 * Secara spesifik membatasi pencarian pada PT UMM.
 *
 * @param {string} query - Nama atau NIM mahasiswa
 * @returns {Promise<Array>} List hasil pencarian dari mockup PDDikti
 */
export async function searchMahasiswaPDDikti(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    // Karena vite proxy menunjuk ke localhost:3001
    const res = await fetch(`/api/pddikti/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('CORS / Internal Server Error saat scraping');
    
    const results = await res.json();
    return results;
  } catch (error) {
    console.error('[Error pdDikti Search Proxy Front]', error);
    throw error;
  }
}

export async function getMahasiswaPDDiktiByNim(nim) {
  // Ambil dulu list nama/query dari NIM untuk mendapat href spesifik.
  // Karena struktur PDDikti scraper search mengembalikan param 'link_detail',
  // kita perlu memukul API spesifik detail jika route sudah diketahui.
  // Untuk flow aplikasi ini, karena Analyze Profile dipanggil dengan NIM langsung,
  // kita cukup jalankan search 1x lagi untuk memancing URL-nya, lalu extract link_detail nya.
  
  try {
    const list = await searchMahasiswaPDDikti(nim);
    const mhs = list.find(l => l.nim.trim() === nim.trim());
    
    if (!mhs) return null;
    if (!mhs.link_detail) return mhs;

    // Pergi ke halaman detail-nya (jika struktur scraping sudah support detail parsing)
    // Server scraper sudah menyediakan /api/pddikti/detail
    const detailRes = await fetch(`/api/pddikti/detail?link=${encodeURIComponent(mhs.link_detail)}`);
    const detail = await detailRes.json();
    
    // Merge detail with list overview
    return { ...mhs, ...detail };

  } catch (err) {
    console.error(err);
    return null;
  }
}
