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
  UserCheck
} from 'lucide-react';
import { getMahasiswaPDDiktiByNim } from '../utils/pddiktiService';
import { saveTrackingEvidence, getEvidenceByNim } from '../utils/sqliteMock';

export default function AnalyzeProfile() {
  const { nim } = useParams();
  const navigate = useNavigate();

  const [pddiktiData, setPddiktiData] = useState(null);
  const [savedEvidence, setSavedEvidence] = useState(null);
  const [masterData, setMasterData] = useState(null);
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

        try {
          const apiBase = import.meta.env.VITE_API_BASE || '/api';
          const mRes = await fetch(`${apiBase}/master/${nim}`);
          if (mRes.ok) {
            const mData = await mRes.json();
            setMasterData(mData);
          }
        } catch (e) {
          console.error("Master data fetch error:", e);
        }

        if (pData) {
          calculateInitialScore(pData, evidence, masterData);
        } else {
          // If no PDDikti data, fallback initialization
          if (evidence) {
            setVerificationStatus(evidence.matchStatus);
            setConfidenceScore(evidence.confidenceScore);
          } else {
            setVerificationStatus('Mismatch');
            setConfidenceScore(0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (nim) fetchData();
  }, [nim]);

  const calculateInitialScore = (pData, evData, mData) => {
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

      let localDataSkeleton = masterData || {
          nama: pddiktiData ? pddiktiData.nama : nim,
          nim: pddiktiData ? pddiktiData.nim : nim,
          prodi: pddiktiData ? pddiktiData.prodi : ''
      };
      
      // Preserve enrichment data if the user had previously filled it out
      if (savedEvidence?.rawData?.local?.enrichment) {
          localDataSkeleton.enrichment = savedEvidence.rawData.local.enrichment;
      }

      const fallbackPddikti = pddiktiData || {
          nama: masterData?.nama || 'Unknown',
          nim: nim,
          statusAkhir: 'Tidak Diketahui',
          pt: masterData?.fakultas || '-',
          prodi: masterData?.program_studi || '-'
      };

      await saveTrackingEvidence(fallbackPddikti, localDataSkeleton, result);
      
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
            {pddiktiData ? (
             <>
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
             </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--accent-red)' }}>
                <XCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <strong>Data PDDikti Tidak Ditemukan</strong>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Mahasiswa ini mungkin belum terdaftar di DIKTI atau API timeout.</div>
              </div>
            )}
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
               <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Data Pelacakan Baru (Belum Tersimpan)</h4>
               <p style={{ fontSize: '12px' }}>Lakukan pelacakan dan simpan data ini untuk melakukan pelacakan jejak alumni.</p>
             </div>
          )}

          {savedEvidence?.rawData?.local?.enrichment && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px' }}>
               <h4 style={{ fontSize: '13px', color: 'var(--accent-purple)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <UserCheck size={14} /> Update Profil oleh Alumni (Menunggu Verifikasi)
               </h4>
               <div className="detail-item"><label>Status Kerja</label><strong>{savedEvidence.rawData.local.enrichment.statusKerja}</strong></div>
               <div className="detail-item"><label>Tempat Kerja</label><strong>{savedEvidence.rawData.local.enrichment.tempatKerja || '-'}</strong></div>
               <div className="detail-item"><label>Posisi</label><strong>{savedEvidence.rawData.local.enrichment.posisi || '-'}</strong></div>
               <div className="detail-item"><label>Email</label><strong>{savedEvidence.rawData.local.enrichment.email || '-'}</strong></div>
               <div className="detail-item"><label>No Telepon</label><strong>{savedEvidence.rawData.local.enrichment.phone || '-'}</strong></div>
               <div className="detail-item"><label>LinkedIn</label><strong>{savedEvidence.rawData.local.enrichment.linkedin || '-'}</strong></div>
            </div>
          )}

          {masterData ? (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Data Ditemukan di Sistem Database Alumni:</h4>
              <div className="detail-item">
                <label>Nama Lulusan</label>
                <strong>{masterData.nama}</strong>
              </div>
              <div className="detail-item">
                <label>NIM</label>
                <strong>{masterData.nim}</strong>
              </div>
              <div className="detail-item">
                <label>Tahun Masuk</label>
                <strong>{masterData.tahun_masuk}</strong>
              </div>
              <div className="detail-item">
                <label>Tanggal Lulus</label>
                <strong>{masterData.tanggal_lulus}</strong>
              </div>
              <div className="detail-item">
                <label>Fakultas</label>
                <strong>{masterData.fakultas}</strong>
              </div>
              <div className="detail-item">
                <label>Program Studi</label>
                <strong>{masterData.program_studi}</strong>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '12px', background: 'var(--bg-input)', marginTop: '20px' }}>
               <AlertTriangle size={24} style={{ color: 'var(--accent-red)', marginBottom: '8px', margin: '0 auto' }} />
               <h4 style={{ fontSize: '12px', marginBottom: '4px' }}>Tidak Ada di Master Data (CSV)</h4>
               <p style={{ fontSize: '11px' }}>NIM {pddiktiData.nim} tidak ditemukan dalam daftar alumni master.</p>
            </div>
          )}
        </div>
      </div>

        <div className="card">
          <div className="section-title">
            {confidenceScore >= 80 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            {savedEvidence ? 'Pembaruan Keputusan Audit (Update Log)' : 'Masukan Status Awal ke Database Master (SQLite)'}
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
            {isSaving ? 'Menyimpan Evidensi...' : (savedEvidence ? 'Perbarui Keputusan Audit' : 'Simpan ke Data Alumni Master')}
          </button>
        </div>
    </div>
  );
}
