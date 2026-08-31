export type SuratKategori =
  | "imigrasi"
  | "instansi"
  | "sekolah"
  | "internal"
  | "asuransi"
  | "custom";

export type SuratFieldSourceType = "manifest" | "manual";

export type SuratInputType = "text" | "date" | "city" | "number" | "select" | "textarea";

export interface SuratPlaceholderMapping {
  key: string;               // e.g. "nama_lengkap" or "Nama Pegawai"
  label: string;             // e.g. "Nama Lengkap Jamaah"
  sourceType: SuratFieldSourceType; // "manifest" (auto-filled from manifest) or "manual" (form prompt)
  manifestField?: string;    // e.g. "jamaah.namaLengkap", "jamaah.nik", "jamaah.nomorPaspor", etc.
  inputType?: SuratInputType; // "text" (Teks Singkat), "date" (Tanggal), "city" (Kota / Tempat), "number" (Angka), "textarea" (Teks Panjang), "select" (Pilihan Dropdown)
  defaultValue?: string;
  placeholderHint?: string;
  options?: string[];        // for select options
  required?: boolean;
}

export interface SuratTemplate {
  id: string;
  slug: string;              // e.g. "rekom-paspor", "cuti-pekerja", "cuti-sekolah", "keterangan", "tugas", "klaim-asuransi"
  nama: string;              // e.g. "Surat Tugas", "Surat Rekomendasi Paspor"
  kategori: SuratKategori;
  deskripsi: string;
  kodeNomorDefault: string;  // e.g. "ST", "SR-PASPOR"
  formatNomor?: string;      // e.g. "[NOMOR]/ST/[BULAN]/[TAHUN]"
  kebutuhanNomorPerSurat?: number; // e.g. 1
  jumlahTemplateTerlampir?: number; // e.g. 1
  formatNamaFile?: string;   // e.g. "SK_{{Nama Pegawai}}" or "Surat_{{nama_lengkap}}"
  fileNameUploaded?: string; // e.g. "Template_Surat_Tugas.docx"
  perihalDefault: string;    // e.g. "Surat Tugas Keberangkatan Umroh"
  kopSuratType: "ppiu_vtu" | "custom" | "none";
  lampiranDefault?: string;  // e.g. "1 (Satu) Berkas"
  tujuanDefault?: string;    // e.g. "Yth. Kepala Kantor Imigrasi"
  kotaTujuanDefault?: string;// e.g. "Di Tempat"
  penandatangan: {
    nama: string;
    jabatan: string;
    showStempel: boolean;
    showBarcode: boolean;
  };
  // The letter template body containing {placeholder_tags}
  templateContent: string;
  // Field mappings (Autocrat mapping)
  placeholders: SuratPlaceholderMapping[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedSuratLog {
  id: string;
  nomorSurat: string;
  templateId: string;
  templateSlug: string;
  templateName: string;
  kategori: SuratKategori;
  jamaahId?: string;
  jamaahNama: string;
  jamaahPaspor?: string;
  jamaahNik?: string;
  packageId?: string;
  packageKode?: string;
  packageName: string;
  departureDate?: string;
  returnDate?: string;
  perihal: string;
  generatedDate: string;
  createdBy: string;
  fieldsData: Record<string, any>;
  renderedHtml?: string;
  renderedText?: string;
  recipientContact?: string;
  status: "aktif" | "dibatalkan";
  verificationUrl?: string;
}

export interface ManifestFieldOption {
  key: string;               // e.g. "jamaah.namaLengkap"
  label: string;             // e.g. "Nama Lengkap Jamaah"
  group: "Jamaah" | "Keberangkatan / Paket" | "Tanggal & Sistem";
  sampleValue: string;
}
