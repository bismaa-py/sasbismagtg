import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Mail, Send, History as HistoryIcon, Search, FileText, Calendar, X } from 'lucide-react';
import DateInput from '../components/DateInput';
import api from '../api/axios';
import { formatTanggalShort } from '../utils/formatDate';

export default function History() {
  const { user, activeJabatanFilter } = useAuth();
  const navigate = useNavigate();
  const [suratMasuk, setSuratMasuk] = useState([]);
  const [suratKeluar, setSuratKeluar] = useState([]);
  const [tab, setTab] = useState('semua');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('terbaru');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, dateFrom, dateTo, activeJabatanFilter]);

  const fetchHistory = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (activeJabatanFilter) params.append('jabatan_id', activeJabatanFilter);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const qs = params.toString();
    const suffix = qs ? '?' + qs : '';
    try {
      const smPromise = api.get(`/surat-masuk/history${suffix}`);
      // User biasa dan waka tidak punya riwayat surat keluar
      const skPromise = (user.role === 'admin' || user.role === 'kepsek')
        ? api.get(`/surat-keluar/history${suffix}`)
        : Promise.resolve({ data: { success: true, data: [] } });
      const [smRes, skRes] = await Promise.all([smPromise, skPromise]);
      if (smRes.data.success) setSuratMasuk(smRes.data.data || []);
      if (skRes.data.success) setSuratKeluar(skRes.data.data || []);
    } catch (e) { /* */ }
  };

  const statusLabel = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', diteruskan: 'Diteruskan', diarsipkan: 'Diarsipkan' };



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

  const getDisplayData = () => {
    let masukItems = suratMasuk.map(s => ({ ...s, _type: 'masuk', _perihal: s.perihal_surat, _asal: s.asal_surat, _uniqueKey: `masuk-${s.id}` }));
    let keluarItems = suratKeluar.map(s => ({ ...s, _type: 'keluar', _perihal: s.perihal, _asal: s.tujuan, _uniqueKey: `keluar-${s.id}` }));

    if (tab === 'masuk') return masukItems;
    if (tab === 'keluar') return keluarItems;
    return [...masukItems, ...keluarItems];
  };

  const displayData = useMemo(() => {
    let result = getDisplayData();

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.no_surat?.toLowerCase().includes(q) ||
        s._perihal?.toLowerCase().includes(q) ||
        s._asal?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return sortOrder === 'terbaru' ? db - da : da - db;
    });

    return result;
  }, [suratMasuk, suratKeluar, tab, search, sortOrder]);

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

  return (
    <div className="page">
      <div className="sticky-filter-container">
        {/* Tab: hanya untuk admin/kepsek yang punya masuk + keluar */}
        {(user.role === 'admin' || user.role === 'kepsek') && (
          <div className="filters" style={{ marginBottom: 12 }}>
            <button className={`filter-btn ${tab === 'semua' ? 'active' : ''}`} onClick={() => setTab('semua')}>
              <FileText size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Semua Surat
            </button>
            <button className={`filter-btn ${tab === 'masuk' ? 'active' : ''}`} onClick={() => setTab('masuk')}>
              <Mail size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Surat Masuk
            </button>
            <button className={`filter-btn ${tab === 'keluar' ? 'active' : ''}`} onClick={() => setTab('keluar')}>
              <Send size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Surat Keluar
            </button>
          </div>
        )}

        {/* Filter & pencarian */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Cari no. surat, perihal..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          {user.role !== 'user' && (
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
              <option value="">Semua Status</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
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
            <DateInput className="form-input" value={dateFrom} onChange={handleDateFromChange} max={dateTo || undefined} style={{ width: 'auto', minWidth: 150 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sampai:</label>
            <DateInput className="form-input" value={dateTo} onChange={handleDateToChange} min={dateFrom || undefined} style={{ width: 'auto', minWidth: 150 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button className="btn btn-ghost btn-sm" onClick={clearDateFilter} style={{ marginLeft: 8 }}>
              <X size={14} /> Atur Ulang
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {displayData.length === 0 ? (
          <div className="empty-state"><HistoryIcon size={48} /><h3>Belum ada riwayat</h3><p>Surat yang sudah diterima atau diproses akan muncul di sini.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No. Surat</th><th>Perihal</th><th>Asal/Tujuan</th><th>Tanggal/Waktu</th><th>Tipe</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
            <tbody>
              {displayData.map((s) => (
                <tr key={s._uniqueKey}>
                  <td>{highlightText(s.no_surat, search)}</td>
                  <td>{highlightText(s._perihal, search)}</td>
                  <td>{highlightText(s._asal, search)}</td>
                  <td>{formatTanggalShort(s.created_at)}</td>
                  <td><span className={`badge ${s._type === 'masuk' ? 'badge-diteruskan' : 'badge-diarsipkan'}`}>{s._type === 'masuk' ? 'Masuk' : 'Keluar'}</span></td>
                  <td><span className={`badge badge-${s.status_verifikasi}`}>{statusLabel[s.status_verifikasi]}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/surat-${s._type}/${s.id}`)}>
                      <Eye size={14} /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
