import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Eye, Edit, Trash2, Upload, X, Search, Mail, Calendar } from 'lucide-react';
import DateInput from '../components/DateInput';
import api from '../api/axios';
import { formatTanggalShort, getLocalTodayDateString, getLocalTodayDateTimeString } from '../utils/formatDate';

// Template no surat otomatis
const generateNoSuratMasuk = () => {
  const now = new Date();
  const romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const bulanRomawi = romawi[now.getMonth() + 1];
  const tahun = now.getFullYear();
  return `___/${bulanRomawi}/${tahun}`;
};

export default function SuratMasuk() {
  const { user, activeJabatanFilter } = useAuth();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ no_surat: '', perihal_surat: '', asal_surat: '', tanggal_surat: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('terbaru');
  const [formError, setFormError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [filter, dateFrom, dateTo, activeJabatanFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/surat-masuk';
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
      if (activeJabatanFilter) params.append('jabatan_id', activeJabatanFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const qs = params.toString();
      if (qs) url += '?' + qs;
      const res = await api.get(url);
      if (res.data.success) setList(res.data.data || []);
    } catch (e) { /* */ }
    setLoading(false);
  };

  const filteredList = useMemo(() => {
    let result = [...list];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.no_surat?.toLowerCase().includes(q) ||
        s.perihal_surat?.toLowerCase().includes(q) ||
        s.asal_surat?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return sortOrder === 'terbaru' ? db - da : da - db;
    });
    return result;
  }, [list, search, sortOrder]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setFormError('Format file harus PDF');
      setFile(null);
      e.target.value = '';
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setFormError('Ukuran file maksimal 2 MB');
      setFile(null);
      e.target.value = '';
      return;
    }

    setFormError('');
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.no_surat.trim() || !form.perihal_surat.trim() || !form.asal_surat.trim() || !form.tanggal_surat.trim()) {
      setFormError('Semua field wajib harus diisi');
      return;
    }

    if (!editItem && !file) {
      setFormError('File lampiran wajib dilampirkan');
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('file_pdf', file);
    setIsSubmitting(true);
    try {
      if (editItem) {
        await api.put(`/surat-masuk/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Surat masuk berhasil diperbarui', 'success');
      } else {
        await api.post('/surat-masuk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Surat masuk berhasil disimpan', 'success');
      }
      closeModal(); fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan surat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ no_surat: generateNoSuratMasuk(), perihal_surat: '', asal_surat: '', tanggal_surat: getCurrentDateTime() });
    setFile(null);
    setFormError('');
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ no_surat: item.no_surat, perihal_surat: item.perihal_surat, asal_surat: item.asal_surat, tanggal_surat: item.tanggal_surat });
    setFile(null);
    setFormError('');
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(''); };

  const handleDelete = async (id) => {
    showConfirm('Hapus surat ini? Tindakan ini tidak bisa dibatalkan.', async () => {
      try {
        await api.delete(`/surat-masuk/${id}`);
        showToast('Surat berhasil dihapus', 'success');
        fetchData();
      } catch (err) {
        showToast(err.response?.data?.message || 'Gagal menghapus surat', 'error');
      }
    });
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Validasi: jika Dari berubah dan lebih besar dari Sampai, reset Sampai
  const handleDateFromChange = (e) => {
    const val = e.target.value;
    setDateFrom(val);
    if (val && dateTo && val > dateTo) {
      setDateTo('');
    }
  };

  // Validasi: jika Sampai berubah dan lebih kecil dari Dari, reset Dari
  const handleDateToChange = (e) => {
    const val = e.target.value;
    setDateTo(val);
    if (val && dateFrom && val < dateFrom) {
      setDateFrom('');
    }
  };



  const badgeClass = (s) => `badge badge-${s}`;
  const statusLabel = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', diteruskan: 'Diteruskan', diarsipkan: 'Diarsipkan' };

  // Search highlight helper
  const highlightText = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ backgroundColor: '#dbeafe', color: '#0f2b52', padding: '2px 4px', borderRadius: '4px', fontWeight: 600 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const canManage = user.role === 'admin' || user.role === 'pegawai';

  if (loading) return <div className="page"><div className="spinner" style={{ margin: '40px auto' }} /></div>;

  return (
    <div className="page">
      <div className="sticky-filter-container">
        {canManage && (
          <div className="page-header" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Buat Surat Masuk</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Cari no. surat, perihal, atau asal..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          {user.role !== 'user' && (
            <select className="form-input" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="">Semua</option>
              <option value="menunggu">Menunggu</option>
            </select>
          )}
          <select className="form-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
            <option value="terbaru">Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
        </div>

        {/* Filter rentang tanggal */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Dari:</label>
            <DateInput className="form-input" value={dateFrom} onChange={handleDateFromChange} max={dateTo && dateTo < getLocalTodayDateString() ? dateTo : getLocalTodayDateString()} style={{ width: 'auto', minWidth: 150 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sampai:</label>
            <DateInput className="form-input" value={dateTo} onChange={handleDateToChange} min={dateFrom || undefined} max={getLocalTodayDateString()} style={{ width: 'auto', minWidth: 150 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button className="btn btn-ghost btn-sm" onClick={clearDateFilter} style={{ marginLeft: 8 }}>
              <X size={14} /> Atur Ulang
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {filteredList.length === 0 ? (
          <div className="empty-state"><Mail size={48} /><h3>{search ? 'Tidak ada hasil' : 'Belum ada surat masuk'}</h3><p>{search ? 'Coba kata kunci lain' : 'Surat masuk akan muncul di sini.'}</p></div>
        ) : (
          <div className="surat-grid">
          {filteredList.map(s => (
            <div className="surat-card" key={s.id}>
              <div className="surat-card-header">
                <span className="no-surat">{highlightText(s.no_surat, search)}</span>
                <span className={badgeClass(s.status_verifikasi)}>{statusLabel[s.status_verifikasi] || s.status_verifikasi}</span>
              </div>
              <div className="perihal">{highlightText(s.perihal_surat, search)}</div>
              <div className="meta"><span>Asal: {highlightText(s.asal_surat, search)}</span><span>{formatTanggalShort(s.created_at)}</span></div>
              <div className="actions">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/surat-masuk/${s.id}`)}><Eye size={14} /> Detail</button>
                {canManage && s.status_verifikasi === 'menunggu' && <button className="btn btn-warning btn-sm" onClick={() => openEdit(s)}><Edit size={14} /> Ubah</button>}
                {canManage && s.status_verifikasi === 'menunggu' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}><Trash2 size={14} /> Hapus</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Ubah Surat Masuk' : 'Buat Surat Masuk'}</h2><button className="modal-close" onClick={closeModal}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.85rem' }}>{formError}</div>}
                <div className="form-group">
                  <label>No. Surat *</label>
                  <input className="form-input" value={form.no_surat} onChange={e => setForm({ ...form, no_surat: e.target.value })} required placeholder="Contoh: 001/I/2026" />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Template otomatis terisi. Sesuaikan nomor urut sesuai kebutuhan.</small>
                </div>
                <div className="form-group"><label>Perihal *</label><input className="form-input" value={form.perihal_surat} onChange={e => setForm({ ...form, perihal_surat: e.target.value })} required /></div>
                <div className="form-group"><label>Asal Surat *</label><input className="form-input" value={form.asal_surat} onChange={e => setForm({ ...form, asal_surat: e.target.value })} required placeholder="Contoh: Dinas Pendidikan Kab. Malang" /></div>
                <div className="form-group"><label>Tanggal Surat *</label><input className="form-input" type="datetime-local" value={form.tanggal_surat} onChange={e => setForm({ ...form, tanggal_surat: e.target.value })} max={getLocalTodayDateTimeString()} required /></div>
                <div className="form-group">
                  <label>Lampiran (PDF) {!editItem && '*'}</label>
                  <div className="file-upload" onClick={() => document.getElementById('file-sm').click()}>
                    <Upload size={24} /><p>{file ? file.name : 'Klik untuk mengunggah file'}</p>
                    <input id="file-sm" type="file" accept=".pdf" onChange={handleFileChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : (editItem ? 'Perbarui' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
