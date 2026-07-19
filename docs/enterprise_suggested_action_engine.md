# Enterprise Suggested Action Engine
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Definisi Suggested Action
Suggested Action adalah usulan prosedural yang diberikan oleh sistem (Engine) berdasarkan pembacaan Activity Event spesifik atau agregasi dari pola error.

## 2. Tingkat Rekomendasi & Otorisasi Eksekusi
Rekomendasi dibagi dalam beberapa lapisan otorisasi (RBAC):

1. **Informational Recommendation:** 
   - *Sifat:* Hanya memberitahu.
   - *Contoh:* "Payment Gateway mengalami delay rata-rata 5 detik."
   - *Otorisasi:* Siapapun dengan akses dashboard.

2. **Navigation Recommendation:** 
   - *Sifat:* Mengarahkan.
   - *Contoh:* "Open Order untuk mengecek detail."
   - *Otorisasi:* Membutuhkan izin *View* pada domain terkait.

3. **User-Confirmed Action:** 
   - *Sifat:* Aksi yang bisa langsung dijalankan dengan 1x klik konfirmasi.
   - *Contoh:* "Retry Upload OCR."
   - *Otorisasi:* Staff operasional yang memegang entitas tersebut.

4. **Approval-Required Action:** 
   - *Sifat:* Aksi finansial/operasional tinggi yang butuh supervisor.
   - *Contoh:* "Refund Tagihan Jamaah."
   - *Otorisasi:* Request oleh Staff → Disetujui oleh Manager Finance.

5. **System-Automated Action:** 
   - *Sifat:* Sistem mengeksekusi otomatis (Self-Healing).
   - *Contoh:* "Retry Background Job (Attempt 2/3)."
   - *Otorisasi:* Dikonfigurasi secara statis oleh IT Admin.

## 3. Aturan Pelaporan (Logging)
Setiap eksekusi dari Suggested Action WAJIB menciptakan Activity Event baru di EAC dengan *Source* yang spesifik (Misal: `Command Center - Suggested Action`). Hal ini menjaga *Immuntability* histori awal sekaligus merekam bahwa resolusi dilakukan atas rekomendasi sistem.
