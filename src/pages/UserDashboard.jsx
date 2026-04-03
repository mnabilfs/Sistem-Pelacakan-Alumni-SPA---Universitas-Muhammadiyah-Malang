import { useState } from 'react';
import { Search, Loader2, Save, UserCircle, Briefcase, MapPin, Link2 } from 'lucide-react';
import { getMasterData, saveTrackingEvidence } from '../utils/sqliteMock';

export default function UserDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    linkedin: '',
    ig: '',
    fb: '',
    tiktok: '',
    email: '',
    phone: '',
    tempatKerja: '',
    alamatKerja: '',
    posisi: '',
    statusKerja: 'Swasta', // PNS, Swasta, Wirausaha
    sosmedKerja: ''
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSelectedAlumni(null);
    setSavedSuccess(false);
    
    try {
      const res = await getMasterData(searchQuery, '', 0);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (alumni) => {
    setSelectedAlumni(alumni);
    setSearchResults([]);
    setSavedSuccess(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlumni) return;
    
    setIsSaving(true);
    try {
      const pddiktiMock = {
        nama: selectedAlumni.nama,
        nim: selectedAlumni.nim,
        statusAkhir: 'Lulus'
      };

      const verificationResult = {
        status: "Perlu Verifikasi",
        confidenceScore: 50,
        verifiedBy: "user",
        notes: "Perbaruan Profil Mandiri oleh Pengguna"
      };

      // We'll pass the form data via localData, which the server saves inside rawData
      await saveTrackingEvidence(pddiktiMock, { enrichment: formData }, verificationResult);
      
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err) {
      alert("Gagal menyimpan data: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px', background: 'var(--gradient-card)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Update Profil Alumni</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Cari Data Anda berdasarkan Nama atau NIM, kemudian isi detail tambahan status bekerja dan kontak Anda.
        </p>
      </div>

      {!selectedAlumni && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div className="search-bar" style={{ flex: 1, margin: 0 }}>
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Masukkan NIM atau Nama lengkap Anda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                autoFocus
              />
            </div>
            <button className="btn btn-primary" onClick={handleSearch} disabled={isSearching} style={{ padding: '0 24px' }}>
              {isSearching ? <Loader2 size={16} className="spinner" /> : 'Cari'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden' }}>
               {searchResults.map((al) => (
                 <div key={al.nim} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                     <div style={{ fontWeight: '600' }}>{al.nama}</div>
                     <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                       NIM: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px' }}>{al.nim}</code> • {al.prodi}
                     </div>
                   </div>
                   <button className="btn btn-secondary btn-sm" onClick={() => handleSelect(al)}>
                     Pilih Data Ini
                   </button>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}

      {selectedAlumni && (
        <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                 <UserCircle size={24} />
               </div>
               <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{selectedAlumni.nama}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedAlumni.nim} • {selectedAlumni.prodi}</div>
               </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAlumni(null)}>Kembali</button>
          </div>

          {savedSuccess && (
            <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', marginBottom: '24px', fontSize: '13.5px', fontWeight: '500' }}>
              ✓ Profil berhasil diperbarui! Menunggu verifikasi admin.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Kontak Pribadi */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <UserCircle size={16} /> Kontak Pribadi
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Email</label>
                  <input className="form-input" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="contoh@gmail.com" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>No HP / WhatsApp</label>
                  <input className="form-input" type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="081xxx" />
                </div>
              </div>
            </div>

            {/* Pekerjaan */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Briefcase size={16} /> Status & Pekerjaan Saat Ini
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Status Bekerja</label>
                  <select className="form-select" name="statusKerja" value={formData.statusKerja} onChange={handleChange} style={{ width: '100%' }}>
                    <option value="Swasta">Swasta</option>
                    <option value="PNS">PNS / ASN</option>
                    <option value="Wirausaha">Wirausaha</option>
                    <option value="Belum Bekerja">Belum Bekerja</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Nama Perusahaan / Tempat Bekerja</label>
                  <input className="form-input" type="text" name="tempatKerja" value={formData.tempatKerja} onChange={handleChange} placeholder="Misal: PT Teknologi Maju" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Posisi / Jabatan</label>
                  <input className="form-input" type="text" name="posisi" value={formData.posisi} onChange={handleChange} placeholder="Software Engineer" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> Alamat Tempat Kerja</label>
                  <input className="form-input" type="text" name="alamatKerja" value={formData.alamatKerja} onChange={handleChange} placeholder="Kota/Jalan..." />
                </div>
              </div>
            </div>

            {/* Media Sosial */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Link2 size={16} /> Tautan Jejaring
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>LinkedIn URL</label>
                  <input className="form-input" type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Instagram / Tiktok</label>
                  <input className="form-input" type="text" name="ig" value={formData.ig} onChange={handleChange} placeholder="@username" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Sosial Media Perusahaan</label>
                  <input className="form-input" type="text" name="sosmedKerja" value={formData.sosmedKerja} onChange={handleChange} placeholder="Website/Instagram Perusahaan" />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <><Loader2 size={16} className="spinner" /> Mengirim...</> : <><Save size={16} /> Simpan Pembaharuan</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
