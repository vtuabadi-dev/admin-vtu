/**
 * Direktori Kantor Imigrasi, Unit Layanan Paspor (ULP), dan Mal Pelayanan Publik (MPP) se-Indonesia
 * Berdasarkan Titik Lokasi Resmi yang Tercatat di Google Maps & Direktori Ditjen Imigrasi.
 *
 * Catatan Standar Nomenklatur:
 * Seluruh nama resmi dan pelampiran menggunakan nama lengkap "Kantor Imigrasi" (bukan singkatan "Kanim").
 *
 * SUMBER REFERENSI UTAMA:
 * - Titik Lokasi Google Maps Resmi: https://www.imigrasi.go.id/hubungi/lokasi-kami
 * - Portal Resmi: https://www.imigrasi.go.id/
 *
 * SINKRONISASI BERKALA:
 * - Update otomatis dilakukan setiap 10 hari sekali (KANIM_SYNC_INTERVAL_DAYS).
 */

export const OFFICIAL_IMIGRASI_URL = "https://www.imigrasi.go.id/";
export const OFFICIAL_IMIGRASI_LOKASI_URL = "https://www.imigrasi.go.id/hubungi/lokasi-kami";

/** Periode sinkronisasi berkala data kantor imigrasi (per 10 hari) */
export const KANIM_SYNC_INTERVAL_DAYS = 10;
export const KANIM_SYNC_INTERVAL_MS = KANIM_SYNC_INTERVAL_DAYS * 24 * 60 * 60 * 1000; // 864.000.000 ms

export interface KantorImigrasiItem {
  id: string;
  nama: string;           // Nama resmi lengkap (cth: "Kantor Imigrasi Surabaya (TPI)")
  shortLabel: string;     // Nama lengkap kantor terverifikasi (cth: "Kantor Imigrasi Surabaya (TPI)")
  kota: string;           // Kota / Kabupaten lokasi (cth: "Surabaya")
  provinsi: string;       // Provinsi
  aliases?: string[];     // Nama alias pencarian / nama terdahulu untuk backward compatibility
  alamat?: string;        // Alamat lengkap fisik kantor sesuai listing Google Maps
  mapsUrl?: string;       // Tautan lokasi Google Maps resmi
}

