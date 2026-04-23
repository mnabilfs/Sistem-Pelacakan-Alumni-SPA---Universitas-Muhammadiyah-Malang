import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Search as SearchIcon,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Globe,
  Database,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMaster: 0,
    trackedCount: 0,
    auditTeridentifikasi: 0,
    auditPerluVerifikasi: 0,
    auditMismatch: 0,
    avgAuditScore: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/dashboard-stats`);
        if (!response.ok) throw new Error('Gagal memuat data dashboard');
        const data = await response.json();
        
        setStats(data.stats);
        setRecentActivities(data.recentActivities);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  return (
    <div>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="card stat-card blue animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon blue"><Users size={20} /></div>
          </div>
          <div className="stat-card-value">{isLoading ? '...' : stats.totalMaster}</div>
          <div className="stat-card-label">Total Data Master (Supabase)</div>
        </div>

        <div className="card stat-card green animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><Database size={20} /></div>
          </div>
          <div className="stat-card-value">{isLoading ? '...' : stats.trackedCount}</div>
          <div className="stat-card-label">Telah Dilacak Web</div>
        </div>

        <div className="card stat-card purple animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon purple"><Globe size={20} /></div>
          </div>
          <div className="stat-card-value">{isLoading ? '...' : stats.auditTeridentifikasi}</div>
          <div className="stat-card-label">Terverifikasi Valid</div>
        </div>

        <div className="card stat-card amber animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon amber"><AlertTriangle size={20} /></div>
          </div>
          <div className="stat-card-value">{isLoading ? '...' : stats.auditPerluVerifikasi}</div>
          <div className="stat-card-label">Perlu Verifikasi</div>
        </div>
      </div>

      {/* Second Row */}
      <div className="two-col" style={{ marginBottom: '24px' }}>
        {/* Status Distribution - Master */}
        <div className="card animate-in">
          <div className="section-title">
            <BarChart3 size={18} />
            Distribusi Status Master Data
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Teridentifikasi (Valid)', count: stats.auditTeridentifikasi, color: 'var(--accent-green)' },
              { label: 'Perlu Verifikasi', count: stats.auditPerluVerifikasi, color: 'var(--accent-amber)' },
              { label: 'Mismatch (Tolak)', count: stats.auditMismatch, color: 'var(--accent-red)' },
              { label: 'Belum Dilacak (Web)', count: stats.totalMaster > stats.trackedCount ? stats.totalMaster - stats.trackedCount : 0, color: 'var(--text-muted)' },
            ].map((item) => {
              const rawPct = stats.totalMaster > 0 ? (item.count / stats.totalMaster) * 100 : 0;
              // Format teks: jika < 1% tapi > 0, tampilkan desimal (misal 0.1%), selain itu bulatkan
              const pctText = (rawPct > 0 && rawPct < 1) ? rawPct.toFixed(1) : Math.round(rawPct);
              // Format lebar bar: minimal 1% agar tetap terlihat meskipun datanya kecil
              const barWidth = item.count > 0 ? Math.max(1, rawPct) : 0;
              
              return (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: item.color }}>{isLoading ? '...' : `${item.count} (${pctText}%)`}</span>
                </div>
                <div className="confidence-bar">
                  <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: '3px', background: item.color, transition: 'width 0.6s ease' }}></div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Audit Stats */}
        <div className="card animate-in">
          <div className="section-title">
            <TrendingUp size={18} />
            Ringkasan Sistem
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rata-rata Confidence Database</span>
              <span className={`confidence-text ${stats.avgAuditScore >= 75 ? 'high' : stats.avgAuditScore >= 45 ? 'medium' : 'low'}`}>{isLoading ? '...' : `${stats.avgAuditScore}%`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Profil Dilacak Otomatis</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-blue)' }}>{isLoading ? '...' : stats.trackedCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Record Supabase</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{isLoading ? '...' : stats.totalMaster}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card animate-in">
        <div className="section-title">
          <Activity size={18} />
          Aktivitas Terbaru
        </div>
        {recentActivities.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <h3>Belum Ada Aktivitas</h3>
            <p>Jalankan pencarian profil PDDikti atau lacak profil untuk melihat log disini</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivities.map((act, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon" style={{
                  background: act.type === 'audit'
                    ? 'rgba(99,102,241,0.12)'
                    : act.status === 'Teridentifikasi' ? 'rgba(16,185,129,0.12)' : act.status === 'Perlu Verifikasi' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)',
                  color: act.type === 'audit'
                    ? 'var(--accent-purple)'
                    : act.status === 'Teridentifikasi' ? 'var(--accent-green)' : act.status === 'Perlu Verifikasi' ? 'var(--accent-amber)' : 'var(--text-muted)',
                }}>
                  {act.type === 'audit' ? <Database size={18} /> : act.status === 'Teridentifikasi' ? <CheckCircle2 size={18} /> : act.status === 'Perlu Verifikasi' ? <AlertTriangle size={18} /> : <SearchIcon size={18} />}
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {act.nama}
                    {act.type === 'audit' && <span style={{ fontSize: '10px', marginLeft: '8px', padding: '2px 6px', background: 'var(--accent-purple)', color: 'white', borderRadius: '4px' }}>AUDIT PDDikti</span>}
                    {act.type === 'tracking' && <span style={{ fontSize: '10px', marginLeft: '8px', padding: '2px 6px', background: 'var(--accent-blue)', color: 'white', borderRadius: '4px' }}>PELACAKAN</span>}
                  </div>
                  <div className="activity-desc">{act.detail}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="activity-time">{new Date(act.date).toLocaleDateString('id-ID')}</div>
                  <div className={`confidence-text ${act.score >= 75 ? 'high' : act.score >= 45 ? 'medium' : 'low'}`} style={{ fontSize: '14px' }}>
                    {act.score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
