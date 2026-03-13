# Sistem Pelacakan Alumni Berkala

Sistem Pelacakan Alumni Berkala adalah sebuah aplikasi replika (mock-up frontend) berbasis React untuk melakukan pelacakan dan pembaharuan jejak alumni secara otomatis memanfaatkan data dari berbagai sumber publik (seperti Google Scholar, PDDikti, LinkedIn, dll). Aplikasi ini mengimplementasikan desain dan pseudocode yang dirancang pada **Daily Project 2** Rekayasa Kebutuhan.

## Fitur Utama

- **Dashboard**: Statistik visual jumlah alumni terpantau, persentase keberhasilan pelacakan, dan status terbaru.
- **Data Alumni**: Mengelola master data alumni yang akan dilacak.
- **Parameter Pelacakan**: Mengonfigurasi parameter sumber prioritas, bobot ambang batas (threshold), dan skenario pencarian (`Buat_Profil_Target`).
- **Jadwal Pelacakan**: Menentukan cron job atau waktu pelacakan berkala (`Main_Job_Pelacakan_Berkala`).
- **Jalankan Pelacakan**: Halaman simulasi eksekusi pelacakan (menghitung skor kecocokan identitas, silang verifikasi bukti, hingga memutuskan status akhir).
- **Laporan Jejak**: Menampilkan riwayat atau bukti penemuan profil (bukti mentah yang diekstrak dan skor disambiguasi).

---

## Hasil Pengujian Kualitas Aplikasi (Berdasarkan Daily Project 2)

Pengujian dilakukan untuk memverifikasi bahwa implementasi fungsi sistem sejalan dengan desain aspek kualitas (Quality Attributes) dan *use case* yang didefinisikan pada dokumen Daily Project 2.

| ID | Aspek Kualitas | Skenario / Fitur yang Diuji | Langkah Pengujian / Kondisi | Hasil yang Diharapkan | Status |
|----|----------------|-----------------------------|-----------------------------|-----------------------|--------|
| **FS-01** | **Functional Suitability** | Mengelola Data Alumni | Menambahkan profil alumni baru ke daftar master dan memperbarui status pelacakan secara manual. | Sistem dapat menyimpan profil baru dan menampilkan perubahan status dengan benar di tabel. | ✅ **Lulus** |
| **FS-02** | **Functional Suitability** | Konfigurasi Bobot & Threshold | Mengubah parameter bobot kecocokan (Nama, Afiliasi Kampus/UMM, Konteks) di halaman Parameter Pelacakan. | Sistem menyimpan dan menyesuaikan parameter kalkulasi skor (`Hitung_Skor_Kecocokan`) untuk simulasi pelacakan berikutnya. | ✅ **Lulus** |
| **FS-03** | **Functional Suitability** | Simulasi Pelacakan (`Main_Job`) | Menjalankan pelacakan individu dan massal yang menyaring daftar pencarian berdasarkan status "Belum Dilacak". | Algoritma `Lacak_Individu_Alumni` tereksekusi dan memberikan skor disambiguasi dari bukti mentah kandidat identitas. | ✅ **Lulus** |
| **FS-04** | **Functional Suitability** | Validasi Penentuan Status | Merujuk batas skor dari hasil simulasi untuk penentuan keputusan status otomatis (*Strong Threshold* vs *Doubt Threshold*). | Status alumni berubah menjadi "Teridentifikasi" (>80), "Perlu Verifikasi Manual" (50-80), atau "Belum Ditemukan" (<50). | ✅ **Lulus** |
| **US-01** | **Usability** | Konsistensi Navigasi & UI | Bernavigasi dari Dashboard -> Data Alumni -> Jalankan Pelacakan secara berurutan dan mengujinya pada ukuran layar *desktop* maupun *mobile*. | Perpindahan antar antarmuka intuitif, tidak ada elemen *overlap*, dan umpan balik aksi (Tabel, *Toast*) ditampilkan dengan jelas. | ✅ **Lulus** |
| **PE-01** | **Performance Efficiency**| Waktu Respons Simulasi | Menekan tombol "Jalankan Pelacakan" untuk > 5 data dummy mock secara bersamaan. | Proses simulasi diselesaikan secara cepat dengan manipulasi *state* reaktif tanpa membuat antarmuka pembeku (*freeze*). | ✅ **Lulus** |
| **RL-01** | **Reliability** | Penanganan *Empty State* | Mengakses halaman "Laporan Jejak" pada alumni yang skor bukti/jejaknya kosong. | Sistem tidak *crash*, dan dengan elegan menampilkan pesan "Belum ada jejak yang ditemukan" (*graceful fallback*). | ✅ **Lulus** |

**Keterangan Aspek Kualitas (Standar Referensi Pengujian):**
- **Functional Suitability**: Kelengkapan fitur utama fungsional sesuai desain pseudocode (proses ekstraksi, *scoring*, dan status).
- **Usability**: Tingkat kemudahan dipahami (*understandability*) dan antarmuka interaktif.
- **Performance Efficiency**: Performa waktu pemuatan (Time-to-Interactive) dan simulasi klien.
- **Reliability**: Keandalan menghadapi situasi data yang minim atau belum lengkap untuk menghindari *crash* sistem.
