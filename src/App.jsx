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

function App() {
  const [sources, setSources] = useState(initialSources);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-alumni" element={<DataAlumni />} />
          <Route path="/parameter" element={<ParameterPelacakan sources={sources} setSources={setSources} />} />
          <Route path="/jadwal" element={<JadwalPelacakan />} />
          <Route path="/jalankan" element={<JalankanPelacakan />} />
          <Route path="/laporan" element={<LaporanJejak />} />
          <Route path="/pddikti-search" element={<SearchAlumni />} />
          <Route path="/analyze/:nim" element={<AnalyzeProfile />} />
          <Route path="/audit" element={<AuditReport />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
