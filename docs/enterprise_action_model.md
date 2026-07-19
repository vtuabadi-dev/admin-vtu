# Enterprise Action Model
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Konsep Action
"Action" adalah respon operasional terhadap sebuah Activity Event. Action bertindak sebagai *intent* bisnis yang disalurkan kembali ke modul asal untuk diproses. Action BUKANlah intervensi database langsung.

## 2. Action Taxonomy (Jenis Action)
Action dikategorikan berdasarkan dampaknya terhadap sistem:
- **Navigation Action:** (Contoh: `Open Payment`, `View Manifest`). Berpindah halaman.
- **Operational Action:** (Contoh: `Retry OCR`, `Reassign Hotel`). Modifikasi state pada domain bisnis.
- **Investigation Action:** (Contoh: `Create Investigation`, `Flag Event`).
- **Assignment Action:** (Contoh: `Assign PIC`, `Escalate Case`).
- **Communication Action:** (Contoh: `Notify Finance`, `Send Reminder to Jamaah`).
- **Retry Action:** (Contoh: `Retry Failed Payment`, `Re-run Background Job`).
- **Approval Action:** (Contoh: `Approve Refund`, `Authorize Override`).
- **Security Action:** (Contoh: `Lock User Account`, `Force Logout`).

## 3. Risk Classification
Tingkat risiko menentukan workflow pengamanan eksekusi:
- **LOW RISK:** Tidak merusak data atau alur finansial. (Contoh: *Navigation*, *Communication*, *Investigation*).
- **MEDIUM RISK:** Mengubah data operasional internal yang bisa dikoreksi/di-rollback. (Contoh: *Retry OCR*, *Assign PIC*).
- **HIGH RISK:** Berdampak finansial, perpindahan aset, atau pembatalan kontrak operasional. (Contoh: *Refund*, *Hotel Reassignment*).
- **CRITICAL:** Berdampak masif, merusak sistem atau otorisasi utama. (Contoh: *Lock Super Admin*, *Factory Reset*, *Mass Delete*).

*Catatan Penting:* Action High/Critical TIDAK BOLEH dieksekusi hanya karena direkomendasikan sistem (Suggested Action). Harus ada mekanisme otorisasi (Approval Workflow) yang ketat berdasarkan Role (RBAC).
