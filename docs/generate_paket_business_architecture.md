# Generate Paket Umroh - Business Architecture

## 1. Business Domain
Domain "Generate Paket Umroh" adalah sistem inti (Core Engine) pembentukan produk di VTU ABADI. Domain ini mendefinisikan perubahan paradigma dari sekadar CRUD tunggal (membuat 1 paket secara manual) menjadi sebuah **Factory Pattern Process**, di mana satu konfigurasi referensi dapat menghasilkan (generate) puluhan paket keberangkatan sekaligus berdasarkan input tanggal yang jamak.

## 2. Business Flow
Alur bisnis berada di tengah-tengah ekosistem:
**Master Data (Referensi) -> Generate Paket Umroh (Factory) -> Order Jamaah (Transaksi).**
- *Master Data* hanya menyediakan bahan baku (opsi).
- *Generate Paket* meracik bahan baku tersebut, menentukan harga spesifik, hotel spesifik, dan memproduksinya menjadi entitas produk jadi (Paket Keberangkatan).
- *Order Jamaah* mengonsumsi produk jadi tersebut, dengan memberikan keleluasaan personalisasi (seperti *upgrade hotel*) tanpa mengubah rancangan awal produk.

## 3. Core Business Rules
Berdasarkan keputusan arsitektural mutlak:
1. **Dynamic Hotel Binding**: Hotel Makkah maupun Hotel Madinah **TIDAK DIMILIKI** oleh Master Paket ataupun Master Klaster. Penentuan hotel dilakukan secara spesifik pada saat *Generate Paket Umroh*. Sebuah Klaster "Gold" di Paket A bisa menggunakan Hotel X, sementara Klaster "Gold" di Paket B bisa menggunakan Hotel Y.
2. **Klaster is a Structural Label**: Klaster (Silver, Gold, VIP) hanyalah struktur hierarki, bukan penyimpan harga default maupun hotel default.
3. **Multiplier by Date**: Input satu konfigurasi paket dengan *N* tanggal keberangkatan akan di-generate oleh sistem menjadi *N* entitas Paket Keberangkatan yang berdiri sendiri, dengan Kode Paket yang unik per keberangkatan.
4. **Hotel Override on Order**: Jamaah dapat melakukan *upgrade/downgrade* hotel pada saat transaksi tanpa merusak struktur paket utama. Override ini hanya disimpan pada level Order Jamaah, bukan level Paket.
