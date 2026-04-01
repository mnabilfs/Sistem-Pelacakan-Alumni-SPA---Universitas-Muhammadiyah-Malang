import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { getAuditReport, deleteEvidenceById } from '../utils/sqliteMock';

export default function DataAlumni() {
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const logs = await getAuditReport();
    setAlumni(logs.map(log => ({
      ...log,
      prodi: log.rawData?.pddikti?.prodi || 'Unknown',
    })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = alumni.filter(a => {
    const matchSearch = a.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nim.includes(searchQuery);
    const matchProdi = !filterProdi || (a.prodi && a.prodi.includes(filterProdi));
    const matchStatus = !filterStatus || a.matchStatus === filterStatus;
    return matchSearch && matchProdi && matchStatus;
  });

  const openAdd = () => {
    navigate('/pddikti-search');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data alumni ini dari sistem lokal?')) {
      await deleteEvidenceById(id);
      fetchData();
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'belum-dilacak';
    if (status.includes('Teridentifikasi')) return 'teridentifikasi';
    if (status.includes('Verifikasi')) return 'perlu-verifikasi';
    if (status.includes('Mismatch')) return 'belum-ditemukan';
    return 'belum-dilacak';
  };

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
            />
          </div>
          <select className="form-select" style={{ width: '180px' }} value={filterProdi} onChange={e => setFilterProdi(e.target.value)}>
            <option value="">Semua Prodi</option>
            <option value="Informatika">Informatika</option>
            <option value="Sistem Informasi">Sistem Informasi</option>
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
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh Data">
             <RefreshCw size={16} className={isLoading ? "spinner" : ""} />
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Search size={16} />
            Cari PDDikti
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
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
            ) : filtered.length === 0 ? (
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
              filtered.map(al => (
                <tr key={al.id}>
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
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(al.id)} title="Hapus dari Data Master">
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

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Menampilkan {filtered.length} dari {alumni.length} alumni (Bersumber dari SQLite Local)
      </div>
    </div>
  );
}
