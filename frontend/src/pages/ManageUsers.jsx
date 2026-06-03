import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Users, Search, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatJabatan } from '../utils/formatDate';

// Daftar jabatan dengan ID dan nama untuk dropdown (sesuai database)
const jabatanOptions = [
  { id: 1, nama: 'Kepala Sekolah' },
  { id: 2, nama: 'Admin / Tata Usaha' },
  { id: 3, nama: 'Pegawai / Staf TU' },
  { id: 5, nama: 'Waka Kesiswaan' },
  { id: 6, nama: 'Waka Kurikulum' },
  { id: 7, nama: 'Waka Sarpras' },
  { id: 8, nama: 'Waka Humas' },
  { id: 9, nama: 'BKK' },
  { id: 11, nama: 'Kapro RPL' },
  { id: 12, nama: 'Kapro TKJ' },
  { id: 13, nama: 'Kapro DKV' },
  { id: 14, nama: 'Kapro AN' },
  { id: 15, nama: 'Kapro EI' },
  { id: 16, nama: 'Kapro MT' },
  { id: 17, nama: 'Kapro AV' },
  { id: 18, nama: 'Kapro BC' },
  { id: 19, nama: 'BK' },
  { id: 20, nama: 'Prakerin' },
  { id: 21, nama: 'Koordinator Waka' },
  { id: 22, nama: 'Koordinator BK' },
  { id: 23, nama: 'Koordinator BKK' }
];

