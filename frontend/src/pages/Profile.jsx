import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Camera, Send, ShieldCheck, ZoomIn, ZoomOut, Move, Trash2, Mail, Briefcase, Shield, Calendar, User, KeyRound, Info, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { formatTanggalOnly, formatJabatan } from '../utils/formatDate';
import { getUploadUrl } from '../utils/urlHelper';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('profil');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // State crop foto
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // State hapus foto
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);

  // State preview foto
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Alur ganti password berbasis OTP
  const [otpStep, setOtpStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' });

  // Pilih foto - buka modal crop
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImage(ev.target.result);
      setCropScale(1);
      setCropOffset({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Render preview crop
  const drawCropPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.clip();

    const imgW = img.naturalWidth * cropScale;
    const imgH = img.naturalHeight * cropScale;
    const dx = (size - imgW) / 2 + cropOffset.x;
    const dy = (size - imgH) / 2 + cropOffset.y;
    ctx.drawImage(img, dx, dy, imgW, imgH);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99,102,241,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [cropScale, cropOffset]);

  useEffect(() => {
    if (showCropModal && cropImage) {
      drawCropPreview();
    }
  }, [showCropModal, cropImage, drawCropPreview, cropScale, cropOffset]);

  const handleCropMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleCropMouseMove = (e) => {
    if (!isDragging) return;
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleCropMouseUp = () => setIsDragging(false);

  // Upload foto yang sudah di-crop
  const handleCropUpload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 200;
    finalCanvas.height = 200;
    const ctx = finalCanvas.getContext('2d');

    const img = imgRef.current;
    const imgW = img.naturalWidth * cropScale;
    const imgH = img.naturalHeight * cropScale;
    const dx = (200 - imgW) / 2 + cropOffset.x;
    const dy = (200 - imgH) / 2 + cropOffset.y;
    ctx.drawImage(img, dx, dy, imgW, imgH);

    finalCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const fd = new FormData();
      fd.append('foto', blob, 'profile.jpg');
      try {
        const res = await api.post('/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) {
          setMsg('Foto profil berhasil diperbarui');
          setShowCropModal(false);
          await refreshUser();
        }
      } catch (err) { setError(err.response?.data?.message || 'Gagal mengunggah foto'); }
    }, 'image/jpeg', 0.9);
  };

  // Hapus foto profil
  const handleDeletePhoto = async () => {
    try {
      const res = await api.delete('/profile/photo');
      if (res.data.success) {
        setMsg('Foto profil berhasil dihapus');
        setShowDeletePhotoModal(false);
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus foto profil');
      setShowDeletePhotoModal(false);
    }
  };

  // Kirim OTP untuk ganti password
  const sendOTP = async () => {
    setError(''); setMsg(''); setOtpSending(true);
    try {
      await api.post('/profile/send-otp');
      setMsg('Kode OTP telah dikirim ke surel Anda');
      setOtpStep(2);
      setOtpCountdown(60);
      const timer = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) { setError(err.response?.data?.message || 'Gagal mengirim OTP'); }
    setOtpSending(false);
  };

  const resendOTP = async () => {
    if (otpCountdown > 0) return;
    await sendOTP();
  };

  const changePassword = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    if (pwForm.new_password !== pwForm.confirm_password) { setError('Kata sandi baru tidak cocok'); return; }
    if (pwForm.new_password.length < 8) { setError('Kata sandi minimal 8 karakter'); return; }
    if (!/[A-Z]/.test(pwForm.new_password)) { setError('Kata sandi harus mengandung huruf besar'); return; }
    if (!/[a-z]/.test(pwForm.new_password)) { setError('Kata sandi harus mengandung huruf kecil'); return; }
    if (!/[0-9]/.test(pwForm.new_password)) { setError('Kata sandi harus mengandung angka'); return; }
    try {
      await api.put('/profile/password', {
        otp_code: otpCode,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      });
      setPwForm({ new_password: '', confirm_password: '' });
      setOtpCode('');
      setOtpStep(1);
      setMsg('Kata sandi berhasil diubah');
    } catch (err) { setError(err.response?.data?.message || 'Gagal mengubah kata sandi'); }
  };

  const roleLabel = { admin: 'Admin / Tata Usaha', pegawai: 'Pegawai TU', kepsek: 'Kepala Sekolah', user: 'Pengguna', waka: 'Wakil Kepala Sekolah' };
  const roleBadgeColor = {
    admin: { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' },
    pegawai: { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' },
    kepsek: { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
    user: { bg: 'rgba(107, 114, 128, 0.12)', color: '#4b5563', border: 'rgba(107, 114, 128, 0.25)' },
    waka: { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)' },
  };
  const allJabatan = user?.semua_jabatan || [];
  const currentRoleColor = roleBadgeColor[user?.role] || roleBadgeColor.user;

  return (
    <div className="page">

      {/* ═══ PREMIUM HERO HEADER ═══ */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 4px 24px rgba(15, 43, 82, 0.12), 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {/* Top gradient banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0f2b52 0%, #1a3f6f 40%, #2563eb 100%)',
          height: 140, position: 'relative',
          backgroundImage: `linear-gradient(135deg, #0f2b52 0%, #1a3f6f 40%, #2563eb 100%), 
            radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)`
        }}>
          {/* Decorative dots */}
          <div style={{
            position: 'absolute', right: 24, top: 24,
            display: 'grid', gridTemplateColumns: 'repeat(6, 8px)', gap: 8, opacity: 0.15
          }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
            ))}
          </div>
        </div>

        {/* Profile info section */}
        <div style={{
          background: 'var(--bg-primary)', padding: '0 32px 28px',
          position: 'relative'
        }}>
          {/* Avatar - overlapping banner */}
          <div style={{
            position: 'relative', width: 'fit-content',
            marginTop: -52
          }}>
            <div
              onClick={() => user?.foto_profil ? setShowPhotoPreview(true) : fileRef.current?.click()}
              style={{
                width: 104, height: 104, borderRadius: '50%',
                border: '4px solid var(--bg-primary)',
                background: 'linear-gradient(135deg, #1a3f6f, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', fontWeight: 700, color: '#ffffff',
                cursor: 'pointer', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(15, 43, 82, 0.2)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {user?.foto_profil ? (
                <img src={getUploadUrl(user?.foto_profil)} alt="Foto Profil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.nama?.charAt(0).toUpperCase()
              )}
            </div>
            {/* Camera button */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 32, height: 32, borderRadius: '50%',
                background: '#2563eb', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--bg-primary)',
                cursor: 'pointer', zIndex: 2,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#2563eb'; }}
            >
              <Camera size={14} color="white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
          </div>

          {/* Name & info row */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                {user?.nama}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} style={{ opacity: 0.6 }} />
                {user?.email}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                {/* Role badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  fontSize: '0.76rem', fontWeight: 600,
                  background: currentRoleColor.bg, color: currentRoleColor.color,
                  border: `1px solid ${currentRoleColor.border}`
                }}>
                  <Shield size={12} />
                  {roleLabel[user?.role] || user?.role}
                </span>
                {/* Jabatan badges */}
                {allJabatan.length > 0 && allJabatan.map((j, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20,
                    fontSize: '0.76rem', fontWeight: 500,
                    background: 'rgba(15, 43, 82, 0.06)', color: '#374151',
                    border: '1px solid rgba(15, 43, 82, 0.1)'
                  }}>
                    <Briefcase size={11} />
                    {formatJabatan(j.nama_jabatan)}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side: account meta & delete photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{
                fontSize: '0.75rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--bg-secondary)', padding: '5px 12px', borderRadius: 8
              }}>
                <Calendar size={12} />
                Bergabung {formatTanggalOnly(user?.created_at)}
              </span>
              {user?.foto_profil && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeletePhotoModal(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '0.75rem', color: '#ef4444', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 8px',
                    borderRadius: 6, fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <Trash2 size={13} /> Hapus Foto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TOAST MESSAGES ═══ */}
      {msg && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #a7f3d0',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          color: '#059669', fontSize: '0.85rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.08)'
        }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}
      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1px solid #fecaca',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          color: '#dc2626', fontSize: '0.85rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
        }}>
          <Info size={16} /> {error}
        </div>
      )}

      {/* ═══ TAB NAVIGATION ═══ */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24
      }}>
        {[
          { key: 'profil', icon: <User size={16} />, label: 'Informasi Profil' },
          { key: 'password', icon: <KeyRound size={16} />, label: 'Keamanan Akun' }
        ].map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMsg(''); setError(''); if (t.key === 'password') setOtpStep(1); }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.color = '#2563eb';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 12,
                fontSize: '0.88rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                border: '1px solid',
                borderColor: isActive ? '#0f2b52' : 'var(--border-color)',
                background: isActive ? 'linear-gradient(135deg, #0f2b52 0%, #1a3f6f 100%)' : 'var(--bg-primary)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive 
                  ? '0 4px 12px rgba(15, 43, 82, 0.2)' 
                  : '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ INFORMASI PROFIL TAB ═══ */}
      {tab === 'profil' && (
        <div style={{
          borderRadius: 16, border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)', overflow: 'hidden',
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
        }}>
          {/* Section header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(15, 43, 82, 0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0f2b52'
            }}>
              <User size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Detail Profil</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Informasi akun dan identitas Anda</p>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 0
            }}>
              {[
                { icon: <User size={16} />, label: 'Nama Lengkap', value: user?.nama },
                { icon: <Mail size={16} />, label: 'Alamat Surel', value: user?.email },
                {
                  icon: <Briefcase size={16} />, label: 'Jabatan',
                  value: allJabatan.length > 0
                    ? allJabatan.map(j => formatJabatan(j.nama_jabatan)).join(', ')
                    : (formatJabatan(user?.nama_jabatan) || roleLabel[user?.role])
                },
                { icon: <Shield size={16} />, label: 'Peran Sistem', value: roleLabel[user?.role] || user?.role },
              ].map((item, idx) => (
                <div key={idx} style={{
                  padding: '16px 0',
                  borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(37, 99, 235, 0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2563eb', marginTop: 2
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.73rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text-muted)', fontSize: '0.78rem'
          }}>
            <Info size={14} />
            Untuk mengubah nama, surel, atau jabatan, silakan hubungi Administrator.
          </div>
        </div>
      )}

      {/* ═══ KEAMANAN AKUN TAB ═══ */}
      {tab === 'password' && (
        <div style={{
          borderRadius: 16, border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)', overflow: 'hidden',
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
        }}>
          {/* Section header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(15, 43, 82, 0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0f2b52'
            }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Ganti Kata Sandi</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Perbarui kata sandi untuk keamanan akun</p>
            </div>
          </div>

          <div style={{ padding: '28px 24px' }}>
            {otpStep === 1 && (
              <div style={{ textAlign: 'center', maxWidth: 400, margin: '0 auto', padding: '16px 0' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', color: '#2563eb'
                }}>
                  <ShieldCheck size={36} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Verifikasi Identitas
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 28, lineHeight: 1.6 }}>
                  Demi keamanan akun Anda, kami akan mengirimkan kode OTP ke alamat surel
                  <strong style={{ color: 'var(--text-primary)' }}> {user?.email}</strong>
                </p>
                <button
                  className="btn btn-primary"
                  onClick={sendOTP}
                  disabled={otpSending}
                  style={{
                    padding: '12px 28px', borderRadius: 12,
                    fontSize: '0.88rem', fontWeight: 600,
                    background: '#0f2b52', display: 'inline-flex',
                    alignItems: 'center', gap: 8
                  }}
                >
                  <Send size={16} /> {otpSending ? 'Mengirim...' : 'Kirim Kode OTP'}
                </button>
              </div>
            )}

            {otpStep === 2 && (
              <form onSubmit={changePassword} style={{ maxWidth: 440, margin: '0 auto' }}>
                {/* OTP Input */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                    display: 'block', marginBottom: 8
                  }}>
                    Kode OTP
                  </label>
                  <input
                    className="form-input"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    required
                    placeholder="Masukkan 6 digit OTP"
                    style={{
                      fontSize: '1.1rem', letterSpacing: '0.3em', fontWeight: 600,
                      textAlign: 'center', borderRadius: 12
                    }}
                  />
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    {otpCountdown > 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Kirim ulang dalam <strong style={{ color: '#2563eb' }}>{otpCountdown}s</strong>
                      </span>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={resendOTP}
                        style={{ padding: '4px 12px', fontSize: '0.78rem', color: '#2563eb' }}>
                        Kirim Ulang OTP
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0',
                  color: 'var(--text-muted)', fontSize: '0.75rem'
                }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                  Kata Sandi Baru
                  <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                    Kata Sandi Baru
                  </label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwForm.new_password}
                    onChange={e => setPwForm({...pwForm, new_password: e.target.value})}
                    required
                    minLength={8}
                    style={{ borderRadius: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {[
                      { test: pwForm.new_password.length >= 8, label: '8+ karakter' },
                      { test: /[A-Z]/.test(pwForm.new_password), label: 'Huruf besar' },
                      { test: /[a-z]/.test(pwForm.new_password), label: 'Huruf kecil' },
                      { test: /[0-9]/.test(pwForm.new_password), label: 'Angka' },
                    ].map((r, i) => (
                      <span key={i} style={{
                        fontSize: '0.7rem', fontWeight: 500,
                        padding: '3px 8px', borderRadius: 6,
                        background: r.test ? 'rgba(5, 150, 105, 0.08)' : 'rgba(107, 114, 128, 0.08)',
                        color: r.test ? '#059669' : 'var(--text-muted)',
                        border: `1px solid ${r.test ? 'rgba(5, 150, 105, 0.2)' : 'transparent'}`,
                        transition: 'all 0.2s ease'
                      }}>
                        {r.test ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                    Konfirmasi Kata Sandi
                  </label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwForm.confirm_password}
                    onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})}
                    required
                    style={{ borderRadius: 12 }}
                  />
                  {pwForm.confirm_password && (
                    <p style={{
                      fontSize: '0.75rem', marginTop: 6,
                      color: pwForm.new_password === pwForm.confirm_password ? '#059669' : '#ef4444',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      {pwForm.new_password === pwForm.confirm_password
                        ? <><CheckCircle size={13} /> Kata sandi cocok</>
                        : <><Info size={13} /> Kata sandi tidak cocok</>
                      }
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setOtpStep(1)}
                    style={{ borderRadius: 12, flex: 1 }}>
                    Kembali
                  </button>
                  <button type="submit" className="btn btn-primary"
                    style={{
                      borderRadius: 12, flex: 2, background: '#0f2b52',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                    <Lock size={16} /> Ganti Kata Sandi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══ Modal Crop Foto ═══ */}
      {showCropModal && cropImage && (
        <div className="modal-overlay" onClick={() => setShowCropModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{
              background: '#0f2b52', padding: '18px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Camera size={18} color="white" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Sesuaikan Foto Profil</h2>
              </div>
              <button onClick={() => setShowCropModal(false)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: '1.1rem'
              }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <img ref={imgRef} src={cropImage} alt="" style={{ display: 'none' }} onLoad={() => drawCropPreview()} />
              <div
                style={{
                  width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid #2563eb', cursor: isDragging ? 'grabbing' : 'grab',
                  position: 'relative', background: '#1a1a2e',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
              >
                <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <Move size={14} /> Geser foto untuk menyesuaikan posisi
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCropScale(s => Math.max(0.2, s - 0.1))}>
                  <ZoomOut size={16} />
                </button>
                <input type="range" min="0.2" max="3" step="0.05" value={cropScale}
                  onChange={e => setCropScale(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#2563eb' }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCropScale(s => Math.min(3, s + 0.1))}>
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border-color)',
              display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--bg-secondary)'
            }}>
              <button className="btn btn-ghost" onClick={() => setShowCropModal(false)} style={{ borderRadius: 10 }}>Batal</button>
              <button className="btn btn-primary" onClick={handleCropUpload} style={{ borderRadius: 10, background: '#0f2b52' }}>Simpan Foto</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Konfirmasi Hapus Foto ═══ */}
      {showDeletePhotoModal && (
        <div className="modal-overlay" onClick={() => setShowDeletePhotoModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', borderRadius: 16 }}>
            <div style={{ padding: '36px 28px 28px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#ef4444'
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 700 }}>Hapus Foto Profil?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 28, lineHeight: 1.5 }}>
                Foto profil akan dihapus dan diganti dengan inisial nama Anda.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowDeletePhotoModal(false)}
                  style={{ minWidth: 100, borderRadius: 10 }}>Batal</button>
                <button className="btn btn-danger" onClick={handleDeletePhoto}
                  style={{ minWidth: 100, borderRadius: 10 }}>Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Preview Foto Profil ═══ */}
      {showPhotoPreview && user?.foto_profil && (
        <div
          onClick={() => setShowPhotoPreview(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={getUploadUrl(user?.foto_profil)}
            alt="Foto Profil"
            style={{
              maxWidth: '85vw', maxHeight: '85vh',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
