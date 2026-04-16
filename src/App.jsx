import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import SiteDetail from './pages/SiteDetail.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/sites/:id"    element={<SiteDetail />} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
}
