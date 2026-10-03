# Dashboard E-Resources Perpustakaan PKN STAN

Dashboard statis untuk E-Journal, LSEG, STATA, dan layanan Uji Similaritas KTI. Sumber data berada di Google Sheets dan dibaca melalui empat Google Apps Script. Grafik menggunakan Chart.js dari CDN.

## Menjalankan secara lokal

Dari folder `dashboard`, jalankan:

```sh
node tools/serve.cjs
```

Buka http://127.0.0.1:4173. Server pratinjau hanya menerima koneksi dari komputer lokal. Gunakan akun dashboard yang sudah ada. Tidak diperlukan instalasi paket.

## Struktur

- `index.html` dan `js/home.js`: ringkasan empat layanan.
- `ejournal.html`, `lseg.html`, `stata.html`, `similaritas-kti.html`: halaman analisis.
- `js/app.js`: koneksi sumber, cache, autentikasi lokal, format tanggal, grafik, dan navigasi.
- `js/data-utils.js`: aturan data bersama, similaritas, sanitasi teks, dan CSV.
- `js/dashboard-tools.js`: status sumber, pembaruan manual, ekspor, reset filter, aksesibilitas, dan paginasi.
- `css/style.css`: gaya bersama dan responsivitas.
- `apps-script/`: kode yang dipasang pada masing-masing Google Sheet.
- `tutorial/tutorial.html`: panduan penggunaan yang mengikuti implementasi saat ini.
- `tests/regression.test.cjs`: pengujian aturan data dan cache tanpa koneksi ke sumber nyata.

## Pembaruan 3 Oktober 2026

- Kartu dan kolom skor tersedia/tidak tersedia dihapus dari KTI serta Home. Sesuai permintaan, baris tanpa skor masuk kelompok 0–10% pada grafik distribusi. Nilai mentah tetap kosong dan tidak dimasukkan ke rata-rata.

## Pembaruan 2 Oktober 2026

- Status kelulusan, ambang 30%/50%, dan warna penilaian dihapus dari halaman KTI, ringkasan Home, serta ekspor. Apps Script tidak lagi menghasilkan status otomatis.
- Filter tahun dan bulan memakai tanggal pemrosesan. Grafik jumlah pemeriksaan dan tabel rekap tersedia per tahun maupun per bulan. Rata-rata mengecualikan skor kosong; 0% tetap dihitung. Data tanpa tanggal valid tetap terlihat pada tampilan semua data dan jumlahnya dijelaskan.

## Pembaruan September 2026

- Informasi program studi dan jenis KTI tidak ditampilkan pada menu Uji Similaritas KTI maupun ekspornya. Informasi prodi tetap tersedia pada filter, statistik, grafik, tabel, dan ekspor LSEG serta STATA. E-Journal tetap menggunakan laporan agregat jurnal yang tidak memuat rincian prodi. Pemetaan kolom sumber tetap dipertahankan untuk kompatibilitas laporan lama.

- Status setiap sumber membedakan hasil baru, cache, cache lama saat gagal, dan sumber tidak tersedia. Waktu yang ditampilkan adalah waktu pengambilan, bukan waktu membuka halaman.
- Tombol Perbarui data mengambil langsung dari sumber. Cache berlaku 30 menit dan dikaitkan dengan URL sumber; respons error tidak disimpan sebagai data.
- Jumlah baris LSEG/STATA disebut total penggunaan. Jumlah pengguna unik dengan NIP/NIM terisi ditampilkan terpisah pada halaman detail.
- Home dan halaman KTI memakai aturan normalisasi yang sama. Hasil kosong/tidak valid berbeda dari 0%; 0% ikut rata-rata dan baris tanpa hasil tidak diberi status kelulusan.
- Laporan KTI enam kolom `Details_Report*.xlsx` dikenali berdasarkan header oleh penghubung terbaru. Frontend juga memulihkan pemetaan deployment lama apabila email, tanggal ISO, dan jumlah kata cocok dengan pola laporan tersebut. Kolom NIM/prodi/jenis/judul yang tidak tersedia ditandai demikian, tanpa dibuat-buat.
- KTI membersihkan cache perhitungan ketika menerima data baru. Paginasi tetap dapat mengakses seluruh halaman.
- Ekspor CSV mengikuti semua filter aktif, dengan perlindungan terhadap formula dari teks sumber. Kolom identitas panjang sebaiknya diimpor sebagai teks di aplikasi spreadsheet.
- Tabel meng-escape teks sumber. Navigasi keyboard, label kontrol, fokus, gerakan yang dikurangi, serta tampilan layar kecil diperbaiki.
- Pengambilan data sebelum login dihapus. Komentar yang berisi kata sandi juga dihapus.