export default function ManageUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ email: '', nama: '', password: '', id_jabatan: [] });
  const [search, setSearch] = useState('');
  const [pwError, setPwError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // State konfirmasi hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await api.get('/users');
    if (res.data.success) setUsers(res.data.data || []);
  };

  // Validasi kata sandi: min 8 karakter, huruf besar, huruf kecil, angka
  const validatePassword = (pw) => {
    if (pw.length < 8) return 'Kata sandi harus minimal 8 karakter';
    if (!/[A-Z]/.test(pw)) return 'Kata sandi harus mengandung huruf besar';
    if (!/[a-z]/.test(pw)) return 'Kata sandi harus mengandung huruf kecil';
    if (!/[0-9]/.test(pw)) return 'Kata sandi harus mengandung angka';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPwError('');

    if (!editItem || form.password) {
      const pwErr = validatePassword(form.password);
      if (pwErr) {
        setPwError(pwErr);
        return;
      }
    }

    if (!editItem && form.id_jabatan.length === 0) {
      setPwError('Pilih minimal satu jabatan');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        const data = { nama: form.nama, email: form.email, id_jabatan: form.id_jabatan };
        if (form.password) data.password = form.password;
        await api.put(`/users/${editItem.id}`, data);
        showToast('Akun berhasil diperbarui', 'success');
      } else {
        await api.post('/users', {
          nama: form.nama,
          email: form.email,
          password: form.password,
          id_jabatan: form.id_jabatan.length > 0 ? form.id_jabatan : [1],
        });
        showToast('Akun berhasil disimpan', 'success');
      }
      closeModal(); fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tampilkan popup konfirmasi hapus
  const handleDeleteClick = (user) => {
    setDeleteTarget(user);
    setShowDeleteModal(true);
  };

  // Hapus user
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      showToast('Akun berhasil dihapus', 'success');
      fetchUsers();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus akun', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle jabatan di multi-select
  const toggleJabatan = (jabatanId) => {
    setForm(prev => {
      const current = prev.id_jabatan || [];
      if (current.includes(jabatanId)) {
        return { ...prev, id_jabatan: current.filter(id => id !== jabatanId) };
      } else {
        return { ...prev, id_jabatan: [...current, jabatanId] };
      }
    });
  };

  const openCreate = () => { setEditItem(null); setForm({ email: '', nama: '', password: '', id_jabatan: [] }); setPwError(''); setShowPassword(false); setShowModal(true); };
  const openEdit = (u) => {
    const jabatanIds = u.semua_jabatan ? u.semua_jabatan.map(j => j.id_jabatan) : [];
    setEditItem(u);
    setForm({ email: u.email, nama: u.nama, password: '', id_jabatan: jabatanIds });
    setPwError('');
    setShowPassword(false);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setPwError(''); setShowPassword(false); };

  const roleLabel = { admin: 'Admin/TU', pegawai: 'Pegawai TU', kepsek: 'Kepala Sekolah', user: 'Pengguna' };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Search highlight helper
  const highlightText = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ backgroundColor: '#fef08a', color: '#0f2b52', padding: '0 2px', borderRadius: '2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div className="page">
      <div className="page-header" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Tambah Akun</button>
      </div>

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form-input" placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="empty-state"><Users size={48} /><h3>Belum ada pengguna</h3></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama</th><th>Email</th><th>Peran</th>
                <th>Jabatan</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>{highlightText(u.nama, search)}</td>
                  <td>{highlightText(u.email, search)}</td>
                  <td><span className="badge badge-diteruskan">{roleLabel[u.role] || u.role || '-'}</span></td>
                  <td>
                    {u.semua_jabatan && u.semua_jabatan.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.semua_jabatan.map((j, i) => (
                          <span key={i} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 500, background: '#e5e7eb', color: '#374151' }}>
                            {formatJabatan(j.nama_jabatan)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>{formatJabatan(u.nama_jabatan) || '-'}</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      {u.role !== 'admin' && u.role !== 'kepsek' ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><Edit size={14} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(u)}><Trash2 size={14} /></button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Dilindungi</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Buat/Ubah */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editItem ? 'Ubah Akun' : 'Tambah Akun Baru'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Grid dua kolom untuk Nama & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                      Nama Lengkap *
                    </label>
                    <input
                      className="form-input"
                      value={form.nama}
                      onChange={e => setForm({ ...form, nama: e.target.value })}
                      required
                      placeholder="Masukkan nama lengkap..."
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                      Alamat Email *
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      placeholder="contoh@domain.com"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                    {editItem ? 'Kata Sandi Baru (kosongkan jika tidak ingin diubah)' : 'Kata Sandi *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => { setForm({ ...form, password: e.target.value }); setPwError(''); }}
                      {...(!editItem && { required: true })}
                      placeholder="Minimal 8 karakter..."
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', display: 'block', marginTop: 4 }}>
                    Kombinasi minimal 8 karakter, terdiri dari huruf besar, huruf kecil, dan angka.
                  </small>
                  {pwError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 6, fontWeight: 500 }}>
                      ⚠️ {pwError}
                    </div>
                  )}
                </div>

                {/* Jabatan checklist dalam grid yang profesional */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 8, display: 'block' }}>
                    Pilih Jabatan * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(pilih satu atau lebih)</span>
                  </label>
                  <div style={{
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '12px',
                    maxHeight: 220,
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 8,
                    background: '#f8fafc'
                  }}>
                    {jabatanOptions.filter(j => j.id !== 1 && j.id !== 2).map(j => {
                      const isSelected = (form.id_jabatan || []).includes(j.id);
                      return (
                        <label key={j.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          borderRadius: 8,
                          border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(15, 43, 82, 0.05)' : '#ffffff',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 1px 3px rgba(15, 43, 82, 0.05)' : 'none'
                        }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--text-muted)';
                              e.currentTarget.style.background = '#f1f5f9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.background = '#ffffff';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleJabatan(j.id)}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: 'var(--accent)',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{j.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', display: 'block', marginTop: 6 }}>
                    Jabatan pertama yang Anda pilih akan secara otomatis dijadikan sebagai jabatan utama (primary).
                  </small>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : (editItem ? 'Perbarui Akun' : 'Simpan Akun')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'var(--danger)'
              }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Hapus Akun</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.nama}</strong>?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} style={{ minWidth: 100 }} disabled={isSubmitting}>
                  Batal
                </button>
                <button className="btn btn-danger" onClick={confirmDelete} style={{ minWidth: 100, background: 'var(--danger)' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
