import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, CheckCircle, XCircle, Send, Download, RefreshCw, Eye, BookOpen, Users, ChevronDown, User, Briefcase, Mail, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import api from '../api/axios';
import { formatTanggal, formatTanggalShort, formatTanggalOnly, formatJabatan } from '../utils/formatDate';

export default function SuratDetail({ type }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [surat, setSurat] = useState(null);
  const [disposisi, setDisposisi] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForward, setShowForward] = useState(false);
  const [forwardTo, setForwardTo] = useState([]); // [{user_id, jabatan_id}]
  const [lastUpdated, setLastUpdated] = useState(null);
  const [forwardLoading, setForwardLoading] = useState(false);

  // Review kepsek langsung di halaman detail (tanpa modal)
  const [reviewForm, setReviewForm] = useState({ status: 'disetujui', catatan: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedPenerima, setSelectedPenerima] = useState([]); // checkbox penerima untuk kepsek

  // Daftar statis penerima untuk checkbox kepsek (sesuai database)
  const daftarPenerima = [
    'waka kesiswaan', 'waka kurikulum', 'waka sarpras', 'waka humas',
    'koordinator waka', 'koordinator bk', 'koordinator bkk',
    'kapro rpl', 'kapro tkj', 'kapro dkv', 'kapro an',
    'kapro ei', 'kapro mt', 'kapro av', 'kapro bc',
    'bk', 'bkk', 'prakerin'
  ];

  // Status auto-read oleh user (sudah dibaca otomatis saat buka)
  const [hasAutoRead, setHasAutoRead] = useState(false);

  // Modal lihat lampiran
  const [showLampiran, setShowLampiran] = useState(false);

  useEffect(() => { fetchDetail(); }, [id, type]);

  // Auto-refresh setiap 10 detik
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDetail(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [id, type]);

  const fetchDetail = async (silent = false) => {
    try {
      const endpoint = type === 'masuk' ? `/surat-masuk/${id}` : `/surat-keluar/${id}`;
      const res = await api.get(endpoint);
      if (res.data.success) {
        if (type === 'masuk') {
          setSurat(res.data.data.surat);
          setDisposisi(res.data.data.disposisi || []);
          // Cek apakah user sudah membaca (auto-read oleh backend saat buka)
          const myDisp = (res.data.data.disposisi || []).find(d => d.id_penerima === user.id);
          if (myDisp && myDisp.status_disposisi === 'dibaca') {
            setHasAutoRead(true);
          }
        } else {
          setSurat(res.data.data);
        }
        setLastUpdated(new Date());
        window.dispatchEvent(new Event('refreshNotifications'));
      }
      // Admin dan pegawai perlu daftar user (untuk meneruskan surat)
      if ((user.role === 'admin' || user.role === 'pegawai') && !silent) {
        const u = await api.get('/users');
        if (u.data.success) {
          const allUsers = u.data.data || [];
          setUsers(allUsers.filter(x => x.role === 'user'));
        }
      }
    } catch (e) { /* */ }
  };

  // Review surat oleh kepsek (langsung di halaman, bukan modal)
  const handleReview = async () => {
    setReviewLoading(true);
    try {
      const endpoint = type === 'masuk' ? `/surat-masuk/${id}/review` : `/surat-keluar/${id}/review`;
      const reviewData = { status: reviewForm.status, catatan: reviewForm.catatan };
      // Jika kepsek menyetujui dan memilih penerima (khusus surat masuk), kirim sebagai info ke TU
      if (type === 'masuk' && reviewForm.status === 'disetujui' && selectedPenerima.length > 0) {
        reviewData.target_penerima = selectedPenerima;
      }
      await api.put(endpoint, reviewData);
      setReviewForm({ status: 'disetujui', catatan: '' });
      setSelectedPenerima([]);
      showToast('Tinjauan surat berhasil dikirim', 'success');
      fetchDetail();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengirim tinjauan', 'error');
    }
    setReviewLoading(false);
  };

  // Toggle penerima checkbox untuk kepsek review
  const togglePenerima = (nama) => {
    setSelectedPenerima(prev => {
      if (prev.includes(nama)) return prev.filter(n => n !== nama);
      return [...prev, nama];
    });
  };

  const handleForward = async () => {
    if (forwardTo.length === 0) { showToast('Pilih minimal 1 penerima', 'error'); return; }
    setForwardLoading(true);
    try {
      await api.put(`/surat-masuk/${id}/teruskan`, { targets: forwardTo });
      setShowForward(false);
      fetchDetail();
      showToast('Surat berhasil diteruskan', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal meneruskan', 'error');
    } finally {
      setForwardLoading(false);
    }
  };



  // Grup user berdasarkan jabatan untuk modal teruskan
  const jabatanGroups = useMemo(() => {
    const groups = {};
    users.forEach(u => {
      if (u.semua_jabatan && u.semua_jabatan.length > 0) {
        u.semua_jabatan.forEach(j => {
          if (!groups[j.id_jabatan]) {
            groups[j.id_jabatan] = { id: j.id_jabatan, nama: j.nama_jabatan, users: [] };
          }
          groups[j.id_jabatan].users.push({ id: u.id, nama: u.nama });
        });
      }
    });
    return Object.values(groups).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [users]);

  // Handle select user per jabatan
  const handleSelectUserForJabatan = (jabatanId, userId) => {
    setForwardTo(prev => {
      // Hapus selection lama untuk jabatan ini
      const filtered = prev.filter(t => t.jabatan_id !== jabatanId);
      if (userId === '') return filtered; // deselect
      return [...filtered, { user_id: parseInt(userId), jabatan_id: jabatanId }];
    });
  };

  const getSelectedUserForJabatan = (jabatanId) => {
    const found = forwardTo.find(t => t.jabatan_id === jabatanId);
    return found ? found.user_id : '';
  };



  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  // Label user dengan jabatan
  const getUserLabel = (u) => {
    let label = u.nama;
    if (u.semua_jabatan && u.semua_jabatan.length > 0) {
      const jabatanNames = u.semua_jabatan.map(j => formatJabatan(j.nama_jabatan)).join(', ');
      label += ` (${jabatanNames})`;
    } else if (u.nama_jabatan) {
      label += ` (${formatJabatan(u.nama_jabatan)})`;
    }
    return label;
  };

  if (!surat) return <div className="page"><div className="spinner" style={{ margin: '40px auto' }} /></div>;

  const statusLabel = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', diteruskan: 'Diteruskan', diarsipkan: 'Diarsipkan' };
  const currentStatus = surat.status_verifikasi;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Kembali
        </button>
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={12} />
            <span>Diperbarui: {formatTimeAgo(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Banner: Surat otomatis ditandai sudah dibaca */}
      {user.role === 'user' && hasAutoRead && type === 'masuk' && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)',
          padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#065f46', marginBottom: 2 }}>
              Surat Sudah Dibaca
            </p>
            <p style={{ fontSize: '0.8rem', color: '#047857' }}>
              Surat ini otomatis ditandai sudah dibaca dan tersedia di halaman Riwayat.
            </p>
          </div>
        </div>
      )}

      {/* Main Detail Card - Premium Design */}
      <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
        {/* Hero Header with gradient */}
        <div style={{
          background: '#0f2b52',
          padding: '24px 28px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Mail size={20} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                    {type === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                  </p>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {surat.no_surat}
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: 4, marginLeft: 50 }}>
                {type === 'masuk' ? surat.perihal_surat : surat.perihal}
              </p>
            </div>
            {/* Status badge - prominent */}
            <div style={{
              padding: '8px 18px', borderRadius: 30,
              background: currentStatus === 'disetujui' ? 'rgba(5, 150, 105, 0.9)'
                : currentStatus === 'ditolak' ? 'rgba(220, 38, 38, 0.9)'
                : currentStatus === 'diteruskan' ? 'rgba(59, 130, 246, 0.9)'
                : 'rgba(217, 119, 6, 0.9)',
              color: '#ffffff', fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.3px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              textTransform: 'uppercase', whiteSpace: 'nowrap'
            }}>
              {statusLabel[currentStatus]}
            </div>
          </div>
        </div>

        {/* Detail Fields */}
        <div style={{ background: '#ffffff', padding: '24px 28px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14
          }}>
            {/* No Surat */}
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#f8fafc',
              borderLeft: '3px solid #0f2b52'
            }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>No Surat</p>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{surat.no_surat}</p>
            </div>

            {/* Perihal */}
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#f8fafc',
              borderLeft: '3px solid #3b82f6'
            }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Perihal</p>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{type === 'masuk' ? surat.perihal_surat : surat.perihal}</p>
            </div>

            {/* Asal / Tujuan */}
            {type === 'masuk' && (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: '#f8fafc',
                borderLeft: '3px solid #60a5fa'
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Asal Surat</p>
                <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{surat.asal_surat}</p>
              </div>
            )}
            {type === 'keluar' && (
              <>
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: '#f8fafc',
                  borderLeft: '3px solid #60a5fa'
                }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Tujuan</p>
                  <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{surat.tujuan}</p>
                </div>
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: '#f8fafc',
                  borderLeft: '3px solid #93c5fd'
                }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Kode Surat</p>
                  <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{surat.kode_surat}</p>
                </div>
              </>
            )}

            {/* Tanggal Surat */}
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#f8fafc',
              borderLeft: '3px solid #93c5fd'
            }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Tanggal Surat</p>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{formatTanggalShort(surat.created_at)}</p>
            </div>

            {/* Tanggal Verifikasi */}
            {surat.tanggal_verifikasi && (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: '#f8fafc',
                borderLeft: '3px solid #059669'
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Tanggal Verifikasi</p>
                <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{formatTanggal(surat.tanggal_verifikasi)}</p>
              </div>
            )}

          </div>

          {/* Catatan Verifikasi & Disposisi */}
          {surat.catatan_verifikasi && (() => {
            const raw = surat.catatan_verifikasi;
            const match = raw.match(/\[Diteruskan kepada:\s*(.+?)\]/);
            const catatanText = raw.replace(/\n?\[Diteruskan kepada:.*?\]/, '').trim();
            const penerimaList = match ? match[1].split(',').map(s => s.trim()) : [];

            return (
              <>
                {catatanText && (
                  <div style={{
                    marginTop: 20, padding: '16px 20px',
                    background: '#f8fafc', borderRadius: 10,
                    borderLeft: '4px solid #0f2b52',
                    position: 'relative'
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Catatan Verifikasi
                    </p>
                    <p style={{ fontSize: '0.92rem', color: '#1e293b', fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{catatanText}"
                    </p>
                  </div>
                )}
                {penerimaList.length > 0 && (
                  <div style={{
                    marginTop: catatanText ? 16 : 20,
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    border: '1px solid rgba(15, 43, 82, 0.12)',
                    boxShadow: '0 2px 12px rgba(15, 43, 82, 0.08)'
                  }}>
                    <div style={{
                      background: '#0f2b52',
                      padding: '14px 20px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Send size={16} color="white" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px' }}>
                          Disposisi Kepala Sekolah
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                          Surat diteruskan ke {penerimaList.length} penerima
                        </p>
                      </div>
                    </div>
                    <div style={{
                      background: '#f0f4ff',
                      padding: '16px 20px'
                    }}>
                      <p style={{ fontSize: '0.73rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                        Diteruskan Kepada
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {penerimaList.map((nama, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 10,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: '#0f2b52',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Briefcase size={13} color="white" />
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                              {formatJabatan(nama)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!catatanText && penerimaList.length === 0 && (
                  <div style={{
                    marginTop: 20, padding: '16px 20px',
                    background: '#f8fafc', borderRadius: 10,
                    borderLeft: '4px solid #0f2b52'
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Catatan Verifikasi
                    </p>
                    <p style={{ fontSize: '0.92rem', color: '#1e293b' }}>{raw}</p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Lampiran - Premium Action Button */}
          {surat.file_pdf && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowLampiran(true)}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#0f2b52',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Eye size={18} color="white" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>Lihat Lampiran</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {surat.file_pdf.match(/\.pdf$/i) ? 'Dokumen PDF' : 'File Gambar'} — Klik untuk membuka
                    </p>
                  </div>
                </div>
                <ArrowLeft size={18} style={{ color: '#94a3b8', transform: 'rotate(180deg)' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tinjauan Kepsek - langsung di halaman detail, bukan modal */}
      {user.role === 'kepsek' && currentStatus === 'menunggu' && (
        <div style={{
          marginBottom: 20,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow)'
        }}>
          {/* Header */}
          <div style={{
            background: '#0f2b52',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle size={18} color="white" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Tinjauan & Keputusan Surat
            </h3>
          </div>

          {/* Body */}
          <div style={{ background: '#ffffff', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Keputusan */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                Keputusan Peninjauan *
              </label>
              <select 
                className="form-input" 
                value={reviewForm.status} 
                onChange={e => setReviewForm({...reviewForm, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.88rem',
                  border: '1.5px solid var(--border-color)',
                  outline: 'none',
                  background: '#f8fafc',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}
              >
                <option value="disetujui">Setujui Surat</option>
                <option value="ditolak">Tolak Surat</option>
              </select>
            </div>

            {/* Catatan */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                Catatan Peninjauan
              </label>
              <textarea 
                className="form-input" 
                value={reviewForm.catatan} 
                onChange={e => setReviewForm({...reviewForm, catatan: e.target.value})} 
                placeholder="Tambahkan instruksi, disposisi verbal, atau catatan penolakan..." 
                rows={3} 
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  fontSize: '0.88rem',
                  border: '1.5px solid var(--border-color)',
                  outline: 'none',
                  background: '#ffffff',
                  color: 'var(--text-primary)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Checkbox penerima - hanya tampil saat disetujui untuk surat masuk */}
            {reviewForm.status === 'disetujui' && type === 'masuk' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 4, display: 'block' }}>
                  Diteruskan Kepada <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(pilih target disposisi)</span>
                </label>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Centang jabatan yang direkomendasikan untuk menerima tindak lanjut surat ini:
                </p>
                <div style={{
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  padding: '12px',
                  maxHeight: 220,
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 8,
                  background: '#f8fafc'
                }}>
                  {daftarPenerima.map(nama => {
                    const isSelected = selectedPenerima.includes(nama);
                    return (
                      <label 
                        key={nama} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          borderRadius: 8,
                          border: isSelected ? '1.5px solid #059669' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(5, 150, 105, 0.05)' : '#ffffff',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 1px 3px rgba(5, 150, 105, 0.05)' : 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePenerima(nama)}
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: '#059669',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {formatJabatan(nama)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {selectedPenerima.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: 6 }}>
                    ✓ {selectedPenerima.length} penerima dipilih
                  </p>
                )}
              </div>
            )}

            {/* Action button */}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleReview} 
                disabled={reviewLoading}
                style={{
                  padding: '10px 24px',
                  background: reviewForm.status === 'ditolak' ? 'var(--danger)' : '#0f2b52',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {reviewLoading ? 'Mengirim...' : 'Kirim Tinjauan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Aksi Admin/Pegawai */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Admin/Pegawai: teruskan surat yang disetujui ke user */}
        {(user.role === 'admin' || user.role === 'pegawai') && type === 'masuk' && currentStatus === 'disetujui' && (!surat.status_alur || surat.status_alur === 'disposisi_kepsek') && (
          <button className="btn btn-primary" onClick={() => setShowForward(true)}><Send size={16} /> Teruskan ke Pengguna</button>
        )}
      </div>

      {/* Daftar disposisi untuk surat masuk */}
      {type === 'masuk' && disposisi.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>Disposisi</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Penerima</th><th>Jabatan</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {disposisi.map(d => (
                  <tr key={d.id}>
                    <td>{d.nama_penerima}</td>
                    <td>
                      {d.nama_jabatan_penerima ? (
                        <span className="badge badge-diteruskan">{formatJabatan(d.nama_jabatan_penerima)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${d.status_disposisi === 'dibaca' ? 'badge-disetujui' : 'badge-menunggu'}`}>
                        {d.status_disposisi === 'dibaca' ? 'Diterima' : 'Belum Diterima'}
                      </span>
                    </td>
                    <td>
                      {d.status_disposisi === 'dibaca' && (
                        <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} /> Sudah Dibaca
                        </span>
                      )}
                      {d.status_disposisi !== 'dibaca' && (
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={14} /> Belum Dibaca
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Modal Teruskan - KHUSUS ADMIN - Grouped by Jabatan */}
      {showForward && (
        <div className="modal-overlay" onClick={() => setShowForward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            {/* Header - matching sidebar navy */}
            <div style={{
              background: '#0f2b52',
              padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Send size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Teruskan Surat</h2>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Pilih penerima berdasarkan jabatan</p>
                </div>
              </div>
              <button onClick={() => setShowForward(false)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.15s'
              }}>
                <XCircle size={18} color="white" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', maxHeight: '55vh', overflowY: 'auto' }}>
              {jabatanGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tidak ada jabatan tersedia</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {jabatanGroups.map(group => {
                    const selectedUserId = getSelectedUserForJabatan(group.id);
                    const isSelected = selectedUserId !== '';
                    return (
                      <div key={group.id} style={{
                        borderRadius: 12,
                        border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                        background: isSelected ? '#eff6ff' : 'var(--bg-primary)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        {/* Jabatan header */}
                        <div style={{
                          padding: '12px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: '1px solid ' + (isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--border-color)')
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: isSelected ? '#2563eb' : '#6b7280',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.2s ease'
                          }}>
                            <Briefcase size={18} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '0.88rem', fontWeight: 600,
                              color: isSelected ? '#1e40af' : 'var(--text-primary)',
                              transition: 'color 0.2s'
                            }}>
                              {formatJabatan(group.nama)}
                            </p>
                            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 1 }}>
                              {group.users.length} pengguna terdaftar
                            </p>
                          </div>
                          {isSelected && (
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <CheckCircle size={14} color="white" />
                            </div>
                          )}
                        </div>

                        {/* User dropdown */}
                        <div style={{ padding: '12px 16px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            Pilih Pengguna
                          </label>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={selectedUserId}
                              onChange={e => handleSelectUserForJabatan(group.id, e.target.value)}
                              style={{
                                width: '100%', padding: '10px 36px 10px 14px',
                                borderRadius: 8, fontSize: '0.85rem',
                                border: '1px solid ' + (isSelected ? '#93c5fd' : 'var(--border-color)'),
                                background: isSelected ? '#ffffff' : 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer', outline: 'none',
                                appearance: 'none', WebkitAppearance: 'none',
                                transition: 'all 0.15s ease',
                                fontWeight: isSelected ? 500 : 400
                              }}
                            >
                              <option value="">— Pilih pengguna —</option>
                              {group.users.map(u => (
                                <option key={u.id} value={u.id}>{u.nama}</option>
                              ))}
                            </select>
                            <ChevronDown size={16} style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              color: 'var(--text-muted)', pointerEvents: 'none'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {forwardTo.length > 0 ? (
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>{forwardTo.length} jabatan dipilih</span>
                ) : 'Belum ada yang dipilih'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowForward(false)} disabled={forwardLoading}>Batal</button>
                <button
                  className="btn btn-primary"
                  onClick={handleForward}
                  disabled={forwardTo.length === 0 || forwardLoading}
                  style={{
                    background: (forwardTo.length > 0 && !forwardLoading) ? '#0f2b52' : undefined,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Send size={16} /> {forwardLoading ? 'Meneruskan...' : `Teruskan (${forwardTo.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lihat Lampiran - Premium Document Viewer */}
      {showLampiran && surat?.file_pdf && (
        <div className="modal-overlay" onClick={() => setShowLampiran(false)} style={{ zIndex: 1200 }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '92vw', maxWidth: 960, height: '88vh',
            background: '#ffffff', borderRadius: 16,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)'
          }}>
            {/* Header - matching sidebar navy */}
            <div style={{
              background: '#0f2b52',
              padding: '16px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Eye size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Lampiran Surat
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {surat.no_surat}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={`http://localhost:8080/uploads/${surat.file_pdf}`}
                  download
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#ffffff', fontSize: '0.82rem', fontWeight: 500,
                    textDecoration: 'none', transition: 'all 0.15s ease',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <Download size={15} /> Unduh
                </a>
                <button
                  onClick={() => setShowLampiran(false)}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease', color: '#ffffff'
                  }}
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {surat.file_pdf.match(/\.pdf$/i) ? (
              <PdfViewer file={surat.file_pdf} filename={surat.file_pdf.split('/').pop()} />
            ) : (
              <>
                {/* Document info bar */}
                <div style={{
                  padding: '10px 24px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#3b82f6'
                    }} />
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                      Gambar
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {surat.file_pdf.split('/').pop()}
                  </span>
                </div>

                <div style={{
                  flex: 1, overflow: 'auto',
                  background: '#cbd5e1',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  padding: '24px'
                }}>
                  <img
                    src={`http://localhost:8080/uploads/${surat.file_pdf}`}
                    alt="Lampiran"
                    style={{
                      maxWidth: '100%', height: 'auto', display: 'block',
                      borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PdfViewer({ file, filename }) {
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    let active = true;
    const loadPdfjs = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Gagal memuat engine PDF.js'));
        });
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    };

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadPdfjs();
        if (!active) return;

        // Dynamically resolve backend root URL from Axios baseURL configuration
        const rootURL = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'http://localhost:8080';
        const fileURL = `${rootURL}/uploads/${file}`;

        // Fetch using the configured Axios API client to seamlessly handle CORS and authorization headers
        const response = await api.get(fileURL, { responseType: 'arraybuffer' });
        if (!active) return;

        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(response.data) });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const numPages = pdf.numPages;
        const loadedPages = [];
        for (let i = 1; i <= numPages; i++) {
          loadedPages.push(i);
        }
        setPages({ pdf, pageNumbers: loadedPages });
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (active) {
          setError('Gagal memuat dokumen PDF: ' + err.message);
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      active = false;
    };
  }, [file]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 60, flex: 1, background: '#cbd5e1' }}>
        <div className="spinner" style={{ borderTopColor: '#0f2b52' }} />
        <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>Mengekstrak halaman dokumen PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', flex: 1, background: '#cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <XCircle size={48} style={{ marginBottom: 12 }} />
        <p style={{ fontWeight: 600 }}>{error}</p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16, background: '#0f2b52', border: 'none' }} onClick={() => window.location.reload()}>Muat Ulang Halaman</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Zoom and Page controls */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', background: '#132f5d', borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 10, color: 'white', flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#dc2626'
          }} />
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {filename}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} 
            style={{ padding: '6px 10px', color: 'white', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}
            title="Perkecil"
          >
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', minWidth: 50, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setZoom(z => Math.min(2.5, z + 0.25))} 
            style={{ padding: '6px 10px', color: 'white', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}
            title="Perbesar"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setZoom(1.0)} 
            style={{ padding: '6px 10px', color: 'white', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
            title="Reset Zoom"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Total: {pages.pageNumbers.length} Halaman
        </span>
      </div>

      {/* Pages Container */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 24, background: '#cbd5e1'
      }}>
        {pages.pageNumbers.map(pageNum => (
          <PdfPage key={pageNum} pdf={pages.pdf} pageNum={pageNum} zoom={zoom} />
        ))}
      </div>
    </div>
  );
}

function PdfPage({ pdf, pageNum, zoom }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let active = true;
    let renderTask = null;

    const renderPage = async () => {
      try {
        setRendering(true);
        const page = await pdf.getPage(pageNum);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        const targetWidth = 780;
        const scale = (targetWidth / originalViewport.width) * zoom;
        const viewport = page.getViewport({ scale });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (active) {
          setRendering(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    renderPage();

    return () => {
      active = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNum, zoom]);

  return (
    <div style={{
      position: 'relative',
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#ffffff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
      {rendering && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        background: 'rgba(15, 43, 82, 0.82)', color: 'white',
        padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
        pointerEvents: 'none', backdropFilter: 'blur(6px)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}>
        Halaman {pageNum}
      </div>
    </div>
  );
}
