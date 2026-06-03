import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Send, Clock, History, FileText, Calendar } from 'lucide-react';
import api from '../api/axios';
import { formatTanggalShort } from '../utils/formatDate';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSuratMasuk, setRecentSuratMasuk] = useState([]);
  const [recentSuratKeluar, setRecentSuratKeluar] = useState([]);
  const [activeTab, setActiveTab] = useState('masuk');

  const isAdminOrKepsek = user.role === 'admin' || user.role === 'kepsek' || user.role === 'pegawai';

  useEffect(() => {
    api.get('/dashboard/stats').then(res => {
      if (res.data.success) setStats(res.data.data);
    }).catch(() => {});

    // Ambil surat masuk terbaru
    api.get('/surat-masuk').then(res => {
      if (res.data.success) {
        const data = res.data.data || [];
        setRecentSuratMasuk(data.slice(0, 5));
      }
    }).catch(() => {});

    // Ambil surat keluar terbaru (hanya untuk admin/kepsek)
    if (isAdminOrKepsek) {
      api.get('/surat-keluar').then(res => {
        if (res.data.success) {
          const data = res.data.data || [];
          setRecentSuratKeluar(data.slice(0, 5));
        }
      }).catch(() => {});
    }
  }, []);

  if (!stats) return <div className="page"><div className="spinner" style={{ margin: '40px auto' }} /></div>;

  const statCards = [];
  statCards.push({
    label: 'Surat Masuk',
    value: stats.total_surat_masuk,
    icon: <Mail size={24} />,
    color: 'blue',
    desc: 'Total surat masuk terdaftar'
  });

  if (isAdminOrKepsek) {
    statCards.push({
      label: 'Surat Keluar',
      value: stats.total_surat_keluar,
      icon: <Send size={24} />,
      color: 'green',
      desc: 'Total surat keluar diarsipkan'
    });
    statCards.push({
      label: 'Menunggu Persetujuan',
      value: stats.surat_menunggu_persetujuan,
      icon: <Clock size={24} />,
      color: 'yellow',
      desc: 'Perlu verifikasi & tanda tangan'
    });
  }

  statCards.push({
    label: 'Riwayat',
    value: stats.total_history,
    icon: <History size={24} />,
    color: 'purple',
    desc: 'Aktivitas persuratan dicatat'
  });

  const greetings = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const statusLabel = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', diteruskan: 'Diteruskan', diarsipkan: 'Diarsipkan' };

  return (
    <div className="page">

      {/* Greeting & description (Welcome Banner) */}
      <div className="welcome-banner">
        <h1 className="welcome-title">
          {greetings()}, {user.nama}! 👋
        </h1>
        <p className="welcome-desc">
          {user.role === 'admin' && 'Selamat datang di panel kendali sistem. Kelola surat, pengguna, dan pantau log aktivitas dari sini.'}
          {user.role === 'kepsek' && 'Anda memiliki akses penuh untuk meninjau, menyetujui, dan menandatangani surat masuk maupun keluar.'}
          {user.role === 'pegawai' && 'Kelola administrasi persuratan, input surat masuk/keluar baru, dan pantau disposisi dengan mudah.'}
          {user.role === 'user' && 'Tinjau surat disposisi yang telah diteruskan kepada Anda dan berikan tanggapan yang diperlukan.'}
        </p>
      </div>

      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div className="stat-card" key={i}>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-desc">{s.desc}</div>
            </div>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Surat Terbaru */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isAdminOrKepsek ? 'Surat Terbaru' : 'Surat Masuk Terbaru'}
            </h3>
          </div>
          {/* Tab hanya untuk admin/kepsek */}
          {isAdminOrKepsek && (
            <div className="filters" style={{ margin: 0, gap: 4 }}>
              <button
                className={`filter-btn ${activeTab === 'masuk' ? 'active' : ''}`}
                onClick={() => setActiveTab('masuk')}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <Mail size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Surat Masuk
              </button>
              <button
                className={`filter-btn ${activeTab === 'keluar' ? 'active' : ''}`}
                onClick={() => setActiveTab('keluar')}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <Send size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Surat Keluar
              </button>
            </div>
          )}
        </div>

        {/* Surat Masuk (tampil untuk semua role, dan untuk admin/kepsek saat tab masuk aktif) */}
        {(activeTab === 'masuk' || !isAdminOrKepsek) && (
          <>
            {recentSuratMasuk.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Mail size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Belum ada surat masuk</p>
              </div>
            ) : (
              <div className="table-container" style={{ boxShadow: 'none', border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>No. Surat</th>
                      <th>Perihal</th>
                      <th>Asal</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSuratMasuk.map(s => (
                      <tr key={s.id} className="clickable-row" onClick={() => navigate(`/surat-masuk/${s.id}`)}>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f2b52' }}>{s.no_surat}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.perihal_surat}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.asal_surat}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> {formatTanggalShort(s.created_at)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${s.status_verifikasi}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                            {statusLabel[s.status_verifikasi] || s.status_verifikasi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Surat Keluar (hanya untuk admin/kepsek saat tab keluar aktif) */}
        {isAdminOrKepsek && activeTab === 'keluar' && (
          <>
            {recentSuratKeluar.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Send size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Belum ada surat keluar</p>
              </div>
            ) : (
              <div className="table-container" style={{ boxShadow: 'none', border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>No. Surat</th>
                      <th>Perihal</th>
                      <th>Tujuan</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSuratKeluar.map(s => (
                      <tr key={s.id} className="clickable-row" onClick={() => navigate(`/surat-keluar/${s.id}`)}>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f2b52' }}>{s.no_surat}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.perihal}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.tujuan}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> {formatTanggalShort(s.created_at)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${s.status_verifikasi}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                            {statusLabel[s.status_verifikasi] || s.status_verifikasi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
