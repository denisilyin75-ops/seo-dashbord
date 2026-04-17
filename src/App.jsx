import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import { getToken } from './api/client.js';
import Layout from './components/Layout.jsx';
import AuthGate from './components/AuthGate.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import SiteDetail from './pages/SiteDetail.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return (
      <ToastProvider>
        <Login onSuccess={() => setAuthed(true)} />
      </ToastProvider>
    );
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <Layout>
            <Routes>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/sites/:id"    element={<SiteDetail />} />
              <Route path="/settings"     element={<Settings />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          <AuthGate />
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
