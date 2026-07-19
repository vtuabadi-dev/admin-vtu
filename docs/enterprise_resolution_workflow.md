# Enterprise Resolution Workflow
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Standar Status Penyelesaian (Resolution Lifecycle)
Alur hidup sebuah investigasi berawal dari insiden dan berakhir dengan verifikasi.
- **DETECTED:** Event tercatat dan ditandai sebagai masalah.
- **ACKNOWLEDGED:** PIC melihat dan mengambil alih (*Assigned*).
- **INVESTIGATING:** Audit/Analisa akar masalah (*Root Cause Explorer*).
- **ACTION PLANNED:** Memilih/menyetujui *Suggested Action*.
- **ACTION IN PROGRESS:** Menunggu API eksternal atau proses async berjalan.
- **RESOLVED:** Hasil eksekusi sukses, masalah fungsional tertangani.
- **VERIFICATION:** Pihak Quality Control / Manager mengecek hasil akhir.
- **CLOSED:** Kasus ditutup. Kesimpulan (Conclusion) diarsipkan.

*Status Pengecualian:*
- **REOPENED:** Terjadi masalah ulang pada *Correlation ID* yang sama.
- **ESCALATED:** PIC melempar tanggung jawab ke level manajerial atas (Supervisor).
- **BLOCKED:** Terhenti karena *Third Party Dependency* (Misal: Menunggu pihak Kedutaan Arab Saudi).

## 2. Aturan Perubahan Status & Assignment
- **Who can change:** Hanya Assignee atau Manager dari Departemen terkait yang bisa mengubah status (terintegrasi dengan RBAC).
- **Assignment PIC:** Dapat di-assign otomatis via SLA/Routing Rule, atau diambil manual (*Pick up case*).
- **SLA & Escalation:** (Fase masa depan) Jika tiket stuck di status *Investigating* melebihi 24 jam, sistem otomatis merubah status menjadi *Escalated* ke Manager.
- **Verification Gate:** Status `Closed` tidak bisa diklik oleh pelaksana aksi (Maker). Harus diverifikasi oleh level peninjau (Checker / Verifier).
