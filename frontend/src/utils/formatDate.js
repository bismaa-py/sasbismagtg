// Shared date/time formatting utilities
// Matches the header clock format: "Senin, 12 Mei 2026 • 08:30:59"

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Parse date from backend correctly.
 * - Date-only strings ("2026-05-12") → local midnight
 * - Timestamps with timezone (Z or +/-offset) → native parsing (UTC→local conversion)
 * - Timestamps without timezone → parse as local time
 */
export function parseBackendDate(tgl) {
  if (!tgl) return null;
  let str = String(tgl);

  // Date-only: "2026-05-12" → parse as local date (midnight local time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return { date: new Date(y, m - 1, d), dateOnly: true };
  }

  // Strip UTC timezone indicator to force local time parsing
  // because the backend stores local time but serializes it as UTC (Z).
  str = str.replace(/Z$/, '').replace(/[+-]00:00$/, '').replace(/[+-]0000$/, '');

  // Extract parts and parse as local time
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return { date: new Date(+match[1], +match[2]-1, +match[3], +match[4], +match[5], +match[6]), dateOnly: false };
  }

  return { date: new Date(str), dateOnly: false };
}

/**
 * Format tanggal lengkap dengan hari dan waktu (seperti di header/navbar)
 * Output: "Senin, 12 Mei 2026 • 08:30:59"
 */
export function formatTanggal(tgl) {
  if (!tgl) return '-';
  const parsed = parseBackendDate(tgl);
  if (!parsed || isNaN(parsed.date.getTime())) return tgl;
  const d = parsed.date;

  const day = DAYS[d.getDay()];
  const dd = d.getDate();
  const mm = MONTHS[d.getMonth()];
  const yyyy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');

  return `${day}, ${dd} ${mm} ${yyyy} • ${h}:${m}:${s}`;
}

/**
 * Format tanggal pendek (tanpa hari dan detik, untuk tabel/card)
 * - Jika date-only (tanggal_surat): "12 Mei 2026" (tanpa waktu)
 * - Jika timestamp (created_at): "12 Mei 2026, 19:14"
 */
export function formatTanggalShort(tgl) {
  if (!tgl) return '-';
  const parsed = parseBackendDate(tgl);
  if (!parsed || isNaN(parsed.date.getTime())) return tgl;
  const d = parsed.date;

  const dd = d.getDate();
  const mm = MONTHS[d.getMonth()];
  const yyyy = d.getFullYear();

  // Date-only fields: show date only, no time
  if (parsed.dateOnly) {
    return `${dd} ${mm} ${yyyy}`;
  }

  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');

  return `${dd} ${mm} ${yyyy}, ${h}:${m}`;
}

/**
 * Format hanya tanggal (untuk profil, dll)
 * Output: "12 Mei 2026"
 */
export function formatTanggalOnly(tgl) {
  if (!tgl) return '-';
  const parsed = parseBackendDate(tgl);
  if (!parsed || isNaN(parsed.date.getTime())) return tgl;
  const d = parsed.date;
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format nama jabatan (misal: "waka kesiswaan" -> "Waka Kesiswaan", "kapro rpl" -> "Kapro RPL")
 */
export function formatJabatan(str) {
  if (!str) return '';
  return str.split(' ').map(word => {
    const upper = word.toUpperCase();
    if (['RPL', 'TKJ', 'DKV', 'AN', 'EI', 'MT', 'AV', 'BC', 'BK', 'BKK', 'TU'].includes(upper)) {
      return upper;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Get local today's date string in YYYY-MM-DD format
 */
export function getLocalTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get local current datetime string in YYYY-MM-DDTHH:MM format
 */
export function getLocalTodayDateTimeString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
