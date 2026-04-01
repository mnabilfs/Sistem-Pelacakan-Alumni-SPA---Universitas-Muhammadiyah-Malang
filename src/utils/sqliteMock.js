// src/utils/sqliteMock.js

// Konstanta Key di localStorage
const AUDIT_STORE_KEY = "umm_alumni_tracker_sqlite_audit";

/**
 * Initialize mock SQLite DB if not exist
 */
const initDB = () => {
  if (!localStorage.getItem(AUDIT_STORE_KEY)) {
    localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify([]));
  }
};

/**
 * Menyimpan bukti pelacakan ke mock SQLite
 * @param {Object} pddiktiData Data dari PDDikti
 * @param {Object} localData Data dari sistem internal (Master Data)
 * @param {Object} verificationResult (Confidence Score, Status, Admin)
 */
export async function saveTrackingEvidence(
  pddiktiData,
  localData,
  verificationResult
) {
  initDB();
  const db = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY));

  const evidence = {
    id: `ev-${Date.now()}`,
    timestamp: new Date().toISOString(),
    nim: pddiktiData.nim,
    nama: pddiktiData.nama,
    pddiktiStatus: pddiktiData.statusAkhir,
    confidenceScore: verificationResult.confidenceScore,
    matchStatus: verificationResult.status,       // e.g. "Teridentifikasi", "Perlu Verifikasi"
    verifiedBy: verificationResult.verifiedBy || "SYSTEM_AUTO",
    notes: verificationResult.notes || "",
    rawData: {
      pddikti: pddiktiData,
      local: localData,
    },
  };

  db.push(evidence);
  localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify(db));

  // Simulasi waktu I/O SQLite Insert
  await new Promise((r) => setTimeout(r, 300));

  return evidence;
}

/**
 * Mengambil seluruh riwayat Audit dari mock SQLite
 * @returns {Promise<Array>} List Log Audit
 */
export async function getAuditReport() {
  initDB();
  // Simulasi query SELECT * FROM tracking_evidences
  await new Promise((r) => setTimeout(r, 200));
  const db = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY));
  
  // Sort by timestamp DESC (terbaru diatas)
  return db.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Cek apakah sebuah NIM sudah tersimpan
 * @param {string} nim 
 * @returns {Promise<Object>} Object log / null
 */
export async function getEvidenceByNim(nim) {
  initDB();
  await new Promise((r) => setTimeout(r, 100));
  const db = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY));
  const nimClean = String(nim).trim();
  return db.find(ev => String(ev.nim).trim() === nimClean) || null;
}

/**
 * Hapus 1 bukti pelacakan dari SQLite
 * @param {string} id 
 */
export async function deleteEvidenceById(id) {
  initDB();
  const db = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY));
  const newDb = db.filter(ev => ev.id !== id);
  localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify(newDb));
  await new Promise((r) => setTimeout(r, 100));
}

/**
 * Reset / truncate table Evidences
 */
export function clearAuditReport() {
  localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify([]));
}

/**
 * Update an existing evidence record (e.g. from tracking simulation)
 * @param {string} id
 * @param {Object} updates 
 */
export async function updateAuditRecord(id, updates) {
  initDB();
  const db = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY));
  const newDb = db.map(ev => ev.id === id ? { ...ev, ...updates } : ev);
  localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify(newDb));
  await new Promise((r) => setTimeout(r, 100));
}
