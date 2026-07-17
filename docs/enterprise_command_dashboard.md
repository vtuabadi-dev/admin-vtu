# Enterprise Command Dashboard
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Evolusi Dashboard (Dari Activity ke Command)
Dashboard kini bertransformasi dari antarmuka "Monitor" (melihat metrik) menjadi antarmuka "Eksekusi".

## 2. Information Hierarchy
Desain tidak boleh membanjiri user dengan notifikasi (*Notification Fatigue*). Hierarki difokuskan pada urgensi (Call to Action).
1. **Top Priority: Attention Required (Red Zone)**
   - Menampilkan `Critical Events` (Misal: 3 Automation Failed).
   - Langsung memunculkan `Recommended Actions` di sebelahnya (Misal: → Open Failed Jobs, → Retry Eligible Jobs).
2. **Action Priority: Task Inbox (Yellow Zone)**
   - `Pending Approval:` Aksi risiko tinggi yang butuh tanda tangan Manager/Director.
   - `Assigned To Me:` Kasus (*Investigation*) yang dilimpahkan ke user saat ini.
3. **Ongoing Status: In Progress (Blue Zone)**
   - `Investigation In Progress:` Tiket pencarian *Root Cause*.
   - `Resolution In Progress:` Tindakan yang masih menunggu respon sistem luar (seperti Visa API).
4. **General Monitoring (Green/Grey Zone)**
   - `Recently Resolved:` Daftar masalah yang baru diselesaikan hari ini (untuk memotivasi *confidence*).
   - `Security Alert:` Aktivitas login anomali.

Konsep UX-nya adalah menyandingkan Event (*The Problem*) langsung dengan Suggested Action (*The Button / The Solution*) pada satu baris UI yang ringkas.
