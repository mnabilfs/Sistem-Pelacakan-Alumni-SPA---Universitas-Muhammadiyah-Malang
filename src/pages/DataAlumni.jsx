import { useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  UserPlus,
  Filter,
} from 'lucide-react';
import { getNextId } from '../data/mockAlumni';

export default function DataAlumni({ alumni, setAlumni }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState(null);
  const [form, setForm] = useState({
    nama: '', nim: '', prodi: 'Informatika', tahunLulus: '',
    email: '', kota: '', variasiNama: '', kataKunciAfiliasi: '', kataKunciKonteks: ''
  });

  const filtered = alumni.filter(a => {
    const matchSearch = a.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nim.includes(searchQuery) || a.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProdi = !filterProdi || a.prodi === filterProdi;
    const matchStatus = !filterStatus || a.statusPelacakan === filterStatus;
    return matchSearch && matchProdi && matchStatus;
  });

  const openAdd = () => {
    setEditingAlumni(null);
    setForm({ nama: '', nim: '', prodi: 'Informatika', tahunLulus: '', email: '', kota: '', variasiNama: '', kataKunciAfiliasi: '', kataKunciKonteks: '' });
    setShowModal(true);
  };

  const openEdit = (al) => {
    setEditingAlumni(al);
    setForm({
      nama: al.nama, nim: al.nim, prodi: al.prodi, tahunLulus: al.tahunLulus.toString(),
      email: al.email, kota: al.kota,
      variasiNama: (al.variasiNama || []).join(', '),
      kataKunciAfiliasi: (al.kataKunciAfiliasi || []).join(', '),
      kataKunciKonteks: (al.kataKunciKonteks || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const newAlumni = {
      id: editingAlumni ? editingAlumni.id : getNextId(),
      nama: form.nama,
      nim: form.nim,
      prodi: form.prodi,
      tahunLulus: parseInt(form.tahunLulus) || 2023,
      email: form.email,
      kota: form.kota,
      statusPelacakan: editingAlumni ? editingAlumni.statusPelacakan : 'Belum Dilacak',
      variasiNama: form.variasiNama.split(',').map(s => s.trim()).filter(Boolean),
      kataKunciAfiliasi: form.kataKunciAfiliasi.split(',').map(s => s.trim()).filter(Boolean),
      kataKunciKonteks: form.kataKunciKonteks.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (editingAlumni) {
      setAlumni(prev => prev.map(a => a.id === editingAlumni.id ? newAlumni : a));
    } else {
      setAlumni(prev => [...prev, newAlumni]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setAlumni(prev => prev.filter(a => a.id !== id));
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Teridentifikasi': return 'teridentifikasi';
      case 'Perlu Verifikasi': return 'perlu-verifikasi';
      case 'Belum Dilacak': return 'belum-dilacak';
      case 'Belum Ditemukan': return 'belum-ditemukan';
      default: return 'belum-dilacak';
    }
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
              placeholder="Cari nama, NIM, atau email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: '180px' }} value={filterProdi} onChange={e => setFilterProdi(e.target.value)}>
            <option value="">Semua Prodi</option>
            <option value="Informatika">Informatika</option>
            <option value="Sistem Informasi">Sistem Informasi</option>
          </select>
          <select className="form-select" style={{ width: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Teridentifikasi">Teridentifikasi</option>
            <option value="Perlu Verifikasi">Perlu Verifikasi</option>
            <option value="Belum Dilacak">Belum Dilacak</option>
            <option value="Belum Ditemukan">Belum Ditemukan</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} />
            Tambah Alumni
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
              <th>Prodi</th>
              <th>Tahun Lulus</th>
              <th>Kota</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <UserPlus size={36} />
                    <h3>Tidak ada data</h3>
                    <p>Tidak ditemukan alumni yang sesuai filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(al => (
                <tr key={al.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{al.nama}</td>
                  <td><code style={{ fontSize: '12px', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{al.nim}</code></td>
                  <td>{al.prodi}</td>
                  <td>{al.tahunLulus}</td>
                  <td>{al.kota}</td>
                  <td><span className={`status-badge ${getStatusClass(al.statusPelacakan)}`}>{al.statusPelacakan}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(al)} title="Edit">
                        <Edit3 size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(al.id)} title="Hapus">
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
        Menampilkan {filtered.length} dari {alumni.length} alumni
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAlumni ? 'Edit Alumni' : 'Tambah Alumni Baru'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input className="form-input" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Muhammad Rizky Pratama" />
                </div>
                <div className="form-group">
                  <label className="form-label">NIM</label>
                  <input className="form-input" value={form.nim} onChange={e => setForm({ ...form, nim: e.target.value })} placeholder="201910370311001" />
                </div>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Program Studi</label>
                  <select className="form-select" value={form.prodi} onChange={e => setForm({ ...form, prodi: e.target.value })}>
                    <option>Informatika</option>
                    <option>Sistem Informasi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tahun Lulus</label>
                  <input className="form-input" type="number" value={form.tahunLulus} onChange={e => setForm({ ...form, tahunLulus: e.target.value })} placeholder="2023" />
                </div>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="alumni@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kota</label>
                  <input className="form-input" value={form.kota} onChange={e => setForm({ ...form, kota: e.target.value })} placeholder="Malang" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Variasi Nama (pisahkan koma)</label>
                <input className="form-input" value={form.variasiNama} onChange={e => setForm({ ...form, variasiNama: e.target.value })} placeholder="M. Rizky Pratama, Rizky Pratama" />
              </div>
              <div className="form-group">
                <label className="form-label">Kata Kunci Afiliasi (pisahkan koma)</label>
                <input className="form-input" value={form.kataKunciAfiliasi} onChange={e => setForm({ ...form, kataKunciAfiliasi: e.target.value })} placeholder="UMM, Universitas Muhammadiyah Malang" />
              </div>
              <div className="form-group">
                <label className="form-label">Kata Kunci Konteks (pisahkan koma)</label>
                <input className="form-input" value={form.kataKunciKonteks} onChange={e => setForm({ ...form, kataKunciKonteks: e.target.value })} placeholder="Software Engineer, Malang, 2023" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.nama || !form.nim}>
                {editingAlumni ? 'Simpan Perubahan' : 'Tambah Alumni'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
