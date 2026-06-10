import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Surel atau kata sandi salah');
        setPassword('');
      }
    } catch (err) {
      setError('Gagal masuk. Periksa koneksi Anda.');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-icon">
          <img src="/logo.png" alt="Logo SMKN 2 Singosari" />
        </div>
        <h1>E-Disposisi Surat</h1>
        <p className="subtitle">SMKN 2 Singosari Malang</p>

        {error && (
          <div className="login-alert login-alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Surel</label>
            <input id="login-email" className="form-input" type="email" placeholder="Masukkan surel" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Kata Sandi</label>
            <div className="input-wrapper">
              <input id="login-password" className="form-input" type={showPw ? 'text' : 'password'} placeholder="Masukkan kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="toggle-pw" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button id="login-submit" className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: '12px', marginTop: 8 }}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <><LogIn size={18} /> Masuk</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/forgot-password" className="login-link">Lupa Kata Sandi?</Link>
        </div>
      </div>
    </div>
  );
}
