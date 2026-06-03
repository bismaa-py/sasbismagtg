import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuratMasuk from './pages/SuratMasuk';
import SuratKeluar from './pages/SuratKeluar';
import SuratDetail from './pages/SuratDetail';
import ManageUsers from './pages/ManageUsers';
import ActivityLog from './pages/ActivityLog';
import Profile from './pages/Profile';
import History from './pages/History';
import ForgotPassword from './pages/ForgotPassword';
import PanduanPengguna from './pages/PanduanPengguna';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="surat-masuk" element={<SuratMasuk />} />
        <Route path="surat-keluar" element={<SuratKeluar />} />
        <Route path="surat-masuk/:id" element={<SuratDetail type="masuk" />} />
        <Route path="surat-keluar/:id" element={<SuratDetail type="keluar" />} />
        <Route path="kelola-pengguna" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />
        <Route path="log-aktivitas" element={<ProtectedRoute roles={['admin']}><ActivityLog /></ProtectedRoute>} />
        <Route path="profil" element={<Profile />} />
        <Route path="riwayat" element={<History />} />
        <Route path="panduan" element={<PanduanPengguna />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
