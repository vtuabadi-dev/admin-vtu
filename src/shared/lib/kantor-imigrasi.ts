/**
 * Direktori Lengkap Kantor Imigrasi (Kanim), Unit Layanan Paspor (ULP),
 * dan Mal Pelayanan Publik (MPP) se-Indonesia.
 * Digunakan untuk dropdown isian form pembuatan surat rekomendasi paspor umroh / dokumen keimigrasian.
 */

export interface KantorImigrasiItem {
  id: string;
  nama: string;           // Nama resmi (cth: "Kantor Imigrasi Kelas I Khusus TPI Surabaya")
  shortLabel: string;     // Label ringkas (cth: "Kanim Kelas I Khusus TPI Surabaya")
  kota: string;           // Kota / Kabupaten lokasi (cth: "Surabaya")
  provinsi: string;       // Provinsi
}

export const DAFTAR_KANTOR_IMIGRASI: KantorImigrasiItem[] = [
  // ── JAWA TIMUR ──
  { id: "kanim-sub-khusus", nama: "Kantor Imigrasi Kelas I Khusus TPI Surabaya", shortLabel: "Kanim Kelas I Khusus TPI Surabaya", kota: "Surabaya", provinsi: "Jawa Timur" },
  { id: "kanim-tg-perak", nama: "Kantor Imigrasi Kelas I TPI Tanjung Perak", shortLabel: "Kanim Kelas I TPI Tanjung Perak", kota: "Surabaya", provinsi: "Jawa Timur" },
  { id: "kanim-sda", nama: "Kantor Imigrasi Kelas II Non TPI Sidoarjo", shortLabel: "Kanim Kelas II Non TPI Sidoarjo", kota: "Sidoarjo", provinsi: "Jawa Timur" },
  { id: "kanim-mlg", nama: "Kantor Imigrasi Kelas II TPI Malang", shortLabel: "Kanim Kelas II TPI Malang", kota: "Malang", provinsi: "Jawa Timur" },
  { id: "kanim-kdr", nama: "Kantor Imigrasi Kelas II TPI Kediri", shortLabel: "Kanim Kelas II TPI Kediri", kota: "Kediri", provinsi: "Jawa Timur" },
  { id: "kanim-blt", nama: "Kantor Imigrasi Kelas II Non TPI Blitar", shortLabel: "Kanim Kelas II Non TPI Blitar", kota: "Blitar", provinsi: "Jawa Timur" },
  { id: "kanim-mdn", nama: "Kantor Imigrasi Kelas II Non TPI Madiun", shortLabel: "Kanim Kelas II Non TPI Madiun", kota: "Madiun", provinsi: "Jawa Timur" },
  { id: "kanim-pgo", nama: "Kantor Imigrasi Kelas II Non TPI Ponorogo", shortLabel: "Kanim Kelas II Non TPI Ponorogo", kota: "Ponorogo", provinsi: "Jawa Timur" },
  { id: "kanim-jmr", nama: "Kantor Imigrasi Kelas II Non TPI Jember", shortLabel: "Kanim Kelas II Non TPI Jember", kota: "Jember", provinsi: "Jawa Timur" },
  { id: "kanim-pmk", nama: "Kantor Imigrasi Kelas II Non TPI Pamekasan", shortLabel: "Kanim Kelas II Non TPI Pamekasan", kota: "Pamekasan", provinsi: "Jawa Timur" },
  { id: "ulp-bgj-sub", nama: "Unit Layanan Paspor (ULP) BG Junction Surabaya", shortLabel: "ULP BG Junction Surabaya", kota: "Surabaya", provinsi: "Jawa Timur" },
  { id: "ulp-atom-sub", nama: "Unit Layanan Paspor (ULP) Pasar Atom Surabaya", shortLabel: "ULP Pasar Atom Surabaya", kota: "Surabaya", provinsi: "Jawa Timur" },
  { id: "mpp-siola-sub", nama: "Mal Pelayanan Publik (MPP) Siola Surabaya", shortLabel: "MPP Siola Surabaya", kota: "Surabaya", provinsi: "Jawa Timur" },
  { id: "mpp-sda", nama: "Mal Pelayanan Publik (MPP) Kab. Sidoarjo", shortLabel: "MPP Kab. Sidoarjo", kota: "Sidoarjo", provinsi: "Jawa Timur" },
  { id: "mpp-gresik", nama: "Mal Pelayanan Publik (MPP) Kab. Gresik", shortLabel: "MPP Kab. Gresik", kota: "Gresik", provinsi: "Jawa Timur" },
  { id: "mpp-mojokerto", nama: "Mal Pelayanan Publik (MPP) Gajah Mada Kota Mojokerto", shortLabel: "MPP Kota Mojokerto", kota: "Mojokerto", provinsi: "Jawa Timur" },
  { id: "mpp-pasuruan", nama: "Mal Pelayanan Publik (MPP) Maslahat Kab. Pasuruan", shortLabel: "MPP Kab. Pasuruan", kota: "Pasuruan", provinsi: "Jawa Timur" },
  { id: "mpp-banyuwangi", nama: "Mal Pelayanan Publik (MPP) Kab. Banyuwangi", shortLabel: "MPP Kab. Banyuwangi", kota: "Banyuwangi", provinsi: "Jawa Timur" },
  { id: "mpp-tuban", nama: "Mal Pelayanan Publik (MPP) Kab. Tuban", shortLabel: "MPP Kab. Tuban", kota: "Tuban", provinsi: "Jawa Timur" },
  { id: "mpp-bojonegoro", nama: "Mal Pelayanan Publik (MPP) Kab. Bojonegoro", shortLabel: "MPP Kab. Bojonegoro", kota: "Bojonegoro", provinsi: "Jawa Timur" },
  { id: "mpp-lamongan", nama: "Mal Pelayanan Publik (MPP) Kab. Lamongan", shortLabel: "MPP Kab. Lamongan", kota: "Lamongan", provinsi: "Jawa Timur" },

  // ── DKI JAKARTA & BODETABEK ──
  { id: "kanim-jaksel", nama: "Kantor Imigrasi Kelas I Khusus Non TPI Jakarta Selatan", shortLabel: "Kanim Kelas I Khusus Non TPI Jakarta Selatan", kota: "Jakarta Selatan", provinsi: "DKI Jakarta" },
  { id: "kanim-jakbar", nama: "Kantor Imigrasi Kelas I Khusus Non TPI Jakarta Barat", shortLabel: "Kanim Kelas I Khusus Non TPI Jakarta Barat", kota: "Jakarta Barat", provinsi: "DKI Jakarta" },
  { id: "kanim-soetta", nama: "Kantor Imigrasi Kelas I Khusus TPI Soekarno-Hatta", shortLabel: "Kanim Kelas I Khusus TPI Soekarno-Hatta", kota: "Tangerang", provinsi: "Banten" },
  { id: "kanim-jakpus", nama: "Kantor Imigrasi Kelas I TPI Jakarta Pusat", shortLabel: "Kanim Kelas I TPI Jakarta Pusat", kota: "Jakarta Pusat", provinsi: "DKI Jakarta" },
  { id: "kanim-jakut", nama: "Kantor Imigrasi Kelas I TPI Jakarta Utara", shortLabel: "Kanim Kelas I TPI Jakarta Utara", kota: "Jakarta Utara", provinsi: "DKI Jakarta" },
  { id: "kanim-jaktim", nama: "Kantor Imigrasi Kelas I TPI Jakarta Timur", shortLabel: "Kanim Kelas I TPI Jakarta Timur", kota: "Jakarta Timur", provinsi: "DKI Jakarta" },
  { id: "kanim-tng", nama: "Kantor Imigrasi Kelas I Non TPI Tangerang", shortLabel: "Kanim Kelas I Non TPI Tangerang", kota: "Tangerang", provinsi: "Banten" },
  { id: "kanim-bks", nama: "Kantor Imigrasi Kelas I Non TPI Bekasi", shortLabel: "Kanim Kelas I Non TPI Bekasi", kota: "Bekasi", provinsi: "Jawa Barat" },
  { id: "kanim-dpk", nama: "Kantor Imigrasi Kelas I Non TPI Depok", shortLabel: "Kanim Kelas I Non TPI Depok", kota: "Depok", provinsi: "Jawa Barat" },
  { id: "kanim-bgr", nama: "Kantor Imigrasi Kelas I Non TPI Bogor", shortLabel: "Kanim Kelas I Non TPI Bogor", kota: "Bogor", provinsi: "Jawa Barat" },
  { id: "ulp-cibubur", nama: "Unit Layanan Paspor (ULP) Mall Cibubur Junction", shortLabel: "ULP Cibubur Junction", kota: "Jakarta Timur", provinsi: "DKI Jakarta" },
  { id: "ulp-puri", nama: "Unit Layanan Paspor (ULP) Lippo Mall Puri", shortLabel: "ULP Lippo Mall Puri", kota: "Jakarta Barat", provinsi: "DKI Jakarta" },
  { id: "ulp-semanggi", nama: "Unit Layanan Paspor (ULP) Plaza Semanggi", shortLabel: "ULP Plaza Semanggi", kota: "Jakarta Selatan", provinsi: "DKI Jakarta" },
  { id: "mpp-dki", nama: "Mal Pelayanan Publik (MPP) Provinsi DKI Jakarta", shortLabel: "MPP DKI Jakarta (Kuningan)", kota: "Jakarta Selatan", provinsi: "DKI Jakarta" },
  { id: "mpp-bks", nama: "Mal Pelayanan Publik (MPP) Kota Bekasi", shortLabel: "MPP Kota Bekasi", kota: "Bekasi", provinsi: "Jawa Barat" },
  { id: "mpp-bgr", nama: "Mal Pelayanan Publik (MPP) Grha Tiyasa Kota Bogor", shortLabel: "MPP Kota Bogor", kota: "Bogor", provinsi: "Jawa Barat" },
  { id: "mpp-dpk", nama: "Mal Pelayanan Publik (MPP) Kota Depok", shortLabel: "MPP Kota Depok", kota: "Depok", provinsi: "Jawa Barat" },
  { id: "mpp-tangsel", nama: "Mal Pelayanan Publik (MPP) Kota Tangerang Selatan", shortLabel: "MPP Tangerang Selatan", kota: "Tangerang Selatan", provinsi: "Banten" },

  // ── JAWA BARAT & BANTEN ──
  { id: "kanim-bdg", nama: "Kantor Imigrasi Kelas I TPI Bandung", shortLabel: "Kanim Kelas I TPI Bandung", kota: "Bandung", provinsi: "Jawa Barat" },
  { id: "kanim-krw", nama: "Kantor Imigrasi Kelas I Non TPI Karawang", shortLabel: "Kanim Kelas I Non TPI Karawang", kota: "Karawang", provinsi: "Jawa Barat" },
  { id: "kanim-crb", nama: "Kantor Imigrasi Kelas II TPI Cirebon", shortLabel: "Kanim Kelas II TPI Cirebon", kota: "Cirebon", provinsi: "Jawa Barat" },
  { id: "kanim-tsm", nama: "Kantor Imigrasi Kelas II Non TPI Tasikmalaya", shortLabel: "Kanim Kelas II Non TPI Tasikmalaya", kota: "Tasikmalaya", provinsi: "Jawa Barat" },
  { id: "kanim-skb", nama: "Kantor Imigrasi Kelas II Non TPI Sukabumi", shortLabel: "Kanim Kelas II Non TPI Sukabumi", kota: "Sukabumi", provinsi: "Jawa Barat" },
  { id: "kanim-serang", nama: "Kantor Imigrasi Kelas I TPI Serang", shortLabel: "Kanim Kelas I TPI Serang", kota: "Serang", provinsi: "Banten" },
  { id: "kanim-clg", nama: "Kantor Imigrasi Kelas II TPI Cilegon", shortLabel: "Kanim Kelas II TPI Cilegon", kota: "Cilegon", provinsi: "Banten" },
  { id: "mpp-bdg", nama: "Mal Pelayanan Publik (MPP) Kota Bandung", shortLabel: "MPP Kota Bandung", kota: "Bandung", provinsi: "Jawa Barat" },

  // ── JAWA TENGAH & D.I. YOGYAKARTA ──
  { id: "kanim-smg", nama: "Kantor Imigrasi Kelas I TPI Semarang", shortLabel: "Kanim Kelas I TPI Semarang", kota: "Semarang", provinsi: "Jawa Tengah" },
  { id: "kanim-slo", nama: "Kantor Imigrasi Kelas I TPI Surakarta", shortLabel: "Kanim Kelas I TPI Surakarta (Solo)", kota: "Surakarta", provinsi: "Jawa Tengah" },
  { id: "kanim-pti", nama: "Kantor Imigrasi Kelas II Non TPI Pati", shortLabel: "Kanim Kelas II Non TPI Pati", kota: "Pati", provinsi: "Jawa Tengah" },
  { id: "kanim-pml", nama: "Kantor Imigrasi Kelas II Non TPI Pemalang", shortLabel: "Kanim Kelas II Non TPI Pemalang", kota: "Pemalang", provinsi: "Jawa Tengah" },
  { id: "kanim-wsb", nama: "Kantor Imigrasi Kelas II Non TPI Wonosobo", shortLabel: "Kanim Kelas II Non TPI Wonosobo", kota: "Wonosobo", provinsi: "Jawa Tengah" },
  { id: "kanim-clp", nama: "Kantor Imigrasi Kelas II Non TPI Cilacap", shortLabel: "Kanim Kelas II Non TPI Cilacap", kota: "Cilacap", provinsi: "Jawa Tengah" },
  { id: "kanim-jog", nama: "Kantor Imigrasi Kelas I TPI Yogyakarta", shortLabel: "Kanim Kelas I TPI Yogyakarta", kota: "Yogyakarta", provinsi: "D.I. Yogyakarta" },
  { id: "mpp-smg", nama: "Mal Pelayanan Publik (MPP) Kota Semarang", shortLabel: "MPP Kota Semarang", kota: "Semarang", provinsi: "Jawa Tengah" },
  { id: "mpp-slo", nama: "Mal Pelayanan Publik (MPP) Jenderal Sudirman Surakarta", shortLabel: "MPP Kota Surakarta", kota: "Surakarta", provinsi: "Jawa Tengah" },
  { id: "mpp-bms", nama: "Mal Pelayanan Publik (MPP) Kab. Banyumas (Purwokerto)", shortLabel: "MPP Kab. Banyumas", kota: "Purwokerto", provinsi: "Jawa Tengah" },

  // ── SUMATERA ──
  { id: "kanim-mdn-khusus", nama: "Kantor Imigrasi Kelas I Khusus TPI Medan", shortLabel: "Kanim Kelas I Khusus TPI Medan", kota: "Medan", provinsi: "Sumatera Utara" },
  { id: "kanim-blw", nama: "Kantor Imigrasi Kelas II TPI Belawan", shortLabel: "Kanim Kelas II TPI Belawan", kota: "Medan", provinsi: "Sumatera Utara" },
  { id: "kanim-pms", nama: "Kantor Imigrasi Kelas II Non TPI Pematang Siantar", shortLabel: "Kanim Kelas II Non TPI Pematang Siantar", kota: "Pematang Siantar", provinsi: "Sumatera Utara" },
  { id: "kanim-sbg", nama: "Kantor Imigrasi Kelas II Non TPI Sibolga", shortLabel: "Kanim Kelas II Non TPI Sibolga", kota: "Sibolga", provinsi: "Sumatera Utara" },
  { id: "kanim-tba", nama: "Kantor Imigrasi Kelas II TPI Tanjung Balai Asahan", shortLabel: "Kanim Kelas II TPI Tanjung Balai Asahan", kota: "Tanjung Balai", provinsi: "Sumatera Utara" },
  { id: "kanim-btj", nama: "Kantor Imigrasi Kelas I TPI Banda Aceh", shortLabel: "Kanim Kelas I TPI Banda Aceh", kota: "Banda Aceh", provinsi: "Aceh" },
  { id: "kanim-lsx", nama: "Kantor Imigrasi Kelas II TPI Lhokseumawe", shortLabel: "Kanim Kelas II TPI Lhokseumawe", kota: "Lhokseumawe", provinsi: "Aceh" },
  { id: "kanim-sbz", nama: "Kantor Imigrasi Kelas II TPI Sabang", shortLabel: "Kanim Kelas II TPI Sabang", kota: "Sabang", provinsi: "Aceh" },
  { id: "kanim-lgs", nama: "Kantor Imigrasi Kelas II TPI Langsa", shortLabel: "Kanim Kelas II TPI Langsa", kota: "Langsa", provinsi: "Aceh" },
  { id: "kanim-meu", nama: "Kantor Imigrasi Kelas II TPI Meulaboh", shortLabel: "Kanim Kelas II TPI Meulaboh", kota: "Meulaboh", provinsi: "Aceh" },
  { id: "kanim-pdg", nama: "Kantor Imigrasi Kelas I TPI Padang", shortLabel: "Kanim Kelas I TPI Padang", kota: "Padang", provinsi: "Sumatera Barat" },
  { id: "kanim-bkt", nama: "Kantor Imigrasi Kelas II Non TPI Agam (Bukittinggi)", shortLabel: "Kanim Kelas II Non TPI Agam", kota: "Bukittinggi", provinsi: "Sumatera Barat" },
  { id: "kanim-pbr", nama: "Kantor Imigrasi Kelas I TPI Pekanbaru", shortLabel: "Kanim Kelas I TPI Pekanbaru", kota: "Pekanbaru", provinsi: "Riau" },
  { id: "kanim-dum", nama: "Kantor Imigrasi Kelas II TPI Dumai", shortLabel: "Kanim Kelas II TPI Dumai", kota: "Dumai", provinsi: "Riau" },
  { id: "kanim-bks-riau", nama: "Kantor Imigrasi Kelas II TPI Bengkalis", shortLabel: "Kanim Kelas II TPI Bengkalis", kota: "Bengkalis", provinsi: "Riau" },
  { id: "kanim-siak", nama: "Kantor Imigrasi Kelas II TPI Siak", shortLabel: "Kanim Kelas II TPI Siak", kota: "Siak", provinsi: "Riau" },
  { id: "kanim-slp", nama: "Kantor Imigrasi Kelas II TPI Selatpanjang", shortLabel: "Kanim Kelas II TPI Selatpanjang", kota: "Selatpanjang", provinsi: "Riau" },
  { id: "kanim-bgn", nama: "Kantor Imigrasi Kelas II TPI Bagansiapiapi", shortLabel: "Kanim Kelas II TPI Bagansiapiapi", kota: "Bagansiapiapi", provinsi: "Riau" },
  { id: "kanim-btm-khusus", nama: "Kantor Imigrasi Kelas I Khusus TPI Batam", shortLabel: "Kanim Kelas I Khusus TPI Batam", kota: "Batam", provinsi: "Kepulauan Riau" },
  { id: "kanim-tpn", nama: "Kantor Imigrasi Kelas I TPI Tanjung Pinang", shortLabel: "Kanim Kelas I TPI Tanjung Pinang", kota: "Tanjung Pinang", provinsi: "Kepulauan Riau" },
  { id: "kanim-tbk", nama: "Kantor Imigrasi Kelas II TPI Tanjung Balai Karimun", shortLabel: "Kanim Kelas II TPI TB Karimun", kota: "Karimun", provinsi: "Kepulauan Riau" },
  { id: "kanim-dbs", nama: "Kantor Imigrasi Kelas II TPI Dabo Singkep", shortLabel: "Kanim Kelas II TPI Dabo Singkep", kota: "Dabo Singkep", provinsi: "Kepulauan Riau" },
  { id: "kanim-plb", nama: "Kantor Imigrasi Kelas I TPI Palembang", shortLabel: "Kanim Kelas I TPI Palembang", kota: "Palembang", provinsi: "Sumatera Selatan" },
  { id: "kanim-mre", nama: "Kantor Imigrasi Kelas II Non TPI Muara Enim", shortLabel: "Kanim Kelas II Non TPI Muara Enim", kota: "Muara Enim", provinsi: "Sumatera Selatan" },
  { id: "kanim-jmb", nama: "Kantor Imigrasi Kelas I TPI Jambi", shortLabel: "Kanim Kelas I TPI Jambi", kota: "Jambi", provinsi: "Jambi" },
  { id: "kanim-klt", nama: "Kantor Imigrasi Kelas II Non TPI Kuala Tungkal", shortLabel: "Kanim Kelas II Non TPI Kuala Tungkal", kota: "Kuala Tungkal", provinsi: "Jambi" },
  { id: "kanim-krc", nama: "Kantor Imigrasi Kelas II Non TPI Kerinci", shortLabel: "Kanim Kelas II Non TPI Kerinci", kota: "Sungai Penuh", provinsi: "Jambi" },
  { id: "kanim-pkp", nama: "Kantor Imigrasi Kelas I TPI Pangkal Pinang", shortLabel: "Kanim Kelas I TPI Pangkal Pinang", kota: "Pangkal Pinang", provinsi: "Bangka Belitung" },
  { id: "kanim-tjp", nama: "Kantor Imigrasi Kelas II TPI Tanjung Pandan", shortLabel: "Kanim Kelas II TPI Tanjung Pandan (Belitung)", kota: "Tanjung Pandan", provinsi: "Bangka Belitung" },
  { id: "kanim-bgl", nama: "Kantor Imigrasi Kelas I TPI Bengkulu", shortLabel: "Kanim Kelas I TPI Bengkulu", kota: "Bengkulu", provinsi: "Bengkulu" },
  { id: "kanim-bdl", nama: "Kantor Imigrasi Kelas I TPI Bandar Lampung", shortLabel: "Kanim Kelas I TPI Bandar Lampung", kota: "Bandar Lampung", provinsi: "Lampung" },
  { id: "kanim-kld", nama: "Kantor Imigrasi Kelas II Non TPI Kalianda", shortLabel: "Kanim Kelas II Non TPI Kalianda", kota: "Kalianda", provinsi: "Lampung" },
  { id: "kanim-ktb", nama: "Kantor Imigrasi Kelas II Non TPI Kotabumi", shortLabel: "Kanim Kelas II Non TPI Kotabumi", kota: "Kotabumi", provinsi: "Lampung" },

  // ── BALI & NUSA TENGGARA ──
  { id: "kanim-dps-khusus", nama: "Kantor Imigrasi Kelas I Khusus TPI Ngurah Rai", shortLabel: "Kanim Kelas I Khusus TPI Ngurah Rai", kota: "Badung", provinsi: "Bali" },
  { id: "kanim-dps", nama: "Kantor Imigrasi Kelas I TPI Denpasar", shortLabel: "Kanim Kelas I TPI Denpasar", kota: "Denpasar", provinsi: "Bali" },
  { id: "kanim-sgj", nama: "Kantor Imigrasi Kelas II TPI Singaraja", shortLabel: "Kanim Kelas II TPI Singaraja", kota: "Singaraja", provinsi: "Bali" },
  { id: "kanim-mtr", nama: "Kantor Imigrasi Kelas I TPI Mataram", shortLabel: "Kanim Kelas I TPI Mataram", kota: "Mataram", provinsi: "Nusa Tenggara Barat" },
  { id: "kanim-swb", nama: "Kantor Imigrasi Kelas II TPI Sumbawa Besar", shortLabel: "Kanim Kelas II TPI Sumbawa Besar", kota: "Sumbawa Besar", provinsi: "Nusa Tenggara Barat" },
  { id: "kanim-bma", nama: "Kantor Imigrasi Kelas II TPI Bima", shortLabel: "Kanim Kelas II TPI Bima", kota: "Bima", provinsi: "Nusa Tenggara Barat" },
  { id: "kanim-kpg", nama: "Kantor Imigrasi Kelas I TPI Kupang", shortLabel: "Kanim Kelas I TPI Kupang", kota: "Kupang", provinsi: "Nusa Tenggara Timur" },
  { id: "kanim-atb", nama: "Kantor Imigrasi Kelas II TPI Atambua", shortLabel: "Kanim Kelas II TPI Atambua", kota: "Atambua", provinsi: "Nusa Tenggara Timur" },
  { id: "kanim-mme", nama: "Kantor Imigrasi Kelas II TPI Maumere", shortLabel: "Kanim Kelas II TPI Maumere", kota: "Maumere", provinsi: "Nusa Tenggara Timur" },
  { id: "kanim-lbj", nama: "Kantor Imigrasi Kelas II TPI Labuan Bajo", shortLabel: "Kanim Kelas II TPI Labuan Bajo", kota: "Labuan Bajo", provinsi: "Nusa Tenggara Timur" },

  // ── KALIMANTAN ──
  { id: "kanim-ptk", nama: "Kantor Imigrasi Kelas I TPI Pontianak", shortLabel: "Kanim Kelas I TPI Pontianak", kota: "Pontianak", provinsi: "Kalimantan Barat" },
  { id: "kanim-etk", nama: "Kantor Imigrasi Kelas II TPI Entikong", shortLabel: "Kanim Kelas II TPI Entikong", kota: "Sanggau", provinsi: "Kalimantan Barat" },
  { id: "kanim-skw", nama: "Kantor Imigrasi Kelas II TPI Singkawang", shortLabel: "Kanim Kelas II TPI Singkawang", kota: "Singkawang", provinsi: "Kalimantan Barat" },
  { id: "kanim-sbs", nama: "Kantor Imigrasi Kelas II TPI Sambas", shortLabel: "Kanim Kelas II TPI Sambas", kota: "Sambas", provinsi: "Kalimantan Barat" },
  { id: "kanim-sgg", nama: "Kantor Imigrasi Kelas II Non TPI Sanggau", shortLabel: "Kanim Kelas II Non TPI Sanggau", kota: "Sanggau", provinsi: "Kalimantan Barat" },
  { id: "kanim-ktp", nama: "Kantor Imigrasi Kelas II Non TPI Ketapang", shortLabel: "Kanim Kelas II Non TPI Ketapang", kota: "Ketapang", provinsi: "Kalimantan Barat" },
  { id: "kanim-bjm", nama: "Kantor Imigrasi Kelas I TPI Banjarmasin", shortLabel: "Kanim Kelas I TPI Banjarmasin", kota: "Banjarmasin", provinsi: "Kalimantan Selatan" },
  { id: "kanim-blc", nama: "Kantor Imigrasi Kelas II TPI Batulicin", shortLabel: "Kanim Kelas II TPI Batulicin", kota: "Batulicin", provinsi: "Kalimantan Selatan" },
  { id: "kanim-bpn", nama: "Kantor Imigrasi Kelas I TPI Balikpapan", shortLabel: "Kanim Kelas I TPI Balikpapan", kota: "Balikpapan", provinsi: "Kalimantan Timur" },
  { id: "kanim-smd", nama: "Kantor Imigrasi Kelas I TPI Samarinda", shortLabel: "Kanim Kelas I TPI Samarinda", kota: "Samarinda", provinsi: "Kalimantan Timur" },
  { id: "kanim-trk", nama: "Kantor Imigrasi Kelas II TPI Tarakan", shortLabel: "Kanim Kelas II TPI Tarakan", kota: "Tarakan", provinsi: "Kalimantan Utara" },
  { id: "kanim-nnk", nama: "Kantor Imigrasi Kelas II TPI Nunukan", shortLabel: "Kanim Kelas II TPI Nunukan", kota: "Nunukan", provinsi: "Kalimantan Utara" },
  { id: "kanim-plk", nama: "Kantor Imigrasi Kelas I TPI Palangka Raya", shortLabel: "Kanim Kelas I TPI Palangka Raya", kota: "Palangka Raya", provinsi: "Kalimantan Tengah" },
  { id: "kanim-spt", nama: "Kantor Imigrasi Kelas II TPI Sampit", shortLabel: "Kanim Kelas II TPI Sampit", kota: "Sampit", provinsi: "Kalimantan Tengah" },

  // ── SULAWESI ──
  { id: "kanim-mks-khusus", nama: "Kantor Imigrasi Kelas I Khusus TPI Makassar", shortLabel: "Kanim Kelas I Khusus TPI Makassar", kota: "Makassar", provinsi: "Sulawesi Selatan" },
  { id: "kanim-pare", nama: "Kantor Imigrasi Kelas II TPI Parepare", shortLabel: "Kanim Kelas II TPI Parepare", kota: "Parepare", provinsi: "Sulawesi Selatan" },
  { id: "kanim-palopo", nama: "Kantor Imigrasi Kelas II Non TPI Palopo", shortLabel: "Kanim Kelas II Non TPI Palopo", kota: "Palopo", provinsi: "Sulawesi Selatan" },
  { id: "kanim-mdo", nama: "Kantor Imigrasi Kelas I TPI Manado", shortLabel: "Kanim Kelas I TPI Manado", kota: "Manado", provinsi: "Sulawesi Utara" },
  { id: "kanim-bitung", nama: "Kantor Imigrasi Kelas II TPI Bitung", shortLabel: "Kanim Kelas II TPI Bitung", kota: "Bitung", provinsi: "Sulawesi Utara" },
  { id: "kanim-ktm", nama: "Kantor Imigrasi Kelas II TPI Kotamobagu", shortLabel: "Kanim Kelas II TPI Kotamobagu", kota: "Kotamobagu", provinsi: "Sulawesi Utara" },
  { id: "kanim-thn", nama: "Kantor Imigrasi Kelas II TPI Tahuna", shortLabel: "Kanim Kelas II TPI Tahuna", kota: "Tahuna", provinsi: "Sulawesi Utara" },
  { id: "kanim-palu", nama: "Kantor Imigrasi Kelas I TPI Palu", shortLabel: "Kanim Kelas I TPI Palu", kota: "Palu", provinsi: "Sulawesi Tengah" },
  { id: "kanim-banggai", nama: "Kantor Imigrasi Kelas II Non TPI Banggai", shortLabel: "Kanim Kelas II Non TPI Banggai", kota: "Luwuk", provinsi: "Sulawesi Tengah" },
  { id: "kanim-kdr-sultra", nama: "Kantor Imigrasi Kelas I TPI Kendari", shortLabel: "Kanim Kelas I TPI Kendari", kota: "Kendari", provinsi: "Sulawesi Tenggara" },
  { id: "kanim-bau", nama: "Kantor Imigrasi Kelas II Non TPI Baubau", shortLabel: "Kanim Kelas II Non TPI Baubau", kota: "Baubau", provinsi: "Sulawesi Tenggara" },
  { id: "kanim-gtl", nama: "Kantor Imigrasi Kelas I TPI Gorontalo", shortLabel: "Kanim Kelas I TPI Gorontalo", kota: "Gorontalo", provinsi: "Gorontalo" },
  { id: "kanim-mamuju", nama: "Kantor Imigrasi Kelas II Non TPI Mamuju", shortLabel: "Kanim Kelas II Non TPI Mamuju", kota: "Mamuju", provinsi: "Sulawesi Barat" },
  { id: "kanim-polman", nama: "Kantor Imigrasi Kelas II Non TPI Polewali Mandar", shortLabel: "Kanim Kelas II Non TPI Polewali Mandar", kota: "Polewali Mandar", provinsi: "Sulawesi Barat" },

  // ── MALUKU & PAPUA ──
  { id: "kanim-ambon", nama: "Kantor Imigrasi Kelas I TPI Ambon", shortLabel: "Kanim Kelas I TPI Ambon", kota: "Ambon", provinsi: "Maluku" },
  { id: "kanim-tual", nama: "Kantor Imigrasi Kelas II TPI Tual", shortLabel: "Kanim Kelas II TPI Tual", kota: "Tual", provinsi: "Maluku" },
  { id: "kanim-ternate", nama: "Kantor Imigrasi Kelas I TPI Ternate", shortLabel: "Kanim Kelas I TPI Ternate", kota: "Ternate", provinsi: "Maluku Utara" },
  { id: "kanim-tobelo", nama: "Kantor Imigrasi Kelas II TPI Tobelo", shortLabel: "Kanim Kelas II TPI Tobelo", kota: "Tobelo", provinsi: "Maluku Utara" },
  { id: "kanim-jayapura", nama: "Kantor Imigrasi Kelas I TPI Jayapura", shortLabel: "Kanim Kelas I TPI Jayapura", kota: "Jayapura", provinsi: "Papua" },
  { id: "kanim-merauke", nama: "Kantor Imigrasi Kelas II TPI Merauke", shortLabel: "Kanim Kelas II TPI Merauke", kota: "Merauke", provinsi: "Papua Selatan" },
  { id: "kanim-biak", nama: "Kantor Imigrasi Kelas II TPI Biak", shortLabel: "Kanim Kelas II TPI Biak", kota: "Biak", provinsi: "Papua" },
  { id: "kanim-mimika", nama: "Kantor Imigrasi Kelas II TPI Mimika", shortLabel: "Kanim Kelas II TPI Mimika (Timika)", kota: "Timika", provinsi: "Papua Tengah" },
  { id: "kanim-sorong", nama: "Kantor Imigrasi Kelas II TPI Sorong", shortLabel: "Kanim Kelas II TPI Sorong", kota: "Sorong", provinsi: "Papua Barat Daya" },
  { id: "kanim-manokwari", nama: "Kantor Imigrasi Kelas II Non TPI Manokwari", shortLabel: "Kanim Kelas II Non TPI Manokwari", kota: "Manokwari", provinsi: "Papua Barat" },
];

