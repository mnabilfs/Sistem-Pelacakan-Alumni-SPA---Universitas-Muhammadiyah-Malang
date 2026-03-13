// Utility functions for alumni tracking simulation

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Step 1: Generate search queries for an alumni
export function generateQueries(alumni) {
  const queries = [];
  const nama = alumni.nama;
  const variasi = alumni.variasiNama || [];
  const afiliasi = alumni.kataKunciAfiliasi || [];
  const konteks = alumni.kataKunciKonteks || [];

  // Query: nama + universitas
  if (afiliasi.length > 0) {
    queries.push(`"${nama}" "${afiliasi[0]}"`);
  }
  // Query: variasi nama + prodi + singkatan
  if (variasi.length > 1 && afiliasi.length > 1) {
    queries.push(`"${variasi[1]}" "${alumni.prodi}" "${afiliasi[1]}"`);
  }
  // Query: nama + site:scholar
  queries.push(`"${nama}" site:scholar.google.com`);
  // Query: nama + ORCID
  queries.push(`"${nama}" ORCID`);
  // Query: nama + konteks pekerjaan
  if (konteks.length > 0) {
    queries.push(`"${nama}" "${konteks[0]}" "${alumni.kota}"`);
  }
  return queries;
}

// Simulated job positions and companies
const jabatanList = [
  "Software Engineer", "Data Analyst", "UI/UX Designer", "Backend Developer",
  "Frontend Developer", "Project Manager", "System Analyst", "DevOps Engineer",
  "Full Stack Developer", "Mobile Developer", "Business Analyst", "QA Engineer",
  "Data Engineer", "IT Consultant", "Product Manager", "Researcher",
];

const instansiList = [
  "PT Tokopedia", "Gojek", "Bukalapak", "Traveloka", "Shopee Indonesia",
  "Bank BCA", "Telkom Indonesia", "Grab Indonesia", "Blibli", "Dana Indonesia",
  "Tiket.com", "Ruangguru", "Amartha", "eFishery", "Xendit",
];

const sumberList = ["LinkedIn", "Google Scholar", "GitHub", "ResearchGate", "ORCID", "Situs Kampus", "Google Web"];

// Step 2: Simulate searching public sources
export function simulateSearch(alumni, queries) {
  const numResults = Math.floor(Math.random() * 3) + 1;
  const candidates = [];

  for (let i = 0; i < numResults; i++) {
    const isMatch = i === 0 && Math.random() > 0.3;
    const sumber = sumberList[Math.floor(Math.random() * sumberList.length)];
    const jabatan = alumni.kataKunciKonteks?.[0] || jabatanList[Math.floor(Math.random() * jabatanList.length)];
    const instansi = instansiList[Math.floor(Math.random() * instansiList.length)];

    candidates.push({
      id: `k${alumni.id}-${i + 1}`,
      nama: isMatch ? alumni.nama : (alumni.variasiNama?.[Math.floor(Math.random() * alumni.variasiNama.length)] || alumni.nama),
      sumber,
      jabatan: isMatch ? jabatan : jabatanList[Math.floor(Math.random() * jabatanList.length)],
      instansi: isMatch ? instansi : instansiList[Math.floor(Math.random() * instansiList.length)],
      lokasi: isMatch ? alumni.kota : ["Jakarta", "Surabaya", "Bandung", "Semarang"][Math.floor(Math.random() * 4)],
      sinyal: {
        namaMatch: true,
        afiliasiMatch: isMatch ? Math.random() > 0.2 : Math.random() > 0.7,
        timelineMatch: isMatch ? Math.random() > 0.1 : Math.random() > 0.6,
        bidangMatch: isMatch ? Math.random() > 0.15 : Math.random() > 0.65,
      },
      bukti: [
        {
          tipe: `Profil ${sumber}`,
          judul: `${alumni.nama} - ${jabatan}`,
          url: `https://example.com/profile/${alumni.id}`,
          snippet: `${alumni.nama}, ${isMatch ? alumni.kota : "Unknown"}`
        }
      ]
    });
  }

  return candidates;
}

// Step 3: Calculate disambiguation score
export function calculateScore(kandidat) {
  let score = 0;
  const s = kandidat.sinyal;

  if (s.namaMatch) score += 25;
  if (s.afiliasiMatch) score += 30;
  if (s.timelineMatch) score += 20;
  if (s.bidangMatch) score += 25;

  // Add some randomness
  score = Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5));

  kandidat.skor = score;

  if (score >= 75) {
    kandidat.cocok = "Kemungkinan Kuat";
  } else if (score >= 45) {
    kandidat.cocok = "Perlu Verifikasi";
  } else {
    kandidat.cocok = "Tidak Cocok";
  }

  return kandidat;
}