export const DAFTAR_KANTOR_IMIGRASI: KantorImigrasiItem[] = [
  {
    "id": "gmap-kanim-banda-aceh-tpi",
    "nama": "Kantor Imigrasi Banda Aceh (TPI)",
    "shortLabel": "Kantor Imigrasi Banda Aceh (TPI)",
    "kota": "Banda Aceh",
    "provinsi": "Aceh",
    "alamat": "Jl. Tengku M. Daud Beureuh No. 82 Banda Aceh",
    "mapsUrl": "https://www.google.com/maps/place/5.55514060045121,95.3172886079495",
    "aliases": [
      "Kanim Banda Aceh (TPI)",
      "Kantor Imigrasi Banda Aceh (TPI)",
      "Kanim Banda Aceh (TPI) Banda Aceh"
    ]
  },
  {
    "id": "gmap-kanim-langsa-tpi",
    "nama": "Kantor Imigrasi Langsa (TPI)",
    "shortLabel": "Kantor Imigrasi Langsa (TPI)",
    "kota": "Langsa",
    "provinsi": "Aceh",
    "alamat": "Jl. Jenderal Ahmad Yani No.115, Gampong Jawa, Kec. Langsa Kota, Kota Langsa, Aceh 24411",
    "mapsUrl": "https://www.google.com/maps/place/4.47626848691879,97.96071928442028",
    "aliases": [
      "Kanim Langsa (TPI)",
      "Kantor Imigrasi Langsa (TPI)",
      "Kanim Langsa (TPI) Langsa"
    ]
  },
  {
    "id": "gmap-kanim-lhokseumawe-tpi",
    "nama": "Kantor Imigrasi Lhokseumawe (TPI)",
    "shortLabel": "Kantor Imigrasi Lhokseumawe (TPI)",
    "kota": "Lhokseumawe",
    "provinsi": "Aceh",
    "alamat": "Jl. Pelabuhan No.5, Kampung Jawa Lama, Banda Sakti, Lhokseumawe City, Aceh 24355",
    "mapsUrl": "https://www.google.com/maps/place/5.177973875220466,97.15279736326171",
    "aliases": [
      "Kanim Lhokseumawe (TPI)",
      "Kantor Imigrasi Lhokseumawe (TPI)",
      "Kanim Lhokseumawe (TPI) Lhokseumawe"
    ]
  },
  {
    "id": "gmap-kanim-meulaboh-non-tpi",
    "nama": "Kantor Imigrasi Meulaboh (NON TPI)",
    "shortLabel": "Kantor Imigrasi Meulaboh (NON TPI)",
    "kota": "Meulaboh",
    "provinsi": "Aceh",
    "alamat": "Jl. Tgk Chik Ditiro No.4, Ps. Aceh, Kec. Johan Pahlawan, Kabupaten Aceh Barat, Aceh 23681",
    "mapsUrl": "https://www.google.com/maps/place/4.135207615406659,96.13048297301519",
    "aliases": [
      "Kanim Meulaboh (NON TPI)",
      "Kantor Imigrasi Meulaboh (NON TPI)",
      "Kanim Meulaboh (NON TPI) Meulaboh",
      "Kantor Imigrasi Kelas II Non TPI Aceh Barat",
      "Kantor Imigrasi Kelas II TPI Meulaboh"
    ]
  },
  {
    "id": "gmap-kanim-sabang-tpi",
    "nama": "Kantor Imigrasi Sabang (TPI)",
    "shortLabel": "Kantor Imigrasi Sabang (TPI)",
    "kota": "Sabang",
    "provinsi": "Aceh",
    "alamat": "Jl. Teuku Umar No. 10 Sabang 23511",
    "mapsUrl": "https://www.google.com/maps/place/5.893592164517405,95.3182950423533",
    "aliases": [
      "Kanim Sabang (TPI)",
      "Kantor Imigrasi Sabang (TPI)",
      "Kanim Sabang (TPI) Sabang"
    ]
  },
  {
    "id": "gmap-kanim-takengon-non-tpi",
    "nama": "Kantor Imigrasi Takengon (NON TPI)",
    "shortLabel": "Kantor Imigrasi Takengon (NON TPI)",
    "kota": "Takengon",
    "provinsi": "Aceh",
    "alamat": "Jl. Penghulu Gayo, Desa Kebet, Kec. Bebesen, Takengon, Aceh",
    "mapsUrl": "https://www.google.com/maps/place/95.33575897520856,5.563527095269724",
    "aliases": [
      "Kanim Takengon (NON TPI)",
      "Kantor Imigrasi Takengon (NON TPI)",
      "Kanim Takengon (NON TPI) Takengon",
      "Kantor Imigrasi Kelas III Non TPI Aceh Tengah"
    ]
  },
  {
    "id": "gmap-kanim-ngurah-rai-tpi",
    "nama": "Kantor Imigrasi Ngurah Rai (TPI)",
    "shortLabel": "Kantor Imigrasi Ngurah Rai (TPI)",
    "kota": "Badung",
    "provinsi": "Bali",
    "alamat": "Jl. Perum Taman Jimbaran No.1, Jimbaran, Kuta Selatan, Badung, Bali",
    "mapsUrl": "https://www.google.com/maps/place/-8.784222828462578,115.19488307735425",
    "aliases": [
      "Kanim Ngurah Rai (TPI)",
      "Kantor Imigrasi Ngurah Rai (TPI)",
      "Kanim Ngurah Rai (TPI) Badung"
    ]
  },
  {
    "id": "gmap-kanim-denpasar-tpi",
    "nama": "Kantor Imigrasi Denpasar (TPI)",
    "shortLabel": "Kantor Imigrasi Denpasar (TPI)",
    "kota": "Denpasar",
    "provinsi": "Bali",
    "alamat": "JL. D.I. PANJAITAN NO.3 KEL. DANGIN PURI KELOD, KEC. DENPASAR TIMUR, DENPASAR, BALI, 80235",
    "mapsUrl": "https://www.google.com/maps/place/-8.671406716984752,115.2305570294594",
    "aliases": [
      "Kanim Denpasar (TPI)",
      "Kantor Imigrasi Denpasar (TPI)",
      "Kanim Denpasar (TPI) Denpasar"
    ]
  },
  {
    "id": "gmap-kanim-singaraja-tpi",
    "nama": "Kantor Imigrasi Singaraja (TPI)",
    "shortLabel": "Kantor Imigrasi Singaraja (TPI)",
    "kota": "Singaraja",
    "provinsi": "Bali",
    "alamat": "Jl. Seririt Singaraja Pemaron Singaraja Bali 81151",
    "mapsUrl": "https://www.google.com/maps/place/-8.132215710085584,115.06147585407217",
    "aliases": [
      "Kanim Singaraja (TPI)",
      "Kantor Imigrasi Singaraja (TPI)",
      "Kanim Singaraja (TPI) Singaraja"
    ]
  },
  {
    "id": "gmap-kanim-pangkalpinang-tpi",
    "nama": "Kantor Imigrasi Pangkalpinang (TPI)",
    "shortLabel": "Kantor Imigrasi Pangkalpinang (TPI)",
    "kota": "Pangkalpinang",
    "provinsi": "Bangka Belitung",
    "alamat": "Jl. Jend. Sudirman Km. 03, Kel. Selindung Baru, Kec. Pangkalpinang, Kep. Bangka Belitung 33117",
    "mapsUrl": "https://www.google.com/maps/place/-2.0925852209027305,106.11216921909242",
    "aliases": [
      "Kanim Pangkalpinang (TPI)",
      "Kantor Imigrasi Pangkalpinang (TPI)",
      "Kanim Pangkalpinang (TPI) Pangkalpinang"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-pandan-tpi",
    "nama": "Kantor Imigrasi Tanjung Pandan (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Pandan (TPI)",
    "kota": "Tanjung Pandan",
    "provinsi": "Bangka Belitung",
    "alamat": "Jl. Jend. Sudirman Km. 6,5 Tg. Pandan 33413",
    "mapsUrl": "https://www.google.com/maps/place/-2.746604699084737,107.68885491488331",
    "aliases": [
      "Kanim Tanjung Pandan (TPI)",
      "Kantor Imigrasi Tanjung Pandan (TPI)",
      "Kanim Tanjung Pandan (TPI) Tanjung Pandan"
    ]
  },
  {
    "id": "gmap-kanim-serang-non-tpi",
    "nama": "Kantor Imigrasi Serang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Serang (NON TPI)",
    "kota": "Serang",
    "provinsi": "Banten",
    "alamat": "JL. WARUNG JAUD NO. 82 RT/ RW.03/ 11 KEL.KALIGANDU, KEC.SERANG, SERANG, BANTEN 42151",
    "mapsUrl": "https://www.google.com/maps/place/-6.1061008743610845,106.17692392655604",
    "aliases": [
      "Kanim Serang (NON TPI)",
      "Kantor Imigrasi Serang (NON TPI)",
      "Kanim Serang (NON TPI) Serang"
    ]
  },
  {
    "id": "gmap-kanim-tangerang-non-tpi",
    "nama": "Kantor Imigrasi Tangerang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Tangerang (NON TPI)",
    "kota": "Tangerang",
    "provinsi": "Banten",
    "alamat": "JL. TAMAN MAKAM PAHLAWAN TARUNA NO.10 RT/RW.05/12 KEL.SUKASARI, KEC.TANGERANG, TANGERANG, BANTEN, 15111",
    "mapsUrl": "https://www.google.com/maps/place/-6.182663097016351,106.6391143653394",
    "aliases": [
      "Kanim Tangerang (NON TPI)",
      "Kantor Imigrasi Tangerang (NON TPI)",
      "Kanim Tangerang (NON TPI) Tangerang"
    ]
  },
  {
    "id": "gmap-kanim-cilegon-tpi",
    "nama": "Kantor Imigrasi Cilegon (TPI)",
    "shortLabel": "Kantor Imigrasi Cilegon (TPI)",
    "kota": "Kotabumi",
    "provinsi": "Banten",
    "alamat": "Jalan KH. Yasin Beji No.8, Kotabumi, Kec. Purwakarta, Kota Cilegon, Banten, 42434",
    "mapsUrl": "https://www.google.com/maps/place/-5.997675522124475,106.03961998626144",
    "aliases": [
      "Kanim Cilegon (TPI)",
      "Kantor Imigrasi Cilegon (TPI)",
      "Kanim Cilegon (TPI) Kotabumi"
    ]
  },
  {
    "id": "gmap-kanim-bengkulu-tpi",
    "nama": "Kantor Imigrasi Bengkulu (TPI)",
    "shortLabel": "Kantor Imigrasi Bengkulu (TPI)",
    "kota": "Padang",
    "provinsi": "Bengkulu",
    "alamat": "Jl. Pembangunan No.23 Rt/Rw. 08/ 03 Kel.Padang Harapan, Kec.Gading Cempaka, Bengkulu 38225",
    "mapsUrl": "https://www.google.com/maps/place/-3.8211464163826916,102.28508522668906",
    "aliases": [
      "Kanim Bengkulu (TPI)",
      "Kantor Imigrasi Bengkulu (TPI)",
      "Kanim Bengkulu (TPI) Padang"
    ]
  },
  {
    "id": "gmap-kanim-yogyakarta-tpi",
    "nama": "Kantor Imigrasi Yogyakarta (TPI)",
    "shortLabel": "Kantor Imigrasi Yogyakarta (TPI)",
    "kota": "Depok",
    "provinsi": "D.I. Yogyakarta",
    "alamat": "JL. SOLO KM. 10 KEL.MAGUWOHARJO, KEC.DEPOK, SLEMAN, DAERAH ISTIMEWA YOGYAKARTA 55282",
    "mapsUrl": "https://www.google.com/maps/place/-7.7834883324625155,110.43581459260992",
    "aliases": [
      "Kanim Yogyakarta (TPI)",
      "Kantor Imigrasi Yogyakarta (TPI)",
      "Kanim Yogyakarta (TPI) Depok",
      "Kantor Imigrasi Kelas I TPI Yogyakarta",
      "Kantor Imigrasi Kelas I Non TPI Yogyakarta",
      "Kanim Jogja",
      "Imigrasi Jogja"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-bantul",
    "nama": "Unit Layanan Paspor Bantul",
    "shortLabel": "Unit Layanan Paspor Bantul",
    "kota": "Yogyakarta",
    "provinsi": "D.I. Yogyakarta",
    "alamat": "Kantor Pemda, Komplek II, Jl. Lkr. Timur Jl. Manding Kidul, Trirenggo, Kabupaten Bantul, Daerah Istimewa Yogyakarta",
    "mapsUrl": "https://www.google.com/maps/place/-7.810321340484671,110.32489070988443",
    "aliases": [
      "UNIT LAYANAN PASPOR BANTUL",
      "UNIT LAYANAN PASPOR BANTUL",
      "UNIT LAYANAN PASPOR BANTUL Yogyakarta"
    ]
  },
  {
    "id": "gmap-kanim-bandara-soekarno-hatta-tpi",
    "nama": "Kantor Imigrasi Bandara Soekarno - Hatta (TPI)",
    "shortLabel": "Kantor Imigrasi Bandara Soekarno - Hatta (TPI)",
    "kota": "Tangerang",
    "provinsi": "Banten",
    "alamat": "Jl. Bandar Udara Internasional Soekarno Hatta, Kel.Pajang, Kec.Benda, Tangerang, Banten, 19110",
    "mapsUrl": "https://www.google.com/maps/place/-6.124350909405925,106.65810586146229",
    "aliases": [
      "Kanim Bandara Soekarno - Hatta (TPI)",
      "Kantor Imigrasi Bandara Soekarno - Hatta (TPI)",
      "Kanim Bandara Soekarno - Hatta (TPI) Tangerang",
      "Kantor Imigrasi Kelas I Khusus TPI Soekarno-Hatta",
      "Kanim Kelas I Khusus TPI Soekarno-Hatta",
      "Kanim Soetta",
      "Imigrasi Soetta"
    ]
  },
  {
    "id": "gmap-kanim-jakarta-barat-non-tpi",
    "nama": "Kantor Imigrasi Jakarta Barat (NON TPI)",
    "shortLabel": "Kantor Imigrasi Jakarta Barat (NON TPI)",
    "kota": "Jakarta Barat",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Pos Kota No.4 Rt/Rw.004/006 Kel.Pinangsia, Kec.Taman Sari, Jakarta Barat, Dki Jakarta, 11110",
    "mapsUrl": "https://www.google.com/maps/place/-6.130443589963615,106.82191182590188",
    "aliases": [
      "Kanim Jakarta Barat (NON TPI)",
      "Kantor Imigrasi Jakarta Barat (NON TPI)",
      "Kanim Jakarta Barat (NON TPI) Jakarta Barat"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-lippo-puri-jakarta-barat",
    "nama": "Unit Layanan Paspor Lippo Puri Jakarta Barat",
    "shortLabel": "Unit Layanan Paspor Lippo Puri Jakarta Barat",
    "kota": "Jakarta Barat",
    "provinsi": "DKI Jakarta",
    "alamat": "Jalan Puri Indah Raya Blok U1, RT.3/RW.2, Kembangan Sel., Kec. Kembangan, Daerah Khusus Ibukota Jakarta 11610",
    "mapsUrl": "https://www.google.com/maps/place/-6.187666099827693,106.73930808102354",
    "aliases": [
      "UNIT LAYANAN PASPOR LIPPO PURI JAKARTA BARAT",
      "UNIT LAYANAN PASPOR LIPPO PURI JAKARTA BARAT",
      "UNIT LAYANAN PASPOR LIPPO PURI JAKARTA BARAT Jakarta Barat"
    ]
  },
  {
    "id": "gmap-kanim-jakarta-selatan-non-tpi",
    "nama": "Kantor Imigrasi Jakarta Selatan (NON TPI)",
    "shortLabel": "Kantor Imigrasi Jakarta Selatan (NON TPI)",
    "kota": "Jakarta Selatan",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Hajjah Tutty Alawiyah No.207, RT.2/RW.1, Duren Tiga, Kec. Pancoran, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12790",
    "mapsUrl": "https://www.google.com/maps/place/-6.272678148834573,106.7800564555572",
    "aliases": [
      "Kanim Jakarta Selatan (NON TPI)",
      "Kantor Imigrasi Jakarta Selatan (NON TPI)",
      "Kanim Jakarta Selatan (NON TPI) Jakarta Selatan"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-kebayoran-lama-jakarta-selatan",
    "nama": "Unit Layanan Paspor Kebayoran Lama Jakarta Selatan",
    "shortLabel": "Unit Layanan Paspor Kebayoran Lama Jakarta Selatan",
    "kota": "Jakarta Selatan",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Ciputat Raya No.27 RT/RW.005/006, Pondok Pinang, Kebayoran Lama, Jakarta Selatan",
    "mapsUrl": "https://www.google.com/maps/place/-6.272564849384382,106.77576395404353",
    "aliases": [
      "UNIT LAYANAN PASPOR KEBAYORAN LAMA JAKARTA SELATAN",
      "UNIT LAYANAN PASPOR KEBAYORAN LAMA JAKARTA SELATAN",
      "UNIT LAYANAN PASPOR KEBAYORAN LAMA JAKARTA SELATAN Jakarta Selatan"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-lippo-mall-kemang-jakarta-selatan",
    "nama": "Unit Layanan Paspor Lippo Mall Kemang Jakarta Selatan",
    "shortLabel": "Unit Layanan Paspor Lippo Mall Kemang Jakarta Selatan",
    "kota": "Jakarta Selatan",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Pangeran Antasari Jl. Kemang Raya No.36, RT.12/RW.5, Bangka, Kec. Mampang Prpt., Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12150",
    "mapsUrl": "https://www.google.com/maps/place/-6.261382848202942,106.8204309784622",
    "aliases": [
      "UNIT LAYANAN PASPOR LIPPO MALL KEMANG JAKARTA SELATAN",
      "UNIT LAYANAN PASPOR LIPPO MALL KEMANG JAKARTA SELATAN",
      "UNIT LAYANAN PASPOR LIPPO MALL KEMANG JAKARTA SELATAN Jakarta Selatan"
    ]
  },
  {
    "id": "gmap-kanim-jakarta-pusat-non-tpi",
    "nama": "Kantor Imigrasi Jakarta Pusat (NON TPI)",
    "shortLabel": "Kantor Imigrasi Jakarta Pusat (NON TPI)",
    "kota": "Jakarta Pusat",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Merpati Blok B 12 No.3, Kel.Gunung Sahari Selatan, Kec.Kemayoran, Jakarta Pusat, Dki Jakarta, 10720",
    "mapsUrl": "https://www.google.com/maps/place/-6.153522350338144,106.84265298102306",
    "aliases": [
      "Kanim Jakarta Pusat (NON TPI)",
      "Kantor Imigrasi Jakarta Pusat (NON TPI)",
      "Kanim Jakarta Pusat (NON TPI) Jakarta Pusat"
    ]
  },
  {
    "id": "gmap-kanim-jakarta-timur-tpi",
    "nama": "Kantor Imigrasi Jakarta Timur (TPI)",
    "shortLabel": "Kantor Imigrasi Jakarta Timur (TPI)",
    "kota": "Jakarta Timur",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Bekasi Timur Raya No. 169 Rt/Rw. 08/14 Kel.Cipinang Besar Utara, Kec.Jatinegara, Jakarta Timur, Dki Jakarta 13410",
    "mapsUrl": "https://www.google.com/maps/place/-6.214845467487932,106.88202160429465",
    "aliases": [
      "Kanim Jakarta Timur (TPI)",
      "Kantor Imigrasi Jakarta Timur (TPI)",
      "Kanim Jakarta Timur (TPI) Jakarta Timur"
    ]
  },
  {
    "id": "gmap-kanim-jakarta-utara-tpi",
    "nama": "Kantor Imigrasi Jakarta Utara (TPI)",
    "shortLabel": "Kantor Imigrasi Jakarta Utara (TPI)",
    "kota": "Jakarta Utara",
    "provinsi": "DKI Jakarta",
    "alamat": "Jl. Agung Karya V Blok A No.15, Papanggo, Tanjung Priok, Kota Jakarta Utara, 14340",
    "mapsUrl": "https://www.google.com/maps/place/-6.136701338068951,106.87881250489515",
    "aliases": [
      "Kanim Jakarta Utara (TPI)",
      "Kantor Imigrasi Jakarta Utara (TPI)",
      "Kanim Jakarta Utara (TPI) Jakarta Utara"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-priok-tpi",
    "nama": "Kantor Imigrasi Tanjung Priok (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Priok (TPI)",
    "kota": "Jakarta Utara",
    "provinsi": "DKI Jakarta",
    "alamat": "JL. MELATI 124 A RT/RW. 001/012 KEL.RAWABADAK UTARA, KEC.KOJA, JAKARTA UTARA, DKI JAKARTA, 14230",
    "mapsUrl": "https://www.google.com/maps/place/-6.115314445251266,106.89497097357133",
    "aliases": [
      "Kanim Tanjung Priok (TPI)",
      "Kantor Imigrasi Tanjung Priok (TPI)",
      "Kanim Tanjung Priok (TPI) Jakarta Utara"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-angke",
    "nama": "Unit Layanan Paspor Angke",
    "shortLabel": "Unit Layanan Paspor Angke",
    "kota": "Indonesia",
    "provinsi": "DKI Jakarta",
    "alamat": "Ruko Permata Kota Blok L/6, Jl. Pangeran Tubagus Angke, RT.10/RW.1, Angke, Tambora, West Jakarta City, Jakarta 11330",
    "mapsUrl": "https://www.google.com/maps/place/-6.140262484562332,106.79994516753229",
    "aliases": [
      "UNIT LAYANAN PASPOR ANGKE",
      "UNIT LAYANAN PASPOR ANGKE",
      "UNIT LAYANAN PASPOR ANGKE Indonesia"
    ]
  },
  {
    "id": "gmap-kanim-gorontalo-tpi",
    "nama": "Kantor Imigrasi Gorontalo (TPI)",
    "shortLabel": "Kantor Imigrasi Gorontalo (TPI)",
    "kota": "Gorontalo",
    "provinsi": "Gorontalo",
    "alamat": "Jl. Brigjen Piola Isa No.214 Kel. Dulomo Selatan, Kec. Kota Utara, Gorontalo 96123",
    "mapsUrl": "https://www.google.com/maps/place/0.5645229091134234,123.086812804236",
    "aliases": [
      "Kanim Gorontalo (TPI)",
      "Kantor Imigrasi Gorontalo (TPI)",
      "Kanim Gorontalo (TPI) Gorontalo"
    ]
  },
  {
    "id": "gmap-kanim-jambi-tpi",
    "nama": "Kantor Imigrasi Jambi (TPI)",
    "shortLabel": "Kantor Imigrasi Jambi (TPI)",
    "kota": "Jambi",
    "provinsi": "Jambi",
    "alamat": "Jl. Arief Rahman Hakim No.63 Rt/Rw.28/07, Kel. Simpang Iv Sipin, Kec. Telanaipura, Jambi 36124",
    "mapsUrl": "https://www.google.com/maps/place/-1.6185428054706505,103.57572566512665",
    "aliases": [
      "Kanim Jambi (TPI)",
      "Kantor Imigrasi Jambi (TPI)",
      "Kanim Jambi (TPI) Jambi"
    ]
  },
  {
    "id": "gmap-kanim-kuala-tungkal-non-tpi",
    "nama": "Kantor Imigrasi Kuala Tungkal (NON TPI)",
    "shortLabel": "Kantor Imigrasi Kuala Tungkal (NON TPI)",
    "kota": "Kuala Tungkal",
    "provinsi": "Jambi",
    "alamat": "Jl. Delata Pura Kuala Tungkal, 36551",
    "mapsUrl": "https://www.google.com/maps/place/-0.8193808166536254,103.47801392542536",
    "aliases": [
      "Kanim Kuala Tungkal (NON TPI)",
      "Kantor Imigrasi Kuala Tungkal (NON TPI)",
      "Kanim Kuala Tungkal (NON TPI) Kuala Tungkal"
    ]
  },
  {
    "id": "gmap-kanim-kerinci-non-tpi",
    "nama": "Kantor Imigrasi Kerinci (NON TPI)",
    "shortLabel": "Kantor Imigrasi Kerinci (NON TPI)",
    "kota": "Sungai Penuh",
    "provinsi": "Jambi",
    "alamat": "Jalan Lintas Sungai Penuh, Desa Sanggaran Agung, Kabupaten Kerinci, Kecamatan Danau Kerinci, Kode Pos 37172",
    "mapsUrl": "https://www.google.com/maps/place/-2.0625666524049744,101.40542451476946",
    "aliases": [
      "Kanim Kerinci (NON TPI)",
      "Kantor Imigrasi Kerinci (NON TPI)",
      "Kanim Kerinci (NON TPI) Sungai Penuh"
    ]
  },
  {
    "id": "gmap-kanim-bandung-tpi",
    "nama": "Kantor Imigrasi Bandung (TPI)",
    "shortLabel": "Kantor Imigrasi Bandung (TPI)",
    "kota": "Bandung",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Surapati No.82 Rt/Rw.09/06 Kel.Cihaurgeulis, Kec.Cibeunying, Bandung, Jawa Barat, 40122",
    "mapsUrl": "https://www.google.com/maps/place/-6.8989223234637365,107.63199111965041",
    "aliases": [
      "Kanim Bandung (TPI)",
      "Kantor Imigrasi Bandung (TPI)",
      "Kanim Bandung (TPI) Bandung"
    ]
  },
  {
    "id": "gmap-kanim-bogor-non-tpi",
    "nama": "Kantor Imigrasi Bogor (NON TPI)",
    "shortLabel": "Kantor Imigrasi Bogor (NON TPI)",
    "kota": "Bogor",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Jend. A. Yani No. 65 Bogor 16161",
    "mapsUrl": "https://www.google.com/maps/place/-6.574504536426764,106.80135047310412",
    "aliases": [
      "Kanim Bogor (NON TPI)",
      "Kantor Imigrasi Bogor (NON TPI)",
      "Kanim Bogor (NON TPI) Bogor"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-soekarno-hatta-bandung",
    "nama": "Unit Layanan Paspor Soekarno Hatta Bandung",
    "shortLabel": "Unit Layanan Paspor Soekarno Hatta Bandung",
    "kota": "Bandung",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Soekarno Hatta No.162 Gedung Bina Citra Lt.3 Bandung, Jawa Barat",
    "mapsUrl": "https://www.google.com/maps/place/-6.947791141703399,107.59856274241788",
    "aliases": [
      "UNIT LAYANAN PASPOR SOEKARNO HATTA BANDUNG",
      "UNIT LAYANAN PASPOR SOEKARNO HATTA BANDUNG",
      "UNIT LAYANAN PASPOR SOEKARNO HATTA BANDUNG Bandung"
    ]
  },
  {
    "id": "gmap-kanim-karawang-non-tpi",
    "nama": "Kantor Imigrasi Karawang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Karawang (NON TPI)",
    "kota": "Karawang",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Ahmad Yani No.18, Karawang 41312",
    "mapsUrl": "https://www.google.com/maps/place/-6.300887721118129,107.30344205033333",
    "aliases": [
      "Kanim Karawang (NON TPI)",
      "Kantor Imigrasi Karawang (NON TPI)",
      "Kanim Karawang (NON TPI) Karawang"
    ]
  },
  {
    "id": "gmap-kanim-bekasi-non-tpi",
    "nama": "Kantor Imigrasi Bekasi (NON TPI)",
    "shortLabel": "Kantor Imigrasi Bekasi (NON TPI)",
    "kota": "Bekasi",
    "provinsi": "Jawa Barat",
    "alamat": "Komplek Gor Bekasi Jl. A. Yani No. 2 Kel.Kayuringin Jaya, Kec.Bekasi Barat, Bekasi, Jawa Barat",
    "mapsUrl": "https://www.google.com/maps/place/-6.219504811392926,107.0307823945146",
    "aliases": [
      "Kanim Bekasi (NON TPI)",
      "Kantor Imigrasi Bekasi (NON TPI)",
      "Kanim Bekasi (NON TPI) Bekasi"
    ]
  },
  {
    "id": "gmap-kanim-cirebon-tpi",
    "nama": "Kantor Imigrasi Cirebon (TPI)",
    "shortLabel": "Kantor Imigrasi Cirebon (TPI)",
    "kota": "Cirebon",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Sultan Ageng Tirtayasa No. 51 Rt/Rw.03/04 Kel.Kedungdawa, Kec.Kedawung, Cirebon, Jawa Barat, 45153",
    "mapsUrl": "https://www.google.com/maps/place/-6.72465327792355,108.5216041043019",
    "aliases": [
      "Kanim Cirebon (TPI)",
      "Kantor Imigrasi Cirebon (TPI)",
      "Kanim Cirebon (TPI) Cirebon"
    ]
  },
  {
    "id": "gmap-kanim-depok-non-tpi",
    "nama": "Kantor Imigrasi Depok (NON TPI)",
    "shortLabel": "Kantor Imigrasi Depok (NON TPI)",
    "kota": "Depok",
    "provinsi": "Jawa Barat",
    "alamat": "Jl. Boulevard Raya, Komp. Perkantoran Pemda Depok, Grand Depok City",
    "mapsUrl": "https://www.google.com/maps/place/-6.4225511903049455,106.82716722407939",
    "aliases": [
      "Kanim Depok (NON TPI)",
      "Kantor Imigrasi Depok (NON TPI)",
      "Kanim Depok (NON TPI) Depok"
    ]
  },
  {
    "id": "gmap-kanim-sukabumi-non-tpi",
    "nama": "Kantor Imigrasi Sukabumi (NON TPI)",
    "shortLabel": "Kantor Imigrasi Sukabumi (NON TPI)",
    "kota": "Sukabumi",
    "provinsi": "Jawa Barat",
    "alamat": "JL. LINGKAR SELATAN NO.7 RT/RW.04/01 KEL.SUDAJAYAHILIR, KEC.BAROS, SUKABUMI, JAWA BARAT, 43161",
    "mapsUrl": "https://www.google.com/maps/place/-6.95095089571504,106.92621243751655",
    "aliases": [
      "Kanim Sukabumi (NON TPI)",
      "Kantor Imigrasi Sukabumi (NON TPI)",
      "Kanim Sukabumi (NON TPI) Sukabumi"
    ]
  },
  {
    "id": "gmap-kanim-tasikmalaya-non-tpi",
    "nama": "Kantor Imigrasi Tasikmalaya (NON TPI)",
    "shortLabel": "Kantor Imigrasi Tasikmalaya (NON TPI)",
    "kota": "Tasikmalaya",
    "provinsi": "Jawa Barat",
    "alamat": "JL. LETNAN HARUN, KOTA TASIKMALAYA 46151",
    "mapsUrl": "https://www.google.com/maps/place/-7.303048932877802,108.19455028475046",
    "aliases": [
      "Kanim Tasikmalaya (NON TPI)",
      "Kantor Imigrasi Tasikmalaya (NON TPI)",
      "Kanim Tasikmalaya (NON TPI) Tasikmalaya"
    ]
  },
  {
    "id": "gmap-kanim-cianjur-non-tpi",
    "nama": "Kantor Imigrasi Cianjur (NON TPI)",
    "shortLabel": "Kantor Imigrasi Cianjur (NON TPI)",
    "kota": "Cianjur",
    "provinsi": "Jawa Barat",
    "alamat": "National Rute 3 No.65, Bojong, Karangtengah, Cianjur Regency, West Java 43281",
    "mapsUrl": "https://www.google.com/maps/place/-6.807826942135881,107.15632720801366",
    "aliases": [
      "Kanim Cianjur (NON TPI)",
      "Kantor Imigrasi Cianjur (NON TPI)",
      "Kanim Cianjur (NON TPI) Cianjur"
    ]
  },
  {
    "id": "gmap-kanim-semarang-tpi",
    "nama": "Kantor Imigrasi Semarang (TPI)",
    "shortLabel": "Kantor Imigrasi Semarang (TPI)",
    "kota": "Semarang",
    "provinsi": "Jawa Tengah",
    "alamat": "JL. SILIWANGI NO.514 KRAPYAK RT/RW.01/03 KEL. KEMBANG ARUM, KEC. SEMARANG BARAT, SEMARANG, JAWA TENGAH 50148",
    "mapsUrl": "https://www.google.com/maps/place/-6.984207520283244,110.3765905726342",
    "aliases": [
      "Kanim Semarang (TPI)",
      "Kantor Imigrasi Semarang (TPI)",
      "Kanim Semarang (TPI) Semarang"
    ]
  },
  {
    "id": "gmap-kanim-pati-non-tpi",
    "nama": "Kantor Imigrasi Pati (NON TPI)",
    "shortLabel": "Kantor Imigrasi Pati (NON TPI)",
    "kota": "Pati",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Raya Pati - Kudus KM.7 No.1, Morgorejo, Pati, Jawa Tengah, 59163",
    "mapsUrl": "https://www.google.com/maps/place/-6.7825616270358315,110.98646100986849",
    "aliases": [
      "Kanim Pati (NON TPI)",
      "Kantor Imigrasi Pati (NON TPI)",
      "Kanim Pati (NON TPI) Pati"
    ]
  },
  {
    "id": "gmap-kanim-pemalang-non-tpi",
    "nama": "Kantor Imigrasi Pemalang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Pemalang (NON TPI)",
    "kota": "Pemalang",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Perintis Kemerdekaan No.110 Kel.Taman, Kec.Beji, Pemalang, Jawa Tengah, 52313",
    "mapsUrl": "https://www.google.com/maps/place/-6.893741831634123,109.4243878982348",
    "aliases": [
      "Kanim Pemalang (NON TPI)",
      "Kantor Imigrasi Pemalang (NON TPI)",
      "Kanim Pemalang (NON TPI) Pemalang"
    ]
  },
  {
    "id": "gmap-kanim-surakarta-tpi",
    "nama": "Kantor Imigrasi Surakarta (TPI)",
    "shortLabel": "Kantor Imigrasi Surakarta (TPI)",
    "kota": "Surakarta",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Lapangan Adi Sucipto No. 8 Colomadu Surakarta 57174",
    "mapsUrl": "https://www.google.com/maps/place/-7.544333541930295,110.77477033498585",
    "aliases": [
      "Kanim Surakarta (TPI)",
      "Kantor Imigrasi Surakarta (TPI)",
      "Kanim Surakarta (TPI) Surakarta",
      "Kanim Kelas I TPI Surakarta (Solo)",
      "Kantor Imigrasi Kelas I TPI Surakarta",
      "Kanim Solo",
      "Imigrasi Solo"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-sukoharjo",
    "nama": "Unit Layanan Paspor Sukoharjo",
    "shortLabel": "Unit Layanan Paspor Sukoharjo",
    "kota": "Sukoharjo",
    "provinsi": "Jawa Tengah",
    "alamat": "Jalan Ir Soekarno, kawasan Solo Baru, Grogol, Sukoharjo.",
    "mapsUrl": "https://www.google.com/maps/place/-7.597297033963359,110.81535169453518",
    "aliases": [
      "UNIT LAYANAN PASPOR SUKOHARJO",
      "UNIT LAYANAN PASPOR SUKOHARJO",
      "UNIT LAYANAN PASPOR SUKOHARJO Sukoharjo"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-semarang",
    "nama": "Unit Layanan Paspor Semarang",
    "shortLabel": "Unit Layanan Paspor Semarang",
    "kota": "Semarang",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Taman Majapahit Selatan No.1, Pedurungan Lor, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192",
    "mapsUrl": "https://www.google.com/maps/place/-7.01216712126122,110.48301038103548",
    "aliases": [
      "UNIT LAYANAN PASPOR SEMARANG",
      "UNIT LAYANAN PASPOR SEMARANG",
      "UNIT LAYANAN PASPOR SEMARANG Semarang"
    ]
  },
  {
    "id": "gmap-kanim-cilacap-tpi",
    "nama": "Kantor Imigrasi Cilacap (TPI)",
    "shortLabel": "Kantor Imigrasi Cilacap (TPI)",
    "kota": "Cilacap",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Urip Sumoharjo No.249, Cilacap",
    "mapsUrl": "https://www.google.com/maps/place/-7.685410572934661,109.0450571331532",
    "aliases": [
      "Kanim Cilacap (TPI)",
      "Kantor Imigrasi Cilacap (TPI)",
      "Kanim Cilacap (TPI) Cilacap"
    ]
  },
  {
    "id": "gmap-kanim-wonosobo-non-tpi",
    "nama": "Kantor Imigrasi Wonosobo (NON TPI)",
    "shortLabel": "Kantor Imigrasi Wonosobo (NON TPI)",
    "kota": "Wonosobo",
    "provinsi": "Jawa Tengah",
    "alamat": "Jl. Raya Banyumas Km. 5,5 Selomerto, Wonosobo",
    "mapsUrl": "https://www.google.com/maps/place/-7.407587878217098,109.88777519824276",
    "aliases": [
      "Kanim Wonosobo (NON TPI)",
      "Kantor Imigrasi Wonosobo (NON TPI)",
      "Kanim Wonosobo (NON TPI) Wonosobo"
    ]
  },
  {
    "id": "gmap-kanim-surabaya-tpi",
    "nama": "Kantor Imigrasi Surabaya (TPI)",
    "shortLabel": "Kantor Imigrasi Surabaya (TPI)",
    "kota": "Surabaya",
    "provinsi": "Jawa Timur",
    "alamat": "Jalan Raya Juanda Km.3-4, Sedati-Sidoarjo, Jawa Timur 61253",
    "mapsUrl": "https://www.google.com/maps/place/-7.378920362979712,112.77299938233095",
    "aliases": [
      "Kanim Surabaya (TPI)",
      "Kantor Imigrasi Surabaya (TPI)",
      "Kanim Surabaya (TPI) Surabaya",
      "Kantor Imigrasi Kelas I Khusus TPI Surabaya",
      "Kanim Kelas I Khusus TPI Surabaya",
      "Kantor Imigrasi Kelas I Khusus TPI Juanda",
      "Kanim Kelas I Khusus TPI Juanda",
      "Kanim Juanda",
      "Kantor Imigrasi Juanda",
      "Kantor Imigrasi Surabaya",
      "Kanim Surabaya"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-maspion-square-surabaya",
    "nama": "Unit Layanan Paspor Maspion Square Surabaya",
    "shortLabel": "Unit Layanan Paspor Maspion Square Surabaya",
    "kota": "Surabaya",
    "provinsi": "Jawa Timur",
    "alamat": "Maspion Square, Jl. Ahmad Yani No.73 Surabaya Jl. Frontage Ahmad Yani Siwalankerto No.73, Margorejo, Wonocolo, Kota SBY, Jawa Timur 60238",
    "mapsUrl": "https://www.google.com/maps/place/-7.315612264224204,112.73576780566228",
    "aliases": [
      "UNIT LAYANAN PASPOR MASPION SQUARE SURABAYA",
      "UNIT LAYANAN PASPOR MASPION SQUARE SURABAYA",
      "UNIT LAYANAN PASPOR MASPION SQUARE SURABAYA Surabaya"
    ]
  },
  {
    "id": "gmap-kanim-malang-tpi",
    "nama": "Kantor Imigrasi Malang (TPI)",
    "shortLabel": "Kantor Imigrasi Malang (TPI)",
    "kota": "Malang",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. R. Panji Suroso No. 4 Rt/Rw.01/01 Kel.Polowijen, Kec.Blimbing, Malang, Jawa Timur 65126",
    "mapsUrl": "https://www.google.com/maps/place/-7.931162341702795,112.65007524293739",
    "aliases": [
      "Kanim Malang (TPI)",
      "Kantor Imigrasi Malang (TPI)",
      "Kanim Malang (TPI) Malang"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-perak-tpi",
    "nama": "Kantor Imigrasi Tanjung Perak (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Perak (TPI)",
    "kota": "Surabaya",
    "provinsi": "Jawa Timur",
    "alamat": "JL. RAYA DARMO INDAH NO. 21 KEL/KEC. TANDES, SURABAYA, JAWA TIMUR 60186",
    "mapsUrl": "https://www.google.com/maps/place/-7.259311570186923,112.68399627170285",
    "aliases": [
      "Kanim Tanjung Perak (TPI)",
      "Kantor Imigrasi Tanjung Perak (TPI)",
      "Kanim Tanjung Perak (TPI) Surabaya"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-gresik",
    "nama": "Unit Layanan Paspor Gresik",
    "shortLabel": "Unit Layanan Paspor Gresik",
    "kota": "Gresik",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Raya Gresik – Babat No.1937, Banjarsari, Cerme, Kabupaten Gresik, Jawa Timur 61162 (031) 39924041",
    "mapsUrl": "https://www.google.com/maps/place/-7.170319007641958,112.57991895274016",
    "aliases": [
      "UNIT LAYANAN PASPOR GRESIK",
      "UNIT LAYANAN PASPOR GRESIK",
      "UNIT LAYANAN PASPOR GRESIK Gresik"
    ]
  },
  {
    "id": "gmap-kanim-blitar-non-tpi",
    "nama": "Kantor Imigrasi Blitar (NON TPI)",
    "shortLabel": "Kantor Imigrasi Blitar (NON TPI)",
    "kota": "Blitar",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Raya Mastrip No.45 Rt/Rw.03/01, Kel/Kec. Srengat, Blitar, Jawa Timur 66152",
    "mapsUrl": "https://www.google.com/maps/place/-8.063073913741041,112.07067867363128",
    "aliases": [
      "Kanim Blitar (NON TPI)",
      "Kantor Imigrasi Blitar (NON TPI)",
      "Kanim Blitar (NON TPI) Blitar"
    ]
  },
  {
    "id": "gmap-kanim-jember-tpi",
    "nama": "Kantor Imigrasi Jember (TPI)",
    "shortLabel": "Kantor Imigrasi Jember (TPI)",
    "kota": "Jember",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Letjend. D.I Panjaitan No. 47 Rt/Rw.005/003, Kel/Kec. Sumbersari, Jember, Jawa Timur, 68121",
    "mapsUrl": "https://www.google.com/maps/place/-8.178134074796368,113.70666630246961",
    "aliases": [
      "Kanim Jember (TPI)",
      "Kantor Imigrasi Jember (TPI)",
      "Kanim Jember (TPI) Jember"
    ]
  },
  {
    "id": "gmap-kanim-kediri-non-tpi",
    "nama": "Kantor Imigrasi Kediri (NON TPI)",
    "shortLabel": "Kantor Imigrasi Kediri (NON TPI)",
    "kota": "Kediri",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Ir Sutami No. 16 Kediri",
    "mapsUrl": "https://www.google.com/maps/place/-7.755688524957432,111.95839607126705",
    "aliases": [
      "Kanim Kediri (NON TPI)",
      "Kantor Imigrasi Kediri (NON TPI)",
      "Kanim Kediri (NON TPI) Kediri"
    ]
  },
  {
    "id": "gmap-kanim-madiun-non-tpi",
    "nama": "Kantor Imigrasi Madiun (NON TPI)",
    "shortLabel": "Kantor Imigrasi Madiun (NON TPI)",
    "kota": "Madiun",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Panglima Sudirman Rt/Rw.11/04, Kel. Kaligunting Kec. Mejayan, Madiun, Jawa Timur, 63153",
    "mapsUrl": "https://www.google.com/maps/place/-7.549361184907112,111.67800194057199",
    "aliases": [
      "Kanim Madiun (NON TPI)",
      "Kantor Imigrasi Madiun (NON TPI)",
      "Kanim Madiun (NON TPI) Madiun"
    ]
  },
  {
    "id": "gmap-kanim-ponorogo-non-tpi",
    "nama": "Kantor Imigrasi Ponorogo (NON TPI)",
    "shortLabel": "Kantor Imigrasi Ponorogo (NON TPI)",
    "kota": "Ponorogo",
    "provinsi": "Jawa Timur",
    "alamat": "Jl. Sekar Putih Tim., Tonatan, Kec. Ponorogo, Kabupaten Ponorogo, Jawa Timur 63418",
    "mapsUrl": "https://www.google.com/maps/place/-7.871435470442834,111.49242255431979",
    "aliases": [
      "Kanim Ponorogo (NON TPI)",
      "Kantor Imigrasi Ponorogo (NON TPI)",
      "Kanim Ponorogo (NON TPI) Ponorogo"
    ]
  },
  {
    "id": "gmap-kanim-pamekasan-non-tpi",
    "nama": "Kantor Imigrasi Pamekasan (NON TPI)",
    "shortLabel": "Kantor Imigrasi Pamekasan (NON TPI)",
    "kota": "Pamekasan",
    "provinsi": "Jawa Timur",
    "alamat": "Jl Raya Panglegur, Tlanakan, Pamekasan, Jawa Timur",
    "mapsUrl": "https://www.google.com/maps/place/-7.196656017915067,113.47269098845922",
    "aliases": [
      "Kanim Pamekasan (NON TPI)",
      "Kantor Imigrasi Pamekasan (NON TPI)",
      "Kanim Pamekasan (NON TPI) Pamekasan"
    ]
  },
  {
    "id": "gmap-kanim-pontianak-tpi",
    "nama": "Kantor Imigrasi Pontianak (TPI)",
    "shortLabel": "Kantor Imigrasi Pontianak (TPI)",
    "kota": "Pontianak",
    "provinsi": "Kalimantan Barat",
    "alamat": "Jl. Letjen Sutoyo Pontianak No.122 Rt/Rw.01/02 Kel. Parit Tokaya, Kec. Pontianak Selatan, Pontianak, Kalimantan Barat 78121",
    "mapsUrl": "https://www.google.com/maps/place/-0.0483500791396677,109.34044875634561",
    "aliases": [
      "Kanim Pontianak (TPI)",
      "Kantor Imigrasi Pontianak (TPI)",
      "Kanim Pontianak (TPI) Pontianak"
    ]
  },
  {
    "id": "gmap-kanim-entikong-tpi",
    "nama": "Kantor Imigrasi Entikong (TPI)",
    "shortLabel": "Kantor Imigrasi Entikong (TPI)",
    "kota": "Sanggau",
    "provinsi": "Kalimantan Barat",
    "alamat": "Jl. Raya Entikong, Kec. Entikong Kab. Sanggau Kalimantan Barat",
    "mapsUrl": "https://www.google.com/maps/place/0.9743506811474916,110.35092322700172",
    "aliases": [
      "Kanim Entikong (TPI)",
      "Kantor Imigrasi Entikong (TPI)",
      "Kanim Entikong (TPI) Sanggau"
    ]
  },
  {
    "id": "gmap-kanim-sambas-tpi",
    "nama": "Kantor Imigrasi Sambas (TPI)",
    "shortLabel": "Kantor Imigrasi Sambas (TPI)",
    "kota": "Sambas",
    "provinsi": "Kalimantan Barat",
    "alamat": "JL. SUTAN SYAHRIR NO. 261 RT/RW.10/2 KEL. ILIR KOTA, KEC. KAPUAS, SANGGAU, KALIMANTAN BARAT 78512",
    "mapsUrl": "https://www.google.com/maps/place/0.1260930727422764,110.59733384656482",
    "aliases": [
      "Kanim Sambas (TPI)",
      "Kantor Imigrasi Sambas (TPI)",
      "Kanim Sambas (TPI) Sambas"
    ]
  },
  {
    "id": "gmap-kanim-singkawang-non-tpi",
    "nama": "Kantor Imigrasi Singkawang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Singkawang (NON TPI)",
    "kota": "Singkawang",
    "provinsi": "Kalimantan Barat",
    "alamat": "JL. FIRDAUS H. RAIS NO.31 RT/RW.43/16 KEL. PASIRAN, KEC. SINGKAWANG BARAT, SINGKAWANG, KALIMANTAN BARAT, 79123",
    "mapsUrl": "https://www.google.com/maps/place/0.902129791638906,108.97890930052459",
    "aliases": [
      "Kanim Singkawang (NON TPI)",
      "Kantor Imigrasi Singkawang (NON TPI)",
      "Kanim Singkawang (NON TPI) Singkawang"
    ]
  },
  {
    "id": "gmap-kanim-ketapang-non-tpi",
    "nama": "Kantor Imigrasi Ketapang (NON TPI)",
    "shortLabel": "Kantor Imigrasi Ketapang (NON TPI)",
    "kota": "Ketapang",
    "provinsi": "Kalimantan Barat",
    "alamat": "Jl.gajahmada no.1 Putussibau -Kalimantan Barat",
    "mapsUrl": "https://www.google.com/maps/place/0.8834058400891438,112.92392053863736",
    "aliases": [
      "Kanim Ketapang (NON TPI)",
      "Kantor Imigrasi Ketapang (NON TPI)",
      "Kanim Ketapang (NON TPI) Ketapang"
    ]
  },
  {
    "id": "gmap-kanim-banjarmasin-tpi",
    "nama": "Kantor Imigrasi Banjarmasin (TPI)",
    "shortLabel": "Kantor Imigrasi Banjarmasin (TPI)",
    "kota": "Banjarmasin",
    "provinsi": "Kalimantan Selatan",
    "alamat": "Jl. Jend. A. Yani Km. 5 1/2 Banjarmasin 70249",
    "mapsUrl": "https://www.google.com/maps/place/-3.4436254221094242,114.72056653866424",
    "aliases": [
      "Kanim Banjarmasin (TPI)",
      "Kantor Imigrasi Banjarmasin (TPI)",
      "Kanim Banjarmasin (TPI) Banjarmasin"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-rantau",
    "nama": "Unit Layanan Paspor Rantau",
    "shortLabel": "Unit Layanan Paspor Rantau",
    "kota": "Rantau",
    "provinsi": "Kalimantan Selatan",
    "alamat": "Jl. Jenderal Sudirman, Rangda Malingkung, Kec. Tapin Utara, Kabupaten Tapin, Kalimantan Selatan 71114",
    "mapsUrl": "https://www.google.com/maps/place/-2.934723686420385,115.16978237932175",
    "aliases": [
      "UNIT LAYANAN PASPOR RANTAU",
      "UNIT LAYANAN PASPOR RANTAU",
      "UNIT LAYANAN PASPOR RANTAU Rantau"
    ]
  },
  {
    "id": "gmap-kanim-batulicin-tpi",
    "nama": "Kantor Imigrasi Batulicin (TPI)",
    "shortLabel": "Kantor Imigrasi Batulicin (TPI)",
    "kota": "Batulicin",
    "provinsi": "Kalimantan Selatan",
    "alamat": "Jl. Dharma Praja Gunung Tinggi Kab. Tanah Bumbu, Kalimantan Selatan",
    "mapsUrl": "https://www.google.com/maps/place/-3.509543326721803,115.94574108284715",
    "aliases": [
      "Kanim Batulicin (TPI)",
      "Kantor Imigrasi Batulicin (TPI)",
      "Kanim Batulicin (TPI) Batulicin"
    ]
  },
  {
    "id": "gmap-kanim-palangkaraya-non-tpi",
    "nama": "Kantor Imigrasi Palangkaraya (NON TPI)",
    "shortLabel": "Kantor Imigrasi Palangkaraya (NON TPI)",
    "kota": "Indonesia",
    "provinsi": "Kalimantan Tengah",
    "alamat": "Jl. G. Obos No.10 Rt/Rw.004/015 Kel. Pahandut, Kec. Jekan Raya, Palangkaraya, Kalimantan Tengah 73111",
    "mapsUrl": "https://www.google.com/maps/place/-2.215141977304596,113.91892802937735",
    "aliases": [
      "Kanim Palangkaraya (NON TPI)",
      "Kantor Imigrasi Palangkaraya (NON TPI)",
      "Kanim Palangkaraya (NON TPI) Indonesia"
    ]
  },
  {
    "id": "gmap-kanim-sampit-tpi",
    "nama": "Kantor Imigrasi Sampit (TPI)",
    "shortLabel": "Kantor Imigrasi Sampit (TPI)",
    "kota": "Ketapang",
    "provinsi": "Kalimantan Tengah",
    "alamat": "JL. CILIK RIWUT KM 0.5 RT/RW.021.A/VIII KEL. MENTAWA BARU HULU, KEC. MENTAWA BARU KETAPANG, KOTAWARINGIN TIMUR/SAMPIT, KALIMANTAN TENGAH, 74322",
    "mapsUrl": "https://www.google.com/maps/place/-2.5368266943713333,112.94188810610922",
    "aliases": [
      "Kanim Sampit (TPI)",
      "Kantor Imigrasi Sampit (TPI)",
      "Kanim Sampit (TPI) Ketapang"
    ]
  },
  {
    "id": "gmap-kanim-balikpapan-tpi",
    "nama": "Kantor Imigrasi Balikpapan (TPI)",
    "shortLabel": "Kantor Imigrasi Balikpapan (TPI)",
    "kota": "Balikpapan",
    "provinsi": "Bali",
    "alamat": "Jl.Mulamarwan No.94, Kel. Sepinggan, Kec. Balikpapan Selatan, Balikpapan",
    "mapsUrl": "https://www.google.com/maps/place/-1.277562022990042,116.82609464421282",
    "aliases": [
      "Kanim Balikpapan (TPI)",
      "Kantor Imigrasi Balikpapan (TPI)",
      "Kanim Balikpapan (TPI) Balikpapan"
    ]
  },
  {
    "id": "gmap-kanim-samarinda-tpi",
    "nama": "Kantor Imigrasi Samarinda (TPI)",
    "shortLabel": "Kantor Imigrasi Samarinda (TPI)",
    "kota": "Samarinda",
    "provinsi": "Kalimantan Timur",
    "alamat": "Jl. Ir. H. Juanda No.45 Kel. Air Hitam, Kec. Samarinda Ulu, Samarinda, Kalimantan Timur 75124",
    "mapsUrl": "https://www.google.com/maps/place/-0.4760086433167877,117.13809015955435",
    "aliases": [
      "Kanim Samarinda (TPI)",
      "Kantor Imigrasi Samarinda (TPI)",
      "Kanim Samarinda (TPI) Samarinda"
    ]
  },
  {
    "id": "gmap-kanim-nunukan-tpi",
    "nama": "Kantor Imigrasi Nunukan (TPI)",
    "shortLabel": "Kantor Imigrasi Nunukan (TPI)",
    "kota": "Nunukan",
    "provinsi": "Kalimantan Utara",
    "alamat": "Jl. Ujang Dewa Sedadap Nunukan Selatan, Nunukan 77482",
    "mapsUrl": "https://www.google.com/maps/place/4.0917830241798505,117.70063526376232",
    "aliases": [
      "Kanim Nunukan (TPI)",
      "Kantor Imigrasi Nunukan (TPI)",
      "Kanim Nunukan (TPI) Nunukan"
    ]
  },
  {
    "id": "gmap-kanim-tarakan-tpi",
    "nama": "Kantor Imigrasi Tarakan (TPI)",
    "shortLabel": "Kantor Imigrasi Tarakan (TPI)",
    "kota": "Tarakan",
    "provinsi": "Kalimantan Timur",
    "alamat": "JL. SUMATERA NO.01 RT/RW.15 KEL. PAMUSIAN, KEC. TARAKAN TENGAH, TARAKAN, KALIMANTAN TIMUR, 77131",
    "mapsUrl": "https://www.google.com/maps/place/3.3089103142414746,117.60734093306935",
    "aliases": [
      "Kanim Tarakan (TPI)",
      "Kantor Imigrasi Tarakan (TPI)",
      "Kanim Tarakan (TPI) Tarakan"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-redeb-non-tpi",
    "nama": "Kantor Imigrasi Tanjung Redeb (NON TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Redeb (NON TPI)",
    "kota": "Berau",
    "provinsi": "Kalimantan Timur",
    "alamat": "JL. MANGGA II NO.51 RT/RW.11 KEL. KARANG AMBUN, KEC. TANJUNG REDEB, BERAU, KALIMANTAN TIMUR 77311",
    "mapsUrl": "https://www.google.com/maps/place/2.147375881275644,117.50265085954658",
    "aliases": [
      "Kanim Tanjung Redeb (NON TPI)",
      "Kantor Imigrasi Tanjung Redeb (NON TPI)",
      "Kanim Tanjung Redeb (NON TPI) Berau"
    ]
  },
  {
    "id": "gmap-kanim-bandar-lampung-tpi",
    "nama": "Kantor Imigrasi Bandar Lampung (TPI)",
    "shortLabel": "Kantor Imigrasi Bandar Lampung (TPI)",
    "kota": "Bandar Lampung",
    "provinsi": "Lampung",
    "alamat": "Jl. Hj. Haniah No.3 Cut Mutia Rt/Rw.021/01 Kel. Gulak Galik, Kec. Teluk Betung Utara, Bandar Lampung, Lampung 35214",
    "mapsUrl": "https://www.google.com/maps/place/-5.435640756363731,105.25909204079363",
    "aliases": [
      "Kanim Bandar Lampung (TPI)",
      "Kantor Imigrasi Bandar Lampung (TPI)",
      "Kanim Bandar Lampung (TPI) Bandar Lampung"
    ]
  },
  {
    "id": "gmap-kanim-kalianda-non-tpi",
    "nama": "Kantor Imigrasi Kalianda (Non TPI)",
    "shortLabel": "Kantor Imigrasi Kalianda (Non TPI)",
    "kota": "Kalianda",
    "provinsi": "Lampung",
    "alamat": "Jl. Jalan Radin Intan, Kalianda, Kabupaten Lampung Selatan",
    "mapsUrl": "https://www.google.com/maps/place/-5.685313957606562,105.58164818287193",
    "aliases": [
      "Kanim Kalianda (Non TPI)",
      "Kantor Imigrasi Kalianda (Non TPI)",
      "Kanim Kalianda (Non TPI) Kalianda"
    ]
  },
  {
    "id": "gmap-kanim-kotabumi-non-tpi",
    "nama": "Kantor Imigrasi Kotabumi (Non TPI)",
    "shortLabel": "Kantor Imigrasi Kotabumi (Non TPI)",
    "kota": "Kotabumi",
    "provinsi": "Lampung",
    "alamat": "Jl. Tjokoel Soebroto No.75 Kelapa Tujuh Kotabumi",
    "mapsUrl": "https://www.google.com/maps/place/-4.849117567296962,104.90959079264171",
    "aliases": [
      "Kanim Kotabumi (Non TPI)",
      "Kantor Imigrasi Kotabumi (Non TPI)",
      "Kanim Kotabumi (Non TPI) Kotabumi"
    ]
  },
  {
    "id": "gmap-kanim-ambon-tpi",
    "nama": "Kantor Imigrasi Ambon (TPI)",
    "shortLabel": "Kantor Imigrasi Ambon (TPI)",
    "kota": "Ambon",
    "provinsi": "Maluku",
    "alamat": "Jl. Dr. Kayadoe No.48 A, Kel.Kudamati, Kec. Nusaniwe, Ambon, Maluku, 97118",
    "mapsUrl": "https://www.google.com/maps/place/-3.7076259303875565,128.17090837913864",
    "aliases": [
      "Kanim Ambon (TPI)",
      "Kantor Imigrasi Ambon (TPI)",
      "Kanim Ambon (TPI) Ambon"
    ]
  },
  {
    "id": "gmap-kanim-tual-tpi",
    "nama": "Kantor Imigrasi Tual (TPI)",
    "shortLabel": "Kantor Imigrasi Tual (TPI)",
    "kota": "Tual",
    "provinsi": "Maluku",
    "alamat": "Jl. Jend. Ahcmad Yani, Tual",
    "mapsUrl": "https://www.google.com/maps/place/-5.633738415031651,132.74616990563823",
    "aliases": [
      "Kanim Tual (TPI)",
      "Kantor Imigrasi Tual (TPI)",
      "Kanim Tual (TPI) Tual"
    ]
  },
  {
    "id": "gmap-kanim-ternate-tpi",
    "nama": "Kantor Imigrasi Ternate (TPI)",
    "shortLabel": "Kantor Imigrasi Ternate (TPI)",
    "kota": "Ternate",
    "provinsi": "Maluku Utara",
    "alamat": "JL. SKSD PALAPA NO.338 KEL.KALUMPANG, KEC. TERNATE TENGAH, TERNATE, MALUKU UTARA 97722",
    "mapsUrl": "https://www.google.com/maps/place/0.7904578660989594,127.37987535769399",
    "aliases": [
      "Kanim Ternate (TPI)",
      "Kantor Imigrasi Ternate (TPI)",
      "Kanim Ternate (TPI) Ternate"
    ]
  },
  {
    "id": "gmap-kanim-tobelo-non-tpi",
    "nama": "Kantor Imigrasi Tobelo (Non TPI)",
    "shortLabel": "Kantor Imigrasi Tobelo (Non TPI)",
    "kota": "Tobelo",
    "provinsi": "Maluku Utara",
    "alamat": "JL TERUSAN GALELA/KEMAKMURAN, GORUA SELATAN, TOBELO, MALUT",
    "mapsUrl": "https://www.google.com/maps/place/1.761340964594729,127.98708291165424",
    "aliases": [
      "Kanim Tobelo (Non TPI)",
      "Kantor Imigrasi Tobelo (Non TPI)",
      "Kanim Tobelo (Non TPI) Tobelo",
      "Kantor Imigrasi Kelas II TPI Halmahera Utara"
    ]
  },
  {
    "id": "gmap-kanim-mataram-tpi",
    "nama": "Kantor Imigrasi Mataram (TPI)",
    "shortLabel": "Kantor Imigrasi Mataram (TPI)",
    "kota": "Mataram",
    "provinsi": "Nusa Tenggara Barat",
    "alamat": "JL. UDAYANA NO. 2 MATARAM RT/RW.05 KEL. MONJOK BARAT, KEC. SELAPARANG, MATARAM, NTB 83122",
    "mapsUrl": "https://www.google.com/maps/place/-8.578904603485334,116.1030474233881",
    "aliases": [
      "Kanim Mataram (TPI)",
      "Kantor Imigrasi Mataram (TPI)",
      "Kanim Mataram (TPI) Mataram"
    ]
  },
  {
    "id": "gmap-kanim-sumbawa-besar-tpi",
    "nama": "Kantor Imigrasi Sumbawa Besar (TPI)",
    "shortLabel": "Kantor Imigrasi Sumbawa Besar (TPI)",
    "kota": "Sumbawa Besar",
    "provinsi": "Nusa Tenggara Barat",
    "alamat": "Jl. Bungur No. 13 Sumbawa Besar NTB 84351",
    "mapsUrl": "https://www.google.com/maps/place/-8.474197916024925,117.40436121546153",
    "aliases": [
      "Kanim Sumbawa Besar (TPI)",
      "Kantor Imigrasi Sumbawa Besar (TPI)",
      "Kanim Sumbawa Besar (TPI) Sumbawa Besar"
    ]
  },
  {
    "id": "gmap-kanim-bima-non-tpi",
    "nama": "Kantor Imigrasi Bima (Non TPI)",
    "shortLabel": "Kantor Imigrasi Bima (Non TPI)",
    "kota": "Bima",
    "provinsi": "Nusa Tenggara Barat",
    "alamat": "Jalan pintu Gerbang Istana Bima",
    "mapsUrl": "https://www.google.com/maps/place/-8.260376103227046,119.36649380300713",
    "aliases": [
      "Kanim Bima (Non TPI)",
      "Kantor Imigrasi Bima (Non TPI)",
      "Kanim Bima (Non TPI) Bima"
    ]
  },
  {
    "id": "gmap-kanim-kupang-tpi",
    "nama": "Kantor Imigrasi Kupang (TPI)",
    "shortLabel": "Kantor Imigrasi Kupang (TPI)",
    "kota": "Kupang",
    "provinsi": "Nusa Tenggara Timur",
    "alamat": "Jl. Adi Sucipto, Penfui, Kupang 85119",
    "mapsUrl": "https://www.google.com/maps/place/-10.162656161292873,123.65095299407751",
    "aliases": [
      "Kanim Kupang (TPI)",
      "Kantor Imigrasi Kupang (TPI)",
      "Kanim Kupang (TPI) Kupang"
    ]
  },
  {
    "id": "gmap-kanim-atambua-tpi",
    "nama": "Kantor Imigrasi Atambua (TPI)",
    "shortLabel": "Kantor Imigrasi Atambua (TPI)",
    "kota": "Atambua",
    "provinsi": "Nusa Tenggara Timur",
    "alamat": "Jl. Adi Sucipto No.8 Atambua Rt/Rw.003/001 Kel. Manumutin, Kec. Atambua Barat, Atambua, Nusa Tenggara Timur, 85711",
    "mapsUrl": "https://www.google.com/maps/place/-9.083216322177915,124.89808360754746",
    "aliases": [
      "Kanim Atambua (TPI)",
      "Kantor Imigrasi Atambua (TPI)",
      "Kanim Atambua (TPI) Atambua"
    ]
  },
  {
    "id": "gmap-kanim-maumere-tpi",
    "nama": "Kantor Imigrasi Maumere (TPI)",
    "shortLabel": "Kantor Imigrasi Maumere (TPI)",
    "kota": "Maumere",
    "provinsi": "Nusa Tenggara Timur",
    "alamat": "Jl. Adi Sucipto No.24 Rt/Rw.024/07 Kel. Waioti, Kec. Alok Timur, Sikka, Nusa Tenggara Timur, 86111",
    "mapsUrl": "https://www.google.com/maps/place/-8.632619554922034,122.23610013131396",
    "aliases": [
      "Kanim Maumere (TPI)",
      "Kantor Imigrasi Maumere (TPI)",
      "Kanim Maumere (TPI) Maumere"
    ]
  },
  {
    "id": "gmap-kanim-labuan-bajo-tpi",
    "nama": "Kantor Imigrasi Labuan Bajo (TPI)",
    "shortLabel": "Kantor Imigrasi Labuan Bajo (TPI)",
    "kota": "Labuan Bajo",
    "provinsi": "Nusa Tenggara Timur",
    "alamat": "Jalan Frans Nala, Manggarai Barat",
    "mapsUrl": "https://www.google.com/maps/place/-8.479397983512225,119.89116181596548",
    "aliases": [
      "Kanim Labuan Bajo (TPI)",
      "Kantor Imigrasi Labuan Bajo (TPI)",
      "Kanim Labuan Bajo (TPI) Labuan Bajo"
    ]
  },
  {
    "id": "gmap-kanim-jayapura-tpi",
    "nama": "Kantor Imigrasi Jayapura (TPI)",
    "shortLabel": "Kantor Imigrasi Jayapura (TPI)",
    "kota": "Jayapura",
    "provinsi": "Papua",
    "alamat": "Jl. Percetakan Negara No.15 Rt/Rw.03/Iii, Kel. Gurabesi, Kec. Jayapura Utara, Jayapura, Papua 99111, Alamat Sementara: Jalan Masuk Akademi Pariwisata Kelapa Dua Entrop Kode Pos 99224, Jayapura",
    "mapsUrl": "https://www.google.com/maps/place/-2.5408715045511374,140.70581931195585",
    "aliases": [
      "Kanim Jayapura (TPI)",
      "Kantor Imigrasi Jayapura (TPI)",
      "Kanim Jayapura (TPI) Jayapura"
    ]
  },
  {
    "id": "gmap-kanim-biak-tpi",
    "nama": "Kantor Imigrasi Biak (TPI)",
    "shortLabel": "Kantor Imigrasi Biak (TPI)",
    "kota": "Biak",
    "provinsi": "Papua",
    "alamat": "Jl. Jend. Sudirman No. 1 Biak 98112",
    "mapsUrl": "https://www.google.com/maps/place/-1.156253212271069,136.24720778816456",
    "aliases": [
      "Kanim Biak (TPI)",
      "Kantor Imigrasi Biak (TPI)",
      "Kanim Biak (TPI) Biak"
    ]
  },
  {
    "id": "gmap-kanim-merauke-tpi",
    "nama": "Kantor Imigrasi Merauke (TPI)",
    "shortLabel": "Kantor Imigrasi Merauke (TPI)",
    "kota": "Merauke",
    "provinsi": "Papua Selatan",
    "alamat": "Jl. T.M.P Trikora No.88 Rt/Rw.17/Vi Kel. Mandala, Kec. Merauke, Merauke, Papua 99616",
    "mapsUrl": "https://www.google.com/maps/place/-8.491055301810562,140.4008702361214",
    "aliases": [
      "Kanim Merauke (TPI)",
      "Kantor Imigrasi Merauke (TPI)",
      "Kanim Merauke (TPI) Merauke"
    ]
  },
  {
    "id": "gmap-kanim-mimika-tpi",
    "nama": "Kantor Imigrasi Mimika (TPI)",
    "shortLabel": "Kantor Imigrasi Mimika (TPI)",
    "kota": "Biak",
    "provinsi": "Papua Tengah",
    "alamat": "Jl. Kantor Utama Pt. Freeport Ind. Tembagapura Biak 98100/C.Heatubun NO.1 TIMIKA PAPUA 99910",
    "mapsUrl": "https://www.google.com/maps/place/-4.539722729174989,136.89468998842386",
    "aliases": [
      "Kanim Mimika (TPI)",
      "Kantor Imigrasi Mimika (TPI)",
      "Kanim Mimika (TPI) Biak"
    ]
  },
  {
    "id": "gmap-kanim-manokwari-non-tpi",
    "nama": "Kantor Imigrasi Manokwari (Non TPI)",
    "shortLabel": "Kantor Imigrasi Manokwari (Non TPI)",
    "kota": "Manokwari",
    "provinsi": "Papua Barat",
    "alamat": "Jl. Trikora Logpond Arfai, Manokwari, Papua Barat 98315",
    "mapsUrl": "https://www.google.com/maps/place/-0.927120207030909,134.02507587490243",
    "aliases": [
      "Kanim Manokwari (Non TPI)",
      "Kantor Imigrasi Manokwari (Non TPI)",
      "Kanim Manokwari (Non TPI) Manokwari"
    ]
  },
  {
    "id": "gmap-kanim-sorong-tpi",
    "nama": "Kantor Imigrasi Sorong (TPI)",
    "shortLabel": "Kantor Imigrasi Sorong (TPI)",
    "kota": "Sorong",
    "provinsi": "Papua Barat Daya",
    "alamat": "Jl. Masjid Raya HBM Sorong 98416",
    "mapsUrl": "https://www.google.com/maps/place/-0.8797359579619681,131.28311920980812",
    "aliases": [
      "Kanim Sorong (TPI)",
      "Kantor Imigrasi Sorong (TPI)",
      "Kanim Sorong (TPI) Sorong"
    ]
  },
  {
    "id": "gmap-kanim-pekanbaru-tpi",
    "nama": "Kantor Imigrasi Pekanbaru (TPI)",
    "shortLabel": "Kantor Imigrasi Pekanbaru (TPI)",
    "kota": "Pekanbaru",
    "provinsi": "Riau",
    "alamat": "Jl. Teratai No. 87 Rt/Rw.02/02 Kel. Pulau Karam, Kec. Sukajadi, Pekanbaru, Riau 28127",
    "mapsUrl": "https://www.google.com/maps/place/0.5225103030615771,101.44490140979497",
    "aliases": [
      "Kanim Pekanbaru (TPI)",
      "Kantor Imigrasi Pekanbaru (TPI)",
      "Kanim Pekanbaru (TPI) Pekanbaru"
    ]
  },
  {
    "id": "gmap-kanim-bagan-siapi-api-tpi",
    "nama": "Kantor Imigrasi Bagan Siapi Api (TPI)",
    "shortLabel": "Kantor Imigrasi Bagan Siapi Api (TPI)",
    "kota": "Indonesia",
    "provinsi": "Riau",
    "alamat": "Jl. Gedung Nasional No.78 Rt/Rw.017/005 Kel.Bagan Barat, Kec.Bangko, Bagan Siapi-Api, Riau, 28912",
    "mapsUrl": "https://www.google.com/maps/place/2.1610153098808813,100.80306890743937",
    "aliases": [
      "Kanim Bagan Siapi Api (TPI)",
      "Kantor Imigrasi Bagan Siapi Api (TPI)",
      "Kanim Bagan Siapi Api (TPI) Indonesia"
    ]
  },
  {
    "id": "gmap-kanim-bengkalis-tpi",
    "nama": "Kantor Imigrasi Bengkalis (TPI)",
    "shortLabel": "Kantor Imigrasi Bengkalis (TPI)",
    "kota": "Bengkalis",
    "provinsi": "Indonesia",
    "alamat": "Jl. Jend. A. Yani No. 04 Bengkalis 28712 (Sementara Rehab Jl. Hang Tuah Bengkalis (fax. 0766-22697)",
    "mapsUrl": "https://www.google.com/maps/place/1.4696396071281015,102.11092177118292",
    "aliases": [
      "Kanim Bengkalis (TPI)",
      "Kantor Imigrasi Bengkalis (TPI)",
      "Kanim Bengkalis (TPI) Bengkalis"
    ]
  },
  {
    "id": "gmap-kanim-dumai-tpi",
    "nama": "Kantor Imigrasi Dumai (TPI)",
    "shortLabel": "Kantor Imigrasi Dumai (TPI)",
    "kota": "Dumai",
    "provinsi": "Riau",
    "alamat": "Jl. Yos Sudarso No.2 Rt/Rw.003 Kel. Buluh Asap, Kec. Dumai Timur, Dumai, Riau, 28814",
    "mapsUrl": "https://www.google.com/maps/place/1.6821017036388546,101.45586471957927",
    "aliases": [
      "Kanim Dumai (TPI)",
      "Kantor Imigrasi Dumai (TPI)",
      "Kanim Dumai (TPI) Dumai"
    ]
  },
  {
    "id": "gmap-kanim-selat-panjang-tpi",
    "nama": "Kantor Imigrasi Selat Panjang (TPI)",
    "shortLabel": "Kantor Imigrasi Selat Panjang (TPI)",
    "kota": "Indonesia",
    "provinsi": "Indonesia",
    "alamat": "Jl. Merdeka No. 150 Selat Panjang 28753",
    "mapsUrl": "https://www.google.com/maps/place/1.0128494607013294,102.70973700423484",
    "aliases": [
      "Kanim Selat Panjang (TPI)",
      "Kantor Imigrasi Selat Panjang (TPI)",
      "Kanim Selat Panjang (TPI) Indonesia"
    ]
  },
  {
    "id": "gmap-kanim-siak-tpi",
    "nama": "Kantor Imigrasi Siak (TPI)",
    "shortLabel": "Kantor Imigrasi Siak (TPI)",
    "kota": "Siak",
    "provinsi": "Riau",
    "alamat": "JL. PRAJA SAKTI NO.03 RT/RW.001/005 KEL.TEMBILAHAN HILIR, KEC. TEMBILAHAN, INDRAGIRI HILIR, RIAU, 29213",
    "mapsUrl": "https://www.google.com/maps/place/0.8018514216227935,102.02426658888952",
    "aliases": [
      "Kanim Siak (TPI)",
      "Kantor Imigrasi Siak (TPI)",
      "Kanim Siak (TPI) Siak"
    ]
  },
  {
    "id": "gmap-kanim-tembilahan-tpi",
    "nama": "Kantor Imigrasi Tembilahan (TPI)",
    "shortLabel": "Kantor Imigrasi Tembilahan (TPI)",
    "kota": "Tembilahan",
    "provinsi": "Riau",
    "alamat": "JL. PRAJA SAKTI NO.03 RT/RW.001/005 KEL.TEMBILAHAN HILIR, KEC. TEMBILAHAN, INDRAGIRI HILIR, RIAU, 29213",
    "mapsUrl": "https://www.google.com/maps/place/-0.3216014989954049,103.16429171166075",
    "aliases": [
      "Kanim Tembilahan (TPI)",
      "Kantor Imigrasi Tembilahan (TPI)",
      "Kanim Tembilahan (TPI) Tembilahan"
    ]
  },
  {
    "id": "gmap-kanim-khusus-batam-tpi",
    "nama": "Kantor Imigrasi Khusus Batam (TPI)",
    "shortLabel": "Kantor Imigrasi Khusus Batam (TPI)",
    "kota": "Batam",
    "provinsi": "Kepulauan Riau",
    "alamat": "Jl. Engku Putri No. 3 Batam Centre Rt/Rw. 02/08, Kel. Teluk Tering, Kec. Nongsa, Batam, Kepulauan Riau, 29400",
    "mapsUrl": "https://www.google.com/maps/place/1.1287481079241382,104.0528429900828",
    "aliases": [
      "Kanim Khusus Batam (TPI)",
      "Kantor Imigrasi Khusus Batam (TPI)",
      "Kanim Khusus Batam (TPI) Batam"
    ]
  },
  {
    "id": "gmap-kanim-belakang-padang-tpi",
    "nama": "Kantor Imigrasi Belakang Padang (TPI)",
    "shortLabel": "Kantor Imigrasi Belakang Padang (TPI)",
    "kota": "Padang",
    "provinsi": "Sumatera Barat",
    "alamat": "Jl. Hang Tuah No.1 Kel.Tanjung Sari, Kec.Belakang Padang, Batam, Kepulauan Riau, 29411",
    "mapsUrl": "https://www.google.com/maps/place/1.1530362454334044,103.89369795398248",
    "aliases": [
      "Kanim Belakang Padang (TPI)",
      "Kantor Imigrasi Belakang Padang (TPI)",
      "Kanim Belakang Padang (TPI) Padang"
    ]
  },
  {
    "id": "gmap-kanim-dabo-singkep-non-tpi",
    "nama": "Kantor Imigrasi Dabo Singkep (Non TPI)",
    "shortLabel": "Kantor Imigrasi Dabo Singkep (Non TPI)",
    "kota": "Dabo Singkep",
    "provinsi": "Kepulauan Riau",
    "alamat": "Jl. Kartini, Dabo Singkep-Lingga, Dabo Singkep, Kepulauan Riau",
    "mapsUrl": "https://www.google.com/maps/place/-0.48581970034572614,104.55910189817081",
    "aliases": [
      "Kanim Dabo Singkep (Non TPI)",
      "Kantor Imigrasi Dabo Singkep (Non TPI)",
      "Kanim Dabo Singkep (Non TPI) Dabo Singkep"
    ]
  },
  {
    "id": "gmap-kanim-ranai-tpi",
    "nama": "Kantor Imigrasi Ranai (TPI)",
    "shortLabel": "Kantor Imigrasi Ranai (TPI)",
    "kota": "Ranai",
    "provinsi": "Kepulauan Riau",
    "alamat": "Jl. Datuk Kayu Wan Mohd Benteng, Ranai Natuna, Kepulauan Riau",
    "mapsUrl": "https://www.google.com/maps/place/3.943052316664539,108.3899973981641",
    "aliases": [
      "Kanim Ranai (TPI)",
      "Kantor Imigrasi Ranai (TPI)",
      "Kanim Ranai (TPI) Ranai"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-pinang-tpi",
    "nama": "Kantor Imigrasi Tanjung Pinang (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Pinang (TPI)",
    "kota": "Tanjung Pinang",
    "provinsi": "Kepulauan Riau",
    "alamat": "JL. JENDERAL A.YANI NO. 31 TANJUNGPINANG, KEPULAUAN RIAU, 29124",
    "mapsUrl": "https://www.google.com/maps/place/0.9089646914903927,104.4667716033876",
    "aliases": [
      "Kanim Tanjung Pinang (TPI)",
      "Kantor Imigrasi Tanjung Pinang (TPI)",
      "Kanim Tanjung Pinang (TPI) Tanjung Pinang"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-uban-tpi",
    "nama": "Kantor Imigrasi Tanjung Uban (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Uban (TPI)",
    "kota": "Tanjung Uban",
    "provinsi": "Kepulauan Riau",
    "alamat": "Jl. Indunsuri No. 9 Tg. Uban 29152",
    "mapsUrl": "https://www.google.com/maps/place/1.0617586547738738,104.24022537303907",
    "aliases": [
      "Kanim Tanjung Uban (TPI)",
      "Kantor Imigrasi Tanjung Uban (TPI)",
      "Kanim Tanjung Uban (TPI) Tanjung Uban"
    ]
  },
  {
    "id": "gmap-kanim-tarempa-tpi",
    "nama": "Kantor Imigrasi Tarempa (TPI)",
    "shortLabel": "Kantor Imigrasi Tarempa (TPI)",
    "kota": "Tarempa",
    "provinsi": "Kepulauan Riau",
    "alamat": "JL. KARTINI NO. 51 TAREMPA, KEPULAUAN RIAU 29791",
    "mapsUrl": "https://www.google.com/maps/place/3.216214359400994,106.21840448888686",
    "aliases": [
      "Kanim Tarempa (TPI)",
      "Kantor Imigrasi Tarempa (TPI)",
      "Kanim Tarempa (TPI) Tarempa"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-balai-karimun-tpi",
    "nama": "Kantor Imigrasi Tanjung Balai Karimun (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Balai Karimun (TPI)",
    "kota": "Tanjung Balai",
    "provinsi": "Kepulauan Riau",
    "alamat": "JL. JEND. A. YANI NO. 105 RT/RW. 01/04, KEL. SUNGAI LAKAM, TANJUNG BALAI KARIMUN, KEPULAUAN RIAU, 29631",
    "mapsUrl": "https://www.google.com/maps/place/0.9981517431626622,103.41524737303928",
    "aliases": [
      "Kanim Tanjung Balai Karimun (TPI)",
      "Kantor Imigrasi Tanjung Balai Karimun (TPI)",
      "Kanim Tanjung Balai Karimun (TPI) Tanjung Balai"
    ]
  },
  {
    "id": "gmap-kanim-mamuju-non-tpi",
    "nama": "Kantor Imigrasi Mamuju (Non TPI)",
    "shortLabel": "Kantor Imigrasi Mamuju (Non TPI)",
    "kota": "Mamuju",
    "provinsi": "Sulawesi Barat",
    "alamat": "Jl. H. Abd. Malik Pattana Endeng-Rangas, Mamuju 91511",
    "mapsUrl": "https://www.google.com/maps/place/-2.6618653800343854,118.85492668098432",
    "aliases": [
      "Kanim Mamuju (Non TPI)",
      "Kantor Imigrasi Mamuju (Non TPI)",
      "Kanim Mamuju (Non TPI) Mamuju"
    ]
  },
  {
    "id": "gmap-kanim-polewali-mandar-non-tpi",
    "nama": "Kantor Imigrasi Polewali Mandar (Non TPI)",
    "shortLabel": "Kantor Imigrasi Polewali Mandar (Non TPI)",
    "kota": "Polewali Mandar",
    "provinsi": "Sulawesi Barat",
    "alamat": "Jl. Tritura No. 12, Kel. Madatte, Kec. Polewali, Kab. Polewali Mandar Kode Pos 91315",
    "mapsUrl": "https://www.google.com/maps/place/-3.4063546804240925,119.30994485451363",
    "aliases": [
      "Kanim Polewali Mandar (Non TPI)",
      "Kantor Imigrasi Polewali Mandar (Non TPI)",
      "Kanim Polewali Mandar (Non TPI) Polewali Mandar"
    ]
  },
  {
    "id": "gmap-kanim-makassar-tpi",
    "nama": "Kantor Imigrasi Makassar (TPI)",
    "shortLabel": "Kantor Imigrasi Makassar (TPI)",
    "kota": "Makassar",
    "provinsi": "Sulawesi Selatan",
    "alamat": "Jl. Perintis Kemerdekaan Km.13 Rt/Rw.02/07 Kel. Kapasa, Kec. Tamalanrea, Makassar, Sulawesi Selatan 90243",
    "mapsUrl": "https://www.google.com/maps/place/-5.120830018628355,119.50832369635543",
    "aliases": [
      "Kanim Makassar (TPI)",
      "Kantor Imigrasi Makassar (TPI)",
      "Kanim Makassar (TPI) Makassar"
    ]
  },
  {
    "id": "gmap-unit-layanan-paspor-makassar",
    "nama": "Unit Layanan Paspor Makassar",
    "shortLabel": "Unit Layanan Paspor Makassar",
    "kota": "Makassar",
    "provinsi": "Sulawesi Selatan",
    "alamat": "Komp. Ruko Alauddin Plaza & Townhouse No. 16-17, Jl. Sultan Alauddin, Makasar, Sulawesi Selatan",
    "mapsUrl": "https://www.google.com/maps/place/-5.178076849922424,119.4401658172678",
    "aliases": [
      "UNIT LAYANAN PASPOR MAKASSAR",
      "UNIT LAYANAN PASPOR MAKASSAR",
      "UNIT LAYANAN PASPOR MAKASSAR Makassar"
    ]
  },
  {
    "id": "gmap-kanim-pare-pare-tpi",
    "nama": "Kantor Imigrasi Pare Pare (TPI)",
    "shortLabel": "Kantor Imigrasi Pare Pare (TPI)",
    "kota": "Indonesia",
    "provinsi": "Sulawesi Selatan",
    "alamat": "Jl. Jend. Sudirman No. 87 Pare-pare 91122",
    "mapsUrl": "https://www.google.com/maps/place/-4.032238873139355,119.631819011689",
    "aliases": [
      "Kanim Pare Pare (TPI)",
      "Kantor Imigrasi Pare Pare (TPI)",
      "Kanim Pare Pare (TPI) Indonesia"
    ]
  },
  {
    "id": "gmap-kanim-palopo-non-tpi",
    "nama": "Kantor Imigrasi Palopo (Non TPI)",
    "shortLabel": "Kantor Imigrasi Palopo (Non TPI)",
    "kota": "Palopo",
    "provinsi": "Sulawesi Selatan",
    "alamat": "No. 2,, Jl. Patang II, Tomarundung, Wara Bar., Kota Palopo, Sulawesi Selatan 91913, Indonesia",
    "mapsUrl": "https://www.google.com/maps/place/-2.999387143526815,120.18666835215072",
    "aliases": [
      "Kanim Palopo (Non TPI)",
      "Kantor Imigrasi Palopo (Non TPI)",
      "Kanim Palopo (Non TPI) Palopo"
    ]
  },
  {
    "id": "gmap-kanim-palu-tpi",
    "nama": "Kantor Imigrasi Palu (TPI)",
    "shortLabel": "Kantor Imigrasi Palu (TPI)",
    "kota": "Palu",
    "provinsi": "Sulawesi Tengah",
    "alamat": "JL RA Kartini No 53, Kel. Lolu Selatan, Kec. Palu Selatan, Kota Palu, Sulawesi Tengah",
    "mapsUrl": "https://www.google.com/maps/place/-0.9009021964719328,119.8874123693366",
    "aliases": [
      "Kanim Palu (TPI)",
      "Kantor Imigrasi Palu (TPI)",
      "Kanim Palu (TPI) Palu"
    ]
  },
  {
    "id": "gmap-kanim-banggai-non-tpi",
    "nama": "Kantor Imigrasi Banggai (Non TPI)",
    "shortLabel": "Kantor Imigrasi Banggai (Non TPI)",
    "kota": "Luwuk",
    "provinsi": "Sulawesi Tengah",
    "alamat": "Jalan Bukit Halimun, Kompleks Perkantoran Pemda, Soho, Luwuk, Banggai Regency, Central Sulawesi 94712",
    "mapsUrl": "https://www.google.com/maps/place/-0.997716160252658,122.78981245861651",
    "aliases": [
      "Kanim Banggai (Non TPI)",
      "Kantor Imigrasi Banggai (Non TPI)",
      "Kanim Banggai (Non TPI) Luwuk"
    ]
  },
  {
    "id": "gmap-kanim-kendari-tpi",
    "nama": "Kantor Imigrasi Kendari (TPI)",
    "shortLabel": "Kantor Imigrasi Kendari (TPI)",
    "kota": "Kendari",
    "provinsi": "Sulawesi Tenggara",
    "alamat": "Jl. Jend. Ahmad Yani No.101 Rt/Rw.001/001 Kel. Bonggoeya, Kec. Wua-Wua, Kendari, Sulawesi Tenggara 93117",
    "mapsUrl": "https://www.google.com/maps/place/-4.00276565598692,122.49938083310417",
    "aliases": [
      "Kanim Kendari (TPI)",
      "Kantor Imigrasi Kendari (TPI)",
      "Kanim Kendari (TPI) Kendari"
    ]
  },
  {
    "id": "gmap-kanim-bau-bau-non-tpi",
    "nama": "Kantor Imigrasi Bau-Bau (Non TPI)",
    "shortLabel": "Kantor Imigrasi Bau-Bau (Non TPI)",
    "kota": "Baubau",
    "provinsi": "Sulawesi Tenggara",
    "alamat": "JL. Muh. Husni Thamrin No 32 baubau",
    "mapsUrl": "https://www.google.com/maps/place/-5.50418690077909,122.57628158843545",
    "aliases": [
      "Kanim Bau-Bau (Non TPI)",
      "Kantor Imigrasi Bau-Bau (Non TPI)",
      "Kanim Bau-Bau (Non TPI) Baubau"
    ]
  },
  {
    "id": "gmap-kanim-wakatobi-non-tpi",
    "nama": "Kantor Imigrasi Wakatobi (Non TPI)",
    "shortLabel": "Kantor Imigrasi Wakatobi (Non TPI)",
    "kota": "Wakatobi",
    "provinsi": "Sulawesi Tenggara",
    "alamat": "JL. Adhyaksa No.34 , Desa Numana Kec. Wangi-wangi Selatan, Kab.Wakatobi",
    "mapsUrl": "https://www.google.com/maps/place/-5.352278599631677,123.56059215723796",
    "aliases": [
      "Kanim Wakatobi (Non TPI)",
      "Kantor Imigrasi Wakatobi (Non TPI)",
      "Kanim Wakatobi (Non TPI) Wakatobi"
    ]
  },
  {
    "id": "gmap-kanim-manado-tpi",
    "nama": "Kantor Imigrasi Manado (TPI)",
    "shortLabel": "Kantor Imigrasi Manado (TPI)",
    "kota": "Manado",
    "provinsi": "Sulawesi Utara",
    "alamat": "Jl. 17 Agustus Kel.Teling, Kec.Wanea, Manado, Sulawesi Utara, 95119",
    "mapsUrl": "https://www.google.com/maps/place/1.4674613276503072,124.84616000794429",
    "aliases": [
      "Kanim Manado (TPI)",
      "Kantor Imigrasi Manado (TPI)",
      "Kanim Manado (TPI) Manado"
    ]
  },
  {
    "id": "gmap-kanim-bitung-tpi",
    "nama": "Kantor Imigrasi Bitung (TPI)",
    "shortLabel": "Kantor Imigrasi Bitung (TPI)",
    "kota": "Bitung",
    "provinsi": "Sulawesi Utara",
    "alamat": "Jl. Dr. Sam Ratulangi Rt/Rw.001/002 Kel. Bitung Barat Satu, Kec. Maesa, Bitung, Sulawesi Utara 95511",
    "mapsUrl": "https://www.google.com/maps/place/1.444532427384586,125.18397539074314",
    "aliases": [
      "Kanim Bitung (TPI)",
      "Kantor Imigrasi Bitung (TPI)",
      "Kanim Bitung (TPI) Bitung"
    ]
  },
  {
    "id": "gmap-kanim-tahuna-tpi",
    "nama": "Kantor Imigrasi Tahuna (TPI)",
    "shortLabel": "Kantor Imigrasi Tahuna (TPI)",
    "kota": "Tahuna",
    "provinsi": "Sulawesi Utara",
    "alamat": "Jl. Pelabuhan Tahuna",
    "mapsUrl": "https://www.google.com/maps/place/3.8468230080111527,126.31153951658933",
    "aliases": [
      "Kanim Tahuna (TPI)",
      "Kantor Imigrasi Tahuna (TPI)",
      "Kanim Tahuna (TPI) Tahuna"
    ]
  },
  {
    "id": "gmap-kanim-kotamobagu-tpi",
    "nama": "Kantor Imigrasi Kotamobagu (TPI)",
    "shortLabel": "Kantor Imigrasi Kotamobagu (TPI)",
    "kota": "Kotamobagu",
    "provinsi": "Sulawesi Utara",
    "alamat": "JL. Veteran No 475 Kel. Matali Kec Kotamobagu Timur, Kota Kotamobagu",
    "mapsUrl": "https://www.google.com/maps/place/0.7233583731084923,124.30874077688183",
    "aliases": [
      "Kanim Kotamobagu (TPI)",
      "Kantor Imigrasi Kotamobagu (TPI)",
      "Kanim Kotamobagu (TPI) Kotamobagu"
    ]
  },
  {
    "id": "gmap-kanim-padang-tpi",
    "nama": "Kantor Imigrasi Padang (TPI)",
    "shortLabel": "Kantor Imigrasi Padang (TPI)",
    "kota": "Padang",
    "provinsi": "Sumatera Barat",
    "alamat": "Jl. Khatib Sulaiman No.50 Rt/Rw. 003/007, Kel. Lolong Belati, Kec. Padang Utara, Padang, Sumatera Barat, 25135",
    "mapsUrl": "https://www.google.com/maps/place/-0.9152649046605693,100.36015823257534",
    "aliases": [
      "Kanim Padang (TPI)",
      "Kantor Imigrasi Padang (TPI)",
      "Kanim Padang (TPI) Padang"
    ]
  },
  {
    "id": "gmap-kanim-agam-non-tpi",
    "nama": "Kantor Imigrasi Agam (Non TPI)",
    "shortLabel": "Kantor Imigrasi Agam (Non TPI)",
    "kota": "Bukittinggi",
    "provinsi": "Sumatera Barat",
    "alamat": "Jl. Raya Bukittinggi - Payakumbuh Km.9 Koto Hilalang Kec. Ampek Angkek Kab. Agam, Bukit Tinggi, Sumatera Barat",
    "mapsUrl": "https://www.google.com/maps/place/-0.28764114698586674,100.44671990794998",
    "aliases": [
      "Kanim Agam (Non TPI)",
      "Kantor Imigrasi Agam (Non TPI)",
      "Kanim Agam (Non TPI) Bukittinggi"
    ]
  },
  {
    "id": "gmap-kanim-palembang-tpi",
    "nama": "Kantor Imigrasi Palembang (TPI)",
    "shortLabel": "Kantor Imigrasi Palembang (TPI)",
    "kota": "Palembang",
    "provinsi": "Sumatera Selatan",
    "alamat": "Jl. Pangeran Ratu No.1 Rt/Rw.015/005 Kel. Ulu, Kec. Seberang Ulu I, Palembang, Sumatera Selatan 30252",
    "mapsUrl": "https://www.google.com/maps/place/-3.0118685147438815,104.77499093444584",
    "aliases": [
      "Kanim Palembang (TPI)",
      "Kantor Imigrasi Palembang (TPI)",
      "Kanim Palembang (TPI) Palembang"
    ]
  },
  {
    "id": "gmap-kanim-muara-enim-non-tpi",
    "nama": "Kantor Imigrasi Muara Enim (Non TPI)",
    "shortLabel": "Kantor Imigrasi Muara Enim (Non TPI)",
    "kota": "Muara Enim",
    "provinsi": "Sumatera Selatan",
    "alamat": "Jl. Dr. A.K. Ghani Muara Enim",
    "mapsUrl": "https://www.google.com/maps/place/-3.6449395394018866,103.77781161725075",
    "aliases": [
      "Kanim Muara Enim (Non TPI)",
      "Kantor Imigrasi Muara Enim (Non TPI)",
      "Kanim Muara Enim (Non TPI) Muara Enim"
    ]
  },
  {
    "id": "gmap-kanim-khusus-medan-tpi",
    "nama": "Kantor Imigrasi Khusus Medan (TPI)",
    "shortLabel": "Kantor Imigrasi Khusus Medan (TPI)",
    "kota": "Medan",
    "provinsi": "Sumatera Utara",
    "alamat": "JL. GATOT SUBROTO NO.268A MEDAN 20123",
    "mapsUrl": "https://www.google.com/maps/place/3.5958450223871874,98.65227286435392",
    "aliases": [
      "Kanim Khusus Medan (TPI)",
      "Kantor Imigrasi Khusus Medan (TPI)",
      "Kanim Khusus Medan (TPI) Medan",
      "Kantor Imigrasi Kelas I Khusus TPI Medan",
      "Kanim Kelas I Khusus TPI Medan"
    ]
  },
  {
    "id": "gmap-kanim-polonia-tpi",
    "nama": "Kantor Imigrasi Polonia (TPI)",
    "shortLabel": "Kantor Imigrasi Polonia (TPI)",
    "kota": "Medan",
    "provinsi": "Sumatera Utara",
    "alamat": "Jl. Mangkubumi No. 2 Rt/Rw. 001/009, Kel. Aur, Kec. Medan Maimun, Medan, Sumatera Utara 20151",
    "mapsUrl": "https://www.google.com/maps/place/3.58425933193078,98.6794758349249",
    "aliases": [
      "Kanim Polonia (TPI)",
      "Kantor Imigrasi Polonia (TPI)",
      "Kanim Polonia (TPI) Medan",
      "Kantor Imigrasi Kelas I TPI Polonia",
      "Kantor Imigrasi Kelas I Non TPI Medan",
      "Kanim Medan"
    ]
  },
  {
    "id": "gmap-kanim-belawan-tpi",
    "nama": "Kantor Imigrasi Belawan (TPI)",
    "shortLabel": "Kantor Imigrasi Belawan (TPI)",
    "kota": "Medan",
    "provinsi": "Sumatera Utara",
    "alamat": "Jl. Serma Hanafiah No.1, Kel. Belawan I, Kec. Medan Belawan, Medan, Sumatera Utara 20411",
    "mapsUrl": "https://www.google.com/maps/place/3.782747221842319,98.6830528270004",
    "aliases": [
      "Kanim Belawan (TPI)",
      "Kantor Imigrasi Belawan (TPI)",
      "Kanim Belawan (TPI) Medan"
    ]
  },
  {
    "id": "gmap-kanim-pematang-siantar-non-tpi",
    "nama": "Kantor Imigrasi Pematang Siantar (Non TPI)",
    "shortLabel": "Kantor Imigrasi Pematang Siantar (Non TPI)",
    "kota": "Pematang Siantar",
    "provinsi": "Sumatera Utara",
    "alamat": "Jl. Raya Medan Km. 11,5 Pematang Siantar, 21154",
    "mapsUrl": "https://www.google.com/maps/place/3.041159953815759,99.08915739546178",
    "aliases": [
      "Kanim Pematang Siantar (Non TPI)",
      "Kantor Imigrasi Pematang Siantar (Non TPI)",
      "Kanim Pematang Siantar (Non TPI) Medan"
    ]
  },
  {
    "id": "gmap-kanim-sibolga-tpi",
    "nama": "Kantor Imigrasi Sibolga (TPI)",
    "shortLabel": "Kantor Imigrasi Sibolga (TPI)",
    "kota": "Sibolga",
    "provinsi": "Sumatera Utara",
    "alamat": "JL. SISINGAMANGARAJA NO. 477 LINGKUNGAN 3, KEL. AEK PAROMBUNAN, KEC.SIBOLGA SELATAN, SIBOLGA, SUMATERA UTARA, 22533",
    "mapsUrl": "https://www.google.com/maps/place/1.7277974743018054,98.80082265583661",
    "aliases": [
      "Kanim Sibolga (TPI)",
      "Kantor Imigrasi Sibolga (TPI)",
      "Kanim Sibolga (TPI) Sibolga"
    ]
  },
  {
    "id": "gmap-kanim-tanjung-balai-asahan-tpi",
    "nama": "Kantor Imigrasi Tanjung Balai Asahan (TPI)",
    "shortLabel": "Kantor Imigrasi Tanjung Balai Asahan (TPI)",
    "kota": "Tanjung Balai",
    "provinsi": "Sumatera Utara",
    "alamat": "Jl. Jend. Sudirman Km 4,5 Tg. B. Asahan 21369",
    "mapsUrl": "https://www.google.com/maps/place/2.949877382816057,99.78077044508836",
    "aliases": [
      "Kanim Tanjung Balai Asahan (TPI)",
      "Kantor Imigrasi Tanjung Balai Asahan (TPI)",
      "Kanim Tanjung Balai Asahan (TPI) Tanjung Balai"
    ]
  },
  {
    "id": "gmap-kanim-khusus-kualanamu-tpi",
    "nama": "Kantor Imigrasi Kelas I Khusus TPI Kualanamu",
    "shortLabel": "Kantor Imigrasi Khusus Kualanamu (TPI)",
    "kota": "Deli Serdang",
    "provinsi": "Sumatera Utara",
    "alamat": "Kompleks Bandara Internasional Kualanamu, Jl. Bandara Kuala Namu, Beringin, Kec. Beringin, Kabupaten Deli Serdang, Sumatera Utara 20553",
    "mapsUrl": "https://www.google.com/maps/place/3.6394548,98.8787752",
    "aliases": [
      "Kanim Kualanamu",
      "Kantor Imigrasi Kualanamu",
      "Kanim Khusus Kualanamu",
      "Kantor Imigrasi Kelas I Khusus TPI Kualanamu",
      "Kanim Deli Serdang"
    ]
  },
  {
    "id": "mpp-siola-sub",
    "nama": "Mal Pelayanan Publik (MPP) Siola Surabaya",
    "shortLabel": "MPP Siola Surabaya",
    "kota": "Surabaya",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Siola"
    ]
  },
  {
    "id": "mpp-sda",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Sidoarjo",
    "shortLabel": "MPP Kab. Sidoarjo",
    "kota": "Sidoarjo",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Sidoarjo"
    ]
  },
  {
    "id": "mpp-gresik",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Gresik",
    "shortLabel": "MPP Kab. Gresik",
    "kota": "Gresik",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Gresik"
    ]
  },
  {
    "id": "mpp-mojokerto",
    "nama": "Mal Pelayanan Publik (MPP) Gajah Mada Kota Mojokerto",
    "shortLabel": "MPP Kota Mojokerto",
    "kota": "Mojokerto",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Mojokerto"
    ]
  },
  {
    "id": "mpp-pasuruan",
    "nama": "Mal Pelayanan Publik (MPP) Maslahat Kab. Pasuruan",
    "shortLabel": "MPP Kab. Pasuruan",
    "kota": "Pasuruan",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Pasuruan"
    ]
  },
  {
    "id": "mpp-banyuwangi",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Banyuwangi",
    "shortLabel": "MPP Kab. Banyuwangi",
    "kota": "Banyuwangi",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Banyuwangi"
    ]
  },
  {
    "id": "mpp-tuban",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Tuban",
    "shortLabel": "MPP Kab. Tuban",
    "kota": "Tuban",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Tuban"
    ]
  },
  {
    "id": "mpp-bojonegoro",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Bojonegoro",
    "shortLabel": "MPP Kab. Bojonegoro",
    "kota": "Bojonegoro",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Bojonegoro"
    ]
  },
  {
    "id": "mpp-lamongan",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Lamongan",
    "shortLabel": "MPP Kab. Lamongan",
    "kota": "Lamongan",
    "provinsi": "Jawa Timur",
    "aliases": [
      "MPP Lamongan"
    ]
  },
  {
    "id": "mpp-dki",
    "nama": "Mal Pelayanan Publik (MPP) Provinsi DKI Jakarta",
    "shortLabel": "MPP DKI Jakarta (Kuningan)",
    "kota": "Jakarta Selatan",
    "provinsi": "DKI Jakarta",
    "aliases": [
      "MPP DKI Jakarta"
    ]
  },
  {
    "id": "mpp-bks",
    "nama": "Mal Pelayanan Publik (MPP) Kota Bekasi",
    "shortLabel": "MPP Kota Bekasi",
    "kota": "Bekasi",
    "provinsi": "Jawa Barat",
    "aliases": [
      "MPP Bekasi"
    ]
  },
  {
    "id": "mpp-bgr",
    "nama": "Mal Pelayanan Publik (MPP) Grha Tiyasa Kota Bogor",
    "shortLabel": "MPP Kota Bogor",
    "kota": "Bogor",
    "provinsi": "Jawa Barat",
    "aliases": [
      "MPP Bogor"
    ]
  },
  {
    "id": "mpp-dpk",
    "nama": "Mal Pelayanan Publik (MPP) Kota Depok",
    "shortLabel": "MPP Kota Depok",
    "kota": "Depok",
    "provinsi": "Jawa Barat",
    "aliases": [
      "MPP Depok"
    ]
  },
  {
    "id": "mpp-tangsel",
    "nama": "Mal Pelayanan Publik (MPP) Kota Tangerang Selatan",
    "shortLabel": "MPP Tangerang Selatan",
    "kota": "Tangerang Selatan",
    "provinsi": "Banten",
    "aliases": [
      "MPP Tangsel"
    ]
  },
  {
    "id": "mpp-bdg",
    "nama": "Mal Pelayanan Publik (MPP) Kota Bandung",
    "shortLabel": "MPP Kota Bandung",
    "kota": "Bandung",
    "provinsi": "Jawa Barat",
    "aliases": [
      "MPP Bandung"
    ]
  },
  {
    "id": "mpp-smg",
    "nama": "Mal Pelayanan Publik (MPP) Kota Semarang",
    "shortLabel": "MPP Kota Semarang",
    "kota": "Semarang",
    "provinsi": "Jawa Tengah",
    "aliases": [
      "MPP Semarang"
    ]
  },
  {
    "id": "mpp-slo",
    "nama": "Mal Pelayanan Publik (MPP) Jenderal Sudirman Surakarta",
    "shortLabel": "MPP Kota Surakarta",
    "kota": "Surakarta",
    "provinsi": "Jawa Tengah",
    "aliases": [
      "MPP Surakarta"
    ]
  },
  {
    "id": "mpp-bms",
    "nama": "Mal Pelayanan Publik (MPP) Kab. Banyumas (Purwokerto)",
    "shortLabel": "MPP Kab. Banyumas",
    "kota": "Purwokerto",
    "provinsi": "Jawa Tengah",
    "aliases": [
      "MPP Banyumas",
      "MPP Purwokerto"
    ]
  }
];

/**
 * Filter and search Kantor Imigrasi with relevance ranking.
 * Mendukung pencarian berdasarkan nama lengkap, kota, provinsi, alias, dan alamat fisik.
 */
export function searchKantorImigrasi(
  query: string,
  customList?: KantorImigrasiItem[]
): KantorImigrasiItem[] {
  const list = customList && customList.length > 0 ? customList : getStoredKantorImigrasiList();
  if (!query || !query.trim()) return list;

  const q = query.trim().toLowerCase();
  const qTerms = q.split(/\s+/);

  const matched = list.filter((item) => {
    const aliasStr = item.aliases && item.aliases.length > 0 ? ` ${item.aliases.join(" ")}` : "";
    const alamatStr = item.alamat ? ` ${item.alamat}` : "";
    const target = `${item.nama} ${item.shortLabel} ${item.kota} ${item.provinsi}${aliasStr}${alamatStr}`
      .toLowerCase()
      .replace(/[-_]/g, " ");
    return qTerms.every((term) => target.includes(term));
  });

  return matched
    .map((item) => {
      let score = 0;
      const kotaLower = item.kota.toLowerCase().trim();
      const namaLower = item.nama.toLowerCase().trim();
      const labelLower = item.shortLabel.toLowerCase().trim();

      if (kotaLower === q) score += 1000;
      else if (kotaLower.startsWith(q)) score += 600;
      else if (new RegExp(`\\b${q}\\b`, "i").test(kotaLower)) score += 500;

      if (namaLower === q || labelLower === q) score += 900;
      else if (namaLower.startsWith(q) || labelLower.startsWith(q)) score += 400;
      else if (new RegExp(`\\b${q}\\b`, "i").test(namaLower) || new RegExp(`\\b${q}\\b`, "i").test(labelLower)) {
        score += 350;
      } else if (namaLower.includes(q)) {
        score += 100;
      }

      if (item.aliases && item.aliases.some((a) => a.toLowerCase().trim() === q)) {
        score += 850;
      } else if (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(q))) {
        score += 250;
      }

      // Prioritas Kantor Imigrasi utama dibandingkan titik layanan perbantuan ULP / MPP
      const isPrimaryKanim =
        namaLower.startsWith("kantor imigrasi") || labelLower.startsWith("kantor imigrasi");
      if (isPrimaryKanim) {
        score += 150;
      }

      if (item.alamat && item.alamat.toLowerCase().includes(q)) {
        score += 80;
      }

      if (item.provinsi.toLowerCase().trim() === q) score += 50;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

export const KANIM_STORAGE_KEY = "vtu_kantor_imigrasi_cache_v2";
export const KANIM_LAST_SYNC_STORAGE_KEY = "vtu_kantor_imigrasi_last_sync_v2";

/**
 * Mengecek apakah cache Kantor Imigrasi di browser sudah melewati batas 10 hari
 * dan perlu diperbarui dari server / referensi resmi.
 */
export function shouldSyncKantorImigrasi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const lastSync = localStorage.getItem(KANIM_LAST_SYNC_STORAGE_KEY);
    if (!lastSync) return true;
    const lastSyncTime = parseInt(lastSync, 10);
    if (isNaN(lastSyncTime) || Date.now() - lastSyncTime > KANIM_SYNC_INTERVAL_MS) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Mencatat timestamp keberhasilan sinkronisasi berkala 10 hari ke localStorage.
 */
export function recordKantorImigrasiSyncSuccess(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KANIM_LAST_SYNC_STORAGE_KEY, Date.now().toString());
    } catch {}
  }
}

/**
 * Load list of Kantor Imigrasi from localStorage + initial defaults
 */
export function getStoredKantorImigrasiList(): KantorImigrasiItem[] {
  if (typeof window === "undefined") return DAFTAR_KANTOR_IMIGRASI;
  try {
    const raw = localStorage.getItem(KANIM_STORAGE_KEY);
    if (!raw) return DAFTAR_KANTOR_IMIGRASI;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const map = new Map<string, KantorImigrasiItem>();
      // Base defaults from authoritative Google Maps list
      DAFTAR_KANTOR_IMIGRASI.forEach((k) => map.set(k.nama.toLowerCase().trim(), k));

      parsed.forEach((k: KantorImigrasiItem) => {
        // Abaikan entri malang palsu jika ada
        if (k?.nama && !(k.id !== "kanim-mlg" && k.nama.toLowerCase().trim() === "malang")) {
          // Hanya timpa jika kustom, entri resmi Google Maps tetap diprioritaskan
          if (k.id?.startsWith("kanim-custom-")) {
            map.set(k.nama.toLowerCase().trim(), k);
          }
        }
      });
      const result = Array.from(map.values());
      return result;
    }
  } catch (err) {
    console.warn("Failed to load stored kanim list:", err);
  }
  return DAFTAR_KANTOR_IMIGRASI;
}

/**
 * Memeriksa apakah suatu item Kantor Imigrasi merupakan item kustom (bukan bawaan resmi Google Maps)
 */
export function isCustomKantorImigrasi(itemOrId: KantorImigrasiItem | string): boolean {
  const id = typeof itemOrId === "string" ? itemOrId : itemOrId.id;
  const nama = typeof itemOrId === "string" ? "" : itemOrId.nama;

  if (id.startsWith("kanim-custom-")) return true;
  return !DAFTAR_KANTOR_IMIGRASI.some(
    (k) =>
      k.id === id ||
      (nama && k.nama.toLowerCase().trim() === nama.toLowerCase().trim()) ||
      (nama && k.shortLabel.toLowerCase().trim() === nama.toLowerCase().trim()) ||
      (nama && k.aliases && k.aliases.some((a) => a.toLowerCase().trim() === nama.toLowerCase().trim()))
  );
}

/**
 * Mengambil nama kota otomatis dari nama Kantor Imigrasi yang dipilih (VLOOKUP ke database & direktori)
 * Mendukung pencarian via nama resmi lengkap, alias terdahulu, maupun nama kota.
 */
export function getKotaFromKanimName(kanimName: string, customList?: KantorImigrasiItem[]): string {
  if (!kanimName || !kanimName.trim()) return "";
  const list = customList && customList.length > 0 ? customList : getStoredKantorImigrasiList();
  const clean = kanimName.toLowerCase().trim();

  // 1. Exact match by nama, shortLabel (Google Maps name), or aliases
  const exact = list.find(
    (k) =>
      k.nama.toLowerCase().trim() === clean ||
      k.shortLabel.toLowerCase().trim() === clean ||
      (k.aliases && k.aliases.some((a) => a.toLowerCase().trim() === clean))
  );
  if (exact) return exact.kota;

  // 2. Partial match: if kanimName contains the item's full name, shortLabel, or aliases
  const partial = list.find(
    (k) =>
      clean.includes(k.nama.toLowerCase().trim()) ||
      clean.includes(k.shortLabel.toLowerCase().trim()) ||
      k.nama.toLowerCase().trim().includes(clean) ||
      (k.aliases && k.aliases.some((a) => clean.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(clean)))
  );
  if (partial) return partial.kota;

  // 3. Check if kanimName mentions any known kota in the directory
  for (const item of list) {
    if (item.kota && clean.includes(item.kota.toLowerCase().trim())) {
      return item.kota;
    }
  }

  // 4. Heuristic: extract location name from commonly used suffixes
  const cleanedText = kanimName.replace(
    /Kantor|Imigrasi|Kelas|Khusus|Non|TPI|Unit|Layanan|Paspor|ULP|MPP|Mal|Pelayanan|Publik|Kab\.|Kota|I|II|III/gi,
    " "
  ).trim();
  const words = cleanedText.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 0) {
    const candidate = words[words.length - 1];
    if (candidate) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  return "";
}

/**
 * Saves a new custom Kantor Imigrasi to localStorage and sends it to the database via API.
 */
export async function saveNewKantorImigrasi(newKanim: {
  nama: string;
  kota?: string;
  provinsi?: string;
}): Promise<KantorImigrasiItem> {
  const cleanNama = newKanim.nama.trim();
  const currentList = getStoredKantorImigrasiList();

  const existing = currentList.find(
    (k) =>
      k.nama.toLowerCase().trim() === cleanNama.toLowerCase() ||
      k.shortLabel.toLowerCase().trim() === cleanNama.toLowerCase() ||
      (k.aliases && k.aliases.some((a) => a.toLowerCase().trim() === cleanNama.toLowerCase()))
  );
  if (existing) return existing;

  const item: KantorImigrasiItem = {
    id: `kanim-custom-${Date.now()}`,
    nama: cleanNama,
    shortLabel: cleanNama,
    kota: newKanim.kota?.trim() || "Di Tempat",
    provinsi: newKanim.provinsi?.trim() || "Indonesia",
  };

  const updatedList = [item, ...currentList];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KANIM_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}
  }

  // Persist to backend database asynchronously
  try {
    fetch("/api/master/kantor-imigrasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch(() => {});
  } catch {}

  return item;
}

/**
 * Menghapus item Kantor Imigrasi kustom dari localStorage dan database backend.
 */
export async function deleteCustomKantorImigrasi(idOrNama: string): Promise<boolean> {
  if (!idOrNama) return false;
  const cleanTarget = idOrNama.trim().toLowerCase();

  // Pastikan bukan bawaan resmi Google Maps
  const isBuiltIn = DAFTAR_KANTOR_IMIGRASI.some(
    (k) =>
      k.id === idOrNama ||
      k.nama.toLowerCase().trim() === cleanTarget ||
      k.shortLabel.toLowerCase().trim() === cleanTarget ||
      (k.aliases && k.aliases.some((a) => a.toLowerCase().trim() === cleanTarget))
  );
  if (isBuiltIn && idOrNama !== "kanim-custom-malang" && cleanTarget !== "malang") {
    console.warn("Tidak dapat menghapus kantor imigrasi bawaan resmi Google Maps.");
    return false;
  }

  const currentList = getStoredKantorImigrasiList();
  const filtered = currentList.filter(
    (k) => k.id !== idOrNama && k.nama.toLowerCase().trim() !== cleanTarget
  );

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KANIM_STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
  }

  // Sync delete to backend database
  try {
    fetch(`/api/master/kantor-imigrasi?id=${encodeURIComponent(idOrNama)}`, {
      method: "DELETE",
    }).catch(() => {});
  } catch {}

  return true;
}
