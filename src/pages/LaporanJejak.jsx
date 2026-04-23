import { useState, useEffect } from 'react';
import {
  FileBarChart,
  Search,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Briefcase,
  MapPin,
  Linkedin,
  Filter,
  Loader2,
  BarChart3,
  Building2,
  Users,
  RefreshCw,
  Download,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function LaporanJejak() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlumni, setSelectedAlumni] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        kategori: filterKategori,
        status: filterStatus,
        offset: offset.toString(),
      });
      const res = await fetch(`${API_BASE}/linkedin-results?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error('Error fetching LinkedIn results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [offset, filterKategori, filterStatus]);

  const handleSearch = () => {
    setOffset(0);
    fetchData();
  };

  const exportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-results/export-csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan_jejak_alumni_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Gagal mengekspor CSV. Pastikan server berjalan.');
    }
  };

  // Statistik ringkasan
  const stats = {
    total: total,
    teridentifikasi: data.filter(d => d.matchStatus === 'Teridentifikasi').length,
    perluVerifikasi: data.filter(d => d.matchStatus === 'Perlu Verifikasi').length,
    belumDitemukan: data.filter(d => d.matchStatus === 'Belum Ditemukan').length,
  };

  const getConfidenceLevel = (score) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Teridentifikasi') return 'teridentifikasi';
    if (status === 'Perlu Verifikasi') return 'perlu-verifikasi';
    return 'belum-ditemukan';
  };

  const totalPages = Math.ceil(total / 100);
  const currentPage = Math.floor(offset / 100) + 1;

  // ─── Detail View ──────────────────────────────────────────────────────────────

  if (selectedAlumni) {
    const al = selectedAlumni;
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => setSelectedAlumni(null)} style={{ marginBottom: '16px' }}>
          <ChevronLeft size={16} /> Kembali ke Daftar
        </button>

        {/* Header */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>{al.nama}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                NIM: {al.nim} • Sumber: {al.sumberData}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`confidence-text ${getConfidenceLevel(al.confidenceScore)}`} style={{ fontSize: '24px' }}>
                {al.confidenceScore}%
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence Score</div>
            </div>
          </div>
          <div className="confidence-bar" style={{ marginTop: '12px', height: '8px' }}>
            <div className={`confidence-fill ${getConfidenceLevel(al.confidenceScore)}`} style={{ width: `${al.confidenceScore}%` }}></div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`status-badge ${getStatusBadgeClass(al.matchStatus)}`}>
              {al.matchStatus === 'Teridentifikasi' && <CheckCircle2 size={12} />}
              {al.matchStatus === 'Perlu Verifikasi' && <AlertTriangle size={12} />}
              {al.matchStatus === 'Belum Ditemukan' && <XCircle size={12} />}
              {al.matchStatus}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Dilacak: {new Date(al.timestamp).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </span>
          </div>
        </div>

        {/* Data Pekerjaan & Kontak */}
        <div className="two-col" style={{ marginBottom: '16px' }}>
          <div className="card" style={{ borderTop: '4px solid var(--accent-blue)' }}>
            <div className="section-title"><Briefcase size={18} /> Data Pekerjaan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="detail-item">
                <label>Tempat Bekerja </label>
                <strong>{al.tempatBekerja || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Alamat Bekerja </label>
                <strong>{al.alamatBekerja || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Posisi / Jabatan </label>
                <strong>{al.posisi || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Kategori Pekerjaan (PNS/Swasta/Wirausaha) </label>
                <span className="chip" style={{ fontSize: '12px' }}>{al.kategoriPekerjaan || 'Tidak Diketahui'}</span>
              </div>
              <div className="detail-item">
                <label>Sosial Media Tempat Bekerja </label>
                {al.sosmedTempatBekerja ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                     {al.sosmedTempatBekerja.split(',').map((url, idx) => {
                       const cleanUrl = url.trim();
                       if (!cleanUrl) return null;
                       return (
                         <a key={idx} href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all', textDecoration: 'none' }}>
                           <ExternalLink size={12} /> {cleanUrl}
                         </a>
                       );
                     })}
                   </div>
                ) : '-'}
              </div>
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #0077B5' }}>
            <div className="section-title"><Users size={18} /> Profil & Kontak Pribadi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="detail-item">
                <label>Email </label>
                <strong>{al.email || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>No HP / WhatsApp </label>
                <strong>{al.noHp || '-'}</strong>
              </div>
              
              <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Alamat Sosial Media:</div>
              
              <div className="detail-item">
                <label>LinkedIn</label>
                {al.urlLinkedin ? (
                  <a href={al.urlLinkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all' }}>
                    <ExternalLink size={12} /> {al.urlLinkedin}
                  </a>
                ) : '-'}
              </div>
              
              <div className="detail-item">
                <label>Instagram </label>
                {al.urlIg ? (
                  <a href={al.urlIg.startsWith('http') ? al.urlIg : `https://${al.urlIg}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all' }}>
                    <ExternalLink size={12} /> {al.urlIg}
                  </a>
                ) : '-'}
              </div>
              <div className="detail-item">
                <label>Facebook </label>
                {al.urlFb ? (
                  <a href={al.urlFb.startsWith('http') ? al.urlFb : `https://${al.urlFb}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all' }}>
                    <ExternalLink size={12} /> {al.urlFb}
                  </a>
                ) : '-'}
              </div>
              <div className="detail-item">
                <label>TikTok </label>
                {al.urlTiktok ? (
                  <a href={al.urlTiktok.startsWith('http') ? al.urlTiktok : `https://${al.urlTiktok}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all' }}>
                    <ExternalLink size={12} /> {al.urlTiktok}
                  </a>
                ) : '-'}
              </div>

              <div className="detail-item" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <label>Diverifikasi Oleh </label>
                <strong>{al.verifiedBy}</strong>
              </div>
              {al.notes && (
                <div className="detail-item">
                  <label>Catatan</label>
                  <div style={{ fontSize: '13px', background: 'var(--bg-input)', padding: '10px', borderRadius: '6px' }}>{al.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main List View ───────────────────────────────────────────────────────────

  return (
    <div>
      {/* Statistik Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Linkedin size={20} style={{ color: '#0077B5' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{total}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Hasil LinkedIn</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>{stats.teridentifikasi}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Teridentifikasi</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber)' }}>{stats.perluVerifikasi}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Perlu Verifikasi</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-red)' }}>{stats.belumDitemukan}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Belum Ditemukan</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: '16px' }}>
        <div className="toolbar-left">
          <div className="search-bar">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Cari nama, NIM, atau tempat kerja..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <select className="form-select" style={{ width: '160px' }} value={filterKategori} onChange={e => { setFilterKategori(e.target.value); setOffset(0); }}>
            <option value="">Semua Kategori</option>
            <option value="PNS">PNS</option>
            <option value="Swasta">Swasta</option>
            <option value="Wirausaha">Wirausaha</option>
            <option value="Tidak Diketahui">Tidak Diketahui</option>
          </select>
          <select className="form-select" style={{ width: '180px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setOffset(0); }}>
            <option value="">Semua Status</option>
            <option value="Teridentifikasi">Teridentifikasi</option>
            <option value="Perlu Verifikasi">Perlu Verifikasi</option>
            <option value="Belum Ditemukan">Belum Ditemukan</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => { setOffset(0); fetchData(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCSV} style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>
            <Download size={14} /> Extract CSV
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Menampilkan {data.length} dari {total} hasil
          </span>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="card">
          <div className="empty-state">
            <Loader2 size={40} className="spinner" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
            <h3>Memuat Data LinkedIn...</h3>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Linkedin size={44} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <h3>Belum Ada Data LinkedIn</h3>
            <p style={{ maxWidth: '400px', margin: '8px auto 0' }}>
              Jalankan scraper Python untuk mulai melacak alumni di LinkedIn.
              <br/>
              <code style={{ fontSize: '12px', display: 'block', margin: '12px auto', background: 'var(--bg-input)', padding: '8px', borderRadius: '6px' }}>
                cd scraper && python linkedin_scraper.py --limit 10
              </code>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumni</th>
                  <th>NIM</th>
                  <th>Tempat Bekerja</th>
                  <th>Posisi</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>LinkedIn</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)', maxWidth: '160px' }}>{r.nama}</td>
                    <td><code style={{ fontSize: '11px' }}>{r.nim}</code></td>
                    <td style={{ maxWidth: '160px' }}>
                      {r.tempatBekerja ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tempatBekerja}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.posisi || '-'}</td>
                    <td>
                      {r.kategoriPekerjaan ? (
                        <span className="chip" style={{ fontSize: '11px' }}>{r.kategoriPekerjaan}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(r.matchStatus)}`} style={{ fontSize: '11px' }}>
                        {r.matchStatus === 'Teridentifikasi' && <CheckCircle2 size={11} />}
                        {r.matchStatus === 'Perlu Verifikasi' && <AlertTriangle size={11} />}
                        {r.matchStatus === 'Belum Ditemukan' && <XCircle size={11} />}
                        {r.matchStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`confidence-text ${getConfidenceLevel(r.confidenceScore)}`} style={{ fontSize: '13px' }}>
                        {r.confidenceScore}%
                      </span>
                    </td>
                    <td>
                      {r.urlLinkedin ? (
                        <a href={r.urlLinkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077B5' }}>
                          <Linkedin size={16} />
                        </a>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAlumni(r)}>
                        <Eye size={13} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + 100)}>
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
