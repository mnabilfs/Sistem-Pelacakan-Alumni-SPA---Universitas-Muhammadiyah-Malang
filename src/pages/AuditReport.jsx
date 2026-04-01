import { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  DatabaseZap,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getAuditReport, clearAuditReport, deleteEvidenceById } from '../utils/sqliteMock';

export default function AuditReport() {
  const [audits, setAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditReport();
      setAudits(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleClear = () => {
    if (window.confirm('Hapus seluruh history Audit (Mock SQLite)?')) {
      clearAuditReport();
      setAudits([]);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data log ini?')) {
      await deleteEvidenceById(id);
      setAudits(audits.filter((a) => a.id !== id));
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Teridentifikasi') return <ShieldCheck size={16} className="text-green-500" />;
    if (status.includes('Verifikasi')) return <AlertTriangle size={16} className="text-amber-500" />;
    return <ShieldAlert size={16} className="text-red-500" />;
  };

  const getConfidenceLevel = (score) => {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px', background: 'var(--gradient-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <DatabaseZap size={20} style={{ color: 'var(--accent-purple)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Log Audit Tracking (SQLite)</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Log penyimpanan hasil pencarian data Scraped dari Real Data PDDikti.
            </p>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleClear}
            style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
          >
            <Trash2 size={14} /> Reset Data Table
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Loader2 size={40} className="spinner" style={{ color: 'var(--accent-purple)', marginBottom: '16px' }} />
          <h3>Menarik Log Database...</h3>
        </div>
      ) : audits.length === 0 ? (
        <div className="empty-state">
          <FileText size={44} style={{ opacity: 0.5 }} />
          <h3>Tidak Ada Audit Log</h3>
          <p>Belum ada pelacakan Real-PDDikti yang di-_Save_ Admin.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal Rekam</th>
                <th>Alumni (PDDikti)</th>
                <th>Status Keputusan</th>
                <th>C-Score</th>
                <th>Penerbit (Verifikator)</th>
                <th>Notes</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <Clock size={12} />
                      {new Date(item.timestamp).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{item.nama}</div>
                    <code style={{ fontSize: '11px', background: 'var(--bg-input)', padding: '2px 4px', borderRadius: '4px' }}>NIM: {item.nim}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getStatusIcon(item.matchStatus)}
                      <span className={`status-badge ${item.matchStatus === 'Teridentifikasi' ? 'teridentifikasi' : item.matchStatus.includes('Verifikasi') ? 'perlu-verifikasi' : 'belum-ditemukan'}`}>
                        {item.matchStatus}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`confidence-text ${getConfidenceLevel(item.confidenceScore)}`}>
                      {item.confidenceScore}%
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', fontWeight: '500' }}>{item.verifiedBy}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.notes || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-icon" 
                      onClick={() => handleDelete(item.id)}
                      title="Hapus Data Ini"
                      style={{ color: 'var(--accent-red)', padding: '6px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
