import { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, CheckCircle2 } from 'lucide-react';

export default function JalankanPelacakan() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [targetStatus, setTargetStatus] = useState('Belum Dilacak');
  const [sumberTarget, setSumberTarget] = useState('Data Master DB');
  const [batasiKuota, setBatasiKuota] = useState('10');
  const [spesifikNIM, setSpesifikNIM] = useState('');
  const [tahunMasuk, setTahunMasuk] = useState('');
  const [numWorkers, setNumWorkers] = useState('1');

  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Cek apakah ada job yang sedang berjalan di background saat komponen dimuat
  useEffect(() => {
    let es = new EventSource('/api/track/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.isDone && data.log === '[SYSTEM] Idle.') {
        // Tidak ada proses yang jalan di server
        es.close();
      } else {
        // Ada proses yang sedang jalan, atau log sedang di-stream
        setIsRunning(true);
        const logText = data.log.includes('[') ? data.log : `[${new Date().toLocaleTimeString()}] ${data.log}`;
        setLogs(prev => {
          // Cegah duplikasi jika React Strict Mode memanggil ulang
          if (prev[prev.length - 1] !== logText) {
            return [...prev, logText];
          }
          return prev;
        });

        if (data.isDone) {
          setIsRunning(false);
          es.close();
        }
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startTracking = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setLogs([`[${new Date().toLocaleTimeString()}] 🚀 Memulai inisialisasi mesin pelacakan...`]);

    let url = `/api/track/stream?status=${encodeURIComponent(targetStatus)}&workers=${numWorkers}&`;
    if (spesifikNIM.trim()) {
      url += `nim=${spesifikNIM.trim()}`;
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🎯 Mode Target Tunggal: NIM ${spesifikNIM}`]);
    } else {
      url += `limit=${batasiKuota}`;
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📊 Mode Batch aktif: Kuota limit = ${batasiKuota} alumni`]);
    }

    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📡 Menghubungkan ke API Scraper...`]);

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.isDone) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${data.log}`]);
        setIsRunning(false);
        es.close();
      } else {
        // Tampilkan teks dengan formatting waktu
        const logText = data.log.includes('[') ? data.log : `[${new Date().toLocaleTimeString()}] ${data.log}`;
        setLogs(prev => [...prev, logText]);
      }
    };

    es.onerror = (err) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Terjadi kesalahan pada koneksi ke server pelacakan.`]);
      setIsRunning(false);
      es.close();
    };
  };

  const stopTracking = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsRunning(false);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏹️ Mengirim sinyal berhenti ke server...`]);
    try {
      await fetch('/api/track/stop', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="tracking-container">
      {/* Left Panel */}
      <div className="tracking-left-panel">
        
        {/* TARGET SET */}
        <div>
          <div className="hacker-title">EXECUTE_JOB</div>
          <div className="hacker-card">
            <div className="hacker-section-label">TARGET SET</div>
            
            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color="#a3ff00" /> Target Status:
              </label>
              <select className="hacker-form-input" value={targetStatus} onChange={e => setTargetStatus(e.target.value)} disabled={isRunning}>
                <option value="Belum Dilacak">Belum Dilacak</option>
                <option value="Semua">Semua Alumni</option>
                <option value="Perlu Verifikasi">Perlu Verifikasi</option>
              </select>
            </div>
            
            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color="#a3ff00" /> Sumber Target:
              </label>
              <select className="hacker-form-input" value={sumberTarget} onChange={e => setSumberTarget(e.target.value)} disabled={isRunning}>
                <option value="Data Master DB">Data Master DB</option>
                <option value="PDDikti API">PDDikti API</option>
              </select>
            </div>

            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color="#a3ff00" /> Batasi Kuota:
              </label>
              <input 
                type="number" 
                className="hacker-form-input" 
                value={batasiKuota} 
                onChange={e => setBatasiKuota(e.target.value)} 
                disabled={isRunning || spesifikNIM.length > 0}
              />
            </div>

            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color="#a3ff00" /> Worker Paralel:
              </label>
              <select className="hacker-form-input" value={numWorkers} onChange={e => setNumWorkers(e.target.value)} disabled={isRunning || spesifikNIM.length > 0}>
                <option value="1">1 (Sekuensial)</option>
                <option value="2">2 Paralel</option>
                <option value="3">3 Paralel</option>
                <option value="4">4 Paralel</option>
                <option value="5">5 Paralel</option>
              </select>
            </div>

            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color={spesifikNIM ? "#a3ff00" : "#666"} /> Spesifik NIM:
              </label>
              <input 
                type="text" 
                className="hacker-form-input" 
                placeholder="Misal: 2015100..." 
                value={spesifikNIM}
                onChange={e => setSpesifikNIM(e.target.value)}
                disabled={isRunning}
              />
            </div>

            <div className="hacker-form-row">
              <label>
                <CheckCircle2 size={14} color={tahunMasuk ? "#a3ff00" : "#666"} /> Tahun Masuk:
              </label>
              <input 
                type="text" 
                className="hacker-form-input" 
                placeholder="Misal: 2015" 
                value={tahunMasuk}
                onChange={e => setTahunMasuk(e.target.value)}
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '0 8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Status Koneksi Server: <span style={{ color: '#10b981' }}>Terhubung</span></span>
        </div>

        {/* Start Button */}
        <div style={{ marginTop: 'auto' }}>
          {!isRunning ? (
            <button className="hacker-btn" onClick={startTracking}>
              <Play size={16} /> MULAI PELACAKAN ({spesifikNIM ? '1' : batasiKuota})
            </button>
          ) : (
            <button className="hacker-btn" style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }} onClick={stopTracking}>
              <Square size={16} /> BERHENTI MENGAMBIL DATA
            </button>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="tracking-right-panel">
        <div className="hacker-title" style={{ borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '16px' }}>
          SYSTEM_LOG
          <span className={isRunning ? 'badge-running' : 'badge-idle'}>
            {isRunning ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
        
        <div className="terminal-logs">
          {logs.length === 0 && (
            <span style={{ color: '#666' }}>&gt;_ Menunggu perintah eksekusi...</span>
          )}
          {logs.map((log, index) => {
            let className = "log-line";
            if (log.includes('❌') || log.includes('Error') || log.includes('[WARNING/ERROR]')) className += ' error';
            else if (log.includes('⚠️') || log.includes('Mismatch')) className += ' warn';
            else if (log.includes('✅') || log.includes('Tersimpan') || log.includes('Ditemukan')) className += ' success';
            else if (log.includes('🔍') || log.includes('Memproses') || log.includes('API')) className += ' info';
            
            return (
              <div key={index} className={className}>
                {log}
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
