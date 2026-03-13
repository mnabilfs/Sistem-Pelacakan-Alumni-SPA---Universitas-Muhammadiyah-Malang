import { useState } from 'react';
import {
  CalendarClock,
  Clock,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  Settings2,
  Calendar,
  Timer,
  Users,
} from 'lucide-react';

export default function JadwalPelacakan() {
  const [scheduleConfig, setScheduleConfig] = useState({
    aktif: true,
    interval: 'mingguan',
    hariJadwal: 'Senin',
    waktuJadwal: '08:00',
    targetKriteria: 'belum-dilacak',
    maxAlumniPerBatch: 10,
    autoRetry: true,
    updateInterval: 6, // bulan
  });

  const [scheduleHistory] = useState([
    { id: 1, tanggal: '2026-03-10 08:00', status: 'Selesai', alumniDilacak: 5, berhasil: 3, gagal: 0, perluVerifikasi: 2 },
    { id: 2, tanggal: '2026-03-03 08:00', status: 'Selesai', alumniDilacak: 4, berhasil: 3, gagal: 1, perluVerifikasi: 0 },
    { id: 3, tanggal: '2026-02-24 08:00', status: 'Selesai', alumniDilacak: 6, berhasil: 4, gagal: 0, perluVerifikasi: 2 },
  ]);

  const handleChange = (key, value) => {
    setScheduleConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {/* Status Banner */}
      <div className="card" style={{ marginBottom: '20px', background: scheduleConfig.aktif ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', borderColor: scheduleConfig.aktif ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {scheduleConfig.aktif ? <Play size={20} style={{ color: 'var(--accent-green)' }} /> : <Pause size={20} style={{ color: 'var(--accent-red)' }} />}
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                Scheduler {scheduleConfig.aktif ? 'Aktif' : 'Nonaktif'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {scheduleConfig.aktif
                  ? `Jadwal berikutnya: Senin, 17 Maret 2026 pukul ${scheduleConfig.waktuJadwal}`
                  : 'Scheduler dinonaktifkan. Aktifkan untuk menjalankan pelacakan otomatis.'
                }
              </div>
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={scheduleConfig.aktif} onChange={() => handleChange('aktif', !scheduleConfig.aktif)} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Configuration */}
      <div className="scheduler-config" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="section-title">
            <Calendar size={18} />
            Jadwal Pelacakan
          </div>
          <div className="form-group">
            <label className="form-label">Interval</label>
            <select className="form-select" value={scheduleConfig.interval} onChange={e => handleChange('interval', e.target.value)}>
              <option value="harian">Harian</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>
          {scheduleConfig.interval === 'mingguan' && (
            <div className="form-group">
              <label className="form-label">Hari</label>
              <select className="form-select" value={scheduleConfig.hariJadwal} onChange={e => handleChange('hariJadwal', e.target.value)}>
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Waktu Eksekusi</label>
            <input className="form-input" type="time" value={scheduleConfig.waktuJadwal} onChange={e => handleChange('waktuJadwal', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <Users size={18} />
            Kriteria Pemilihan Alumni
          </div>
          <div className="form-group">
            <label className="form-label">Target Pelacakan</label>
            <select className="form-select" value={scheduleConfig.targetKriteria} onChange={e => handleChange('targetKriteria', e.target.value)}>
              <option value="belum-dilacak">Belum Pernah Dilacak</option>
              <option value="perlu-verifikasi">Perlu Verifikasi Ulang</option>
              <option value="perlu-update">Perlu Pembaruan (≥6 bulan)</option>
              <option value="semua">Semua Alumni</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Maks. Alumni per Batch</label>
            <input className="form-input" type="number" min="1" max="50" value={scheduleConfig.maxAlumniPerBatch} onChange={e => handleChange('maxAlumniPerBatch', parseInt(e.target.value) || 10)} />
          </div>
          <div className="form-group">
            <label className="form-label">Interval Pembaruan (bulan)</label>
            <input className="form-input" type="number" min="1" max="24" value={scheduleConfig.updateInterval} onChange={e => handleChange('updateInterval', parseInt(e.target.value) || 6)} />
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <Settings2 size={18} />
            Pengaturan Tambahan
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>Auto Retry Gagal</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Otomatis coba ulang alumni yang gagal dilacak</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={scheduleConfig.autoRetry} onChange={() => handleChange('autoRetry', !scheduleConfig.autoRetry)} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Notifikasi</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email notifikasi dikirim ke admin@umm.ac.id setelah job selesai</div>
          </div>
        </div>
      </div>

      {/* Schedule History */}
      <div className="card">
        <div className="section-title">
          <Clock size={18} />
          Riwayat Jadwal Pelacakan
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Status</th>
                <th>Alumni Dilacak</th>
                <th>Berhasil</th>
                <th>Perlu Verifikasi</th>
                <th>Gagal</th>
              </tr>
            </thead>
            <tbody>
              {scheduleHistory.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{h.tanggal}</td>
                  <td><span className="status-badge teridentifikasi"><CheckCircle2 size={12} /> {h.status}</span></td>
                  <td>{h.alumniDilacak}</td>
                  <td style={{ color: 'var(--accent-green)' }}>{h.berhasil}</td>
                  <td style={{ color: 'var(--accent-amber)' }}>{h.perluVerifikasi}</td>
                  <td style={{ color: h.gagal > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{h.gagal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
