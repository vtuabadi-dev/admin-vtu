# Enterprise Activity Center - Filter Policy
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Untuk menjadikan Activity Center sebagai sarana pemantauan (*monitoring*) dan investigasi forensik yang berkinerja tinggi, kemampuan pencarian (*Search*) dan penyaringan (*Filter*) yang canggih adalah fitur mutlak. Dokumen ini mendefinisikan kapabilitas *Advanced Filtering* dan kebijakan pencarian sistem.

## 2. Advanced Filtering Criteria
Antarmuka pengguna dari Activity Center HARUS mendukung filter berlapis berikut:

1. **Domain:** Multi-select list dari seluruh domain sistem (Master Data, Order, Visa, dll).
2. **Menu:** Auto-cascading dari Domain yang dipilih (Misal: Domain Master Data akan memunculkan opsi menu Hotel, Flight, dll).
3. **Entity:** Menyaring berdasarkan jenis objek bisnis (Package, Order, Invoice, Passport).
4. **Action:** Menyaring jenis kegiatan spesifik (Create, Update, Delete, Export, Login). Sangat krusial untuk melacak aktivitas destruktif (Delete).
5. **Severity:** Menyaring tingkat insiden (Information, Warning, Critical, Emergency). Secara bawaan, tampilan dasbor keamanan dapat difilter ke level Critical/Emergency.
6. **Source:** Membedakan antara operasi "Manual User" dengan eksekusi otomatis "System / Automation".
7. **Actor:** Menyaring aktivitas spesifik dari seorang karyawan (Berdasarkan ID / Nama).
8. **Date Range:** Filter rentang Waktu dan Tanggal yang absolut.
9. **Correlation ID:** Exact match filter untuk merangkai satu siklus penuh proses bisnis.
10. **Keyword (Full Text Search):** Pencarian teks bebas menggunakan *Reverse Indexing* atau mekanisme text-search khusus.

## 3. Best Practice Filtering & Full Text Search

### The Keyword Target Fields
Ketika *User* memasukkan keyword pencarian (misal: nama jamaah, nomor urut invoice, nama maskapai), sistem *Full Text Search* di belakang Activity Center akan mencari ke dalam indeks berikut:
- `context.entity_name` (Mencari nama entitas: "Swissotel", "Reguler Agustus", "INV-2026-999")
- `actor.actor_name` (Mencari nama staff pelaksana)
- `detail.description` (Mencari narasi event)
- `detail.old_value` dan `detail.new_value` (Mencari perubahan data di kedalaman JSON, sangat berguna untuk mencari nomor passport lama vs baru).

### Search Optimization (Future Proof)
Pencarian teks bebas pada tabel SQL relasional berjuta-juta baris menggunakan `LIKE '%keyword%'` akan menimbulkan kelumpuhan *database* (Table Lock / Slow Query).
Kebijakan filter menetapkan bahwa *engine* filter harus dikonstruksi secara *agnostic* agar di kemudian hari mekanisme pencarian (*Search Service*) dapat dipindahkan ke engine khusus seperti ElasticSearch, Meilisearch, atau PostgreSQL GIN Index tanpa merubah arsitektur *frontend* atau logika bisnis core.
