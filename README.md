# AiFa

AiFa adalah prototipe aplikasi catatan keuangan bersama dengan gaya chat.

## Fitur

- Login atau buat akun memakai email.
- Buat ruang keuangan bersama.
- Undang anggota lewat email.
- Akun yang masuk dengan email undangan otomatis bergabung ke ruang.
- Catat pendapatan, pengeluaran, dan tabungan.
- Pendapatan dan pengeluaran tampil di chat bersama.
- Tabungan tampil di chat bersama dan tidak ikut refresh.
- Tombol refresh memulai periode baru sehingga total pendapatan dan pengeluaran kembali nol.
- Arsip periode lama tetap bisa dilihat, tetapi tidak ikut total aktif.

## Cara menjalankan

Buka `index.html` langsung di browser, atau jalankan server lokal:

```bash
python -m http.server 5173
```

Lalu buka `http://localhost:5173`.

## Catatan teknis

Versi ini menyimpan data di `localStorage` browser. Untuk produksi, fitur akun email, undangan asli, sinkronisasi antar perangkat, dan keamanan data perlu backend, database, autentikasi, dan layanan email.
