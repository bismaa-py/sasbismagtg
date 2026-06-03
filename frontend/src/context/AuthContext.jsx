import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // null = Semua Jabatan, number = specific jabatan filter
  const [activeJabatanFilter, setActiveJabatanFilterState] = useState(() => {
    const saved = localStorage.getItem('activeJabatanFilter');
    return saved ? JSON.parse(saved) : null;
  });

  const setActiveJabatanFilter = (val) => {
    setActiveJabatanFilterState(val);
    if (val === null) {
      localStorage.removeItem('activeJabatanFilter');
    } else {
      localStorage.setItem('activeJabatanFilter', JSON.stringify(val));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      api.get('/auth/me').then(res => {
        if (res.data.success) {
          setUser(res.data.data);
          localStorage.setItem('user', JSON.stringify(res.data.data));
        }
      }).catch(() => {
        logout();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, refresh_token, user: userData } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setActiveJabatanFilter(null); // Reset to "Semua Jabatan" on login
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      // Axios throws on 4xx/5xx - extract the backend message
      const msg = err.response?.data?.message || 'Gagal masuk. Periksa koneksi Anda.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeJabatanFilter');
    setUser(null);
    setActiveJabatanFilter(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch (e) { /* ignore */ }
  };

  // Feature 5: Switch jabatan for users with multiple jabatan
  const switchJabatan = async (idJabatan) => {
    try {
      const res = await api.put('/profile/switch-jabatan', { id_jabatan: idJabatan });
      if (res.data.success) {
        const updatedUser = res.data.data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setActiveJabatanFilter(idJabatan); // Automatically filter to this jabatan
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'Gagal switch jabatan' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, refreshUser, switchJabatan,
      activeJabatanFilter, setActiveJabatanFilter
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

