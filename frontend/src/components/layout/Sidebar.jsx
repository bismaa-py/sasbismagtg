import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Mail, Send, Users, ClipboardList, User, History, LogOut, AlertTriangle, RefreshCw, BookOpen, Briefcase } from 'lucide-react';
import { formatJabatan } from '../../utils/formatDate';
export default function Sidebar({ open, onClose }) {
  const { user, logout, activeJabatanFilter, setActiveJabatanFilter } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showJabatanModal, setShowJabatanModal] = useState(false);

  const handleLogoutClick = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  // Switch jabatan = just change local filter, no API call
  const handleSwitchJabatan = (idJabatan) => {
    setActiveJabatanFilter(idJabatan); // null = semua, number = specific
    setShowJabatanModal(false);
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard />, label: 'Beranda', roles: ['admin', 'kepsek', 'user', 'pegawai'] },
    { to: '/surat-masuk', icon: <Mail />, label: 'Surat Masuk', roles: ['admin', 'kepsek', 'user', 'pegawai'] },
    { to: '/surat-keluar', icon: <Send />, label: 'Surat Keluar', roles: ['admin', 'kepsek', 'pegawai'] },
    { to: '/riwayat', icon: <History />, label: 'Riwayat', roles: ['admin', 'kepsek', 'user', 'pegawai'] },
  ];

  const adminItems = [
    { to: '/kelola-pengguna', icon: <Users />, label: 'Kelola Pengguna', roles: ['admin'] },
    { to: '/log-aktivitas', icon: <ClipboardList />, label: 'Catatan Aktivitas', roles: ['admin'] },
  ];

  const renderNav = (items) =>
    items
      .filter((item) => item.roles.includes(user?.role))
      .map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ));

  const allJabatan = user?.semua_jabatan || [];
  const hasMultipleJabatan = allJabatan.length > 1;
  // Label jabatan yang sedang aktif
  const activeJabatanLabel = activeJabatanFilter === null
    ? 'Semua Jabatan'
    : formatJabatan(allJabatan.find(j => j.id_jabatan === activeJabatanFilter)?.nama_jabatan) || 'Jabatan';

  // Jabatan yang ditampilkan di kartu profil user (bawah avatar)
  const displayedRole = activeJabatanFilter === null
    ? user?.nama_jabatan
    : allJabatan.find(j => j.id_jabatan === activeJabatanFilter)?.nama_jabatan;

  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo.png" alt="Logo SMK" />
          </div>
          <div className="app-name">
            E-Disposisi Surat
            <span>SMKN 2 Singosari</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Menu Utama</div>
            {renderNav(navItems)}
          </div>

          {user?.role === 'admin' && (
            <div className="nav-section">
              <div className="nav-section-title">Administrasi</div>
              {renderNav(adminItems)}
            </div>
          )}

          <div className="nav-section">
            <div className="nav-section-title">Akun</div>
            <NavLink to="/panduan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <BookOpen /> Panduan Pengguna
            </NavLink>
            <NavLink to="/profil" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <User /> Profil
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.foto_profil ? (
                <img src={`http://localhost:8080/uploads/${user.foto_profil}`} alt="" />
              ) : (
                user?.nama?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-details">
              <div className="name">{user?.nama}</div>
              <div className="role">{formatJabatan(displayedRole) || (user?.role === 'admin' ? 'Admin / TU' : user?.role)}</div>
            </div>
          </div>

          {/* Tombol ganti jabatan - hanya tampil jika punya lebih dari 1 jabatan */}
          {hasMultipleJabatan && (
            <button
              className="nav-link"
              onClick={() => setShowJabatanModal(true)}
              style={{ marginTop: 4, color: '#60a5fa', fontSize: '0.85rem' }}
            >
              <RefreshCw size={16} />
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span>Ganti Jabatan</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                  {activeJabatanLabel}
                </span>
              </span>
            </button>
          )}

          <button className="nav-link" onClick={handleLogoutClick} style={{ marginTop: 4, color: '#f87171' }}>
            <LogOut /> Keluar
          </button>
        </div>
      </aside>

      {/* Modal Ganti Jabatan */}
      {showJabatanModal && (
        <div className="modal-overlay" onClick={() => setShowJabatanModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(15, 43, 82, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)'
                }}>
                  <Briefcase size={18} />
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Ganti Jabatan</h2>
              </div>
              <button className="modal-close" onClick={() => setShowJabatanModal(false)} style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 18, lineHeight: 1.5 }}>
                Pilih jabatan di bawah ini untuk memfilter daftar surat yang ditampilkan di dashboard Anda:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Semua Jabatan (default) */}
                {(() => {
                  const isSelected = activeJabatanFilter === null;
                  return (
                    <div
                      onClick={() => handleSwitchJabatan(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: 'var(--radius)',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(15, 43, 82, 0.04)' : '#ffffff',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(15, 43, 82, 0.05)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--text-muted)';
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Semua Jabatan</span>
                      {isSelected ? (
                        <span style={{ background: 'var(--accent)', color: '#ffffff', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>Aktif</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Pilih</span>
                      )}
                    </div>
                  );
                })()}

                {/* Per jabatan */}
                {allJabatan.map((j) => {
                  const isSelected = activeJabatanFilter === j.id_jabatan;
                  return (
                    <div
                      key={j.id_jabatan}
                      onClick={() => handleSwitchJabatan(j.id_jabatan)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: 'var(--radius)',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(15, 43, 82, 0.04)' : '#ffffff',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(15, 43, 82, 0.05)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--text-muted)';
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{formatJabatan(j.nama_jabatan)}</span>
                      {isSelected ? (
                        <span style={{ background: 'var(--accent)', color: '#ffffff', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>Aktif</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Pilih</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#fee2e2', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'var(--danger)'
              }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Konfirmasi Keluar</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Apakah Anda yakin ingin keluar dari sistem?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowLogoutModal(false)} style={{ minWidth: 100 }}>Batal</button>
                <button className="btn btn-danger" onClick={confirmLogout} style={{ minWidth: 100 }}>Keluar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
