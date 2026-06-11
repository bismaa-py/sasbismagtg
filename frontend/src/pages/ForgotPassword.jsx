import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useSchool } from '../context/SchoolContext';
import { getUploadUrl } from '../utils/urlHelper';

export default function ForgotPassword() {
  const { schoolInfo } = useSchool();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const startCountdown = () => {
    setOtpCountdown(60);
    const timer = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTP = async (e) => {
    if (e) e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMsg('OTP telah dikirim ke surel Anda');
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim OTP');
    }
    setLoading(false);
  };

  const resendOTP = async () => {
    if (otpCountdown > 0) return;
    setError(''); setLoading(true);
    try {
      await api.post('/auth/resend-otp', { email });
      setMsg('OTP baru telah dikirim ke surel Anda');
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim ulang OTP');
    }
    setLoading(false);
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP tidak valid');
    }
    setLoading(false);
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('Kata sandi tidak cocok'); return; }
    if (newPw.length < 8) { setError('Kata sandi minimal 8 karakter'); return; }
    if (!/[A-Z]/.test(newPw)) { setError('Kata sandi harus mengandung huruf besar'); return; }
    if (!/[a-z]/.test(newPw)) { setError('Kata sandi harus mengandung huruf kecil'); return; }
    if (!/[0-9]/.test(newPw)) { setError('Kata sandi harus mengandung angka'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, new_password: newPw, confirm_password: confirmPw });
      setMsg('Kata sandi berhasil direset! Silakan masuk.');
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengatur ulang kata sandi');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-icon"><img src={schoolInfo?.logo_sekolah ? getUploadUrl(schoolInfo.logo_sekolah) : "/logo.png"} alt="Logo" /></div>
        <h1>Atur Ulang Kata Sandi</h1>
        <p className="subtitle">
          {step === 1 && 'Masukkan surel untuk menerima kode OTP'}
          {step === 2 && 'Masukkan kode OTP yang dikirim ke surel'}
          {step === 3 && 'Buat kata sandi baru'}
          {step === 4 && 'Kata sandi berhasil direset!'}
        </p>
        {error && <div className="login-alert login-alert-error">{error}</div>}
        {msg && step !== 4 && <div className="login-alert login-alert-success">{msg}</div>}

        {step === 1 && (
          <form onSubmit={sendOTP}>
            <div className="form-group"><label>Surel</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <button className="btn btn-primary btn-full" disabled={loading}>Kirim OTP</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={verifyOTP}>
            <div className="form-group">
              <label>Kode OTP (6 digit)</label>
              <input className="form-input" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required />
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                {otpCountdown > 0 ? (
                  <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Kirim ulang OTP dalam {otpCountdown} detik</small>
                ) : (
                  <button type="button" onClick={resendOTP} disabled={loading} className="login-link" style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    textDecoration: 'underline'
                  }}>
                    Kirim Ulang OTP
                  </button>
                )}
              </div>
            </div>
            <button className="btn btn-primary btn-full" disabled={loading}>Verifikasi</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div className="form-group"><label>Kata Sandi Baru</label><input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} /><small style={{color:'#94a3b8',fontSize:'0.75rem'}}>Min 8 karakter, huruf besar & kecil, angka</small></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required /></div>
            <button className="btn btn-primary btn-full" disabled={loading}>Atur Ulang Kata Sandi</button>
          </form>
        )}
        {step === 4 && <Link to="/login" className="btn btn-primary btn-full">Kembali ke Halaman Masuk</Link>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" className="login-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
