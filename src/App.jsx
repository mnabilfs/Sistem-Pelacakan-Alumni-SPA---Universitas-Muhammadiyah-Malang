import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataAlumni from './pages/DataAlumni';
import ParameterPelacakan from './pages/ParameterPelacakan';
import JadwalPelacakan from './pages/JadwalPelacakan';
import JalankanPelacakan from './pages/JalankanPelacakan';
import LaporanJejak from './pages/LaporanJejak';
import SearchAlumni from './pages/SearchAlumni';
import AnalyzeProfile from './pages/AnalyzeProfile';
import AuditReport from './pages/AuditReport';
import { initialSources } from './data/mockSources';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';

function App() {
  // Simple auth state
  const [role, setRole] = useState(sessionStorage.getItem('authRole') || null);
  const [sources, setSources] = useState(initialSources);

  const handleLogin = (selectedRole) => {
    sessionStorage.setItem('authRole', selectedRole);
    setRole(selectedRole);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authRole');
    setRole(null);
  };

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout role={role} onLogout={handleLogout}>
        <Routes>
          {role === 'admin' ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data-alumni" element={<DataAlumni />} />
              <Route path="/parameter" element={<ParameterPelacakan sources={sources} setSources={setSources} />} />
              <Route path="/jadwal" element={<JadwalPelacakan />} />
              <Route path="/jalankan" element={<JalankanPelacakan />} />
              <Route path="/laporan" element={<LaporanJejak />} />
              <Route path="/pddikti-search" element={<SearchAlumni />} />
              <Route path="/analyze/:nim" element={<AnalyzeProfile />} />
              <Route path="/audit" element={<AuditReport />} />
              <Route path="*" element={<Dashboard />} />
            </>
          ) : (
             <>
              <Route path="/" element={<UserDashboard />} />
              <Route path="*" element={<UserDashboard />} />
             </>
          )}
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
