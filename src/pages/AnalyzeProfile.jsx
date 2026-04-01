import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  Database,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { getMahasiswaPDDiktiByNim } from '../utils/pddiktiService';
import { saveTrackingEvidence, getEvidenceByNim } from '../utils/sqliteMock';

export default function AnalyzeProfile() {
  const { nim } = useParams();
  const navigate = useNavigate();

  const [pddiktiData, setPddiktiData] = useState(null);
  const [savedEvidence, setSavedEvidence] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const pData = await getMahasiswaPDDiktiByNim(nim);
        setPddiktiData(pData);
        
        // Check if already saved in local DB
        const evidence = await getEvidenceByNim(nim);
        setSavedEvidence(evidence);

        if (pData) {
          calculateInitialScore(pData, evidence);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (nim) fetchData();
  }, [nim]);

  const calculateInitialScore = (pData, evData) => {
    let score = 0;
    
    // NIM Match
    score += 50;

    if (evData) {
       // If it was already saved, use the saved confidence score
       score = evData.confidenceScore;
       setVerificationStatus(evData.matchStatus);
       setConfidenceScore(score);
       return;
    }

    // Default scoring for new profile
    score += 50; // Assume Name match is valid since API filtered it

    setConfidenceScore(score);
    
    if (score >= 80) setVerificationStatus('Teridentifikasi');
    else if (score >= 50) setVerificationStatus('Perlu Verifikasi Manual');
    else setVerificationStatus('Mismatch');
  };

  const handleSaveEvidence = async () => {
    setIsSaving(true);
    try {
      const result = {
        confidenceScore,
        status: verificationStatus,
        verifiedBy: 'Sistem Lacak web otomatis',
        notes: notes,
      };

      // Since we dropped mock local data, we just pass empty object or basic info as localData
      const localDataSkeleton = {
          nama: pddiktiData.nama,
          nim: pddiktiData.nim,
          prodi: pddiktiData.prodi
      };

      await saveTrackingEvidence(pddiktiData, localDataSkeleton, result);
      
      navigate('/data-alumni');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="empty-state" style={{ padding: '60px 0' }}>
        <Loader2 size={40} className="spinner" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
        <h3>Robot Sedang Menganalisis Detail...</h3>
        <p>Mengambil detail validasi riwayat kemahasiswaan dari API PDDikti.</p>
      </div>
    );
  }

  if (!pddiktiData) {
    return (
      <div className="empty-state">
        <XCircle size={44} style={{ opacity: 0.5, color: 'var(--accent-red)', margin: '0 auto 16px' }} />
        <h3>Data Tidak Valid</h3>
        <p>NIM {nim} gagal dianalisis karena server PDDikti tidak merespons atau bukan Lulus.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/pddikti-search')} style={{ marginTop: '16px' }}>Kembali</button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'Teridentifikasi' || status === 'Verified') return 'var(--accent-green)';
    if (status.includes('Verifikasi')) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/pddikti-search')} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Kembali ke Pencarian
      </button>

      <div className="card" style={{ marginBottom: '24px', background: 'var(--gradient-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Analisis Profil API PDDikti</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Verifikasi dan simpan profil ini ke SQLite lokal sebagai Master Data.
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className={`confidence-text ${confidenceScore >= 80 ? 'high' : confidenceScore >= 50 ? 'medium' : 'low'}`} style={{ fontSize: '28px', lineHeight: '1' }}>
              {confidenceScore}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Confidence Score PDDikti</div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: '24px' }}>
        {/* PDDikti Data Panel */}
        <div className="card" style={{ borderTop: '4px solid var(--accent-blue)' }}>
          <div className="section-title">
            <Database size={18} />
            Data ASLI dari Web PDDikti
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="detail-item">
              <label>Nama Mahasiswa</label>
              <strong>{pddiktiData.nama}</strong>
            </div>
            <div className="detail-item">
              <label>NIM</label>
              <code style={{ fontSize: '12px', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{pddiktiData.nim}</code>
            </div>
            <div className="detail-item">
              <label>Perguruan Tinggi</label>
              <strong>{pddiktiData.pt}</strong>
            </div>
            <div className="detail-item">
              <label>Prodi / Jenjang</label>
              <strong>{pddiktiData.prodi} / {pddiktiData.jenjang}</strong>
            </div>
            <div className="detail-item">
              <label>Status Saat Ini (Real-Time)</label>
              <span className={`status-badge ${pddiktiData.statusAkhir === 'Lulus' ? 'teridentifikasi' : 'perlu-verifikasi'}`}>
                {pddiktiData.statusAkhir}
              </span>
            </div>
          </div>
        </div>

        {/* Local Master Data Panel */}
        <div className="card" style={{ borderTop: '4px solid var(--accent-purple)' }}>
          <div className="section-title">
            <Database size={18} />
            Status Data Master Alumni (Sistem Lokal SQLite)
          </div>
          {savedEvidence ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="empty-state" style={{ padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '8px' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--accent-green)', marginBottom: '8px', margin: '0 auto' }} />
                <h4 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--accent-green)' }}>Telah Tersimpan di Master Data SQLite</h4>
                <p style={{ fontSize: '12px' }}>Mahasiswa ini telah sukses ditambahkan ke Data Alumni Master.</p>
              </div>
              <div className="detail-item">
                <label>Status Verifikasi (Recorded)</label>
                <span className={`status-badge ${savedEvidence.matchStatus === 'Teridentifikasi' ? 'teridentifikasi' : savedEvidence.matchStatus.includes('Verifikasi') ? 'perlu-verifikasi' : 'belum-ditemukan'}`}>
                  {savedEvidence.matchStatus}
                </span>
              </div>
              <div className="detail-item">
                <label>Verifikator</label>
                <strong>{savedEvidence.verifiedBy}</strong>
              </div>
              {savedEvidence.notes && (
                <div className="detail-item">
                  <label>Catatan Admin</label>
                  <strong style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>"{savedEvidence.notes}"</strong>
                </div>
              )}
            </div>
          ) : (
             <div className="empty-state" style={{ padding: '20px 0' }}>
               <AlertTriangle size={32} style={{ color: 'var(--accent-amber)', marginBottom: '8px', margin: '0 auto' }} />
               <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Data Baru (Belum Tersimpan)</h4>
               <p style={{ fontSize: '12px' }}>NIM {pddiktiData.nim} belum ada di Data Alumni lokal Anda. Lakukan validasi dan simpan data ini untuk melakukan pelacakan jejak alumni.</p>
             </div>
          )}
        </div>
      </div>

      {!savedEvidence && (
        <div className="card">
          <div className="section-title">
            {confidenceScore >= 80 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            Masukan Status Awal ke Database Master (SQLite)
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Skoring otomatis deteksi kecocokan mencapai <strong style={{ color: getStatusColor(verificationStatus), marginLeft: '4px' }}>{verificationStatus}</strong>.
            Kirim Data ini ke Laporan Audit dengan menyimpannya.
          </p>

          <div className="form-group">
            <label className="form-label">Keputusan Validasi Manual</label>
            <select 
              className="form-select" 
              value={verificationStatus} 
              onChange={e => setVerificationStatus(e.target.value)}
            >
              <option value="Teridentifikasi">Konfirmasi Lulus Tervalidasi PDDikti</option>
              <option value="Perlu Verifikasi Manual">Ragu (Perlu Verifikasi Tambahan/Ijazah)</option>
              <option value="Mismatch">Tolak: Tidak Sesuai Data (Mismatch)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Catatan Tambahan (Opsional)</label>
            <textarea 
              className="form-input" 
              rows={2} 
              placeholder="Simpan catatan misal: Sudah di Cek Transkrip Nilai Asli dll..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleSaveEvidence}
            disabled={isSaving}
            style={{ width: '100%', padding: '12px', fontSize: '14px', gap: '8px' }}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            {isSaving ? 'Menyimpan Evidensi...' : 'Simpan ke Data Alumni Master'}
          </button>
        </div>
      )}
    </div>
  );
}
