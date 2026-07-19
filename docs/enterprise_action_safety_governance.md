# Enterprise Action Safety & Governance
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Safety Command Center Principles
Enterprise Command Center berisiko berubah menjadi alat pengrusak (Super Admin Destructive Console) jika tidak dikawal dengan ketat.
Prinsip utamanya: **"Command Center memanggil Use Case, bukan mengubah Data secara langsung."** Tidak boleh ada *query UPDATE/DELETE* yang membypass *Business Logic Service* di modul utama.

## 2. Action Safety Matrix
Tabel tata kelola risiko eksekusi:

| Action Name | Risk Level | Needs Confirmation? | Needs Approval? | Auditability |
| :--- | :--- | :--- | :--- | :--- |
| Open Order | Low | No | No | Read Log (EAC) |
| Retry OCR | Low | Optional (UI click) | No | New Event |
| Retry Payment | Medium | Yes (Popup Alert) | No | New Event |
| Reassign Hotel | Medium-High| Yes | Yes (Manager) | New Event |
| Lock User | High | Yes (Multi-step) | Depends on User Role | New Event |
| Factory Reset / Mass Delete | Critical | Yes (Multi-step + OTP) | Yes (Super Admin / Owner) | New Event |

## 3. Pelaksanaan Eksekusi (Execution Governance)
- **Idempotency:** Aksi operasional (seperti *Retry Payment*) harus dirancang *idempotent* di domain asalnya. Mengklik tombol "Retry" berkali-kali secara membabi-buta di Dashboard **TIDAK BOLEH** menghasilkan debet rekening berganda (Double Charge).
- **Rollback Capability:** Pada operasi berisiko (Medium-High), action idealnya memiliki *counter-action* atau *compensating transaction* (Saga Pattern) jika hasil akhir gagal.
- **RBAC Overrides:** User tidak boleh melihat atau menekan tombol `Suggested Action` apabila *Role*-nya tidak memiliki izin *Write/Execute* pada domain asalnya (Misal: Staf biasa tidak bisa menekan `Approve Refund`).
