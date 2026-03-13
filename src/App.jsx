import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataAlumni from './pages/DataAlumni';
import ParameterPelacakan from './pages/ParameterPelacakan';
import JadwalPelacakan from './pages/JadwalPelacakan';
import JalankanPelacakan from './pages/JalankanPelacakan';
import LaporanJejak from './pages/LaporanJejak';
import { initialAlumniData } from './data/mockAlumni';
import { initialSources } from './data/mockSources';
import { initialTrackingResults } from './data/mockTrackingResults';

function App() {
  const [alumni, setAlumni] = useState(initialAlumniData);
  const [sources, setSources] = useState(initialSources);
  const [trackingResults, setTrackingResults] = useState(initialTrackingResults);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={
            <Dashboard alumni={alumni} trackingResults={trackingResults} />
          } />
          <Route path="/data-alumni" element={
            <DataAlumni alumni={alumni} setAlumni={setAlumni} />
          } />
          <Route path="/parameter" element={
            <ParameterPelacakan sources={sources} setSources={setSources} />
          } />
          <Route path="/jadwal" element={
            <JadwalPelacakan />
          } />
          <Route path="/jalankan" element={
            <JalankanPelacakan
              alumni={alumni}
              setAlumni={setAlumni}
              trackingResults={trackingResults}
              setTrackingResults={setTrackingResults}
            />
          } />
          <Route path="/laporan" element={
            <LaporanJejak alumni={alumni} trackingResults={trackingResults} />
          } />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
