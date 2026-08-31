import type {
  SuratTemplate,
  GeneratedSuratLog,
  ManifestFieldOption,
} from "@/shared/types/surat";
import { formatDate } from "@/shared/lib/utils";

// ────────────────────────────────────────────────────────────
// ROMAN MONTHS & DATE UTILITIES
// ────────────────────────────────────────────────────────────

export const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function getTodayDateInfo(dateObj: Date = new Date()) {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const masehi = dateObj.toLocaleDateString("id-ID", options);
  const romanMonth = ROMAN_MONTHS[dateObj.getMonth()] ?? "VIII";
  const year = dateObj.getFullYear();
  return {
    masehi,
    hijriyah: "Safar 1448 H",
    romanMonth,
    bulanRomawi: romanMonth,
    year,
  };
}

// ────────────────────────────────────────────────────────────
// AVAILABLE MANIFEST FIELDS CATALOG FOR AUTOCRAT MAPPING
// ────────────────────────────────────────────────────────────

export const MANIFEST_FIELD_OPTIONS: ManifestFieldOption[] = [
  // Jamaah group
  { key: "jamaah.namaLengkap", label: "Nama Lengkap Jamaah", group: "Jamaah", sampleValue: "MUCHAMAD ZAMRONI" },
  { key: "jamaah.nik", label: "Nomor Induk Kependudukan (NIK)", group: "Jamaah", sampleValue: "3515082103850001" },
  { key: "jamaah.nomorPaspor", label: "Nomor Paspor", group: "Jamaah", sampleValue: "X1234567" },
  { key: "jamaah.tempatLahir", label: "Tempat Lahir", group: "Jamaah", sampleValue: "Sidoarjo" },
  { key: "jamaah.tanggalLahir", label: "Tanggal Lahir (DD MMMM YYYY)", group: "Jamaah", sampleValue: "21 Maret 1985" },
  { key: "jamaah.jenisKelamin", label: "Jenis Kelamin (Laki-laki / Perempuan)", group: "Jamaah", sampleValue: "LAKI-LAKI" },
  { key: "jamaah.namaAyah", label: "Nama Ayah Kandung", group: "Jamaah", sampleValue: "H. AHMAD SOFWAN" },
  { key: "jamaah.alamat", label: "Alamat Lengkap", group: "Jamaah", sampleValue: "Jl. Raya Taman No. 45, Sidoarjo, Jawa Timur" },
  { key: "jamaah.nomorTelepon", label: "Nomor Telepon / WhatsApp", group: "Jamaah", sampleValue: "081234567890" },
  { key: "jamaah.registrationId", label: "ID Registrasi / Nomor Peserta", group: "Jamaah", sampleValue: "REG-2026-0814" },

  // Keberangkatan / Package group
  { key: "keberangkatan.namaPaket", label: "Nama Paket Umroh", group: "Keberangkatan / Paket", sampleValue: "Paket Umroh Reguler Awal Musim 1448 H" },
  { key: "keberangkatan.kode", label: "Kode Keberangkatan / Manifest", group: "Keberangkatan / Paket", sampleValue: "KBR-2026-08-A" },
  { key: "keberangkatan.tanggalBerangkat", label: "Tanggal Keberangkatan", group: "Keberangkatan / Paket", sampleValue: "15 September 2026" },
  { key: "keberangkatan.tanggalPulang", label: "Tanggal Kepulangan", group: "Keberangkatan / Paket", sampleValue: "24 September 2026" },
  { key: "keberangkatan.programHari", label: "Durasi Program Hari", group: "Keberangkatan / Paket", sampleValue: "9 Hari" },
  { key: "keberangkatan.maskapai", label: "Maskapai Penerbangan", group: "Keberangkatan / Paket", sampleValue: "Saudia Airlines (SV)" },
  { key: "keberangkatan.hotelMekkah", label: "Hotel Mekkah", group: "Keberangkatan / Paket", sampleValue: "Pullman Zamzam Makkah (Bintang 5)" },
  { key: "keberangkatan.hotelMadinah", label: "Hotel Madinah", group: "Keberangkatan / Paket", sampleValue: "Rove Al Madinah (Bintang 4)" },
  { key: "keberangkatan.startingPoint", label: "Bandara Keberangkatan (Starting Point)", group: "Keberangkatan / Paket", sampleValue: "Bandara Internasional Juanda (SUB)" },

  // System & Today group
  { key: "today.masehi", label: "Tanggal Hari Ini (Masehi)", group: "Tanggal & Sistem", sampleValue: "31 Agustus 2026" },
  { key: "today.hijriyah", label: "Tanggal Hari Ini (Hijriyah)", group: "Tanggal & Sistem", sampleValue: "18 Safar 1448 H" },
  { key: "today.bulanRomawi", label: "Bulan Romawi Saat Ini", group: "Tanggal & Sistem", sampleValue: "VIII" },
  { key: "today.tahun", label: "Tahun Saat Ini", group: "Tanggal & Sistem", sampleValue: "2026" },
  { key: "vtu.pimpinan", label: "Nama Direktur / Pimpinan PPIU", group: "Tanggal & Sistem", sampleValue: "H. Fauzan Adzim, S.E." },
  { key: "vtu.jabatan", label: "Jabatan Penandatangan", group: "Tanggal & Sistem", sampleValue: "Direktur Utama" },
  { key: "vtu.noIzin", label: "Nomor Izin PPIU Resmi", group: "Tanggal & Sistem", sampleValue: "Izin Kemenag RI No. U.400 Tahun 2021" },
];

