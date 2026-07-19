# Enterprise AI Command Center Roadmap
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Peta Jalan Evolusi (Evolution Phases)
EAC berevolusi dalam tahapan teknis yang terukur, matang, dan tidak terburu-buru memasukkan AI secara paksa tanpa *Governance*.

- **PHASE 1 - Enterprise Activity Center (Saat Ini):** Mengumpulkan Big Data. *Observe & Search* yang direpresentasikan oleh EAC fundamental (Immutable log, Filter, Table).
- **PHASE 2 - Enterprise Investigation Center:** *Investigate & Root Cause* dengan Correlation ID, Timeline, dan Case Management manual.
- **PHASE 3 - Enterprise Resolution Center:** *Action & Resolve*. Pembuatan Action Model, Suggested Action (Rule-Based), Workflow resolusi & Eksekusi melalui EAC.
- **PHASE 4 - Enterprise AI Command Center:** Mengaktifkan *Assist & Recommend* berbasis Large Language Models (LLM) / Machine Learning.
- **PHASE 5 - Enterprise Business Intelligence:** Tahapan paripurna di mana data prediktif digunakan untuk optimasi harga (Dynamic Pricing) dan kapasitas operasional (*Predict & Optimize*).

## 2. AI Governance Principles
Pada Phase 4, adopsi AI diletakkan dalam pagar kontrol yang ketat:
- **AI CAN RECOMMEND:** AI boleh menyarankan tindakan berdasarkan dokumentasi pola masa lalu (SOP).
- **AI CAN EXPLAIN:** AI membaca tumpukan JSON log dan menjelaskannya ke bahasa manusia.
- **AI CAN SUMMARIZE:** Membantu membuat simpulan (*Conclusion*) pada Investigation Ticket.
- **AI CAN PRIORITIZE:** Mengatur urutan tiket di Dashboard berdasarkan sentimen ancaman bisnis (Risk Priority).
- **AI MUST NOT BYPASS HUMAN APPROVAL:** AI **DILARANG KERAS** melakukan aksi mutasi database (*Destructive Action* / Operasional Penting) secara otonom (Auto-Heal pada level finansial). Sistem selalu melempar konfirmasi persetujuan ke otorisasi manusia sesuai RBAC.
