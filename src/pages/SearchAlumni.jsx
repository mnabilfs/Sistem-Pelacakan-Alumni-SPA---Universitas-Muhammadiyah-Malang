import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Globe,
  GraduationCap,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { searchMahasiswaPDDikti } from '../utils/pddiktiService';

export default function SearchAlumni() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchMahasiswaPDDikti(query);
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyze = (nim) => {
    navigate(`/analyze/${nim}`);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px', background: 'var(--gradient-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Globe size={20} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '15px', fontWeight: '600' }}>Pencarian Data PDDikti (Real Data)</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Lakukan pencarian pada *API PDDikti (via Rone Dev)* Pangkalan Data Kemdikbudristek melalui sistem Proxy localhost. Setuju menggunakan data langsung dari PDDikti Universitas Muhammadiyah Malang.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div className="search-bar" style={{ flex: 1, height: '44px', borderRadius: '8px' }}>
            <Search size={18} />
            <input
              className="form-input"
              style={{ fontSize: '14px', border: 'none', background: 'transparent' }}
              placeholder="Masukkan NIM atau Nama Alumni (contoh: Muhammad Nabil...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: '44px', padding: '0 24px', whiteSpace: 'nowrap' }}
            disabled={isSearching || query.trim().length < 3}
          >
            {isSearching ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
            {isSearching ? 'Mencari di API PDDikti...' : 'Cari PDDikti'}
          </button>
        </form>
        {query.trim().length > 0 && query.trim().length < 3 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> Minimal 3 karakter pencarian untuk PDDikti.
          </div>
        )}
      </div>

      {isSearching ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Loader2 size={40} className="spinner" style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
          <h3>Robot Sedang Mencari di pddikti.kemdiktisaintek.go.id...</h3>
          <p>Membutuhkan waktu 3-8 detik karena menavigasi web asli dan melakukan _Real-time Request_.</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="empty-state">
          <GraduationCap size={44} style={{ opacity: 0.5 }} />
          <h3>Data Tidak Ditemukan</h3>
          <p>Mahasiswa / Alumni dengan string "{query}" tidak ditemukan di list PDDikti (Filter UMM).</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Hasil Pencarian API PDDikti Asli ({results.length} ditemukan)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((mhs) => (
              <div key={mhs.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', borderLeft: '4px solid var(--accent-blue)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{mhs.nama}</span>
                    <span className="status-badge perlu-verifikasi">
                      Valid Profil ID PDDikti
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>NIM: <strong style={{ color: 'var(--text-secondary)' }}>{mhs.nim}</strong></span>
                    <span>Prodi: <strong style={{ color: 'var(--text-secondary)' }}>{mhs.prodi}</strong></span>
                    <span>Jenjang: <strong style={{ color: 'var(--text-secondary)' }}>{mhs.jenjang}</strong></span>
                  </div>
                </div>
                <div style={{ paddingLeft: '20px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleAnalyze(mhs.nim)}
                    style={{ background: 'var(--accent-blue)', color: 'white', borderColor: 'transparent' }}
                  >
                    Analyze Profile
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
