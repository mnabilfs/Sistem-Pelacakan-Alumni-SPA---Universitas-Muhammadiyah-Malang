import { useState } from 'react';
import {
  GraduationCap,
  Fingerprint,
  FlaskConical,
  Briefcase,
  Code,
  Building2,
  Globe,
  BarChart3,
  Settings2,
  ArrowUp,
  ArrowDown,
  Shield,
} from 'lucide-react';

const iconMap = {
  GraduationCap, Fingerprint, FlaskConical, Briefcase, Code, Building2, Globe, BarChart3,
};

export default function ParameterPelacakan({ sources, setSources }) {
  const [filterTipe, setFilterTipe] = useState('');

  const filtered = sources.filter(s => !filterTipe || s.tipe === filterTipe);

  const toggleSource = (id) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, aktif: !s.aktif } : s));
  };

  const changePriority = (id, delta) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, prioritas: Math.max(1, Math.min(5, s.prioritas + delta)) };
      }
      return s;
    }));
  };

  const tipeColors = {
    'Akademik': 'var(--accent-purple)',
    'Profesional': 'var(--accent-blue)',
    'Teknologi': 'var(--accent-cyan)',
    'Institusi': 'var(--accent-green)',
    'Umum': 'var(--text-muted)',
  };

  return (
    <div>
      {/* Header Info */}
      <div className="card" style={{ marginBottom: '20px', background: 'var(--gradient-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '14px', fontWeight: '600' }}>Konfigurasi Sumber Pelacakan Publik</span>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Kelola sumber publik yang digunakan untuk pelacakan alumni. Aktifkan/nonaktifkan sumber, dan atur prioritas pencarian.
          Sumber diurutkan berdasarkan prioritas (1 = tertinggi). Pastikan hanya menggunakan sumber yang sesuai dengan Terms of Service.
        </p>
      </div>

      {/* Filter */}
      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" style={{ width: '200px' }} value={filterTipe} onChange={e => setFilterTipe(e.target.value)}>
            <option value="">Semua Tipe Sumber</option>
            <option value="Akademik">Akademik</option>
            <option value="Profesional">Profesional</option>
            <option value="Teknologi">Teknologi</option>
            <option value="Institusi">Institusi</option>
            <option value="Umum">Umum</option>
          </select>
        </div>
        <div className="toolbar-right">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {sources.filter(s => s.aktif).length} dari {sources.length} sumber aktif
          </span>
        </div>
      </div>

      {/* Source Grid */}
      <div className="source-grid">
        {filtered.map(source => {
          const IconComp = iconMap[source.icon] || Globe;
          return (
            <div key={source.id} className="card source-card" style={{ opacity: source.aktif ? 1 : 0.5 }}>
              <div className="source-icon" style={{
                background: `${tipeColors[source.tipe]}15`,
                color: tipeColors[source.tipe],
              }}>
                <IconComp size={22} />
              </div>
              <div className="source-info">
                <div className="source-name">{source.nama}</div>
                <div className="source-desc">{source.deskripsi}</div>
                <div className="source-type" style={{ color: tipeColors[source.tipe] }}>
                  {source.tipe} • Prioritas {source.prioritas}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <label className="toggle">
                  <input type="checkbox" checked={source.aktif} onChange={() => toggleSource(source.id)} />
                  <span className="toggle-slider"></span>
                </label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => changePriority(source.id, -1)} title="Naikkan prioritas">
                    <ArrowUp size={12} />
                  </button>
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => changePriority(source.id, 1)} title="Turunkan prioritas">
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Rules */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="section-title">
          <Settings2 size={18} />
          Aturan Prioritas Berdasarkan Tipe Alumni
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipe Alumni</th>
                <th>Sumber Prioritas 1</th>
                <th>Sumber Prioritas 2</th>
                <th>Sumber Prioritas 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Validasi Dasar (API Asli)</td>
                <td><span className="chip" style={{ background: 'var(--accent-blue)', color: 'white', borderColor: 'transparent' }}>PDDikti (Rone Dev)</span></td>
                <td><span className="chip">Sistem Internal UMM</span></td>
                <td>-</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Alumni Akademik / Peneliti</td>
                <td><span className="chip">Google Scholar</span></td>
                <td><span className="chip">ORCID</span></td>
                <td><span className="chip">ResearchGate</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Alumni Profesional</td>
                <td><span className="chip">LinkedIn</span></td>
                <td><span className="chip">Situs Kampus</span></td>
                <td><span className="chip">Google Web</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Alumni Developer / IT</td>
                <td><span className="chip">LinkedIn</span></td>
                <td><span className="chip">GitHub</span></td>
                <td><span className="chip">Kaggle</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
