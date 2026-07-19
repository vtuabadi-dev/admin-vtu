# Enterprise Resolution & Action Architecture
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Vision & Purpose
Visi utama dari pengembangan ini adalah mentransformasi sistem yang sebelumnya pasif ("Ini yang terjadi") menjadi proaktif dan solutif ("Ini masalahnya, ini rekomendasinya, dan ini resolusinya"). Tujuan akhirnya adalah menciptakan **Enterprise Command Center** terpadu.

## 2. Architectural Positioning
Sistem ini tidak memecah modul secara fisik menjadi aplikasi terpisah, melainkan menerapkan kapabilitas berlapis (Layered Capabilities) dalam satu payung **Enterprise Command Center**. Hubungannya adalah evolusioner:

1. **Activity Center (Layer 1 - Observation):** Fondasi data immutable. Merekam segala event sebagai fakta mutlak (Single Source of Truth).
2. **Investigation Center (Layer 2 - Analysis):** Lapisan forensik (Correlation ID, Root Cause Explorer, Case Management).
3. **Resolution Center (Layer 3 - Action):** Lapisan eksekusi (Suggested Actions, Action Execution, Resolution Tracking).
4. **AI Command Center (Layer 4 - Intelligence):** Lapisan asisten kognitif (Smart Recommendation, Fraud Detection).
5. **Business Intelligence (Layer 5 - Strategy):** Prediksi dan optimasi jangka panjang.

## 3. Separation of Responsibility
Pemisahan fungsional wajib ditaati:
- **Activity Log** adalah *Immutable Fact*.
- **Investigation** adalah *Analytical State*.
- **Recommendation** adalah *System Proposal*.
- **Action** adalah *Business Intent* yang memanggil Business Use Case resmi di domain asalnya (bukan memotong kompas via modifikasi database langsung).
- **Resolution** adalah *Verification Outcome*.

## 4. Event → Action Lifecycle
Siklus hidup kejadian hingga penutupan (End-to-End Lifecycle):
`EVENT → DETECT → INVESTIGATE → RECOMMEND → AUTHORIZE → ACT → RESOLVE → VERIFY → CLOSE`
Arsitektur ini memastikan setiap langkah tercatat (traceable) dan terhubung dengan `Correlation ID` yang berakar dari Event pertama.
