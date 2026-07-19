# Governance Version History

Dokumen ini melacak sejarah evolusi kebijakan, tata kelola, dan standarisasi (Governance) dalam organisasi Engineering perusahaan, guna memberikan konteks mengenai perubahan drastis yang terjadi di tiap fase iterasi.

| Version | Date | Status | Major Changes |
|---------|------|--------|---------------|
| **v1.0** | (Legacy) | Deprecated | Inisialisasi dasar Engineering Playbook. Pengenalan prinsip arsitektur awal dan Git Workflow standar. Pendekatan dokumen masih sporadis. |
| **v2.0** | Sprint Terdahulu | Deprecated | Standardisasi **Build Hygiene Policy** dan **Incident Management** (EEOS v1.2). Menetapkan *Confidence Level* (Confirmed, High Confidence, Hypothesis) dalam pemecahan masalah serta penyempurnaan rekomendasi (Build Gate). |
| **v2.1** | Pasca Insiden Schema Drift | Superseded | Introduksi **Database Governance** sebagai respon atas insiden hilangnya kolom di Production. Menambahkan aturan tegas mengenai *Prisma Workflow*, kewajiban *migrate deploy* dalam CI/CD, dan mitigasi *Schema Drift*. |
| **v2.2 Final** | Saat Ini | Ready For Lock | Transformasi menjadi **Enterprise Engineering Handbook** secara utuh. Penambahan masif pada pilar *Security*, *Performance*, *Testing*, *Observability*, *Coding Standards*, *ADR*, dan penyusunan struktur dokumentasi yang terpusat. |

## Detailed Changes

### v1.0
- Fokus pada *Clean Architecture* dan *Layer Responsibility*.
- Definisi siklus pengembangan sederhana (Discovery - Release).

### v2.0
- Mengatasi problem inkonsistensi *build artifacts*.
- Menciptakan matriks *Incident Recovery Flow* (Environment, Cache, Configuration).

### v2.1
- Lahir dari *Root Cause Analysis* (Insiden *maskapaiId* tidak eksis).
- Pemisahan aturan eksekusi database `db push` (untuk lokal/hotfix) vs `migrate deploy` (untuk staging/production).
- Menciptakan *Deployment Checklist* dan SOP *Standalone Next.js*.

### v2.2 Final
- Mengangkat tata kelola menuju tingkat Enterprise.
- Mengadopsi **ADR (Architecture Decision Record)** secara formal.
- Mendefinisikan **Document Lifecycle** dan status penguncian dokumen (*Lock*).
- Menyatukan seluruh panduan ke dalam sebuah Master Entry Point (`README.md` dan *Playbook*).