## Penerapan ke lingkungan yang sudah berjalan

1. Salin versi terbaru folder dashboard ke tempat hosting yang sudah digunakan.
2. Pasang ulang isi `apps-script/kti-apps-script.js` pada proyek Apps Script KTI dan perbarui deployment ke versi baru. Kode ini memperbaiki pembacaan sel berformat persen dan membedakan hasil kosong dari nol. URL bisa tetap sama jika deployment yang ada diperbarui.
3. Di dashboard, tekan Perbarui data. Cache format lama akan diabaikan; pemuatan awal mengambil data ulang.
4. Jika URL deployment berubah, masukkan melalui Konfigurasi URL pada halaman layanan terkait.

Perubahan lokal pada Apps Script tidak otomatis mengubah deployment Google. Data kosong yang sudah dikonversi menjadi 0 (atau nilai nol yang sudah diubah menjadi teks kosong) oleh deployment lama tidak dapat dipulihkan frontend; pembaruan deployment KTI diperlukan agar semua hasil, termasuk nol, terjaga.

## Batas keamanan dan definisi data

Login yang ada merupakan gerbang akses di browser. Token sesi, hash sandi, dan token API tersedia di frontend; ini belum merupakan autentikasi server untuk data privat. Sebelum membuka dashboard ke publik, gunakan autentikasi dan otorisasi server atau pembatasan akses hosting serta API. Menghapus komentar sandi atau prefetch tidak menyelesaikan batas arsitektur ini. Tombol Keluar membersihkan empat cache layanan dari browser; menutup tab saja tidak membersihkan cache. Gunakan perangkat yang dipercaya.

Kategori dosen/mahasiswa mengikuti aturan awalan NIP/NIM yang sudah ada, bukan verifikasi identitas. Dashboard KTI tidak menetapkan status kelulusan atau ambang skor. Jumlah pemeriksaan adalah jumlah baris laporan, bukan jumlah naskah atau pengguna unik. Filter tahun/bulan, grafik, dan ringkasan periode memakai tanggal pemrosesan; tanggal tidak valid dikecualikan dari ringkasan periode. Rata-rata hanya memakai skor numerik 0–100 yang tersedia. Total aktivitas lintas layanan bukan pengguna unik dan bukan metrik yang seragam. Dashboard mengikuti timezone browser untuk pengelompokan tanggal.

## Verifikasi

```sh
node --test tests/regression.test.cjs
```

Pengujian mencakup parsing similaritas, nol/kosong, tanggal tidak valid, teks berbahaya, CSV, pengguna unik, cache per URL, pembaruan paksa, kegagalan sumber, respons kosong/error, konsistensi Home–KTI, invalidasi cache KTI, dan format persen Google Sheets. Tidak mengubah data Google Sheets.

Pemeriksaan browser lokal juga mencakup login, pembacaan empat sumber nyata, filter tahun/metrik, kondisi pencarian kosong, reset, halaman terakhir tabel LSEG, dan navigasi tutorial. Tata letak diperiksa pada lebar 375 px dan 1440 px. Ekspor menghasilkan notifikasi jumlah baris di browser; isi CSV dan cakupan seluruh baris filter diverifikasi pada uji otomatis.
