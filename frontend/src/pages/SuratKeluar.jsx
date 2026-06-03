import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Eye, Edit, Trash2, Upload, X, Send, Search, Calendar } from 'lucide-react';
import DateInput from '../components/DateInput';
import api from '../api/axios';
import { formatTanggalShort } from '../utils/formatDate';

// Template kode surat
const kodeSuratOptions = [
  { value: '420', label: '420 - Pendidikan' },
  { value: '421', label: '421 - Kurikulum' },
  { value: '422', label: '422 - Sarana Pendidikan' },
  { value: '423', label: '423 - Peserta Didik' },
  { value: '424', label: '424 - Tenaga Kependidikan' },
  { value: '425', label: '425 - Organisasi' },
  { value: '800', label: '800 - Kepegawaian' },
  { value: '821', label: '821 - Cuti' },
  { value: '850', label: '850 - Pembinaan' },
  { value: '900', label: '900 - Keuangan' },
  { value: '028', label: '028 - Inventaris' },
  { value: '005', label: '005 - Undangan' },
  { value: '100', label: '100 - Umum' },
];

// Fungsi generate template no surat otomatis
const generateNoSurat = (kodeSurat) => {
  const now = new Date();
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const tahun = now.getFullYear();
  const romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const bulanRomawi = romawi[now.getMonth() + 1];
  const kode = kodeSurat || '___';
  return `${kode}/___/${bulanRomawi}/${tahun}`;
};