// ────────────────────────────────────────────────────────────
// SCANNER FOR EXTRACTING {TAG} FROM TEMPLATE TEXT
// ────────────────────────────────────────────────────────────

export function extractPlaceholdersFromText(text: string): string[] {
  if (!text) return [];
  const regex = /\{+([a-zA-Z0-9_\-\.\s]+?)\}+/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1]?.trim();
    if (raw && raw.length > 0 && !raw.startsWith("/*") && !raw.startsWith("http")) {
      tags.add(raw);
    }
  }
  return Array.from(tags);
}

// ────────────────────────────────────────────────────────────
// DEFAULT BUILT-IN TEMPLATES
// ────────────────────────────────────────────────────────────

export const DEFAULT_SURAT_TEMPLATES: SuratTemplate[] = [
  {
    id: "tpl-rekom-paspor",
    slug: "rekom-paspor",
    nama: "Surat Rekomendasi Paspor",
    kategori: "imigrasi",
    deskripsi: "Rekomendasi resmi penerbitan / penggantian paspor umroh ke Kantor Imigrasi / Kemenag",
    kodeNomorDefault: "SR-PASPOR",
    formatNomor: "[NOMOR]/SR-PASPOR/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Rekomendasi_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Rekomendasi_Paspor.docx",
    perihalDefault: "Rekomendasi Pembuatan / Penggantian Paspor Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas",
    tujuanDefault: "Yth. Kepala Kantor Imigrasi",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yang bertanda tangan di bawah ini, Pimpinan Penyelenggara Perjalanan Ibadah Umroh (PPIU) PT. Vauza Trikarsa Utama (Izin Kemenag No. U.400 Tahun 2021), menerangkan dengan sebenarnya bahwa:

Nama Lengkap      : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Tempat/Tgl Lahir  : {tempat_lahir}, {tanggal_lahir}
Jenis Kelamin     : {jenis_kelamin}
Alamat Lengkap    : {alamat}
Nomor Telepon/HP  : {nomor_telepon}

Adalah benar-benar calon jamaah Umroh PT. Vauza Trikarsa Utama yang telah terdaftar resmi dan dijadwalkan berangkat ibadah Umroh dengan rincian jadwal sebagai berikut:

Paket Umroh       : {nama_paket} ({program_hari})
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kembali   : {tanggal_pulang}
Maskapai          : {maskapai}
Hotel Mekkah      : {hotel_mekkah}
Hotel Madinah     : {hotel_madinah}

Sehubungan dengan hal tersebut, kami mohon kepada pihak Kantor Imigrasi kiranya dapat memberikan kemudahan dan bantuan dalam proses penerbitan / perpanjangan Paspor Republik Indonesia atas nama jamaah yang bersangkutan.

Demikian surat rekomendasi ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap Jamaah", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK (KTP)", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "tempat_lahir", label: "Tempat Lahir", sourceType: "manifest", manifestField: "jamaah.tempatLahir", inputType: "city", required: true },
      { key: "tanggal_lahir", label: "Tanggal Lahir", sourceType: "manifest", manifestField: "jamaah.tanggalLahir", inputType: "date", required: true },
      { key: "jenis_kelamin", label: "Jenis Kelamin", sourceType: "manifest", manifestField: "jamaah.jenisKelamin", inputType: "select", options: ["LAKI-LAKI", "PEREMPUAN"], required: true },
      { key: "alamat", label: "Alamat Lengkap", sourceType: "manifest", manifestField: "jamaah.alamat", inputType: "textarea", required: true },
      { key: "nomor_telepon", label: "Nomor Telepon", sourceType: "manifest", manifestField: "jamaah.nomorTelepon", inputType: "text", required: true },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text", required: true },
      { key: "program_hari", label: "Program Hari", sourceType: "manifest", manifestField: "keberangkatan.programHari", inputType: "text", defaultValue: "9 Hari" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date", required: true },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date", required: true },
      { key: "maskapai", label: "Maskapai Penerbangan", sourceType: "manifest", manifestField: "keberangkatan.maskapai", inputType: "text" },
      { key: "hotel_mekkah", label: "Hotel Mekkah", sourceType: "manifest", manifestField: "keberangkatan.hotelMekkah", inputType: "text" },
      { key: "hotel_madinah", label: "Hotel Madinah", sourceType: "manifest", manifestField: "keberangkatan.hotelMadinah", inputType: "text" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-cuti-pekerja",
    slug: "cuti-pekerja",
    nama: "Surat Permohonan Cuti Pekerja",
    kategori: "instansi",
    deskripsi: "Permohonan dispensasi izin dan cuti kerja karyawan untuk menunaikan ibadah umroh",
    kodeNomorDefault: "SC-KERJA",
    formatNomor: "[NOMOR]/SC-KERJA/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Cuti_Kerja_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Cuti_Pekerja.docx",
    perihalDefault: "Permohonan Izin / Cuti Ibadah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Lembar Itinerary",
    tujuanDefault: "Yth. Pimpinan / HRD {nama_perusahaan}",
    kotaTujuanDefault: "{kota_kantor}",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Sehubungan dengan rencana keberangkatan Ibadah Umroh jamaah PT. Vauza Trikarsa Utama, dengan ini kami sampaikan bahwa karyawan/karyawati Bapak/Ibu di bawah ini:

Nama Karyawan     : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Nomor Paspor      : {nomor_paspor}
Jabatan / Posisi  : {jabatan_karyawan}
Departemen / Div  : {departemen}
Nama Perusahaan   : {nama_perusahaan}

Telah terdaftar resmi sebagai jamaah umroh PT. Vauza Trikarsa Utama dan dijadwalkan menunaikan ibadah Umroh ke Tanah Suci pada:

Paket Umroh       : {nama_paket}
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kepulangan: {tanggal_pulang}
Lama Pelaksanaan : {lama_cuti_hari} Hari

Mengingat pentingnya rangkaian ibadah tersebut, kami memohon kesediaan Bapak/Ibu Pimpinan kiranya dapat memberikan izin cuti / dispensasi kerja kepada yang bersangkutan selama periode keberangkatan tersebut di atas.

Demikian surat permohonan ini kami sampaikan. Atas perhatian, kebijaksanaan, dan kerjasama Bapak/Ibu, kami ucapkan terima kasih.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK Karyawan", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "nama_perusahaan", label: "Nama Perusahaan / Instansi", sourceType: "manual", inputType: "text", defaultValue: "PT. Maju Bersama", placeholderHint: "Nama kantor/perusahaan" },
      { key: "kota_kantor", label: "Kota Kantor / Instansi", sourceType: "manual", inputType: "city", defaultValue: "Jakarta", placeholderHint: "Kota tempat bekerja" },
      { key: "jabatan_karyawan", label: "Jabatan Karyawan", sourceType: "manual", inputType: "text", defaultValue: "Staff Operasional", placeholderHint: "Jabatan/posisi" },
      { key: "departemen", label: "Departemen / Divisi", sourceType: "manual", inputType: "text", defaultValue: "Divisi Operasional" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "lama_cuti_hari", label: "Lama Cuti (Hari)", sourceType: "manual", inputType: "number", defaultValue: "10", placeholderHint: "Jumlah hari cuti" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-cuti-sekolah",
    slug: "cuti-sekolah",
    nama: "Surat Cuti / Dispensasi Sekolah / Kuliah",
    kategori: "sekolah",
    deskripsi: "Permohonan dispensasi izin tidak masuk sekolah / kampus selama menunaikan ibadah umroh",
    kodeNomorDefault: "SC-SEKOLAH",
    formatNomor: "[NOMOR]/SC-SEKOLAH/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Izin_Sekolah_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Izin_Sekolah.docx",
    perihalDefault: "Permohonan Dispensasi Izin Tidak Masuk Sekolah / Kuliah",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas",
    tujuanDefault: "Yth. Kepala Sekolah / Dekan {nama_sekolah}",
    kotaTujuanDefault: "{kota_sekolah}",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Bersama surat ini kami dari Penyelenggara Ibadah Umroh PT. Vauza Trikarsa Utama memberitahukan bahwa siswa / siswi / mahasiswa di bawah ini:

Nama Siswa/i      : {nama_lengkap}
NISN / NIM        : {nisn_nim}
Kelas / Jurusan   : {kelas_jurusan}
Nama Sekolah/Univ : {nama_sekolah}
Nama Orang Tua    : {nama_orang_tua}

Telah terdaftar resmi dan akan menunaikan Ibadah Umroh ke Tanah Suci bersama keluarga melalui travel kami pada:

Paket Umroh       : {nama_paket}
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kepulangan: {tanggal_pulang}
Rencana Masuk Kbm : {tanggal_masuk_kembali}

Sehubungan dengan hal tersebut, kami memohon kiranya Bapak/Ibu Kepala Sekolah / Dosen dapat memberikan izin dispensasi tidak mengikuti kegiatan belajar mengajar selama periode keberangkatan tersebut.

Demikian permohonan ini kami ajukan. Atas perhatian, dukungan, dan izin yang diberikan, kami haturkan terima kasih.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap Siswa", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nisn_nim", label: "NISN / NIM / No. Induk", sourceType: "manual", inputType: "text", defaultValue: "20241001", placeholderHint: "Nomor Induk Siswa/Mahasiswa" },
      { key: "kelas_jurusan", label: "Kelas / Jurusan", sourceType: "manual", inputType: "text", defaultValue: "Kelas XI IPA 2", placeholderHint: "Tingkat kelas atau jurusan" },
      { key: "nama_sekolah", label: "Nama Sekolah / Universitas", sourceType: "manual", inputType: "text", defaultValue: "SMA Negeri 1", placeholderHint: "Nama institusi pendidikan" },
      { key: "kota_sekolah", label: "Kota Sekolah", sourceType: "manual", inputType: "city", defaultValue: "Sidoarjo" },
      { key: "nama_orang_tua", label: "Nama Orang Tua / Ayah", sourceType: "manifest", manifestField: "jamaah.namaAyah", inputType: "text" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "tanggal_masuk_kembali", label: "Tanggal Kembali Masuk Sekolah", sourceType: "manual", inputType: "date", defaultValue: "" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-surat-keterangan",
    slug: "keterangan",
    nama: "Surat Keterangan Terdaftar Jamaah",
    kategori: "internal",
    deskripsi: "Keterangan resmi status calon jamaah umroh aktif terdaftar di sistem PT. VTU Abadi",
    kodeNomorDefault: "SK-JAMAAH",
    formatNomor: "[NOMOR]/SK-JAMAAH/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Keterangan_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Keterangan_Jamaah.docx",
    perihalDefault: "Surat Keterangan Terdaftar Calon Jamaah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "-",
    tujuanDefault: "Kepada Pihak yang Berkepentingan",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Yang bertanda tangan di bawah ini menerangkan bahwa:

Nama Lengkap      : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Nomor Paspor      : {nomor_paspor}
Tempat/Tgl Lahir  : {tempat_lahir}, {tanggal_lahir}
Alamat Lengkap    : {alamat}
Nomor Registrasi  : {nomor_registrasi}

Adalah benar calon jamaah Umroh PT. Vauza Trikarsa Utama (Izin PPIU Kemenag RI No. U.400/2021) yang telah menyelesaikan proses administrasi pendaftaran untuk program keberangkatan:

Paket Umroh       : {nama_paket}
Kode Manifest     : {kode_paket}
Tanggal Berangkat : {tanggal_berangkat}
Status Registrasi : {status_registrasi}

Surat keterangan ini diterbitkan atas permintaan yang bersangkutan untuk keperluan: {keperluan_surat}.

Demikian surat keterangan ini kami berikan untuk dapat dipergunakan sebagaimana mestinya.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "tempat_lahir", label: "Tempat Lahir", sourceType: "manifest", manifestField: "jamaah.tempatLahir", inputType: "city" },
      { key: "tanggal_lahir", label: "Tanggal Lahir", sourceType: "manifest", manifestField: "jamaah.tanggalLahir", inputType: "date" },
      { key: "alamat", label: "Alamat", sourceType: "manifest", manifestField: "jamaah.alamat", inputType: "textarea" },
      { key: "nomor_registrasi", label: "No Registrasi", sourceType: "manifest", manifestField: "jamaah.registrationId", inputType: "text" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "kode_paket", label: "Kode Manifest", sourceType: "manifest", manifestField: "keberangkatan.kode", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "status_registrasi", label: "Status Jamaah", sourceType: "manual", inputType: "text", defaultValue: "Terdaftar Resmi (Lengkap)" },
      { key: "keperluan_surat", label: "Keperluan Pembuatan Surat", sourceType: "manual", inputType: "text", defaultValue: "Kelengkapan Administrasi & Verifikasi Keberangkatan" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-surat-tugas",
    slug: "tugas",
    nama: "Surat Perintah Tugas Petugas / Muthawwif",
    kategori: "internal",
    deskripsi: "Surat penugasan operasional resmi Tour Leader, Muthawwif, Medis, & Tim Handling",
    kodeNomorDefault: "ST-PETUGAS",
    formatNomor: "[NOMOR]/ST/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "SK_{{Nama Pegawai}}",
    fileNameUploaded: "Template_Surat_Tugas.docx",
    perihalDefault: "Surat Perintah Tugas Operasional Ibadah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Lembar Manifest",
    tujuanDefault: "Kepada Petugas yang Ditugaskan",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `SURAT PERINTAH TUGAS OPERASIONAL

Pimpinan PT. Vauza Trikarsa Utama dengan ini memberikan tugas dan tanggung jawab kepada:

Nama Petugas      : {Nama Pegawai}
ID / NIP Petugas  : {NIP}
Jabatan Tugas     : {peran_tugas}
Nomor Kontak      : {kontak_petugas}

Untuk melaksanakan tugas pembimbingan dan pengawalan rombongan jamaah umroh pada program:

Paket Keberangkatan : {nama_paket}
Kode Rombongan      : {kode_paket}
Tanggal Berangkat   : {tanggal_berangkat}
Tanggal Kepulangan  : {tanggal_pulang}
Jumlah Jamaah       : {jumlah_jamaah} Orang

Rincian Tanggung Jawab Operasional:
1. Memimpin dan membimbing jalannya ibadah umroh sesuai sunnah Nabi SAW.
2. Memastikan kelancaran proses handling bandara, hotel, transportasi, dan ziarah.
3. Melakukan koordinasi berkala dengan tim kantor pusat dan perwakilan di Arab Saudi.

Demikian surat tugas ini diterbitkan untuk dilaksanakan dengan penuh amanah dan tanggung jawab.`,
    placeholders: [
      { key: "Nama Pegawai", label: "Nama Pegawai", sourceType: "manual", inputType: "text", defaultValue: "Ust. Ahmad Zaki, Lc.", placeholderHint: "Nama lengkap petugas" },
      { key: "NIP", label: "Nomor Induk Pegawai (NIP)", sourceType: "manual", inputType: "text", defaultValue: "PTG-2026-004" },
      { key: "peran_tugas", label: "Peran / Jabatan Tugas", sourceType: "manual", inputType: "select", options: ["Tour Leader (TL)", "Muthawwif Utama", "Pembimbing Ibadah", "Petugas Medis", "Handling Bandara"], defaultValue: "Tour Leader (TL)" },
      { key: "kontak_petugas", label: "Nomor Kontak Petugas", sourceType: "manual", inputType: "text", defaultValue: "081122334455" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "kode_paket", label: "Kode Manifest", sourceType: "manifest", manifestField: "keberangkatan.kode", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "jumlah_jamaah", label: "Jumlah Jamaah Rombongan", sourceType: "manual", inputType: "number", defaultValue: "45" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-klaim-asuransi",
    slug: "klaim-asuransi",
    nama: "Surat Pengantar Klaim Asuransi",
    kategori: "asuransi",
    deskripsi: "Pengantar klaim penggantian biaya medis, pembatalan, atau penanganan darurat asuransi",
    kodeNomorDefault: "SKA-ASURANSI",
    formatNomor: "[NOMOR]/SKA-ASURANSI/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Klaim_Asuransi_{{nama_lengkap}}",
    fileNameUploaded: "Template_Klaim_Asuransi.docx",
    perihalDefault: "Permohonan Pengajuan Klaim Asuransi Perjalanan Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas Medis & Tagihan",
    tujuanDefault: "Yth. Bagian Klaim {nama_perusahaan_asuransi}",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Fauzan Adzim, S.E.",
      jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Sehubungan dengan kepesertaan asuransi perjalanan ibadah umroh jamaah PT. Vauza Trikarsa Utama, bersama ini kami mengajukan permohonan klaim asuransi atas nama tertanggung:

Nama Jamaah / Tertanggung : {nama_lengkap}
Nomor Paspor              : {nomor_paspor}
Nomor NIK                 : {nik}
Nomor Polis / Sertifikat  : {nomor_polis}
Paket & Keberangkatan     : {nama_paket} ({tanggal_berangkat})

Rincian Kejadian Klaim:
Jenis Klaim               : {jenis_klaim}
Tanggal & Waktu Kejadian  : {tanggal_kejadian}
Lokasi Kejadian           : {lokasi_kejadian}
Estimasi Nominal Klaim    : Rp {nominal_klaim}
Keterangan Medis/Kronologi: {kronologi_singkat}

Bersama surat ini kami lampirkan dokumen pendukung berupa tagihan rumah sakit, resep obat, laporan medis, dan tiket perjalanan.

Besar harapan kami kiranya permohonan klaim ini dapat segera diproses sesuai ketentuan polis yang berlaku. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.`,
    placeholders: [
      { key: "nama_perusahaan_asuransi", label: "Nama Asuransi", sourceType: "manual", inputType: "text", defaultValue: "Asuransi Syariah Al-Amin / Zurich" },
      { key: "nama_lengkap", label: "Nama Jamaah", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "nik", label: "NIK", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text" },
      { key: "nomor_polis", label: "Nomor Polis Asuransi", sourceType: "manual", inputType: "text", defaultValue: "POLIS-UMR-2026-8821" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "jenis_klaim", label: "Jenis Klaim", sourceType: "manual", inputType: "select", options: ["Biaya Pengobatan / Rawat Inap", "Keterlambatan Penerbangan", "Kehilangan Bagasi", "Pembatalan Akibat Sakit Kritis"], defaultValue: "Biaya Pengobatan / Rawat Inap" },
      { key: "tanggal_kejadian", label: "Tanggal Kejadian", sourceType: "manual", inputType: "date", defaultValue: "" },
      { key: "lokasi_kejadian", label: "Lokasi Kejadian", sourceType: "manual", inputType: "city", defaultValue: "Mekkah Al-Mukarramah" },
      { key: "nominal_klaim", label: "Nominal Estimasi Klaim", sourceType: "manual", inputType: "number", defaultValue: "5000000" },
      { key: "kronologi_singkat", label: "Kronologi Singkat Kejadian", sourceType: "manual", inputType: "textarea", defaultValue: "Jamaah mengalami kelelahan dan dehidrasi saat pelaksanaan ibadah sehingga dirawat di RS Jiad Makkah." },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ────────────────────────────────────────────────────────────
// AUTOCRAT ENGINE: RESOLVE VALUES FROM MANIFEST & FORM DATA
// ────────────────────────────────────────────────────────────

export function resolveAutocratFieldValues(
  template: SuratTemplate,
  jamaah: any | null,
  keberangkatan: any | null,
  manualFormData: Record<string, any> = {}
): Record<string, string> {
  const today = getTodayDateInfo();
  const values: Record<string, string> = {};

  // Extract all placeholders in template
  const detectedKeys = extractPlaceholdersFromText(
    `${template.templateContent} ${template.perihalDefault} ${template.tujuanDefault || ""} ${template.kotaTujuanDefault || ""}`
  );

  detectedKeys.forEach((key) => {
    // Check if mapping exists in template.placeholders
    const mapping = template.placeholders.find((p) => p.key.toLowerCase() === key.toLowerCase());

    if (mapping) {
      if (mapping.sourceType === "manifest" && mapping.manifestField) {
        // Resolve from manifest / jamaah / keberangkatan
        values[key] = resolveManifestFieldValue(mapping.manifestField, jamaah, keberangkatan, today);
      } else {
        // Manual form data priority -> defaultValue -> empty string
        values[key] = manualFormData[key] !== undefined ? String(manualFormData[key]) : (mapping.defaultValue ?? "");
      }
    } else {
      // Smart Auto-detection based on key name if not explicitly configured in mapping!
      values[key] = autoDetectManifestValue(key, jamaah, keberangkatan, today, manualFormData);
    }
  });

  return values;
}

// ────────────────────────────────────────────────────────────
// RESOLVE SPECIFIC MANIFEST FIELD
// ────────────────────────────────────────────────────────────

export function resolveManifestFieldValue(
  fieldKey: string,
  jamaah: any | null,
  keberangkatan: any | null,
  today = getTodayDateInfo()
): string {
  if (!fieldKey) return "";

  // Jamaah fields
  if (fieldKey.startsWith("jamaah.")) {
    if (!jamaah) return "";
    const subKey = fieldKey.replace("jamaah.", "");
    switch (subKey) {
      case "namaLengkap":
        return (jamaah.namaLengkap || jamaah.name || "").toUpperCase();
      case "nik":
        return jamaah.nik || "-";
      case "nomorPaspor":
        return (
          jamaah.nomorPaspor ||
          jamaah.passportNumber ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "paspor")?.ocrData?.nomorPaspor ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "paspor")?.manualData?.nomorPaspor ||
          "-"
        );
      case "tempatLahir":
        return jamaah.tempatLahir || jamaah.pob || "-";
      case "tanggalLahir":
        return jamaah.tanggalLahir ? formatDate(jamaah.tanggalLahir) : (jamaah.dob ? formatDate(jamaah.dob) : "-");
      case "jenisKelamin":
        return jamaah.jenisKelamin === "L" || jamaah.jenisKelamin === "LAKI-LAKI"
          ? "LAKI-LAKI"
          : jamaah.jenisKelamin === "P" || jamaah.jenisKelamin === "PEREMPUAN"
          ? "PEREMPUAN"
          : "-";
      case "namaAyah":
        return (jamaah.namaAyah || jamaah.ayahKandung || jamaah.fatherName || "-").toUpperCase();
      case "alamat":
        return jamaah.alamat || jamaah.address || "-";
      case "nomorTelepon":
        return jamaah.nomorTelepon || jamaah.noHp || jamaah.phone || "-";
      case "registrationId":
        return jamaah.registrationId || jamaah.nomorPeserta || jamaah.id || "-";
      default:
        return jamaah[subKey] ? String(jamaah[subKey]) : "";
    }
  }

  // Keberangkatan fields
  if (fieldKey.startsWith("keberangkatan.")) {
    if (!keberangkatan) return "";
    const subKey = fieldKey.replace("keberangkatan.", "");
    switch (subKey) {
      case "namaPaket":
        return keberangkatan.namaPaket || keberangkatan.paketUmroh?.namaPaket || keberangkatan.name || "-";
      case "kode":
        return keberangkatan.kode || keberangkatan.kodePaket || "-";
      case "tanggalBerangkat":
        return keberangkatan.tanggalBerangkat
          ? formatDate(keberangkatan.tanggalBerangkat)
          : keberangkatan.departureDate
          ? formatDate(keberangkatan.departureDate)
          : "-";
      case "tanggalPulang":
        return keberangkatan.tanggalPulang
          ? formatDate(keberangkatan.tanggalPulang)
          : keberangkatan.returnDate
          ? formatDate(keberangkatan.returnDate)
          : "-";
      case "programHari":
        return keberangkatan.programHari
          ? `${keberangkatan.programHari} Hari`
          : keberangkatan.durationDays
          ? `${keberangkatan.durationDays} Hari`
          : "9 Hari";
      case "maskapai":
        return keberangkatan.maskapai || keberangkatan.airline || "Saudia Airlines";
      case "hotelMekkah":
        return keberangkatan.hotelMekkah || keberangkatan.hotelMakkah || "Pullman Zamzam Makkah (Bintang 5)";
      case "hotelMadinah":
        return keberangkatan.hotelMadinah || "Rove Al Madinah (Bintang 4)";
      case "startingPoint":
        return keberangkatan.startingPoint || "Bandara Juanda Surabaya (SUB)";
      default:
        return keberangkatan[subKey] ? String(keberangkatan[subKey]) : "";
    }
  }

  // System & Today fields
  if (fieldKey === "today.masehi") return today.masehi;
  if (fieldKey === "today.hijriyah") return today.hijriyah;
  if (fieldKey === "today.bulanRomawi") return today.bulanRomawi;
  if (fieldKey === "today.tahun") return String(today.year);
  if (fieldKey === "vtu.pimpinan") return "H. Fauzan Adzim, S.E.";
  if (fieldKey === "vtu.jabatan") return "Direktur Utama";
  if (fieldKey === "vtu.noIzin") return "Izin Kemenag RI No. U.400 Tahun 2021";

  return "";
}

// ────────────────────────────────────────────────────────────
// SMART AUTO-DETECTION FOR UNMAPPED TAGS
// ────────────────────────────────────────────────────────────

function autoDetectManifestValue(
  key: string,
  jamaah: any | null,
  keberangkatan: any | null,
  today = getTodayDateInfo(),
  manualFormData: Record<string, any> = {}
): string {
  const k = key.toLowerCase();

  // If user provided manual value
  if (manualFormData[key] !== undefined) {
    return String(manualFormData[key]);
  }

  // Common keywords
  if (k.includes("nama_lengkap") || k === "nama" || k === "nama_jamaah") {
    return resolveManifestFieldValue("jamaah.namaLengkap", jamaah, keberangkatan, today);
  }
  if (k === "nik" || k.includes("ktp")) {
    return resolveManifestFieldValue("jamaah.nik", jamaah, keberangkatan, today);
  }
  if (k.includes("paspor")) {
    return resolveManifestFieldValue("jamaah.nomorPaspor", jamaah, keberangkatan, today);
  }
  if (k.includes("tempat_lahir")) {
    return resolveManifestFieldValue("jamaah.tempatLahir", jamaah, keberangkatan, today);
  }
  if (k.includes("tanggal_lahir") || k === "tgl_lahir") {
    return resolveManifestFieldValue("jamaah.tanggalLahir", jamaah, keberangkatan, today);
  }
  if (k.includes("jenis_kelamin") || k === "gender") {
    return resolveManifestFieldValue("jamaah.jenisKelamin", jamaah, keberangkatan, today);
  }
  if (k.includes("ayah") || k.includes("orang_tua")) {
    return resolveManifestFieldValue("jamaah.namaAyah", jamaah, keberangkatan, today);
  }
  if (k.includes("alamat")) {
    return resolveManifestFieldValue("jamaah.alamat", jamaah, keberangkatan, today);
  }
  if (k.includes("telepon") || k.includes("hp") || k.includes("wa")) {
    return resolveManifestFieldValue("jamaah.nomorTelepon", jamaah, keberangkatan, today);
  }
  if (k.includes("nama_paket") || k === "paket") {
    return resolveManifestFieldValue("keberangkatan.namaPaket", jamaah, keberangkatan, today);
  }
  if (k.includes("kode_paket") || k === "kode_keberangkatan" || k === "kode_manifest") {
    return resolveManifestFieldValue("keberangkatan.kode", jamaah, keberangkatan, today);
  }
  if (k.includes("tanggal_berangkat") || k === "tgl_berangkat") {
    return resolveManifestFieldValue("keberangkatan.tanggalBerangkat", jamaah, keberangkatan, today);
  }
  if (k.includes("tanggal_pulang") || k === "tgl_pulang" || k.includes("tanggal_kembali")) {
    return resolveManifestFieldValue("keberangkatan.tanggalPulang", jamaah, keberangkatan, today);
  }
  if (k.includes("maskapai")) {
    return resolveManifestFieldValue("keberangkatan.maskapai", jamaah, keberangkatan, today);
  }
  if (k.includes("hotel_mekkah") || k.includes("hotel_makkah")) {
    return resolveManifestFieldValue("keberangkatan.hotelMekkah", jamaah, keberangkatan, today);
  }
  if (k.includes("hotel_madinah")) {
    return resolveManifestFieldValue("keberangkatan.hotelMadinah", jamaah, keberangkatan, today);
  }
  if (k.includes("program_hari") || k === "durasi") {
    return resolveManifestFieldValue("keberangkatan.programHari", jamaah, keberangkatan, today);
  }
  if (k.includes("tanggal_hari_ini") || k === "today") {
    return today.masehi;
  }

  return manualFormData[key] || "";
}

// ────────────────────────────────────────────────────────────
// MERGE TEMPLATE TEXT WITH RESOLVED VALUES
// ────────────────────────────────────────────────────────────

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderAutocratMergedText(templateText: string, resolvedValues: Record<string, string>): string {
  if (!templateText) return "";

  let result = templateText;
  Object.keys(resolvedValues).forEach((key) => {
    const val = resolvedValues[key] !== undefined ? String(resolvedValues[key]) : "";
    const escapedKey = escapeRegExp(key);
    // Replace {key}, {{key}}, { key }, {{ key }} (case-insensitive)
    const pattern = new RegExp(`\\{+\\s*${escapedKey}\\s*\\}+`, "gi");
    result = result.replace(pattern, val);
  });

  return result;
}

// ────────────────────────────────────────────────────────────
// LOCAL STORAGE PERSISTENCE REPOSITORY FOR GENERATED LOGS
// ────────────────────────────────────────────────────────────

const STORAGE_KEY_TEMPLATES = "vtu_surat_templates_v2";
const STORAGE_KEY_GENERATED_LOGS = "vtu_surat_generated_logs_v2";

export function loadSavedSuratTemplates(): SuratTemplate[] {
  if (typeof window === "undefined") return DEFAULT_SURAT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(DEFAULT_SURAT_TEMPLATES));
      return DEFAULT_SURAT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SURAT_TEMPLATES;
  } catch {
    return DEFAULT_SURAT_TEMPLATES;
  }
}

export function saveSuratTemplates(templates: SuratTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error("Failed to persist templates to localStorage", err);
  }
}

export function loadGeneratedSuratLogs(): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GENERATED_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedSuratLog(log: GeneratedSuratLog): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const current = loadGeneratedSuratLogs();
    // Filter out if duplicate ID exists
    const updated = [log, ...current.filter((item) => item.id !== log.id)];
    localStorage.setItem(STORAGE_KEY_GENERATED_LOGS, JSON.stringify(updated.slice(0, 500))); // Keep last 500
    return updated;
  } catch (err) {
    console.error("Failed to persist generated surat log", err);
    return [];
  }
}

export function deleteGeneratedSuratLog(id: string): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const current = loadGeneratedSuratLogs();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_GENERATED_LOGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to delete generated surat log", err);
    return [];
  }
}
