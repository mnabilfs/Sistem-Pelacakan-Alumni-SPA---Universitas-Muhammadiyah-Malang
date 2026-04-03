import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  UserPlus,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { getMasterData, deleteMasterByNim } from '../utils/sqliteMock';

export default function DataAlumni() {
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const fetchData = async (currentOffset = offset, searchVal = searchQuery, prodiVal = filterProdi) => {
    setIsLoading(true);
    try {
      const response = await getMasterData(searchVal, prodiVal, currentOffset);
      const logs = response.data || [];
      const total = response.total || 0;
      
      setAlumni(logs);
      setTotalCount(total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, '', '');
    // eslint-disable-next-line
  }, []);

  const handleSearchClick = () => {
    setOffset(0);
    fetchData(0, searchQuery, filterProdi);
  };

  const handleProdiChange = (e) => {
    const val = e.target.value;
    setFilterProdi(val);
    setOffset(0);
    fetchData(0, searchQuery, val);
  };

  const handleOffsetChange = (newOffset) => {
    setOffset(newOffset);
    fetchData(newOffset, searchQuery, filterProdi);
  };

  const openAdd = () => {
    navigate('/pddikti-search');
  };

  const handleDelete = async (nim) => {
    if (window.confirm('Yakin ingin menghapus data alumni ini dari Master Data lokal?')) {
      await deleteMasterByNim(nim);
      fetchData(offset, searchQuery, filterProdi);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'belum-dilacak';
    if (status.includes('Teridentifikasi')) return 'teridentifikasi';
    if (status.includes('Verifikasi')) return 'perlu-verifikasi';
    if (status.includes('Mismatch')) return 'belum-ditemukan';
    return 'belum-dilacak';
  };

  let renderedAlumni = alumni;
  if (filterStatus) {
     renderedAlumni = alumni.filter(a => (a.matchStatus || 'Belum Dilacak') === filterStatus);
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
              placeholder="Cari nama atau NIM..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
              onBlur={handleSearchClick}
            />
          </div>
          <select className="form-select" style={{ width: '180px' }} value={filterProdi} onChange={handleProdiChange}>
            <option value="">Semua Prodi</option>
            <option value="Informatika">Informatika</option>
            <option value="Kedokteran">Kedokteran</option>
            <option value="Manajemen">Manajemen</option>
            <option value="Agribisnis">Agribisnis</option>
          </select>
          <select className="form-select" style={{ width: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status Audit</option>
            <option value="Teridentifikasi">Teridentifikasi</option>
            <option value="Perlu Verifikasi">Perlu Verifikasi</option>
            <option value="Mismatch">Mismatch</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={handleSearchClick} title="Refresh Data">
             <RefreshCw size={16} className={isLoading ? "spinner" : ""} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <UserPlus size={16} />
            PDDikti
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', borderBottom: '1px solid var(--border-color)' }}>
        <table className="data-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
            <tr>
              <th>Nama</th>
              <th>NIM</th>
              <th>Program Studi</th>
              <th>Status PDDikti</th>
              <th>Status Audit</th>
              <th>Skor Tracking</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               <tr>
               <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td>
             </tr>
            ) : renderedAlumni.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <UserPlus size={36} />
                    <h3>Data Master Kosong</h3>
                    <p>Lakukan pencarian PDDikti dan simpan data untuk memasukkannya ke Master Data.</p>
                  </div>
                </td>
              </tr>
            ) : (
              renderedAlumni.map(al => (
                <tr key={al.nim}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{al.nama}</td>
                  <td><code style={{ fontSize: '12px', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{al.nim}</code></td>
                  <td>{al.prodi}</td>
                  <td>{al.pddiktiStatus}</td>
                  <td><span className={`status-badge ${getStatusClass(al.matchStatus)}`}>{al.matchStatus || 'Belum Dilacak'}</span></td>
                  <td>
                    {al.confidenceScore ? (
                        <span className={`confidence-text ${al.confidenceScore >= 75 ? 'high' : al.confidenceScore >= 45 ? 'medium' : 'low'}`} style={{ fontSize: '14px' }}>
                            {al.confidenceScore}%
                        </span>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/analyze/${al.nim}`)} title="Analyze Profile">
                        <FileCheck size={13} /> Analisis
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(al.nim)} title="Hapus dari Data Master">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Menampilkan {totalCount === 0 ? 0 : offset + 1} - {Math.min(offset + 100, totalCount)} dari {totalCount} alumni Master.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={offset === 0} 
            onClick={() => handleOffsetChange(Math.max(0, offset - 100))}
          >
            Sebelumnya
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={offset + 100 >= totalCount} 
            onClick={() => handleOffsetChange(offset + 100)}
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}
