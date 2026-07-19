# Enterprise Activity Center - Architecture
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System
**Architecture:** Clean Architecture, Framework Agnostic

## 1. Vision & Purpose
VTU ABADI diposisikan untuk berkembang menjadi sistem manajemen biro perjalanan berskala *Enterprise* (ERP) yang menaungi puluhan modul kompleks, mulai dari Pemesanan, Manifest, Pembayaran, hingga Automasi dan Integrasi Pihak Ketiga (API/OCR). 

Dengan besarnya skala operasi, memisahkan *Audit Log* di setiap modul akan menyebabkan fragmentasi data, inkonsistensi monitoring, dan hilangnya visibilitas menyeluruh lintas proses bisnis (misal: *traceability* dari Generate Paket hingga Manifest dan Rooming). 

Oleh karena itu, arsitektur VTU ABADI menerapkan **Enterprise Activity Center**: Sebuah tulang punggung (*backbone*) terpusat yang bertindak sebagai:
- **Single Source of Activity:** Seluruh aktivitas, baik dari User, Sistem, maupun Job Background bermuara ke sini.
- **Single Audit Standard:** Format log yang seragam, standarisasi entitas, dan *compliance* global.
- **Single Event Timeline:** Kronologi *end-to-end* yang memungkinkan manajemen melacak *lifecycle* sebuah proses bisnis secara utuh.
- **Single Monitoring Center:** Pusat pemantauan *real-time* untuk keamanan, analitik, dan investigasi error.

## 2. Architectural Positioning
Activity Center bukanlah modul fungsional operasional biasa (seperti Master Data atau Pembayaran). Posisinya berada pada **Cross-Cutting Concern Layer** di dalam kerangka Clean Architecture.

### Diagram Konseptual Pendekatan Arsitektur:
1. **Core Domain Layer:** Modul-modul bisnis tidak langsung mengelola tabel log masing-masing.
2. **Application Layer:** Seluruh *Use Case* (Create, Update, Delete, Approve, dll.) mengeksekusi operasi bisnisnya dan memancarkan (emit) *Activity Event*.
3. **Infrastructure Layer:** Sebuah antarmuka *Message/Event Bus* menangkap event tersebut dan meneruskannya (secara *asynchronous*) ke Activity Center untuk direkam.
4. **Activity Center:** Mengonsumsi, merapikan, dan menyimpan event tersebut di dalam penampungan (*storage*) yang dioptimalkan untuk pencarian besar-besaran.

## 3. Beyond Audit Log
Activity Center dirancang melampaui konsep *Audit Trail* konvensional. Ia adalah **Nerve Center** aplikasi yang memusatkan:
- **Audit Trail:** Jejak rekam manipulasi data (*Create, Update, Delete*).
- **System Event:** Rekaman kejadian sistem (Start, Stop, Error, Recovery).
- **Automation & Background Job Event:** Pelacakan cron, *Scheduler*, dan proses *Background Job*.
- **Integration History:** Transaksi eksternal (API call, Webhook, Payment Gateway).
- **Authentication & Security Event:** Percobaan login, reset password, dan indikasi anomali keamanan.
- **Business Event:** Peristiwa krusial yang berdampak langsung ke *flow* pengguna (seperti *Approve* Manifest, *Generate* Dokumen).

Dengan pemusatan ini, VTU ABADI menjamin kontrol penuh terhadap visibilitas dan tata kelola aktivitas perusahaan.
