import { useState, useEffect } from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import api from '../api/axios';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/activity-logs');
      if (res.data.success) {
        const allLogs = res.data.data || [];
        // Filter: hanya tampilkan log dari 1 minggu terakhir
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const filteredLogs = allLogs.filter(l => {
          const logDate = parseLocal(l.updated_at);
          return logDate >= oneWeekAgo;
        });
        setLogs(filteredLogs);
      }
    } catch (e) { /* abaikan */ }
  };

  // Format waktu - parse backend timestamp sebagai local time (bukan UTC)
  const parseLocal = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr);
    const match = str.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (match) return new Date(+match[1], +match[2]-1, +match[3], +match[4], +match[5], +match[6]);
    return new Date(str);
  };

  const formatWaktu = (dateStr) => {
    if (!dateStr) return '-';
    const d = parseLocal(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${dd} ${mm} ${yyyy} ${h}.${m}.${s}`;
  };

  const aksiLabel = {
    'LOGIN': 'Masuk',
    'BUAT_SURAT_MASUK': 'Buat Surat Masuk',
    'EDIT_SURAT_MASUK': 'Ubah Surat Masuk',
    'HAPUS_SURAT_MASUK': 'Hapus Surat Masuk',
    'REVIEW_SURAT_MASUK': 'Tinjau Surat Masuk',
    'TERUSKAN_SURAT': 'Teruskan Surat',
    'ARSIP_SURAT': 'Arsip Surat',
    'BUAT_SURAT_KELUAR': 'Buat Surat Keluar',
    'EDIT_SURAT_KELUAR': 'Ubah Surat Keluar',
    'HAPUS_SURAT_KELUAR': 'Hapus Surat Keluar',
    'REVIEW_SURAT_KELUAR': 'Tinjau Surat Keluar',
    'ARSIP_SURAT_KELUAR': 'Arsip Surat Keluar',
    'BUAT_AKUN': 'Buat Akun',
    'EDIT_AKUN': 'Ubah Akun',
    'HAPUS_AKUN': 'Hapus Akun',
    'GANTI_PASSWORD': 'Ganti Kata Sandi',
    'RESET_PASSWORD': 'Atur Ulang Kata Sandi',
    'UPDATE_FOTO_PROFIL': 'Perbarui Foto Profil',
    'KONFIRMASI_DISPOSISI': 'Konfirmasi Disposisi',
    'SWITCH_JABATAN': 'Ganti Jabatan',
  };

  // Hitung berapa hari lagi log akan direset
  const getResetInfo = () => {
    if (logs.length === 0) return null;
    // Cari log tertua
    const oldest = logs.reduce((min, l) => {
      const d = parseLocal(l.updated_at);
      return d < min ? d : min;
    }, new Date());
    const resetDate = new Date(oldest);
    resetDate.setDate(resetDate.getDate() + 7);
    const now = new Date();
    const diffDays = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Log sudah melewati batas 1 minggu';
    return `Log akan otomatis dihapus dalam ${diffDays} hari`;
  };

  return (
    <div className="page">

      {/* Info reset log */}
      <div style={{
        background: 'var(--accent-light)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
        fontSize: '0.8rem', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <Trash2 size={14} />
        <span>Log aktivitas hanya menampilkan data 7 hari terakhir. {getResetInfo()}</span>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state"><ClipboardList size={48} /><h3>Belum ada aktivitas</h3><p>Aktivitas 7 hari terakhir akan muncul di sini.</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatWaktu(l.updated_at)}</td>
                  <td>{l.nama_user}</td>
                  <td><span className="badge badge-diteruskan">{aksiLabel[l.aksi] || l.aksi}</span></td>
                  <td>{l.tabel_terkait}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
