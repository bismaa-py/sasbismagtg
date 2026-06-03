import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Camera, Send, ShieldCheck, ZoomIn, ZoomOut, Move, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { formatTanggalOnly, formatJabatan } from '../utils/formatDate';

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
      setMsg('Kode OTP telah dikirim ke email Anda');
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

  const roleLabel = { admin: 'Admin / Tata Usaha', pegawai: 'Pegawai TU', kepsek: 'Kepala Sekolah', user: 'Pengguna' };
  const allJabatan = user?.semua_jabatan || [];

  return (
    <div className="page">

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="profile-card">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div className="profile-avatar" onClick={() => user?.foto_profil ? setShowPhotoPreview(true) : fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              {user?.foto_profil ? (
                <img src={`http://localhost:8080/uploads/${user.foto_profil}`} alt="Foto Profil" />
              ) : (
                user?.nama?.charAt(0).toUpperCase()
              )}
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--bg-secondary)',
                cursor: 'pointer', zIndex: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={14} color="white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
          </div>
          <div>
            <h2>{user?.nama}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {allJabatan.length > 0 ? (
                allJabatan.map((j, i) => (
                  <span key={i} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 500, background: '#e5e7eb', color: '#374151' }}>{formatJabatan(j.nama_jabatan)}</span>
                ))
              ) : (
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 500, background: '#e5e7eb', color: '#374151' }}>{formatJabatan(user?.nama_jabatan) || roleLabel[user?.role]}</span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
              Akun dibuat: {formatTanggalOnly(user?.created_at)}
            </p>
            {/* Tombol hapus foto - semua role bisa hapus */}
            {user?.foto_profil && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setShowDeletePhotoModal(true); }}
                style={{ marginTop: 8, color: 'var(--danger)', fontSize: '0.8rem' }}
              >
                <Trash2 size={14} /> Hapus Foto Profil
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#059669', fontSize: '0.85rem' }}>{msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>}

      <div className="filters" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${tab === 'profil' ? 'active' : ''}`} onClick={() => { setTab('profil'); setMsg(''); setError(''); }}>Informasi Profil</button>
        <button className={`filter-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => { setTab('password'); setMsg(''); setError(''); setOtpStep(1); }}>Ganti Kata Sandi</button>
      </div>

      {tab === 'profil' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nama</label>
              <p style={{ fontSize: '0.95rem' }}>{user?.nama}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email / Akun</label>
              <p style={{ fontSize: '0.95rem' }}>{user?.email}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Jabatan</label>
              <p style={{ fontSize: '0.95rem' }}>
                {allJabatan.length > 0 ? allJabatan.map(j => formatJabatan(j.nama_jabatan)).join(', ') : (formatJabatan(user?.nama_jabatan) || roleLabel[user?.role])}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Peran</label>
              <p style={{ fontSize: '0.95rem' }}>{roleLabel[user?.role] || user?.role}</p>
            </div>
          </div>
          <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Untuk mengubah nama, email, atau jabatan, silakan hubungi Admin.
          </p>
        </div>
      )}


      {tab === 'password' && (
        <div className="card">
          {otpStep === 1 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <ShieldCheck size={48} style={{ color: 'var(--accent)', marginBottom: 16, opacity: 0.7 }} />
              <h3 style={{ marginBottom: 8 }}>Verifikasi OTP</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Untuk keamanan, kami perlu mengirimkan kode OTP ke email Anda sebelum mengganti kata sandi.
              </p>
              <button className="btn btn-primary" onClick={sendOTP} disabled={otpSending}>
                <Send size={16} /> {otpSending ? 'Mengirim...' : 'Kirim Kode OTP'}
              </button>
            </div>
          )}

          {otpStep === 2 && (
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label>Kode OTP (6 digit)</label>
                <input className="form-input" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} required placeholder="Masukkan 6 digit OTP" />
                <div style={{ marginTop: 6 }}>
                  {otpCountdown > 0 ? (
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Kirim ulang OTP dalam {otpCountdown} detik</small>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={resendOTP} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      Kirim Ulang OTP
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Kata Sandi Baru</label>
                <input className="form-input" type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} required minLength={8} />
                <small style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>Min 8 karakter, huruf besar & kecil, angka</small>
              </div>
              <div className="form-group">
                <label>Konfirmasi Kata Sandi Baru</label>
                <input className="form-input" type="password" value={pwForm.confirm_password} onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOtpStep(1)}>Kembali</button>
                <button type="submit" className="btn btn-primary"><Lock size={16} /> Ganti Kata Sandi</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal Crop Foto */}
      {showCropModal && cropImage && (
        <div className="modal-overlay" onClick={() => setShowCropModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Sesuaikan Foto Profil</h2>
              <button className="modal-close" onClick={() => setShowCropModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <img
                ref={imgRef}
                src={cropImage}
                alt=""
                style={{ display: 'none' }}
                onLoad={() => drawCropPreview()}
              />

              <div
                style={{
                  width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid var(--accent)', cursor: isDragging ? 'grabbing' : 'grab',
                  position: 'relative', background: '#1a1a2e'
                }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
              >
                <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Move size={14} /> Geser foto untuk menyesuaikan posisi
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCropScale(s => Math.max(0.2, s - 0.1)); }}>
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.05"
                  value={cropScale}
                  onChange={e => setCropScale(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCropScale(s => Math.min(3, s + 0.1)); }}>
                  <ZoomIn size={16} />
                </button>
              </div>

              {(() => { setTimeout(drawCropPreview, 0); return null; })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCropModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCropUpload}>Simpan Foto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Foto */}
      {showDeletePhotoModal && (
        <div className="modal-overlay" onClick={() => setShowDeletePhotoModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'var(--danger)'
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Hapus Foto Profil</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Apakah Anda yakin ingin menghapus foto profil? Foto akan diganti dengan inisial nama.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowDeletePhotoModal(false)} style={{ minWidth: 100 }}>Batal</button>
                <button className="btn btn-danger" onClick={handleDeletePhoto} style={{ minWidth: 100 }}>Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Foto Profil */}
      {showPhotoPreview && user?.foto_profil && (
        <div
          onClick={() => setShowPhotoPreview(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={`http://localhost:8080/uploads/${user.foto_profil}`}
            alt="Foto Profil"
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
