// src/utils/sqliteMock.js

const API_BASE = 'http://localhost:3001/api';

/**
 * Menyimpan bukti pelacakan ke mock SQLite
 */
export async function saveTrackingEvidence(
  pddiktiData,
  localData,
  verificationResult
) {
  const res = await fetch(`${API_BASE}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pddiktiData, localData, verificationResult })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

/**
 * Mengambil seluruh riwayat Audit
 */
export async function getAuditReport() {
  const res = await fetch(`${API_BASE}/evidence`);
  return await res.json();
}

/**
 * Mengambil Master Data (dengan filter)
 */
export async function getMasterData(query = '', prodi = '', offset = 0) {
  const res = await fetch(`${API_BASE}/master?q=${encodeURIComponent(query)}&prodi=${encodeURIComponent(prodi)}&offset=${offset}`);
  return await res.json();
}

/**
 * Hapus dari Master Data Asli
 */
export async function deleteMasterByNim(nim) {
  await fetch(`${API_BASE}/master/${nim}`, { method: 'DELETE' });
}

/**
 * Cek apakah sebuah NIM sudah tersimpan
 */
export async function getEvidenceByNim(nim) {
  const res = await fetch(`${API_BASE}/evidence/${nim}`);
  if (res.ok) {
    return await res.json();
  }
  return null;
}

/**
 * Hapus 1 bukti pelacakan
 */
export async function deleteEvidenceById(id) {
  await fetch(`${API_BASE}/evidence/${id}`, { method: 'DELETE' });
}

export function clearAuditReport() {
  // Not implemented in Real DB for safety
}

export async function updateAuditRecord(id, updates) {
  // Can be implemented if needed
}