/**
 * Helper untuk mencari item kantor imigrasi berdasarkan nama / kota / keyword
 */
export function searchKantorImigrasi(query: string): KantorImigrasiItem[] {
  if (!query || query.trim().length === 0) return DAFTAR_KANTOR_IMIGRASI;
  const q = query.toLowerCase().trim().replace(/[-_]/g, " ");
  const qTerms = q.split(/\s+/).filter(Boolean);

  return DAFTAR_KANTOR_IMIGRASI.filter((item) => {
    const target = `${item.nama} ${item.shortLabel} ${item.kota} ${item.provinsi}`
      .toLowerCase()
      .replace(/[-_]/g, " ");
    return qTerms.every((term) => target.includes(term));
  });
}

const KANIM_STORAGE_KEY = "vtu_kantor_imigrasi_cache_v1";

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
      DAFTAR_KANTOR_IMIGRASI.forEach((k) => map.set(k.nama.toLowerCase().trim(), k));
      parsed.forEach((k: KantorImigrasiItem) => {
        if (k?.nama) map.set(k.nama.toLowerCase().trim(), k);
      });
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn("Failed to load stored kanim list:", err);
  }
  return DAFTAR_KANTOR_IMIGRASI;
}

/**
 * Mengambil nama kota otomatis dari nama Kanim yang dipilih (VLOOKUP ke database & direktori Kanim)
 */
