# Engineering Glossary

Kamus istilah ini berfungsi sebagai referensi standar untuk menghindari kebingungan (semantic gap) antar anggota tim. Semua definisi bersifat *framework-agnostic*.

| Istilah | Definisi |
|---------|----------|
| **ADR (Architecture Decision Record)** | Dokumen singkat yang mencatat sebuah keputusan teknis penting, beserta konteks dan konsekuensinya, sehingga sejarah arsitektur tetap abadi. |
| **API (Application Programming Interface)** | Kontrak komunikasi antar layanan atau antar klien dan server, mendefinisikan *endpoint*, *header*, dan struktur data (Request/Response). |
| **Repository** | Lapisan arsitektur yang bertugas khusus untuk menangani interaksi langsung dengan penyimpanan data (Database), menyembunyikan kompleksitas kueri dari logika bisnis. |
| **Service** | Lapisan pusat yang mengandung murni logika bisnis aplikasi (Business Logic). |
| **DTO (Data Transfer Object)** | Objek yang membawa data antar proses (misalnya dari HTTP Controller ke Service). Biasanya direpresentasikan dengan validasi skema ketat. |
| **CI (Continuous Integration)** | Otomatisasi penggabungan, pengujian (testing), dan kompilasi (*build*) secara kontinu setiap ada kode baru. |
| **CD (Continuous Deployment/Delivery)** | Otomatisasi rilis dan pengiriman (*deployment*) *build artifact* ke lingkungan target (Staging/Production). |
| **Pipeline** | Serangkaian langkah (Install → Generate → Test → Build → Deploy) yang dieksekusi CI/CD secara berurutan. |
| **Smoke Test** | Pengujian post-deployment sangat singkat untuk memvalidasi bahwa aplikasi hidup dan infrastruktur tidak rusak (contoh: endpoint `/health` membalas 200). |
| **Regression Test** | Pengujian menyeluruh untuk memastikan penambahan kode baru tidak merusak atau mematahkan fungsionalitas yang sudah ada sebelumnya. |
| **Integration Test** | Pengujian yang memverifikasi bahwa dua atau lebih modul (seperti *Service* dan *Repository*) berkolaborasi dengan sempurna. |
| **Unit Test** | Pengujian terisolasi berskala kecil terhadap satu modul/fungsi tanpa memedulikan integrasi luar. |
| **UAT (User Acceptance Test)** | Validasi akhir oleh pemangku kepentingan (*Product Owner* atau Klien) melalui antarmuka grafis atau penggunaan empiris (UI/UX) untuk menyetujui rilis fungsional. |
| **RC (Release Candidate)** | Paket *build* yang telah lulus semua tes dan tinggal selangkah lagi untuk didorong ke Production. |
| **Preview / Staging** | Lingkungan tiruan yang mendekati spesifikasi Production untuk keperluan validasi tahap akhir (UAT). |
| **Production** | Lingkungan Live di mana end-user sesungguhnya berinteraksi dengan sistem. |
| **Rollback** | Pembatalan rilis untuk mengembalikan versi aplikasi atau database ke state yang stabil (versi sebelumnya) akibat kegagalan kritis. |
| **Hotfix** | Rilis tambalan darurat yang mem-bypass jadwal rilis normal guna memperbaiki kerentanan (Security) atau *bug* kritis di Production. |
| **Schema Drift** | Ketidaksinkronan berbahaya di mana struktur kolom/tabel pada database fisik berbeda dengan rancangan ORM (*schema*) di source code. |
| **Migration** | Eksekusi SQL yang terkelola (*versioned*) guna mengubah struktur DDL database secara bertahap dan tercatat. |
| **Backward Compatibility** | Pembaruan kode atau skema yang memungkinkan sistem atau klien lama tetap berjalan tanpa *error*. |
| **Breaking Change** | Perubahan drastis (biasanya rilis Mayor) yang tidak kompatibel ke belakang, dan berisiko merusak integrasi dengan klien eksisting jika tidak diumumkan. |
| **Observability** | Kemampuan suatu sistem untuk memberikan kejelasan tingkat kesehatannya berdasarkan output telemetri internal (Metrik, Logs, dan Tracing). |
| **Tracing** | Perekaman jalur aliran instruksi tunggal yang mengarungi berbagai batas sistem (microservices/API endpoints). |
| **Correlation ID / Trace ID** | Pengenal unik (UUID) yang dilekatkan pada Request dari Klien, menyertai semua log yang dihasilkan di berbagai lapisan sistem. |
| **SLO (Service Level Objective)** | Tujuan terukur untuk performa sistem (Misal: 99.9% *Uptime*, Latensi kueri 100ms). |
| **SLA (Service Level Agreement)** | Janji kontraktual eksternal antara penyedia dan pelanggan terkait kinerja SLO. |
| **RCA (Root Cause Analysis)** | Metode investigasi mendalam terhadap suatu insiden untuk mengidentifikasi penyebab dasar (*fundamental root cause*). |
| **Root Cause** | Titik mula masalah di tingkat sistem, yang jika dihilangkan, dapat mencegah error serupa terjadi kembali. |
| **Post Mortem** | Sesi bedah kasus usai pemulihan insiden untuk menelusuri pelajaran (*Lessons Learned*) tanpa menyalahkan individu (*blameless*). |
| **Build Artifact** | Paket statis, *binaries*, atau container image akhir hasil dari fase Build (Kompilasi) di pipeline CI/CD. |
| **Engineering Governance** | Keseluruhan kerangka kerja, aturan main, standar mutu, dan prosedur teknis bagi seluruh anggota *Engineering*. |
| **Architecture Governance** | Sub-set pedoman berfokus pada desain topologi (Server, Jaringan, Komunikasi Data, Database, Komponen) beserta relasi lintas entitas. |
