import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

const panduanAdmin = [
  {
    id: 'login',
    title: 'Login ke Sistem',
    steps: [
      'Buka halaman login di browser.',
      'Masukkan email dan kata sandi akun Admin/TU.',
      'Klik tombol "Masuk" untuk masuk ke dashboard.',
      'Jika lupa kata sandi, klik "Lupa Kata Sandi?" untuk reset via OTP email.'
    ]
  },
  {
    id: 'buat-surat-masuk',
    title: 'Membuat Surat Masuk',
    steps: [
      'Buka menu "Surat Masuk" di sidebar.',
      'Klik tombol "+ Buat Surat Masuk" di kanan atas.',
      'Isi formulir: No. Surat (otomatis terisi template), Perihal, Asal Surat, dan Tanggal.',
      'Unggah file lampiran (PDF atau gambar) — wajib untuk surat baru.',
      'Klik "Simpan" untuk mengirim surat ke Kepala Sekolah untuk ditinjau.',
      'Status surat akan menjadi "Menunggu" hingga Kepala Sekolah meninjau.'
    ]
  },
  {
    id: 'buat-surat-keluar',
    title: 'Membuat Surat Keluar',
    steps: [
      'Buka menu "Surat Keluar" di sidebar.',
      'Klik tombol "+ Buat Surat Keluar".',
      'Isi Tujuan, pilih Kode Surat (otomatis generate template nomor), Perihal, dan Tanggal.',
      'Unggah file lampiran (PDF atau gambar).',
      'Klik "Simpan" — surat akan dikirim ke Kepala Sekolah untuk persetujuan.'
    ]
  },
  {
    id: 'teruskan-surat',
    title: 'Meneruskan Surat ke Pengguna',
    steps: [
      'Setelah Kepala Sekolah menyetujui surat masuk, buka detail surat tersebut.',
      'Klik tombol "Teruskan ke Pengguna".',
      'Pilih pengguna dan jabatan yang akan menerima disposisi surat.',
      'Klik "Teruskan" — pengguna yang dipilih akan mendapat notifikasi.',
      'Pantau status disposisi (Diterima / Belum Diterima) di tabel disposisi.'
    ]
  },
  {
    id: 'kelola-pengguna',
    title: 'Kelola Pengguna',
    steps: [
      'Buka menu "Kelola Pengguna" di sidebar (khusus Admin).',
      'Klik "+ Tambah Akun" untuk membuat akun baru.',
      'Isi Email, Nama, Kata Sandi (min 8 karakter, huruf besar+kecil+angka).',
      'Pilih satu atau lebih jabatan untuk pengguna tersebut.',
      'Untuk mengubah akun, klik ikon Edit. Untuk menghapus, klik ikon Hapus.'
    ]
  },
  {
    id: 'filter-cari',
    title: 'Filter & Pencarian Surat',
    steps: [
      'Gunakan kolom pencarian untuk mencari berdasarkan No. Surat, Perihal, atau Asal/Tujuan.',
      'Filter berdasarkan status: Semua atau Menunggu.',
      'Urutkan berdasarkan Terbaru atau Terlama.',
      'Gunakan filter tanggal "Dari" dan "Sampai" untuk rentang waktu tertentu.',
      'Klik "Atur Ulang" untuk menghapus filter tanggal.'
    ]
  },
  {
    id: 'log-aktivitas',
    title: 'Catatan Aktivitas',
    steps: [
      'Buka menu "Catatan Aktivitas" di sidebar.',
      'Lihat semua aktivitas pengguna dalam 7 hari terakhir.',
      'Informasi meliputi: waktu, nama pengguna, jenis aksi, dan detail.',
      'Log otomatis dihapus setelah 7 hari.'
    ]
  },
  {
    id: 'riwayat',
    title: 'Riwayat Surat',
    steps: [
      'Buka menu "Riwayat" untuk melihat semua surat yang sudah diproses.',
      'Gunakan tab untuk filter: Semua Surat, Surat Masuk, atau Surat Keluar.',
      'Cari dan filter berdasarkan status atau rentang tanggal.'
    ]
  },
  {
    id: 'profil',
    title: 'Pengaturan Profil',
    steps: [
      'Buka menu "Profil" di sidebar.',
      'Klik ikon kamera untuk mengunggah atau mengubah foto profil.',
      'Untuk ganti kata sandi: klik tab "Ganti Kata Sandi", kirim OTP ke email, lalu isi kata sandi baru.'
    ]
  }
];

