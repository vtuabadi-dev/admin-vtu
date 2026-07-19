# Enterprise Activity Center - Business Rules
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Core Principles
Activity Center beroperasi di bawah prinsip **Single Source of Activity, Single Audit Standard, Single Event Timeline, dan Single Monitoring Center.** Seluruh modul fungsional sistem wajib tunduk pada standar pencatatan ini.

## 2. Activity Attributes Rules

### Rule 1: Mandatory Domain
Setiap aktivitas WAJIB dikategorikan ke dalam *Domain* bisnis utama. 
*Contoh:* Master Data, Generate Paket, Order Jamaah, Manifest, Rooming, Pembayaran, Visa, Authentication, Automation.

### Rule 2: Mandatory Menu
Setiap aktivitas WAJIB mencantumkan *Menu* tempat aktivitas tersebut diakses atau diinisiasi.
*Contoh:* Domain `Master Data` → Menu `Hotel`. Domain `Generate Paket` → Menu `Harga Paket`.

### Rule 3: Mandatory Entity
Aktivitas harus mengikat pada objek bisnis (Entity) yang sedang diproses.
*Contoh:* Package, Order, Hotel, Manifest, Invoice, User, Role.

### Rule 4: Mandatory Entity Name
Aktivitas harus memiliki identifikasi visual yang manusiawi (*human-readable*) atas entitas tersebut (Entity Name).
*Contoh:* Package `Reguler 9 Hari Agustus`, Hotel `Swissotel Makkah`, Order `ORD-000123`.

### Rule 5: Mandatory Action
Jenis operasi yang dilakukan wajib tercatat secara terstandarisasi.
*Minimal meliputi:* Create, Update, Delete, Activate, Deactivate, Approve, Reject, Generate, Assign, Import, Export, Upload, Download, Move, Sync, Login, Logout, Reset Password, Factory Reset.

### Rule 6: Mandatory Severity
Aktivitas dikategorikan berdasarkan tingkat kepentingan dan dampaknya:
*Tingkat:* Information (Info biasa), Warning (Perlu perhatian), Critical (Kesalahan kritis/Operasi besar), Emergency (Sistem down/Keamanan terancam).

### Rule 7: Mandatory Source
Harus jelas dari mana aktivitas ini dipicu (Source).
*Kategori:* Manual User, System, Automation, Scheduler, Webhook, OCR, Import Excel, Import CSV, API, Migration, Background Job.

### Rule 8: Mandatory Actor
Identifikasi pihak atau mesin yang melakukan tindakan.
*Format:* Nama User, Role, Department (untuk *Manual User*), atau `System` (jika *Automation/System*).

### Rule 9: Mandatory Timestamp
Waktu eksekusi yang tepat dan tidak dapat diubah (Immutable).
*Komponen:* Tanggal, Jam, Timezone (wajib menyertakan UTC offset).

### Rule 10: Mandatory Detail
Perubahan yang bersifat manipulasi data WAJIB menyertakan Detail.
*Komponen:* Old Value (Nilai sebelumnya), New Value (Nilai terkini), Reason (Alasan perubahan), Description (Deskripsi konteks aktivitas).

### Rule 11: Mandatory Correlation ID
Seluruh aktivitas terkait dalam satu aliran proses bisnis panjang WAJIB dirantai menggunakan satu **Correlation ID** yang sama.
*Contoh Flow:* Generate Paket → Order → Invoice → Payment → Manifest → Rooming → Visa (Seluruhnya memiliki 1 Correlation ID spesifik untuk proses jamaah tersebut).

### Rule 12: Mandatory Navigation Reference
Activity Center harus bertindak sebagai papan interaktif. Aktivitas WAJIB memuat *Navigation Reference* (seperti `Open Package`, `Open Order`, `Open Manifest`) untuk mengarahkan User kembali ke data asli (selama data tersebut masih ada).

## 3. System Capability Rules

### Rule 13: Full Text Search Support
Activity Center HARUS memfasilitasi pencarian global menyeluruh.
*Key Search Fields:* Nama Jamaah, Kode Paket, Kode Invoice, Nama Hotel, Nomor Passport, Nama User, Correlation ID, Nomor Manifest, dan parameter entitas lainnya.

### Rule 14: Advanced Filtering
Sistem wajib menyediakan penyaringan lanjutan untuk forensik dan analitik.
*Filter Minimal:* Domain, Menu, Entity, Action, Actor, Severity, Source, Date Range, Keyword, Correlation ID.

### Rule 15: Read-Only (Immutable)
Activity Center adalah saksi sejarah yang tidak boleh diubah.
**DILARANG ADA**: Edit Log, Delete Log, atau Update Log. Sifat rekamannya adalah *Append-Only*.

### Rule 16: Universal Event Hub
Aktivitas ini mencakup segala aspek sistem: Audit Trail pengguna, System Event log, hasil *Automation*, ekstraksi OCR, *Import/Export History*, pelacakan otentikasi (login), dan integrasi API pihak ketiga.

### Rule 17: Framework Agnostic
Aturan, penamaan kolom, dan mekanisme penyimpanan Activity Center harus dirancang independen dari framework bahasa pemrograman (misal: bebas dari *vendor lock-in*). Bisa diimplementasikan di Node.js, Go, Python, atau teknologi apapun di masa depan.
