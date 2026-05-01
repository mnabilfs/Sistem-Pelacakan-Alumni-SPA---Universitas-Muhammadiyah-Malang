import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Rocket,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Eye,
  Loader2,
  GraduationCap,
  Linkedin,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Database,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alumni, setAlumni] = useState([]);
  const [totalAlumniList, setTotalAlumniList] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFakultas, setFilterFakultas] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [fakultasList, setFakultasList] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  const [offset, setOffset] = useState(0);

  // ── Fetch Stats ──
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard-stats`);
        const data = await res.json();
        setStats(data.stats);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // ── Fetch Alumni List ──
  const fetchAlumni = async () => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        fakultas: filterFakultas,
        prodi: filterProdi,
        sort: sortOrder,
        offset: offset.toString(),
      });
      const res = await fetch(`${API_BASE}/dashboard-alumni?${params}`);
      const data = await res.json();
      setAlumni(data.data || []);
      setTotalAlumniList(data.total || 0);
      if (data.fakultasList) setFakultasList(data.fakultasList);
      if (data.prodiList) setProdiList(data.prodiList);
    } catch (err) {
      console.error('Error fetching alumni list:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, [offset, filterFakultas, filterProdi, sortOrder]);

  const handleSearch = () => {
    setOffset(0);
    fetchAlumni();
  };

  // ── Field coverage items ──
  const getFieldItems = () => {
    if (!stats || !stats.fieldCoverage) return [];
    const total = stats.totalAlumni || 1;
    const fc = stats.fieldCoverage;
    return [
      { label: 'LinkedIn / Sosmed', icon: Linkedin, color: '#0077B5', ...fc.linkedin, total },
      { label: 'Email', icon: Mail, color: '#ea4335', ...fc.email, total },
      { label: 'No HP', icon: Phone, color: '#10b981', ...fc.noHp, total },
      { label: 'Tempat Kerja', icon: Building2, color: '#8b5cf6', ...fc.tempatKerja, total },
      { label: 'Posisi', icon: Briefcase, color: '#f59e0b', ...fc.posisi, total },
      { label: 'Sosmed Tempat Kerja', icon: Globe, color: '#06b6d4', ...fc.sosmedTempatKerja, total },
      { label: 'Alamat Kerja', icon: MapPin, color: '#ec4899', ...fc.alamatKerja, total },
    ];
  };

  const getEnrichColor = (score) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 50) return 'var(--accent-blue)';
    if (score >= 25) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  const totalPages = Math.ceil(totalAlumniList / 50);
  const currentPage = Math.floor(offset / 50) + 1;

  return (
    <div>
      {/* ═══ Hero Header ═══ */}
      <div style={{ textAlign: 'center', marginBottom: '32px', paddingTop: '8px' }}>
        <div style={{
          width: '64px', height: '64px', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
        }}>
          <Rocket size={28} style={{ color: 'white' }} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px',
          background: 'linear-gradient(135deg, #e8eaed, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tracking Alumni UMM
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
          Data lulusan Universitas Muhammadiyah Malang
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '20px',
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
          fontSize: '13px', fontWeight: '600', color: 'var(--accent-blue)',
        }}>
          <GraduationCap size={14} />
          {isLoadingStats ? '...' : `${(stats?.totalAlumni || 0).toLocaleString()} Total Alumni Tercatat`}
        </div>
      </div>

      {/* ═══ Stats Row: Coverage, Accuracy, Field Coverage ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '16px', marginBottom: '32px' }}>
        {/* Coverage Keseluruhan */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(59,130,246,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)',
            }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>COVERAGE KESELURUHAN</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                dari {isLoadingStats ? '...' : (stats?.totalMaster || 0).toLocaleString()} total alumni
              </div>
            </div>
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-2px', color: 'var(--accent-green)', lineHeight: 1 }}>
            {isLoadingStats ? '...' : stats?.coverage || 0}<span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>%</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0 16px' }}>
            {isLoadingStats ? '...' : (stats?.totalAlumni || 0).toLocaleString()} alumni memiliki minimal 1 data
          </p>
          <div className="confidence-bar" style={{ marginBottom: '16px' }}>
            <div style={{ width: `${stats?.coverage || 0}%`, height: '100%', borderRadius: '3px', background: 'var(--accent-blue)', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
              Scraped: {isLoadingStats ? '...' : (stats?.scrapedCount || 0).toLocaleString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
              Generated: {isLoadingStats ? '...' : (stats?.generatedCount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Accuracy (Data Real) */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(16,185,129,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)',
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>ACCURACY (DATA REAL)</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                dari data yang sudah di-enrich
              </div>
            </div>
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-2px', color: 'var(--accent-green)', lineHeight: 1 }}>
            {isLoadingStats ? '...' : stats?.accuracy || 0}<span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>%</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0 16px' }}>
            {isLoadingStats ? '...' : (stats?.scrapedCount || 0).toLocaleString()} alumni terverifikasi via scraping
          </p>
          <div className="confidence-bar" style={{ marginBottom: '16px' }}>
            <div style={{ width: `${stats?.accuracy || 0}%`, height: '100%', borderRadius: '3px', background: 'var(--accent-green)', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>Scraped</span> = data nyata dari LinkedIn/Web •{' '}
            <span style={{ color: 'var(--accent-amber)', fontWeight: '700' }}>Generated</span> = estimasi berdasarkan prodi
          </div>
        </div>

        {/* Coverage Per Field */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(139,92,246,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)',
            }}>
              <Database size={18} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>
              COVERAGE PER FIELD <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(DARI {isLoadingStats ? '...' : (stats?.totalAlumni || 0).toLocaleString()})</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getFieldItems().map(field => {
              const pct = field.total > 0 ? Math.round((field.count / field.total) * 100) : 0;
              const scrapedPct = field.total > 0 ? Math.round((field.scrapedCount / field.total) * 100) : 0;
              return (
                <div key={field.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '150px', flexShrink: 0 }}>
                    <field.icon size={13} style={{ color: field.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{field.label}</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: field.color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>{field.count.toLocaleString()}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: field.color, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent-green)', padding: '1px 5px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', whiteSpace: 'nowrap' }}>{scrapedPct}% real</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Search Bar ═══ */}
      <div className="card" style={{ marginBottom: '16px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Cari nama alumni atau NIM..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              style={{ paddingLeft: '44px', fontSize: '15px', padding: '14px 16px 14px 44px', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} style={{ padding: '14px 28px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}>
            <Search size={16} /> Cari
          </button>
        </div>
      </div>

      {/* ═══ Filters ═══ */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>FAKULTAS</label>
          <select className="form-select" value={filterFakultas} onChange={e => { setFilterFakultas(e.target.value); setOffset(0); }} style={{ width: '220px' }}>
            <option value="">Semua Fakultas</option>
            {fakultasList.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>PROGRAM STUDI</label>
          <select className="form-select" value={filterProdi} onChange={e => { setFilterProdi(e.target.value); setOffset(0); }} style={{ width: '240px' }}>
            <option value="">Semua Prodi</option>
            {prodiList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>URUTKAN</label>
          <select className="form-select" value={sortOrder} onChange={e => { setSortOrder(e.target.value); setOffset(0); }} style={{ width: '160px' }}>
            <option value="az">Nama A–Z</option>
            <option value="za">Nama Z–A</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>SUMBER</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--accent-amber)', fontSize: '12px', fontWeight: '600',
          }}>
            <Database size={14} /> Database Lokal UMM
          </div>
        </div>
      </div>

      {/* ═══ Alumni Data Table ═══ */}
      {isLoadingList ? (
        <div className="card">
          <div className="empty-state">
            <Loader2 size={40} className="spinner" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
            <h3>Memuat Data Alumni...</h3>
          </div>
        </div>
      ) : alumni.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <GraduationCap size={44} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <h3>Data Tidak Ditemukan</h3>
            <p>Coba ubah kata kunci pencarian atau filter.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>NAMA LULUSAN</th>
                  <th>NIM</th>
                  <th>FAKULTAS</th>
                  <th>PROGRAM STUDI</th>
                  <th>MSK</th>
                  <th style={{ textAlign: 'center' }}>ENRICHMENT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alumni.map((al, idx) => (
                  <tr key={al.nim + '-' + idx}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)', maxWidth: '200px' }}>{al.nama}</td>
                    <td>
                      <code style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)',
                      }}>
                        {al.nim}
                      </code>
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.fakultas || '-'}</td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.programStudi || '-'}</td>
                    <td>{al.tahunMasuk || '-'}</td>
                    <td style={{ textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: getEnrichColor(al.enrichScore), marginBottom: '4px' }}>
                        {al.enrichScore}%
                      </div>
                      <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', margin: '0 auto 4px' }}>
                        <div style={{ width: `${al.enrichScore}%`, height: '100%', borderRadius: '2px', background: getEnrichColor(al.enrichScore), transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
                        padding: '2px 6px', borderRadius: '4px',
                        background: al.sumber === 'Generated' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: al.sumber === 'Generated' ? 'var(--accent-amber)' : 'var(--accent-green)',
                      }}>
                        {al.sumber === 'Generated' ? 'GENERATED' : 'SCRAPED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/pddikti-search?q=${encodeURIComponent(al.nama)}`)}
                          style={{ fontSize: '11px' }}
                        >
                          <Search size={12} /> Cari Data
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/analyze/${al.nim}`)}
                          style={{ fontSize: '11px' }}
                        >
                          Detail →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + 50)}>
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
