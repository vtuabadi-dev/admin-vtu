# Enterprise Activity Center - Future Features Roadmap
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Activity Center di desain *Future Proof*. Seiring dengan terkumpulnya basis data aktivitas *(Big Data)* secara historis, sistem ini harus berkembang dari sekadar alat "Rekam & Cari" menjadi mesin Analisis Proaktif.

## 2. Future Intelligence Roadmap

### A. Fraud Detection & Behavior Analytics
Sistem tidak lagi pasif menunggu Auditor. Mesin akan memprofiling perilaku wajar (*baseline behavior*) dari masing-masing user.
- **Skenario:** Jika Admin biasanya hanya menghapus 2 *Order* sehari, dan tiba-tiba menghapus 50 *Order* dalam 1 jam, sistem otomatis menandai (*Flagging*) ini sebagai **Fraud Indication** dan mem-freeze aksi selanjutnya.

### B. Anomaly Detection & Predictive Alert
Mendeteksi lonjakan masalah sebelum berdampak ke Jamaah.
- **Skenario:** Jika *Payment Gateway Timeout* meningkat 300% dibanding rata-rata harian pada *Heat Map*, sistem mengirim peringatan (Predictive Alert) ke IT Administrator lewat Telegram/WhatsApp bahwa ada anomali integrasi, bahkan sebelum ada laporan dari Customer Service.

### C. AI Investigation (Copilot Auditor)
Integrasi *Artificial Intelligence / Large Language Model (LLM)* ke dalam proses investigasi.
- **Skenario:** Auditor cukup bertanya pada kolom AI: *"Kenapa Generate Paket Promo VIP selalu rugi bulan ini?"*. 
- **AI Action:** AI secara mandiri menelusuri rentetan *Correlation ID*, menganalisa *old_value* dan *new_value* pada harga, mengkorelasikannya dengan pengeluaran tiket, dan membuat *Conclusion* otomatis di *Investigation Mode*.

Dengan fondasi infrastruktur *Activity Center* yang rapi di fase saat ini, semua kapabilitas *Enterprise Intelligence* masa depan di atas akan sangat dimungkinkan.
