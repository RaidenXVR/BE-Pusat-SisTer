## Cara input data dummy
- Pastikan MySQL database aktif dan sudah ada database + tables nya
- Ubah settingan koneksi MySQL sesuai kebutuhan di `server.js`.
- Jika belum install dependensi, install dengan `npm install`
- Nyalakan server dengan `node server.js`.
- di terminal lain, jalankan command `curl -X POST http://localhost:3000/sync/branch-data -H "Content-Type: application/json" -d @dummy-sync-data-i.json` dengan i adalah nomor dari dummy data
- jika `success: true` maka data sudah di update.

## Cek script MySQL buat data nya, ada perbaikan.
