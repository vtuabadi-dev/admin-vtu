# Architecture Decision Record (ADR) Governance

Dokumen ini menjelaskan kebijakan pembuatan, pengelolaan, dan arsip Architecture Decision Record (ADR) di dalam siklus pengembangan aplikasi.

## 1. Apa itu ADR?
Architecture Decision Record (ADR) adalah dokumen singkat yang merekam keputusan arsitektural yang signifikan, termasuk konteks masalah, opsi yang dipertimbangkan, keputusan yang diambil, serta konsekuensinya.

## 2. Kapan ADR Wajib Dibuat?
ADR **wajib** dibuat apabila memenuhi minimal satu dari kondisi (ADR Trigger Policy) berikut:
- Perubahan Database Schema (termasuk migrasi struktural yang berisiko).
- Perubahan Business Rule inti.
- Perubahan skema Authentication atau Authorization.
- Perubahan kebijakan Security.
- Perubahan Infrastruktur atau topology deployment.
- Perubahan Public API / Breaking Contract.
- Perubahan UI yang secara fundamental mengubah alur bisnis utama (Breaking UI).
- Perubahan dengan Cross Domain Impact (berdampak pada lebih dari satu service).

Jika salah satu kondisi terpenuhi: **STOP IMPLEMENTATION**. Status menjadi **ADR REQUIRED**. Pengembangan baru boleh dilanjutkan setelah ADR disetujui.

## 3. ADR Workflow
1. **Identifikasi Masalah**: Engineer mendeteksi kebutuhan perubahan arsitektural.
2. **Drafting ADR**: Pembuatan dokumen ADR menggunakan template standar.
3. **Architecture Review**: Sesi diskusi dengan tim teknis/arsitek.
4. **Engineering Review**: Persetujuan kelayakan implementasi.
5. **Product Owner Approval**: Persetujuan final sebelum eksekusi.
6. **Eksekusi & Arsip**: Penerapan keputusan ke source code dan pengarsipan ADR.

## 4. ADR Approval Flow
- **Diusulkan oleh**: Engineer / Tech Lead.
- **Diulas oleh**: Peer Engineer / Architect.
- **Disetujui oleh**: Product Owner.

## 5. ADR Numbering Convention
ADR disimpan dalam folder `docs/adr/`. Penomoran menggunakan format:
`ADR-XXXX-Judul-Singkat.md`
Contoh: `ADR-0001-Gunakan-Supabase-Pooler.md`. Penomoran (`XXXX`) selalu bersifat inkremental mulai dari `0001`.

## 6. ADR Status
Status ADR dapat berupa salah satu dari berikut:
- **PROPOSED**: Masih dalam tahap pengajuan.
- **REVIEW**: Sedang diulas oleh tim.
- **APPROVED**: Disetujui dan siap direalisasikan.
- **REJECTED**: Ditolak dan tidak diimplementasikan.
- **SUPERSEDED**: Digantikan oleh ADR lain yang lebih baru (referensikan nomor ADR penggantinya).
- **DEPRECATED**: Keputusan tidak lagi relevan tetapi dibiarkan untuk riwayat historis.

## 7. ADR Template
Setiap file ADR wajib menggunakan format berikut:
```markdown
# ADR-[Nomor]: [Judul Keputusan]

## Status
[PROPOSED | REVIEW | APPROVED | REJECTED | SUPERSEDED | DEPRECATED]

## Tanggal
[YYYY-MM-DD]

## Konteks
[Jelaskan masalah, kebutuhan, atau dorongan teknis di balik keputusan ini.]

## Opsi yang Dipertimbangkan
- [Opsi A]
- [Opsi B]
- [Opsi C]

## Keputusan
[Keputusan yang diambil.]

## Konsekuensi
- Positif: [Apa benefitnya?]
- Negatif: [Apa trade-off atau kekurangannya?]
- Netral: [Apa perubahannya?]
```

## 8. ADR Archive Policy
- ADR yang telah dibuat **TIDAK BOLEH DIHAPUS**.
- Jika keputusan diubah di masa depan, ADR lama hanya diubah statusnya menjadi `SUPERSEDED` atau `DEPRECATED`.
- Semua ADR disimpan ke version control (Git) agar riwayat pengambilan keputusan tetap abadi.