const panduanKepsek = [
  {
    id: 'login',
    title: 'Login ke Sistem',
    steps: [
      'Buka halaman login di browser.',
      'Masukkan email dan kata sandi akun Kepala Sekolah.',
      'Klik "Masuk" untuk masuk ke dashboard.',
    ]
  },
  {
    id: 'tinjau-surat-masuk',
    title: 'Meninjau Surat Masuk',
    steps: [
      'Buka menu "Surat Masuk" — surat dengan status "Menunggu" perlu ditinjau.',
      'Klik "Detail" pada surat yang ingin ditinjau.',
      'Di halaman detail, temukan bagian "Tinjauan Surat".',
      'Pilih keputusan: "Setujui" atau "Tolak".',
      'Tambahkan catatan jika perlu (opsional).',
      'Klik "Kirim Tinjauan" — status surat akan berubah sesuai keputusan.'
    ]
  },
  {
    id: 'tinjau-surat-keluar',
    title: 'Meninjau Surat Keluar',
    steps: [
      'Buka menu "Surat Keluar" — surat dengan status "Menunggu" perlu ditinjau.',
      'Klik "Detail" pada surat yang ingin ditinjau.',
      'Pilih keputusan: "Setujui" atau "Tolak" dan tambahkan catatan.',
      'Klik "Kirim Tinjauan" untuk menyelesaikan proses.'
    ]
  },
  {
    id: 'notifikasi',
    title: 'Notifikasi',
    steps: [
      'Ikon lonceng di header menunjukkan jumlah notifikasi baru.',
      'Klik ikon lonceng untuk melihat daftar notifikasi.',
      'Klik notifikasi untuk langsung membuka detail surat terkait.'
    ]
  },
  {
    id: 'riwayat',
    title: 'Riwayat Surat',
    steps: [
      'Buka menu "Riwayat" untuk melihat semua surat yang sudah ditinjau.',
      'Gunakan tab Semua Surat, Surat Masuk, atau Surat Keluar.',
      'Filter berdasarkan status (Disetujui/Ditolak) atau rentang tanggal.',
    ]
  },
  {
    id: 'profil',
    title: 'Pengaturan Profil',
    steps: [
      'Buka menu "Profil" di sidebar.',
      'Klik ikon kamera untuk mengubah foto profil.',
      'Untuk ganti kata sandi: tab "Ganti Kata Sandi" → kirim OTP → isi kata sandi baru.'
    ]
  }
];

const panduanUser = [
  {
    id: 'login',
    title: 'Login ke Sistem',
    steps: [
      'Buka halaman login di browser.',
      'Masukkan email dan kata sandi yang diberikan oleh Admin.',
      'Klik "Masuk" untuk masuk ke dashboard.',
    ]
  },
  {
    id: 'lihat-surat',
    title: 'Melihat Surat Masuk',
    steps: [
      'Buka menu "Surat Masuk" di sidebar.',
      'Anda akan melihat surat yang telah diteruskan (disposisi) kepada Anda.',
      'Klik "Detail" untuk membuka informasi lengkap surat.',
      'Klik "Lihat Lampiran" untuk melihat file PDF atau gambar yang dilampirkan.'
    ]
  },
  {
    id: 'terima-surat',
    title: 'Menerima / Konfirmasi Surat',
    steps: [
      'Pada surat yang belum diterima, akan muncul banner "Surat Belum Diterima".',
      'Klik tombol "Terima Surat" untuk konfirmasi penerimaan.',
      'Pada dialog konfirmasi, klik "Ya, Terima Surat".',
      'Setelah diterima, surat akan berpindah ke halaman "Riwayat".',
      'Anda juga bisa menerima surat langsung dari daftar tanpa membuka detail.'
    ]
  },
  {
    id: 'ganti-jabatan',
    title: 'Ganti Jabatan (Multi-Jabatan)',
    steps: [
      'Jika Anda memiliki lebih dari satu jabatan, tombol "Ganti Jabatan" muncul di sidebar.',
      'Klik untuk membuka daftar jabatan Anda.',
      'Pilih jabatan tertentu untuk memfilter surat yang ditampilkan.',
      'Pilih "Semua Jabatan" untuk melihat semua surat dari seluruh jabatan.'
    ]
  },
  {
    id: 'notifikasi',
    title: 'Notifikasi',
    steps: [
      'Ikon lonceng di header menunjukkan jumlah notifikasi baru.',
      'Klik untuk melihat daftar surat yang baru diteruskan kepada Anda.',
      'Klik notifikasi untuk langsung membuka detail surat.'
    ]
  },
  {
    id: 'riwayat',
    title: 'Riwayat Surat',
    steps: [
      'Buka menu "Riwayat" untuk melihat semua surat yang sudah Anda terima.',
      'Gunakan pencarian dan filter tanggal untuk mencari surat tertentu.'
    ]
  },
  {
    id: 'profil',
    title: 'Pengaturan Profil',
    steps: [
      'Buka menu "Profil" di sidebar.',
      'Klik ikon kamera untuk mengubah foto profil.',
      'Untuk ganti kata sandi: tab "Ganti Kata Sandi" → kirim OTP → isi kata sandi baru.',
      'Untuk mengubah nama atau jabatan, hubungi Admin.'
    ]
  }
];