// Step 4: Cross-validation
export function crossValidate(candidates) {
  const strongCandidates = candidates.filter(c => c.cocok === "Kemungkinan Kuat");
  const sumberCocok = [...new Set(strongCandidates.map(c => c.sumber))];

  return {
    sumberCocok,
    konsisten: sumberCocok.length >= 2,
    catatan: sumberCocok.length >= 2
      ? `${sumberCocok.join(" dan ")} saling menguatkan identitas kandidat`
      : sumberCocok.length === 1
        ? `Hanya ditemukan di ${sumberCocok[0]}, perlu sumber tambahan`
        : "Tidak ada kandidat kuat dari sumber manapun",
  };
}

// Step 5: Determine final status
export function determineStatus(candidates, crossVal) {
  const bestCandidate = candidates.reduce((best, c) => (c.skor > (best?.skor || 0) ? c : best), null);

  if (bestCandidate && bestCandidate.cocok === "Kemungkinan Kuat") {
    return {
      status: "Teridentifikasi",
      confidenceScore: bestCandidate.skor + (crossVal.konsisten ? 5 : 0),
      ringkasan: `${bestCandidate.jabatan} di ${bestCandidate.instansi}, ${bestCandidate.lokasi}`,
    };
  } else if (bestCandidate && bestCandidate.cocok === "Perlu Verifikasi") {
    return {
      status: "Perlu Verifikasi",
      confidenceScore: bestCandidate.skor,
      ringkasan: "Ditemukan kandidat potensial, perlu verifikasi manual",
    };
  }

  return {
    status: "Belum Ditemukan",
    confidenceScore: 0,
    ringkasan: "Tidak ditemukan kandidat relevan di sumber publik",
  };
}

// Full simulation pipeline with step-by-step callbacks
export async function runTrackingSimulation(alumni, onStep) {
  // Step 1: Membuat Profil & Query
  onStep?.({ step: 1, label: "Menyiapkan Profil Target Pencarian", detail: `Membuat variasi nama & query untuk ${alumni.nama}` });
  await delay(800);
  const queries = generateQueries(alumni);
  onStep?.({ step: 1, label: "Menyiapkan Profil Target Pencarian", detail: `${queries.length} query dihasilkan`, done: true });

  // Step 2: Pencarian di Sumber Publik
  await delay(400);
  onStep?.({ step: 2, label: "Mencari di Sumber Publik", detail: "Memindai LinkedIn, Scholar, GitHub, ORCID..." });
  await delay(1200);
  const candidates = simulateSearch(alumni, queries);
  onStep?.({ step: 2, label: "Mencari di Sumber Publik", detail: `${candidates.length} kandidat ditemukan`, done: true });

  // Step 3: Ekstraksi & Scoring
  await delay(400);
  onStep?.({ step: 3, label: "Ekstraksi Sinyal & Scoring", detail: "Menganalisis sinyal identitas dari kandidat..." });
  await delay(1000);
  const scoredCandidates = candidates.map(c => calculateScore(c));
  const bestScore = Math.max(...scoredCandidates.map(c => c.skor));
  onStep?.({ step: 3, label: "Ekstraksi Sinyal & Scoring", detail: `Skor tertinggi: ${bestScore}/100`, done: true });

  // Step 4: Cross-Validation
  await delay(400);
  onStep?.({ step: 4, label: "Cross-Validation Antar Sumber", detail: "Memverifikasi silang antar sumber..." });
  await delay(800);
  const crossVal = crossValidate(scoredCandidates);
  onStep?.({ step: 4, label: "Cross-Validation Antar Sumber", detail: crossVal.catatan, done: true });

  // Step 5: Penetapan Status
  await delay(400);
  onStep?.({ step: 5, label: "Menetapkan Status Alumni", detail: "Menentukan status akhir pelacakan..." });
  await delay(600);
  const result = determineStatus(scoredCandidates, crossVal);
  onStep?.({ step: 5, label: "Menetapkan Status Alumni", detail: `Status: ${result.status} (${result.confidenceScore}%)`, done: true });

  // Step 6: Simpan Hasil
  await delay(400);
  onStep?.({ step: 6, label: "Menyimpan Jejak Bukti", detail: "Menyimpan hasil pelacakan & bukti..." });
  await delay(500);
  const trackingResult = {
    alumniId: alumni.id,
    tanggalPelacakan: new Date().toISOString(),
    status: result.status,
    confidenceScore: Math.min(100, result.confidenceScore),
    ringkasan: result.ringkasan,
    kandidat: scoredCandidates,
    crossValidation: crossVal,
    queries,
  };
  onStep?.({ step: 6, label: "Menyimpan Jejak Bukti", detail: "Pelacakan selesai!", done: true });

  return trackingResult;
}
