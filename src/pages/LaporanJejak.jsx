import { useState, useMemo, useEffect } from 'react';
import {
  FileBarChart,
  Search,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Eye,
  Filter,
  Clock,
  Link2,
} from 'lucide-react';
import { getAuditReport } from '../utils/sqliteMock';

export default function LaporanJejak() {
  const [alumniData, setAlumniData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      const logs = await getAuditReport();
      // Hanya ambil log yang sudah pernah di-tracking (ada properti trackingData)
      const trackedLogs = logs.filter(log => log.trackingData);
      setAlumniData(trackedLogs);
      setIsLoading(false);
    };
    fetchReports();
  }, []);

  const enrichedResults = useMemo(() => {
    return alumniData.map(log => {
      const pddikti = log.rawData?.pddikti || {};
      return {
        ...log.trackingData,
        alumniId: log.id,
        alumni: {
          nama: log.nama,
          prodi: pddikti.prodi || 'Unknown',
          tahunLulus: pddikti.statusAkhir?.includes('20') ? pddikti.statusAkhir.split(' ')[0] : 'Unknown',
          kota: 'Indonesia'
        }
      };
    });
  }, [alumniData]);

  const filtered = enrichedResults.filter(r => {
    const matchSearch = r.alumni.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const selectedResult = selectedAlumni ? enrichedResults.find(r => r.alumniId === selectedAlumni) : null;

  const getConfidenceLevel = (score) => {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
  };

  if (selectedResult) {
    return (
      <div>
        {/* Back button */}
        <button className="btn btn-secondary" onClick={() => setSelectedAlumni(null)} style={{ marginBottom: '16px' }}>
          <ChevronLeft size={16} />
          Kembali ke Daftar
        </button>

        {/* Alumni Info Header */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>{selectedResult.alumni.nama}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {selectedResult.alumni.prodi} • Lulus {selectedResult.alumni.tahunLulus} • {selectedResult.alumni.kota}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`confidence-text ${getConfidenceLevel(selectedResult.confidenceScore)}`}>
                {selectedResult.confidenceScore}%
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence Score</div>
            </div>
          </div>
          <div className="confidence-bar" style={{ marginTop: '12px', height: '8px' }}>
            <div className={`confidence-fill ${getConfidenceLevel(selectedResult.confidenceScore)}`} style={{ width: `${selectedResult.confidenceScore}%` }}></div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Terakhir dilacak:</span>
              <span style={{ fontWeight: '500' }}>{new Date(selectedResult.tanggalPelacakan).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
            </div>
            <span className={`status-badge ${selectedResult.status === 'Teridentifikasi' ? 'teridentifikasi' : selectedResult.status === 'Perlu Verifikasi' ? 'perlu-verifikasi' : 'belum-ditemukan'}`}>
              {selectedResult.status === 'Teridentifikasi' && <CheckCircle2 size={12} />}
              {selectedResult.status === 'Perlu Verifikasi' && <AlertTriangle size={12} />}
              {selectedResult.status}
            </span>
          </div>
          {selectedResult.ringkasan && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
              <strong>Ringkasan:</strong> {selectedResult.ringkasan}
            </div>
          )}
        </div>

        {/* Cross-Validation */}
        {selectedResult.crossValidation && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">
              <Shield size={18} />
              Cross-Validation Antar Sumber
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-sm)', background: selectedResult.crossValidation.konsisten ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)' }}>
              {selectedResult.crossValidation.konsisten
                ? <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                : <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
              }
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                  {selectedResult.crossValidation.konsisten ? 'Tervalidasi Silang' : 'Belum Tervalidasi Silang'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedResult.crossValidation.catatan}</div>
              </div>
            </div>
            {selectedResult.crossValidation.sumberCocok.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 0' }}>Sumber yang cocok:</span>
                {selectedResult.crossValidation.sumberCocok.map((s, i) => (
                  <span key={i} className="chip">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kandidat */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="section-title">
            <Search size={18} />
            Kandidat Ditemukan ({selectedResult.kandidat?.length || 0})
          </div>
          {(selectedResult.kandidat || []).map((k, i) => (
            <div key={i} className="detail-panel" style={{ marginBottom: '12px' }}>
              <div className="detail-header">
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{k.nama}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{k.jabatan} • {k.instansi} • {k.lokasi}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`confidence-text ${getConfidenceLevel(k.skor)}`} style={{ fontSize: '16px' }}>{k.skor}%</span>
                  <div>
                    <span className={`status-badge ${k.cocok === 'Kemungkinan Kuat' ? 'teridentifikasi' : k.cocok === 'Perlu Verifikasi' ? 'perlu-verifikasi' : 'belum-ditemukan'}`} style={{ fontSize: '10px' }}>
                      {k.cocok}
                    </span>
                  </div>
                </div>
              </div>
              <div className="detail-body">
                {/* Sinyal */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Sinyal Identitas</div>
                  <div className="signal-grid">
                    {[
                      { label: 'Kecocokan Nama', match: k.sinyal?.namaMatch },
                      { label: 'Kecocokan Afiliasi', match: k.sinyal?.afiliasiMatch },
                      { label: 'Kecocokan Timeline', match: k.sinyal?.timelineMatch },
                      { label: 'Kecocokan Bidang', match: k.sinyal?.bidangMatch },
                    ].map((sig, j) => (
                      <div key={j} className="signal-item">
                        <span className={`signal-dot ${sig.match ? 'match' : 'no-match'}`}></span>
                        <span style={{ color: sig.match ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '12px' }}>{sig.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bukti */}
                {k.bukti && k.bukti.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Jejak Bukti</div>
                    {k.bukti.map((b, j) => (
                      <div key={j} className="evidence-card">
                        <div className="evidence-type">{b.tipe}</div>
                        <div className="evidence-title">{b.judul}</div>
                        <div className="evidence-snippet">"{b.snippet}"</div>
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="evidence-url">
                          <Link2 size={10} style={{ display: 'inline', marginRight: '4px' }} />{b.url}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Queries Used */}
        {selectedResult.queries && (
          <div className="card">
            <div className="section-title">
              <Search size={18} />
              Query Pencarian yang Digunakan
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedResult.queries.map((q, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                  {q}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Cari nama alumni..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: '200px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Teridentifikasi">Teridentifikasi</option>
            <option value="Perlu Verifikasi">Perlu Verifikasi</option>
            <option value="Belum Ditemukan">Belum Ditemukan</option>
          </select>
        </div>
        <div className="toolbar-right">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {filtered.length} laporan ditemukan
          </span>
        </div>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="card">
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: '16px', color: 'var(--accent-blue)', width: '32px', height: '32px' }}></div>
            <h3>Memuat Data...</h3>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileBarChart size={40} />
            <h3>Belum Ada Laporan</h3>
            <p>Jalankan pelacakan alumni terlebih dahulu untuk melihat laporan jejak dari SQLite</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alumni</th>
                <th>Prodi</th>
                <th>Status Pelacakan</th>
                <th>Confidence</th>
                <th>Ringkasan</th>
                <th>Terakhir Dilacak</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.alumniId}>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{r.alumni.nama}</td>
                  <td>{r.alumni.prodi}</td>
                  <td>
                    <span className={`status-badge ${r.status === 'Teridentifikasi' ? 'teridentifikasi' : r.status === 'Perlu Verifikasi' ? 'perlu-verifikasi' : 'belum-ditemukan'}`}>
                      {r.status === 'Teridentifikasi' && <CheckCircle2 size={12} />}
                      {r.status === 'Perlu Verifikasi' && <AlertTriangle size={12} />}
                      {r.status === 'Belum Ditemukan' && <XCircle size={12} />}
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`confidence-text ${getConfidenceLevel(r.confidenceScore)}`} style={{ fontSize: '14px' }}>{r.confidenceScore}%</span>
                      <div className="confidence-bar" style={{ width: '60px' }}>
                        <div className={`confidence-fill ${getConfidenceLevel(r.confidenceScore)}`} style={{ width: `${r.confidenceScore}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ringkasan}</td>
                  <td style={{ fontSize: '12px' }}>{new Date(r.tanggalPelacakan).toLocaleDateString('id-ID')}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAlumni(r.alumniId)}>
                      <Eye size={13} /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