const panduanPegawai = [
  {
    id: 'login',
    title: 'Login ke Sistem',
    steps: [
      'Buka halaman login di browser.',
      'Masukkan email dan kata sandi akun Pegawai TU.',
      'Klik tombol "Masuk" untuk masuk ke dashboard.',
      'Jika lupa kata sandi, klik "Lupa Kata Sandi?" untuk reset via OTP email.'
    ]
  },
  {
    id: 'buat-surat-masuk',
    title: 'Membuat Surat Masuk',
    steps: [
      'Buka menu "Surat Masuk" di sidebar.',
      'Klik tombol "+ Buat Surat Masuk" di kanan atas.',
      'Isi formulir: No. Surat (otomatis terisi template), Perihal, Asal Surat, dan Tanggal.',
      'Unggah file lampiran (PDF atau gambar) — wajib untuk surat baru.',
      'Klik "Simpan" untuk mengirim surat ke Kepala Sekolah untuk ditinjau.',
      'Status surat akan menjadi "Menunggu" hingga Kepala Sekolah meninjau.'
    ]
  },
  {
    id: 'buat-surat-keluar',
    title: 'Membuat Surat Keluar',
    steps: [
      'Buka menu "Surat Keluar" di sidebar.',
      'Klik tombol "+ Buat Surat Keluar".',
      'Isi Tujuan, pilih Kode Surat (otomatis generate template nomor), Perihal, dan Tanggal.',
      'Unggah file lampiran (PDF atau gambar).',
      'Klik "Simpan" — surat akan dikirim ke Kepala Sekolah untuk persetujuan.'
    ]
  },
  {
    id: 'teruskan-surat',
    title: 'Meneruskan Surat ke Pengguna',
    steps: [
      'Setelah Kepala Sekolah menyetujui surat masuk, buka detail surat tersebut.',
      'Klik tombol "Teruskan ke Pengguna".',
      'Pilih pengguna dan jabatan yang akan menerima disposisi surat.',
      'Klik "Teruskan" — pengguna yang dipilih akan mendapat notifikasi.',
      'Pantau status disposisi (Diterima / Belum Diterima) di tabel disposisi.'
    ]
  },
  {
    id: 'filter-cari',
    title: 'Filter & Pencarian Surat',
    steps: [
      'Gunakan kolom pencarian untuk mencari berdasarkan No. Surat, Perihal, atau Asal/Tujuan.',
      'Filter berdasarkan status: Semua atau Menunggu.',
      'Urutkan berdasarkan Terbaru atau Terlama.',
      'Gunakan filter tanggal "Dari" dan "Sampai" untuk rentang waktu tertentu.',
      'Klik "Atur Ulang" untuk menghapus filter tanggal.'
    ]
  },
  {
    id: 'riwayat',
    title: 'Riwayat Surat',
    steps: [
      'Buka menu "Riwayat" untuk melihat semua surat yang sudah diproses.',
      'Gunakan tab untuk filter: Semua Surat, Surat Masuk, atau Surat Keluar.',
      'Cari dan filter berdasarkan status atau rentang tanggal.'
    ]
  },
  {
    id: 'profil',
    title: 'Pengaturan Profil',
    steps: [
      'Buka menu "Profil" di sidebar.',
      'Klik ikon kamera untuk mengunggah atau mengubah foto profil.',
      'Untuk ganti kata sandi: klik tab "Ganti Kata Sandi", kirim OTP ke email, lalu isi kata sandi baru.'
    ]
  }
];

