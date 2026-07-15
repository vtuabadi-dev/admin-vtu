# Security Governance

Dokumen ini mendefinisikan standar keamanan (security posture) yang diwajibkan untuk seluruh proses pengembangan dan deployment aplikasi.

## 1. Secret Management
Seluruh file konfigurasi sensitif (keys, passwords, API tokens) **DILARANG KERAS** masuk ke dalam Version Control System (seperti GitHub, GitLab). Pengelolaan secret harus menggunakan sistem manajemen eksternal (seperti AWS Secrets Manager, Vercel Environment Variables, atau HashiCorp Vault).

## 2. Environment Variable Policy
- File `.env` dilarang dikomit (kecuali `.env.example`).
- Gunakan naming prefix spesifik apabila diekspos ke klien (seperti `NEXT_PUBLIC_`), selebihnya variabel dilarang terekspos secara publik.
- Saat proses build / deployment, gunakan injeksi variabel yang secure dari host mesin target.

## 3. Credential Rotation
Seluruh secret kredensial utama (database passwords, API keys eksternal, JWT secret) wajib melalui proses **Rotation** secara berkala (minimal 90 hari). Rotasi harus direncanakan tanpa menimbulkan *downtime* (overlapping keys policy).

## 4. API Key Management
Setiap layanan eksternal harus dipisahkan kunci API-nya per-environment (Development, Preview/Staging, Production). Jangan gunakan API Key Development di Production. Semua akses API pihak ketiga dibatasi (IP Whitelisting / Host Domain Restriction jika memungkinkan).

## 5. Production Access
Akses langsung ke server production dibatasi (No Direct SSH Policy). Debugging production harus menggunakan alat monitoring terpusat (Observability Tools). Akses hanya dibuka secara insidental (break-glass procedure) dengan persetujuan manajemen keamanan.

## 6. Database Access
Akses langsung ke database production **dilarang**. Administrator hanya boleh berinteraksi dengan database melalui:
- Database Console terotorisasi dengan Audit Trail.
- Migration otomatis via CI/CD Pipeline.
Seluruh akses manual ke DB harus tercatat dan memiliki masa kadaluwarsa akses (Time-bound Access).

## 7. Least Privilege Principle
Prinsip hak istimewa terkecil (Least Privilege) wajib diterapkan secara universal:
- IAM Roles: Aplikasi hanya boleh mengakses resources yang dibutuhkan.
- Database Users: Aplikasi tidak menggunakan user *root/superuser*, melainkan user terbatas yang hanya berhak atas skema aplikasi.
- Sistem File: Server Node.js dijalankan oleh user non-root.

## 8. Backup Policy
Backup wajib diaktifkan pada semua instance database (Point-in-Time Recovery - PITR). Snapshot reguler diambil setiap 24 jam dengan durasi retensi minimal 14 hari. Pemulihan (Restoration Drill) wajib dites minimal 6 bulan sekali.

## 9. Security Incident Reporting
Dalam kondisi *security breach* (kebocoran data, Unauthorized Access):
1. Segera lakukan pembekuan credentials terkait (Revoke Access).
2. Laporkan ke saluran komunikasi Security/Tech Lead.
3. Eskalasi incident secara formal.
4. Lakukan Root Cause Analysis dan post-mortem audit setelah insiden teratasi.
