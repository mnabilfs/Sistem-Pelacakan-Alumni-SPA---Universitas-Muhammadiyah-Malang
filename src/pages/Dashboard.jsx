import { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Search as SearchIcon,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';

export default function Dashboard({ alumni, trackingResults }) {
  const stats = useMemo(() => {
    const total = alumni.length;
    const teridentifikasi = alumni.filter(a => a.statusPelacakan === 'Teridentifikasi').length;
    const perluVerifikasi = alumni.filter(a => a.statusPelacakan === 'Perlu Verifikasi').length;
    const belumDilacak = alumni.filter(a => a.statusPelacakan === 'Belum Dilacak').length;
    const belumDitemukan = alumni.filter(a => a.statusPelacakan === 'Belum Ditemukan').length;
    const avgConfidence = trackingResults.length > 0
      ? Math.round(trackingResults.reduce((sum, r) => sum + r.confidenceScore, 0) / trackingResults.length)
      : 0;
    return { total, teridentifikasi, perluVerifikasi, belumDilacak, belumDitemukan, avgConfidence };
  }, [alumni, trackingResults]);

  const recentActivities = useMemo(() => {
    return [...trackingResults]
      .sort((a, b) => new Date(b.tanggalPelacakan) - new Date(a.tanggalPelacakan))
      .slice(0, 5)
      .map(r => {
        const al = alumni.find(a => a.id === r.alumniId);
        return { ...r, alumniNama: al?.nama || 'Unknown' };
      });
  }, [trackingResults, alumni]);

  const prodiDistribution = useMemo(() => {
    const dist = {};
    alumni.forEach(a => { dist[a.prodi] = (dist[a.prodi] || 0) + 1; });
    return Object.entries(dist).map(([prodi, count]) => ({ prodi, count }));
  }, [alumni]);

  return (
    <div>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="card stat-card blue animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon blue"><Users size={20} /></div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">Total Alumni</div>
        </div>

        <div className="card stat-card green animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><CheckCircle2 size={20} /></div>
          </div>
          <div className="stat-card-value">{stats.teridentifikasi}</div>
          <div className="stat-card-label">Teridentifikasi</div>
        </div>

        <div className="card stat-card amber animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon amber"><AlertTriangle size={20} /></div>
          </div>
          <div className="stat-card-value">{stats.perluVerifikasi}</div>
          <div className="stat-card-label">Perlu Verifikasi</div>
        </div>

        <div className="card stat-card purple animate-in">
          <div className="stat-card-header">
            <div className="stat-card-icon purple"><SearchIcon size={20} /></div>
          </div>
          <div className="stat-card-value">{stats.belumDilacak}</div>
          <div className="stat-card-label">Belum Dilacak</div>
        </div>
      </div>

      {/* Second Row */}
      <div className="two-col" style={{ marginBottom: '24px' }}>
        {/* Status Distribution */}
        <div className="card animate-in">
          <div className="section-title">
            <BarChart3 size={18} />
            Distribusi Status Pelacakan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Teridentifikasi', count: stats.teridentifikasi, color: 'var(--accent-green)', pct: Math.round((stats.teridentifikasi/stats.total)*100) },
              { label: 'Perlu Verifikasi', count: stats.perluVerifikasi, color: 'var(--accent-amber)', pct: Math.round((stats.perluVerifikasi/stats.total)*100) },
              { label: 'Belum Dilacak', count: stats.belumDilacak, color: 'var(--text-muted)', pct: Math.round((stats.belumDilacak/stats.total)*100) },
              { label: 'Belum Ditemukan', count: stats.belumDitemukan, color: 'var(--accent-red)', pct: Math.round((stats.belumDitemukan/stats.total)*100) },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: item.color }}>{item.count} ({item.pct}%)</span>
                </div>
                <div className="confidence-bar">
                  <div style={{ width: `${item.pct}%`, height: '100%', borderRadius: '3px', background: item.color, transition: 'width 0.6s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card animate-in">
          <div className="section-title">
            <TrendingUp size={18} />
            Ringkasan Performa
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rata-rata Confidence</span>
              <span className={`confidence-text ${stats.avgConfidence >= 75 ? 'high' : stats.avgConfidence >= 45 ? 'medium' : 'low'}`}>{stats.avgConfidence}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Pelacakan Selesai</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-blue)' }}>{trackingResults.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tingkat Keberhasilan</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-green)' }}>{stats.total > 0 ? Math.round(((stats.teridentifikasi) / stats.total) * 100) : 0}%</span>
            </div>
            {prodiDistribution.map(({ prodi, count }) => (
              <div key={prodi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{prodi}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-purple)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card animate-in">
        <div className="section-title">
          <Activity size={18} />
          Aktivitas Pelacakan Terbaru
        </div>
        {recentActivities.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <h3>Belum Ada Aktivitas</h3>
            <p>Jalankan pelacakan untuk melihat aktivitas terbaru</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivities.map((act, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon" style={{
                  background: act.status === 'Teridentifikasi' ? 'rgba(16,185,129,0.12)' : act.status === 'Perlu Verifikasi' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)',
                  color: act.status === 'Teridentifikasi' ? 'var(--accent-green)' : act.status === 'Perlu Verifikasi' ? 'var(--accent-amber)' : 'var(--text-muted)',
                }}>
                  {act.status === 'Teridentifikasi' ? <CheckCircle2 size={18} /> : act.status === 'Perlu Verifikasi' ? <AlertTriangle size={18} /> : <SearchIcon size={18} />}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{act.alumniNama}</div>
                  <div className="activity-desc">{act.ringkasan}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="activity-time">{new Date(act.tanggalPelacakan).toLocaleDateString('id-ID')}</div>
                  <div className={`confidence-text ${act.confidenceScore >= 75 ? 'high' : act.confidenceScore >= 45 ? 'medium' : 'low'}`} style={{ fontSize: '14px' }}>
                    {act.confidenceScore}%
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