const alurAdmin = ['Admin membuat surat', 'Dikirim ke Kepsek', 'Kepsek meninjau', 'Admin meneruskan ke pengguna', 'Pengguna menerima', 'Masuk riwayat'];
const alurPegawai = ['Pegawai TU membuat surat', 'Dikirim ke Kepsek', 'Kepsek meninjau', 'Pegawai TU meneruskan ke pengguna', 'Pengguna menerima', 'Masuk riwayat'];
const alurKepsek = ['Admin membuat surat', 'Notifikasi masuk', 'Kepsek buka detail', 'Setujui / Tolak', 'Masuk riwayat'];
const alurUser = ['Admin meneruskan surat', 'Notifikasi masuk', 'Buka detail surat', 'Klik "Terima Surat"', 'Masuk riwayat'];

function AccordionItem({ item, index, isOpen, onToggle }) {
  return (
    <div style={{
      borderBottom: '1px solid var(--border-color)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1.5px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)',
          flexShrink: 0,
          background: isOpen ? 'var(--text-primary)' : 'transparent',
          color: isOpen ? 'var(--bg-primary)' : 'var(--text-muted)',
          borderColor: isOpen ? 'var(--text-primary)' : 'var(--border-color)',
          transition: 'all 0.2s ease'
        }}>
          {index + 1}
        </span>
        <span style={{
          flex: 1, fontWeight: 500, fontSize: '0.9rem',
          color: 'var(--text-primary)'
        }}>
          {item.title}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      <div style={{
        maxHeight: isOpen ? 600 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease'
      }}>
        <div style={{ paddingBottom: 20, paddingLeft: 40 }}>
          {item.steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '6px 0',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--text-muted)', flexShrink: 0,
                marginTop: 7
              }} />
              <span style={{
                fontSize: '0.85rem', color: 'var(--text-secondary)',
                lineHeight: 1.65
              }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PanduanPengguna() {
  const { user } = useAuth();
  const [openId, setOpenId] = useState(null);

  const role = user?.role;
  const roleLabel = { admin: 'Admin / Tata Usaha', pegawai: 'Pegawai TU', kepsek: 'Kepala Sekolah', user: 'Pengguna' };

  let panduan, alur;
  if (role === 'admin') { panduan = panduanAdmin; alur = alurAdmin; }
  else if (role === 'pegawai') { panduan = panduanPegawai; alur = alurPegawai; }
  else if (role === 'kepsek') { panduan = panduanKepsek; alur = alurKepsek; }
  else { panduan = panduanUser; alur = alurUser; }

  const toggle = (id) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="page">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 28 }}>
        Panduan penggunaan sistem E-Disposisi untuk peran <strong style={{ color: 'var(--text-secondary)' }}>{roleLabel[role]}</strong>
      </p>

      {/* Alur Surat — clean horizontal flow */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Alur Disposisi Surat
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {alur.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '7px 14px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap'
              }}>
                {step}
              </span>
              {i < alur.length - 1 && (
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panduan Langkah — clean accordion */}
      <div className="card" style={{ padding: '4px 24px' }}>
        {panduan.map((item, index) => (
          <AccordionItem
            key={item.id}
            item={item}
            index={index}
            isOpen={openId === item.id}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>

      {/* Tips singkat */}
      <div style={{
        marginTop: 20, padding: '16px 20px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-glass)'
      }}>
        <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
          Tips Keamanan
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Jangan bagikan kata sandi Anda kepada siapapun.',
            'Gunakan kata sandi yang kuat: minimal 8 karakter dengan huruf besar, kecil, dan angka.',
            'Selalu logout setelah selesai, terutama di komputer bersama.',
          ].map((tip, i) => (
            <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              • {tip}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
