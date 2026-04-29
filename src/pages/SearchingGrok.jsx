import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ExternalLink,
  Eye,
  Briefcase,
  MapPin,
  Filter,
  Loader2,
  Building2,
  Users,
  RefreshCw,
  Download,
  GraduationCap,
  Mail,
  Phone,
  Globe,
  BookOpen,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function SearchingGrok() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterFakultas, setFilterFakultas] = useState('');
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [fakultasList, setFakultasList] = useState([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        kategori: filterKategori,
        fakultas: filterFakultas,
        offset: offset.toString(),
      });
      const res = await fetch(`${API_BASE}/grok-results?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
      if (json.fakultasList) setFakultasList(json.fakultasList);
    } catch (err) {
      console.error('Error fetching Grok results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [offset, filterKategori, filterFakultas]);

  const handleSearch = () => {
    setOffset(0);
    fetchData();
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/grok-results/export-csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `searching_grok_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Gagal mengekspor CSV. Pastikan server berjalan.');
    } finally {
      setIsExporting(false);
    }
  };

  // Statistik ringkasan
  const stats = {
    total: total,
    pns: data.filter(d => d.kategori === 'PNS').length,
    swasta: data.filter(d => d.kategori === 'Swasta').length,
    wirausaha: data.filter(d => d.kategori === 'Wirausaha').length,
  };

  const getKategoriBadge = (kategori) => {
    if (kategori === 'PNS') return 'teridentifikasi';
    if (kategori === 'Swasta') return 'perlu-verifikasi';
    if (kategori === 'Wirausaha') return 'belum-ditemukan';
    return '';
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
                NIM: {al.nim} • {al.program_studi} • {al.fakultas}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`status-badge ${getKategoriBadge(al.kategori)}`} style={{ fontSize: '13px' }}>
                {al.kategori || 'Tidak Diketahui'}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip" style={{ fontSize: '12px' }}>
              <GraduationCap size={12} /> Tahun Masuk: {al.tahun_masuk || '-'}
            </span>
            <span className="chip" style={{ fontSize: '12px' }}>
              <BookOpen size={12} /> Lulus: {al.tanggal_lulus || '-'}
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
                <strong>{al.tempat_bekerja || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Alamat Bekerja </label>
                <strong>{al.alamat_bekerja || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Posisi / Jabatan </label>
                <strong>{al.posisi || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Kategori Pekerjaan </label>
                <span className={`status-badge ${getKategoriBadge(al.kategori)}`} style={{ fontSize: '12px' }}>
                  {al.kategori || 'Tidak Diketahui'}
                </span>
              </div>
              <div className="detail-item">
                <label>Sosial Media Tempat Bekerja </label>
                {al.sosmed_tempat_bekerja ? (
                   <a href={al.sosmed_tempat_bekerja.match(/https?:\/\/\S+/)?.[0] || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all', textDecoration: 'none' }}>
                     <ExternalLink size={12} /> {al.sosmed_tempat_bekerja}
                   </a>
                ) : '-'}
              </div>
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #0077B5' }}>
            <div className="section-title"><Users size={18} /> Profil & Kontak Pribadi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="detail-item">
                <label><Mail size={12} /> Email </label>
                <strong>{al.email || '-'}</strong>
              </div>
              <div className="detail-item">
                <label><Phone size={12} /> No HP / WhatsApp </label>
                <strong>{al.no_hp || '-'}</strong>
              </div>
              
              <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Sosial Media Pribadi:</div>
              
              <div className="detail-item">
                <label>Sosmed</label>
                {al.sosmed ? (
                  <a href={al.sosmed.match(/https?:\/\/\S+/)?.[0] || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077B5', fontSize: '12px', wordBreak: 'break-all' }}>
                    <ExternalLink size={12} /> {al.sosmed}
                  </a>
                ) : '-'}
              </div>

              <div className="detail-item" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <label>Fakultas</label>
                <strong>{al.fakultas || '-'}</strong>
              </div>
              <div className="detail-item">
                <label>Program Studi</label>
                <strong>{al.program_studi || '-'}</strong>
              </div>
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
            <Globe size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{total}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Data Grok</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>{stats.pns}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNS</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={20} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber)' }}>{stats.swasta}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Swasta</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-red)' }}>{stats.wirausaha}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wirausaha</div>
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
          </select>
          <select className="form-select" style={{ width: '200px' }} value={filterFakultas} onChange={e => { setFilterFakultas(e.target.value); setOffset(0); }}>
            <option value="">Semua Fakultas</option>
            {fakultasList.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => { setOffset(0); fetchData(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCSV} disabled={isExporting} style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>
            {isExporting ? <><Loader2 size={14} className="spinner" /> Mengunduh...</> : <><Download size={14} /> Extract CSV</>}
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
            <h3>Memuat Data Grok...</h3>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Globe size={44} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <h3>Belum Ada Data Grok</h3>
            <p style={{ maxWidth: '400px', margin: '8px auto 0' }}>
              Import data CSV terlebih dahulu melalui script import.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Lulusan</th>
                  <th>NIM</th>
                  <th>Tahun Masuk</th>
                  <th>Fakultas</th>
                  <th>Program Studi</th>
                  <th>Tempat Bekerja</th>
                  <th>Posisi</th>
                  <th>Kategori</th>
                  <th>Email</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)', maxWidth: '160px' }}>{r.nama}</td>
                    <td><code style={{ fontSize: '11px' }}>{r.nim}</code></td>
                    <td>{r.tahun_masuk || '-'}</td>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fakultas || '-'}</td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program_studi || '-'}</td>
                    <td style={{ maxWidth: '160px' }}>
                      {r.tempat_bekerja ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tempat_bekerja}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.posisi || '-'}</td>
                    <td>
                      {r.kategori ? (
                        <span className={`status-badge ${getKategoriBadge(r.kategori)}`} style={{ fontSize: '11px' }}>
                          {r.kategori}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: '11px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '-'}</td>
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
