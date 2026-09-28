# Deploy ke GitHub Pages

Paket versi 27 September 2026, disalin dari dashboard terbaru. Halaman `index.html` sudah berada di akar paket. Tidak memerlukan npm install atau proses build.

## Langkah pemasangan

1. Ekstrak ZIP jika menggunakan paket ZIP.
2. Unggah **isi folder ini** ke akar repository GitHub Anda. Pastikan `index.html`, `login.html`, folder `css`, folder `js`, dan folder `tutorial` berada langsung di akar repository, bukan di dalam folder tambahan.
3. Sertakan `.nojekyll`. File ini menandai situs sebagai berkas statis.
4. Commit perubahan pada branch yang akan dipublikasikan, misalnya `main`.
5. Buka **Settings → Pages** pada repository.
6. Di bagian **Build and deployment**, pilih **Deploy from a branch**.
7. Pilih branch `main` (atau branch tempat Anda mengunggah berkas), kemudian folder **/(root)**, lalu **Save**.
8. Tunggu proses deployment selesai. Buka alamat situs yang ditampilkan GitHub Pages.

Panduan resmi: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Penghubung Google Sheets

URL sumber data yang sudah digunakan tetap disertakan. Deployment website tidak memperbarui Apps Script secara otomatis.

Untuk menerapkan perbaikan pembacaan laporan KTI sepenuhnya, salin isi `apps-script/kti-apps-script.js` ke proyek Google Apps Script KTI, lalu perbarui deployment yang ada ke versi baru. Setelah itu tekan **Perbarui data** pada dashboard. Jika URL berubah, masukkan melalui **Konfigurasi URL**.

## Isi paket

- Halaman website, gaya, JavaScript, dan logo terbaru.
- Tutorial dan README.
- Kode penghubung Apps Script.
- Pengujian dan alat pratinjau lokal untuk pemeliharaan.

Berkas Excel/CSV sumber, cadangan versi lama, dan screenshot tidak disertakan.

## Batas akses

Login masih berbasis browser dan token API berada dalam kode frontend. Ini bukan autentikasi server untuk melindungi data privat. Baca bagian keamanan pada README sebelum mempublikasikan situs.

## Verifikasi paket

Sebelas pengujian regresi lulus. Pemeriksaan sintaks JavaScript serta keberadaan tautan dan aset lokal lulus.
