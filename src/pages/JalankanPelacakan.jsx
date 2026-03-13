import { useState, useCallback } from 'react';
import {
  Radar,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ListFilter,
  RotateCcw,
} from 'lucide-react';
import { runTrackingSimulation } from '../utils/trackingSimulator';

export default function JalankanPelacakan({ alumni, setAlumni, trackingResults, setTrackingResults }) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState([]);
  const [steps, setSteps] = useState([]);
  const [currentAlumniName, setCurrentAlumniName] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [filterTarget, setFilterTarget] = useState('belum-dilacak');
  const [results, setResults] = useState([]);

  const eligibleAlumni = alumni.filter(a => {
    switch (filterTarget) {
      case 'belum-dilacak': return a.statusPelacakan === 'Belum Dilacak';
      case 'perlu-verifikasi': return a.statusPelacakan === 'Perlu Verifikasi';
      case 'belum-ditemukan': return a.statusPelacakan === 'Belum Ditemukan';
      case 'semua': return true;
      default: return a.statusPelacakan === 'Belum Dilacak';
    }
  });

  const toggleSelect = (id) => {
    setSelectedAlumni(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAlumni.length === eligibleAlumni.length) {
      setSelectedAlumni([]);
    } else {
      setSelectedAlumni(eligibleAlumni.map(a => a.id));
    }
  };

  const runTracking = useCallback(async () => {
    if (selectedAlumni.length === 0) return;

    setIsRunning(true);
    setCompletedCount(0);
    setResults([]);

    const toTrack = alumni.filter(a => selectedAlumni.includes(a.id));
    const newResults = [];

    for (let i = 0; i < toTrack.length; i++) {
      const al = toTrack[i];
      setCurrentAlumniName(al.nama);
      setSteps([]);

      const result = await runTrackingSimulation(al, (stepInfo) => {
        setSteps(prev => {
          const existing = prev.findIndex(s => s.step === stepInfo.step);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = stepInfo;
            return updated;
          }
          return [...prev, stepInfo];
        });
      });

      newResults.push(result);
      setResults(prev => [...prev, { alumniNama: al.nama, ...result }]);
      setCompletedCount(i + 1);

      // Update alumni status
      setAlumni(prev => prev.map(a =>
        a.id === al.id ? { ...a, statusPelacakan: result.status } : a
      ));

      // Update tracking results
      setTrackingResults(prev => {
        const existing = prev.findIndex(r => r.alumniId === al.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = result;
          return updated;
        }
        return [...prev, result];
      });

      // Small delay between alumni
      if (i < toTrack.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setIsRunning(false);
    setSelectedAlumni([]);
  }, [selectedAlumni, alumni, setAlumni, setTrackingResults]);

  const stepList = [
    { step: 1, label: 'Menyiapkan Profil Target Pencarian' },
    { step: 2, label: 'Mencari di Sumber Publik' },
    { step: 3, label: 'Ekstraksi Sinyal & Scoring' },
    { step: 4, label: 'Cross-Validation Antar Sumber' },
    { step: 5, label: 'Menetapkan Status Alumni' },
    { step: 6, label: 'Menyimpan Jejak Bukti' },
  ];

  return (
    <div>
      {!isRunning && results.length === 0 && (
        <>
          {/* Selection Panel */}
          <div className="card" style={{ marginBottom: '20px', background: 'var(--gradient-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Radar size={20} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Pelacakan Alumni Manual</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Pilih alumni yang ingin dilacak. Sistem akan menjalankan proses pelacakan secara simulasi sesuai alur:
              Profil → Query → Pencarian → Ekstraksi → Scoring → Cross-Validation → Penyimpanan.
            </p>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <select className="form-select" style={{ width: '220px' }} value={filterTarget} onChange={e => { setFilterTarget(e.target.value); setSelectedAlumni([]); }}>
                <option value="belum-dilacak">Belum Pernah Dilacak</option>
                <option value="perlu-verifikasi">Perlu Verifikasi Ulang</option>
                <option value="belum-ditemukan">Belum Ditemukan (Retry)</option>
                <option value="semua">Semua Alumni</option>
              </select>
              <button className="btn btn-secondary" onClick={selectAll}>
                <ListFilter size={14} />
                {selectedAlumni.length === eligibleAlumni.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={runTracking} disabled={selectedAlumni.length === 0}>
                <Play size={16} />
                Jalankan Pelacakan ({selectedAlumni.length})
              </button>
            </div>
          </div>

          {/* Alumni List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eligibleAlumni.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <User size={40} />
                  <h3>Tidak Ada Alumni</h3>
                  <p>Tidak ada alumni yang memenuhi kriteria "{filterTarget}" saat ini</p>
                </div>
              </div>
            ) : (
              eligibleAlumni.map(al => (
                <div
                  key={al.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '14px 18px',
                    borderColor: selectedAlumni.includes(al.id) ? 'var(--accent-blue)' : undefined,
                    background: selectedAlumni.includes(al.id) ? 'var(--accent-blue-glow)' : undefined,
                  }}
                  onClick={() => toggleSelect(al.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '4px',
                      border: `2px solid ${selectedAlumni.includes(al.id) ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                      background: selectedAlumni.includes(al.id) ? 'var(--accent-blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selectedAlumni.includes(al.id) && <CheckCircle2 size={14} color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{al.nama}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {al.prodi} • Lulus {al.tahunLulus} • {al.kota}
                      </div>
                    </div>
                    <span className={`status-badge ${al.statusPelacakan === 'Perlu Verifikasi' ? 'perlu-verifikasi' : al.statusPelacakan === 'Belum Ditemukan' ? 'belum-ditemukan' : 'belum-dilacak'}`}>
                      {al.statusPelacakan}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Running State */}
      {isRunning && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>Menjalankan Pelacakan...</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {completedCount} / {selectedAlumni.length} alumni
              </span>
            </div>
            <div className="confidence-bar" style={{ height: '8px' }}>
              <div className="confidence-fill high" style={{ width: `${(completedCount / selectedAlumni.length) * 100}%` }}></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: 'var(--accent-blue)' }}>
              <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Melacak: {currentAlumniName}
            </div>
            <div className="simulation-container">
              {stepList.map(({ step, label }) => {
                const info = steps.find(s => s.step === step);
                const isDone = info?.done;
                const isActive = info && !isDone;
                return (
                  <div key={step} className={`sim-step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                    <div className="sim-step-indicator">
                      {isDone ? <CheckCircle2 size={14} /> : isActive ? <Loader2 size={14} className="spinner" style={{ border: 'none', animation: 'spin 0.8s linear infinite' }} /> : step}
                    </div>
                    <div className="sim-step-content">
                      <div className="sim-step-label">{info?.label || label}</div>
                      <div className="sim-step-detail">{info?.detail || 'Menunggu...'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!isRunning && results.length > 0 && (
        <div>
          <div className="card" style={{ marginBottom: '20px', background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--accent-green)' }} />
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Pelacakan Selesai!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {results.length} alumni berhasil dilacak
                </div>
              </div>
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setResults([])}>
                <RotateCcw size={14} />
                Lacak Lagi
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((r, i) => (
              <div key={i} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.alumniNama}</div>
                  <span className={`status-badge ${r.status === 'Teridentifikasi' ? 'teridentifikasi' : r.status === 'Perlu Verifikasi' ? 'perlu-verifikasi' : 'belum-ditemukan'}`}>
                    {r.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Confidence Score</div>
                    <span className={`confidence-text ${r.confidenceScore >= 75 ? 'high' : r.confidenceScore >= 45 ? 'medium' : 'low'}`} style={{ fontSize: '18px' }}>
                      {r.confidenceScore}%
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Kandidat Ditemukan</div>
                    <span style={{ fontSize: '18px', fontWeight: '700' }}>{r.kandidat?.length || 0}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Ringkasan</div>
                    <span style={{ fontSize: '13px' }}>{r.ringkasan}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
