# Walkthrough: Pengiriman OTP Gmail via SMTP

Kami telah berhasil mengintegrasikan dukungan pengiriman OTP menggunakan Gmail SMTP ke dalam sistem.

## Perubahan yang Dilakukan

1. **Konfigurasi Environment ([`.env`](file:///c:/Users/NANDA/OneDrive/Dokumen/Folder%20Bisma/sasbismagtg/backend/.env))**:
   Menambahkan variabel konfigurasi SMTP dengan nilai akun Gmail Anda:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_EMAIL=bismapurbawasesaa@gmail.com
   SMTP_PASSWORD=12345678
   SMTP_FROM_NAME="E-Disposisi SMKN 2 Singosari"
   ```

2. **Backend Config ([`config.go`](file:///c:/Users/NANDA/OneDrive/Dokumen/Folder%20Bisma/sasbismagtg/backend/internal/config/config.go))**:
   Menambahkan parsing variabel lingkungan baru untuk SMTP agar siap digunakan oleh handler.

3. **Backend Auth Handler ([`auth_handler.go`](file:///c:/Users/NANDA/OneDrive/Dokumen/Folder%20Bisma/sasbismagtg/backend/internal/handlers/auth_handler.go))**:
   - Menggunakan pustaka standard Go `"net/smtp"` untuk membuat koneksi email yang aman dengan port `587` (STARTTLS) dari Gmail.
   - Menambahkan fungsi pembantu `sendOTPViaSMTP` untuk memformat headers MIME HTML dan mengirimkan email.
   - Mengatur prioritas: Jika kredensial SMTP Gmail diatur di `.env`, pengiriman OTP akan otomatis menggunakan SMTP. Jika tidak diatur, sistem akan mencoba menggunakan Resend API Key (jika ada), atau mencetaknya ke konsol log (untuk keperluan pengembangan offline).

## Cara Menjalankan & Memverifikasi

1. **Jalankan Ulang Server Backend**:
   Karena server saat ini berjalan dengan binary lama (`server.exe`), Anda perlu menghentikan proses server tersebut dan menjalankannya kembali agar perubahan di `.env` dan kode baru dimuat.
   - Anda bisa menghentikan server yang sedang berjalan (biasanya dengan menekan `Ctrl+C` di terminal backend Anda).
   - Jalankan ulang server menggunakan perintah:
     ```powershell
     go run cmd/server/main.go
     ```
     Atau compile ulang:
     ```powershell
     go build -o server.exe cmd/server/main.go
     .\server.exe
     ```

2. **Uji Pengiriman OTP**:
   - Buka halaman login di frontend dan klik tautan **Lupa Password** (Forgot Password).
   - Masukkan alamat email Anda yang terdaftar, lalu klik tombol kirim.
   - Periksa konsol backend (akan menampilkan log `✅ OTP berhasil dikirim ke ... via SMTP` jika berhasil, atau pesan kesalahan jika gagal).
   - Periksa kotak masuk (inbox) atau spam folder di email penerima untuk melihat email HTML OTP dari `bismapurbawasesaa@gmail.com`.

> [!NOTE]
> Jika Anda mengalami masalah autentikasi (misalnya kesalahan `535 Authentication Failed`), pastikan bahwa Anda telah mengaktifkan **Verifikasi 2 Langkah** pada akun Gmail Anda dan membuat **Sandi Aplikasi (App Password)** khusus untuk aplikasi ini di pengaturan Google Account Anda, lalu tempelkan sandi 16 karakter tersebut di bagian `SMTP_PASSWORD` pada file `.env`.
