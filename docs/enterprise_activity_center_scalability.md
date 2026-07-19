# Enterprise Activity Center - Scalability
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Sejalan dengan penambahan modul, user, dan trafik biro perjalanan VTU ABADI, Activity Center diproyeksikan menerima injeksi jutaan rekaman (event) setiap tahunnya. Arsitektur harus dijamin tidak rontok *(bottleneck)* saat menanggung beban operasi penulisan (*Write-heavy*) yang masif sekaligus pencarian teks (*Read-heavy*).

## 2. Best Practice Asynchronous Write (Write Optimization)
- **Fire and Forget (Non-Blocking):** Modul fungsional utama (seperti *Order Jamaah*) **TIDAK BOLEH** menunggu penulisan log berhasil di Activity Center sebelum membalas *Request* pengguna.
- Proses bisnis utama cukup menembakkan (*emit*) payload Event ke dalam antrean (Message Queue/Message Broker seperti RabbitMQ, Redis Pub/Sub, atau Kafka). Worker *background* akan memproses penyisipan ke tabel log dengan cara *batching*. Hal ini menjamin performa operasional tetap *lighting fast* berapapun besarnya jumlah event yang dicatat.

## 3. Future Strategy: Search Optimization
Penyimpanan *Activity Log* tradisional di database relasional PostgreSQL/MySQL memiliki keterbatasan berat dalam melakukan `Full Text Search` pada kolom JSON/teks berukuran besar.

- **Fase 1 (Awal):** Penggunaan Index GIN (Generalized Inverted Index) pada PostgreSQL atas kolom `context` dan `detail` JSONB untuk menopang *query filter* dasar.
- **Fase 2 (Skala Enterprise Menengah-Besar):** Pola CQRS (*Command Query Responsibility Segregation*). *Write Model* disimpan pada DBMS reguler atau *Time Series Database*, sementara data secara simultan direplikasikan ke *Read Model* khusus pencarian log yaitu **ElasticSearch** (atau OpenSearch / Meilisearch). Activity Center UI akan melakukan pencarian *Lightning-Fast* yang ditenagai oleh mesin pencari independen ini.

## 4. Partitioning & Sharding
Untuk mencegah membengkaknya index tabel database yang melambatkan eksekusi:
- Menerapkan **Table Partitioning by Date** (Partisi tabel secara bulanan atau tahunan). Pencarian rentang waktu (*Date Range Filter*) akan otomatis menyasar partisi spesifik, melipatgandakan kecepatan query.

Dengan strategi arsitektural asinkronus, *full-text search engine*, dan partisi tabel ini, VTU ABADI Activity Center adalah struktur *Future-Proof* untuk Enterprise ERP skala sangat masif.
