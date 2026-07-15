# Release Governance

Dokumen ini memuat standar tahapan siklus rilis (*Release Lifecycle*) beserta aturan penetapan versi rilis dalam aplikasi perusahaan.

## 1. Lingkungan Deployment (Release Stages)

### Release Candidate (RC)
Kode yang telah dibekukan (code freeze) dan dianggap siap untuk di-deploy. Kode ini telah lolos unit & integration test pada CI.

### Preview / Staging
Lingkungan pra-produksi di mana rilis kandidat di-deploy. Di environment inilah UAT, integrasi data tiruan (seolah produksi), dan Smoke Test dijalankan. Jika gagal, perbaikan dilakukan pada kandidat RC selanjutnya.

### Production
Lingkungan aktual (Live) tempat interaksi pengguna sungguhan terjadi. Rilis menuju Production hanya dilakukan setelah *Release Approval Flow* disetujui Product Owner.

## 2. Release Type & Versioning (SemVer)
Semua rilis versi mengikuti standar *Semantic Versioning* (MAJOR.MINOR.PATCH).

### Major Release (X.0.0)
Berisi perubahan berskala besar, breaking changes (perubahan API kontrak, arsitektur dasar, database schema refactoring yang signifikan).
- Mewajibkan pengumuman (Downtime Maintenance) kepada pengguna.
- Wajib memiliki dokumen ADR terkait.

### Minor Release (0.X.0)
Penambahan fitur baru yang berstatus *Backward Compatible* (Aman, tidak merusak fitur lama).
- Dirilis pada siklus sprint biasa (misal Mingguan atau Dwimingguan).

### Patch Release (0.0.X)
Perbaikan Bug, optimasi kueri minor, atau perbaikan *edge cases*. Tidak ada perubahan alur fitur baru.

### Hotfix (Di luar Jadwal Rilis)
Patch krusial yang bersifat insidental dan mendesak, menargetkan perbaikan *Severity Critical* (seperti server crash, eksploit keamanan, database corrupt). Prosedur rilisnya bisa melakukan bypass terhadap siklus QA yang panjang asalkan mengacu pada *Emergency Hotfix Procedure*.

### Rollback
Proses instan pembatalan rilis (revert/demotion) menuju versi Major/Minor/Patch stabil sebelumnya karena insiden yang lolos ke Production.

## 3. Release Checklist
Sebelum tombol Deploy (Merge to Main) ditekan, tim operasional/engineer wajib memenuhi Checklist berikut:
- [ ] Pipeline CI memberikan status hijau (All tests passing).
- [ ] Migration Script valid (Review ADR Database additive/destructive).
- [ ] Secret Environment Variables siap dan relevan pada host.
- [ ] *No regression observed* selama di Staging/Preview.
- [ ] Change Log / Release Notes sudah diperbarui.

## 4. Release Approval Flow
1. **Developer**: Membuat Pull Request (PR).
2. **Tech Lead**: Mereview kode (Architecture, Security, Code Standards). Approve PR.
3. **CI Bot**: Membangun branch sementara (Preview) & melaporkan success log.
4. **QA/Tester**: Melakukan verifikasi E2E & validasi visual UAT pada Preview URL.
5. **Product Owner**: Memberikan keputusan bisnis *Approval to Go-Live*.
6. **DevOps / CI/CD**: Merge ke branch `main`, eksekusi deployment akhir ke Production.
