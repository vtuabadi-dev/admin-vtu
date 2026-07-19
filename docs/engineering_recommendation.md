# Engineering Recommendation

## Incident Priority
Urutan investigasi standar saat terjadi insiden adalah sebagai berikut:

**Priority 1: Infrastructure**
&nbsp;&nbsp;&nbsp;&nbsp;↓
**Priority 2: Configuration**
&nbsp;&nbsp;&nbsp;&nbsp;↓
**Priority 3: Cache**
&nbsp;&nbsp;&nbsp;&nbsp;↓
**Priority 4: Dependency**
&nbsp;&nbsp;&nbsp;&nbsp;↓
**Priority 5: Source Code**

**Alasan mengapa engineer tidak boleh langsung menyalahkan source code:**
Sebagian besar insiden sistem seringkali bukan disebabkan oleh cacat pada logika source code, terutama bila kode tersebut sudah lolos uji CI/CD. Menyalahkan source code terlebih dahulu akan mengarah pada asumsi yang keliru dan perombakan kode yang sebenarnya tidak rusak. Engineer harus secara sistematis mengecualikan faktor luar (seperti limit memori, jaringan, salah konfigurasi, cache lama, atau library bermasalah) sebelum menuduh alur program yang menjadi penyebab utama.

## Build Gate Philosophy

Berisi prinsip fundamental bahwa:
Developer **tidak diperbolehkan melakukan perubahan source code** selama belum dapat membuktikan bahwa:
- **Infrastructure sehat**
- **Configuration sehat**
- **Cache sehat**
- **Dependency sehat**

Hanya setelah keempat lapisan fundamental tersebut diverifikasi sehat, barulah Source Code boleh diinvestigasi.
