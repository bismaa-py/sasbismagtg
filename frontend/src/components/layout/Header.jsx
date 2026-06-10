import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { parseBackendDate } from '../../utils/formatDate';

const pageTitles = {
  '/dashboard': 'Beranda',
  '/surat-masuk': 'Surat Masuk',
  '/surat-keluar': 'Surat Keluar',
  '/kelola-pengguna': 'Kelola Pengguna',
  '/log-aktivitas': 'Catatan Aktivitas',
  '/profil': 'Profil',
  '/riwayat': 'Riwayat',
  '/panduan': 'Panduan Pengguna',
};

export default function Header({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const title = pageTitles[location.pathname] || 'Detail Surat';

  // Jam realtime
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    const handleRefresh = () => {
      fetchUnread();
    };
    window.addEventListener('refreshNotifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setShowPopup(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data.success) setUnreadCount(res.data.data.count);
    } catch (e) { /* abaikan */ }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) setNotifications(res.data.data || []);
    } catch (e) { /* abaikan */ }
  };

  const togglePopup = () => {
    if (!showPopup) fetchNotifications();
    setShowPopup(!showPopup);
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      await markRead(n.id);
    }
    setShowPopup(false);
    if (n.id_referensi && n.tipe_referensi) {
      if (n.tipe_referensi === 'surat_masuk') {
        navigate(`/surat-masuk/${n.id_referensi}`);
      } else if (n.tipe_referensi === 'surat_keluar') {
        navigate(`/surat-keluar/${n.id_referensi}`);
      }
    }
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (date) => {
    if (!date) return '-';
    const parsedObj = parseBackendDate(date);
    if (!parsedObj || isNaN(parsedObj.date.getTime())) return '-';
    const parsed = parsedObj.date;
    const diff = Date.now() - parsed.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  };

  // Format tanggal & waktu realtime
  const formatDateTime = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = days[date.getDay()];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${day}, ${d} ${m} ${y} • ${h}:${min}:${s}`;
  };

  return (
    <header className="header">
      {/* Kiri: Tombol menu mobile dan Judul Halaman */}
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <Menu size={22} />
        </button>
        <h2>{title}</h2>
      </div>

      {/* Kanan: Jam dan Notifikasi */}
      <div className="header-right" ref={popupRef}>
        {/* Jam Realtime */}
        <div className="header-clock">
          <Clock size={14} />
          <span>{formatDateTime(currentTime)}</span>
        </div>

        <button className="notif-btn" onClick={togglePopup} id="notif-bell">
          <Bell size={20} />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        {showPopup && (
          <div className="notif-popup">
            <div className="notif-popup-header">
              <h3>Notifikasi</h3>
              {unreadCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Tandai semua dibaca</button>
              )}
            </div>
            <div className="notif-popup-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">Tidak ada notifikasi</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleNotifClick(n)} style={{ cursor: 'pointer' }}>
                    <div className="notif-title">{n.judul}</div>
                    <div className="notif-msg">{n.pesan}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