export default function SuratKeluar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ dari: '', kode_surat: '', no_surat: '', perihal: '', tanggal_surat: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('terbaru');
  const [formError, setFormError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [filter, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/surat-keluar';
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
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
        s.perihal?.toLowerCase().includes(q) ||
        s.tujuan?.toLowerCase().includes(q)
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

    if (!form.dari.trim() || !form.kode_surat || !form.no_surat.trim() || !form.perihal.trim() || !form.tanggal_surat.trim()) {
      setFormError('Semua field wajib harus diisi');
      return;
    }

    if (!editItem && !file) {
      setFormError('File lampiran wajib dilampirkan');
      return;
    }

    const fd = new FormData();
    fd.append('tujuan', form.dari);
    fd.append('kode_surat', form.kode_surat);
    fd.append('no_surat', form.no_surat);
    fd.append('perihal', form.perihal);
    fd.append('tanggal_surat', form.tanggal_surat);
    if (file) fd.append('file_pdf', file);
    setIsSubmitting(true);
    try {
      if (editItem) {
        await api.put(`/surat-keluar/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Surat keluar berhasil diperbarui', 'success');
      } else {
        await api.post('/surat-keluar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Surat keluar berhasil disimpan', 'success');
      }
      closeModal(); fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan');
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

  // Ketika kode surat dipilih, auto-generate no surat
  const handleKodeSuratChange = (value) => {
    const kode = value;
    setForm(prev => ({
      ...prev,
      kode_surat: kode,
      no_surat: prev.no_surat || generateNoSurat(kode)
    }));
  };

  const openCreate = () => {
    setEditItem(null);
    const defaultKode = '';
    setForm({ dari: '', kode_surat: defaultKode, no_surat: '', perihal: '', tanggal_surat: getCurrentDateTime() });
    setFile(null);
    setFormError('');
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ dari: item.tujuan || '', kode_surat: item.kode_surat || '', no_surat: item.no_surat, perihal: item.perihal, tanggal_surat: item.tanggal_surat });
    setFile(null);
    setFormError('');
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(''); };

  const handleDelete = async (id) => {
    showConfirm('Hapus surat ini? Tindakan ini tidak bisa dibatalkan.', async () => {
      try {
        await api.delete(`/surat-keluar/${id}`);
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

  const handleDateFromChange = (e) => {
    const val = e.target.value;
    setDateFrom(val);
    if (val && dateTo && val > dateTo) {
      setDateTo('');
    }
  };

  const handleDateToChange = (e) => {
    const val = e.target.value;
    setDateTo(val);
    if (val && dateFrom && val < dateFrom) {
      setDateFrom('');
    }
  };

  const badgeClass = (s) => `badge badge-${s}`;
  const statusLabel = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', diarsipkan: 'Diarsipkan' };

  // Search highlight helper
  const highlightText = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const canManage = user.role === 'admin' || user.role === 'pegawai';


  if (loading) return <div className="page"><div className="spinner" style={{ margin: '40px auto' }} /></div>;

  return (
    <div className="page">
      {canManage && (
        <div className="page-header" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Buat Surat Keluar</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Cari no. surat, perihal, atau tujuan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Dari:</label>
          <DateInput className="form-input" value={dateFrom} onChange={handleDateFromChange} max={dateTo || undefined} style={{ width: 'auto', minWidth: 150 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sampai:</label>
          <DateInput className="form-input" value={dateTo} onChange={handleDateToChange} min={dateFrom || undefined} style={{ width: 'auto', minWidth: 150 }} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn btn-ghost btn-sm" onClick={clearDateFilter}>
            <X size={14} /> Atur Ulang
          </button>
        )}
      </div>

      {filteredList.length === 0 ? (
        <div className="empty-state"><Send size={48} /><h3>{search ? 'Tidak ada hasil' : 'Belum ada surat keluar'}</h3></div>
      ) : (
        <div className="surat-grid">
          {filteredList.map(s => (
            <div className="surat-card" key={s.id}>
              <div className="surat-card-header"><span className="no-surat">{highlightText(s.no_surat, search)}</span><span className={badgeClass(s.status_verifikasi)}>{statusLabel[s.status_verifikasi]}</span></div>
              <div className="perihal">{highlightText(s.perihal, search)}</div>
              <div className="meta"><span>Tujuan: {highlightText(s.tujuan, search)}</span><span>Kode: {s.kode_surat}</span><span>{formatTanggalShort(s.created_at)}</span></div>
              <div className="actions">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/surat-keluar/${s.id}`)}><Eye size={14} /> Detail</button>
                {canManage && s.status_verifikasi === 'menunggu' && <button className="btn btn-warning btn-sm" onClick={() => openEdit(s)}><Edit size={14} /> Ubah</button>}
                {canManage && s.status_verifikasi === 'menunggu' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}><Trash2 size={14} /> Hapus</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Ubah Surat Keluar' : 'Buat Surat Keluar'}</h2><button className="modal-close" onClick={closeModal}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.85rem' }}>{formError}</div>}
                <div className="form-group"><label>Tujuan *</label><input className="form-input" value={form.dari} onChange={e => setForm({...form, dari: e.target.value})} required placeholder="Contoh: Dinas Pendidikan Kab. Malang" /></div>
                <div className="form-group">
                  <label>Kode Surat *</label>
                  <select className="form-input" value={form.kode_surat} onChange={e => handleKodeSuratChange(e.target.value)} required>
                    <option value="">-- Pilih Kode Surat --</option>
                    {kodeSuratOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>No. Surat *</label>
                  <input className="form-input" value={form.no_surat} onChange={e => setForm({...form, no_surat: e.target.value})} required placeholder="Contoh: 420/001/I/2026" />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Template otomatis terisi saat kode surat dipilih. Sesuaikan nomor urut sesuai kebutuhan.</small>
                </div>
                <div className="form-group"><label>Perihal *</label><input className="form-input" value={form.perihal} onChange={e => setForm({...form, perihal: e.target.value})} required /></div>
                <div className="form-group"><label>Tanggal Surat *</label><input className="form-input" type="datetime-local" value={form.tanggal_surat} onChange={e => setForm({...form, tanggal_surat: e.target.value})} required /></div>
                <div className="form-group"><label>Lampiran (PDF) {!editItem && '*'}</label><div className="file-upload" onClick={() => document.getElementById('file-sk').click()}><Upload size={24} /><p>{file ? file.name : 'Klik untuk mengunggah'}</p><input id="file-sk" type="file" accept=".pdf" onChange={handleFileChange} /></div></div>
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
