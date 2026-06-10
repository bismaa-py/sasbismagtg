/**
 * Helper untuk menghasilkan URL upload file dari backend.
 * Membaca baseURL dari env variable (VITE_API_URL) jika tersedia,
 * atau fallback ke localhost:8080 untuk pengembangan lokal.
 */
const getBackendRoot = () => {
  // Jika VITE_API_URL diset (misal: https://api.yourdomain.com/api),
  // strip trailing /api untuk mendapatkan root URL
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  // Fallback: gunakan asal yang sama jika frontend & backend di server yang sama
  // Ini bekerja saat di-deploy ke domain yang sama
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return 'http://localhost:8080';
};

/**
 * Mengembalikan URL lengkap untuk file upload dari backend.
 * @param {string} filePath - Path file relatif (misal: "sm_123456789.pdf")
 * @returns {string} URL lengkap
 */
export function getUploadUrl(filePath) {
  if (!filePath) return '';
  // Jika sudah berupa URL lengkap, kembalikan apa adanya
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  return `${getBackendRoot()}/uploads/${filePath}`;
}

export { getBackendRoot };