export function getKotaFromKanimName(kanimName: string, customList?: KantorImigrasiItem[]): string {
  if (!kanimName || !kanimName.trim()) return "";
  const list = customList && customList.length > 0 ? customList : getStoredKantorImigrasiList();
  const clean = kanimName.toLowerCase().trim();

  // 1. Exact match by nama or shortLabel
  const exact = list.find(
    (k) => k.nama.toLowerCase().trim() === clean || k.shortLabel.toLowerCase().trim() === clean
  );
  if (exact) return exact.kota;

  // 2. Partial match: if kanimName contains the item's full name or shortLabel, or vice versa
  const partial = list.find(
    (k) =>
      clean.includes(k.nama.toLowerCase().trim()) ||
      clean.includes(k.shortLabel.toLowerCase().trim()) ||
      k.nama.toLowerCase().trim().includes(clean)
  );
  if (partial) return partial.kota;

  // 3. Check if kanimName mentions any known kota in the directory
  for (const item of list) {
    if (item.kota && clean.includes(item.kota.toLowerCase().trim())) {
      return item.kota;
    }
  }

  // 4. Heuristic: extract location name from commonly used suffixes
  // e.g. "Kantor Imigrasi Kotabaru" -> "Kotabaru", "Kantor Imigrasi Kelas II Nunukan" -> "Nunukan"
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
    (k) => k.nama.toLowerCase().trim() === cleanNama.toLowerCase()
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
