import { useState } from 'react';
import { ShieldCheck, UserCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
      const userUsername = import.meta.env.VITE_USER_USERNAME;
      const userPassword = import.meta.env.VITE_USER_PASSWORD;

      if (username === adminUsername && password === adminPassword) {
        onLogin('admin');
      } else if (username === userUsername && password === userPassword) {
        onLogin('user');
      } else {
        setError('Username atau password tidak valid!');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-default)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'var(--gradient-blue)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 16px' }}>
            <ShieldCheck size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Login SPA</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Sistem Pelacakan Alumni</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Username</label>
            <div className="search-bar" style={{ padding: '0', background: 'transparent' }}>
               <UserCircle2 size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
               <input
                 className="form-input"
                 style={{ paddingLeft: '36px', width: '100%' }}
                 placeholder="admin / user"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 autoFocus
                 required
               />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Password</label>
            <input
              type="password"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="spinner" /> : <><ArrowRight size={18} /> Masuk</>}
          </button>
        </form>
      </div>
    </div>
  );
}
