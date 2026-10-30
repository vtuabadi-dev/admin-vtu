import { describe, it, expect } from "vitest";
import {
  extractPlaceholdersFromText,
  extractDocxTextFromXml,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  DEFAULT_SURAT_TEMPLATES,
  isSystemAutoPlaceholder,
  formatMonthYear,
  toTitleCase,
  matchTagToManifestField,
  extractNamaFromAutocratFields,
  generateSuratFileName,
  parseDateToIsoString,
  formatIsoToIndonesianDate,
  formatIsoToIndonesianDateRange,
  parseDateRangeToIsoStrings,
  parseMonthYearToIsoString,
  formatIsoToIndonesianMonthYear,
  formatJamaahNameWithEndorsement,
  countNameWords,
  generateWaTemplateText,
  parseWaFormText,
} from "@/shared/lib/surat-autocrat-engine";
import { searchKantorImigrasi, getKotaFromKanimName } from "@/shared/lib/kantor-imigrasi";

describe("Surat Autocrat Merge Engine", () => {
  it("should extract {placeholders} and {{placeholders}} from template text accurately", () => {
    const text = "Yth. {nama_lengkap} dengan NIK {nik} dan Paspor {{nomor_paspor}} paket {nama_paket}.";
    const tags = extractPlaceholdersFromText(text);
    expect(tags).toEqual(["nama_lengkap", "nik", "nomor_paspor", "nama_paket"]);
  });

  it("should resolve manifest fields automatically when jamaah and package data are provided", () => {
    const template = DEFAULT_SURAT_TEMPLATES[0]!; // Rekom Paspor
    const mockJamaah = {
      namaLengkap: "Muchamad Zamroni",
      nik: "3515082103850001",
      nomorPaspor: "X1234567",
      tempatLahir: "Sidoarjo",
      tanggalLahir: "1985-03-21",
      jenisKelamin: "L",
      namaAyah: "H. Ahmad Sofwan",
      alamat: "Jl. Raya Taman No. 45, Sidoarjo",
      nomorTelepon: "081234567890",
      registrationId: "REG-2026-0814",
    };
    const mockKeberangkatan = {
      namaPaket: "Paket Umroh Reguler Awal Musim 1448 H",
      kode: "KBR-2026-08-A",
      tanggalBerangkat: "2026-09-15",
      tanggalPulang: "2026-09-24",
      programHari: 9,
      maskapai: "Saudia Airlines",
      hotelMekkah: "Pullman Zamzam Makkah",
      hotelMadinah: "Rove Al Madinah",
    };

    const resolved = resolveAutocratFieldValues(template, mockJamaah, mockKeberangkatan, {});

    expect(resolved.nama_lengkap).toBe("Muchamad Zamroni");
    expect(resolved.nik).toBe("3515082103850001");
    expect(resolved.tempat_lahir).toBe("Sidoarjo");
    expect(resolved.alamat).toBe("Jl. Raya Taman No. 45, Sidoarjo");
    expect(resolved.jenis_kelamin).toBe("LAKI-LAKI");
    expect(resolved.nama_paket).toBe("Paket Umroh Reguler Awal Musim 1448 H");
  });

  it("should merge template text correctly with resolved placeholder values", () => {
    const templateText = "Nama: {nama_lengkap}\nNIK: {nik}\nPaket: {nama_paket}";
    const resolvedValues = {
      nama_lengkap: "MUCHAMAD ZAMRONI",
      nik: "3515082103850001",
      nama_paket: "Paket Umroh 9 Hari",
    };

    const merged = renderAutocratMergedText(templateText, resolvedValues);
    expect(merged).toContain("Nama: MUCHAMAD ZAMRONI");
    expect(merged).toContain("NIK: 3515082103850001");
    expect(merged).toContain("Paket: Paket Umroh 9 Hari");
  });

  it("should extract Autocrat <<tags>>, «guillemets», and tags with apostrophes like {{Nama Jama'ah}}", () => {
    const text = "Kepada Yth. <<Nama Jama'ah>>, NIK: <<nik>>, Paket: «nama_paket», Dokumen: [[nomor_surat]].";
    const tags = extractPlaceholdersFromText(text);
    expect(tags).toEqual(["Nama Jama'ah", "nik", "nama_paket", "nomor_surat"]);
  });

  it("should parse docx XML with split runs and XML entities into clean tags", () => {
    // Word frequently splits runs inside a paragraph and encodes < and > as &lt; and &gt;
    const wordXml = `
      <w:p>
        <w:r><w:t>&lt;&lt;Nama</w:t></w:r>
        <w:r><w:t> Jama'ah&gt;&gt;</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>&lt;&lt;nik&gt;&gt;</w:t></w:r>
      </w:p>
    `;
    const parsedText = extractDocxTextFromXml(wordXml);
    expect(parsedText).toContain("<<Nama Jama'ah>>");
    expect(parsedText).toContain("<<nik>>");

    const tags = extractPlaceholdersFromText(parsedText);
    expect(tags).toEqual(["Nama Jama'ah", "nik"]);
  });

  it("should deduplicate shared placeholders between Template Dokumen 1 and Dokumen 2", () => {
    const doc1Text = "Dokumen 1: <<Nama Jama'ah>>, <<NIK>>, <<nomor_paspor>>";
    const doc2Text = "Dokumen 2: <<Nama Jama'ah>>, <<nik>>, <<alamat>>";

    const combinedText = `${doc1Text}\n${doc2Text}`;
    const tags = extractPlaceholdersFromText(combinedText);

    // Should contain unique tags without duplicating "Nama Jama'ah" or "nik" (case-insensitive)
    expect(tags).toHaveLength(4);
    expect(tags.map(t => t.toLowerCase())).toEqual([
      "nama jama'ah",
      "nik",
      "nomor_paspor",
      "alamat",
    ]);
  });

  it("should render and replace Autocrat <<key>>, «key», and {{key}} correctly", () => {
    const templateText = "Kepada Yth. <<Nama Jama'ah>> (NIK: {{nik}})\nPaket: «nama_paket»";
    const resolvedValues = {
      "Nama Jama'ah": "MUCHAMAD ZAMRONI",
      "nik": "3515082103850001",
      "nama_paket": "Paket Umroh Reguler",
    };

    const merged = renderAutocratMergedText(templateText, resolvedValues);
    expect(merged).toContain("Kepada Yth. MUCHAMAD ZAMRONI (NIK: 3515082103850001)");
    expect(merged).toContain("Paket: Paket Umroh Reguler");
  });

  it("should correctly identify system auto placeholders (Nomor Surat, Tanggal Surat, etc.)", () => {
    // True cases: system-managed tags
    expect(isSystemAutoPlaceholder("Nomor Surat")).toBe(true);
    expect(isSystemAutoPlaceholder("Nomor Surat 1")).toBe(true);
    expect(isSystemAutoPlaceholder("Nomor Surat 2")).toBe(true);
    expect(isSystemAutoPlaceholder("no_surat")).toBe(true);
    expect(isSystemAutoPlaceholder("nomor")).toBe(true);
    expect(isSystemAutoPlaceholder("Tanggal Surat")).toBe(true);
    expect(isSystemAutoPlaceholder("tanggal_surat")).toBe(true);
    expect(isSystemAutoPlaceholder("Tanggal Hari Ini")).toBe(true);
    expect(isSystemAutoPlaceholder("today")).toBe(true);
    expect(isSystemAutoPlaceholder("tanggal_hijriyah")).toBe(true);

    // False cases: manual user input / manifest fields
    expect(isSystemAutoPlaceholder("Nama Jama'ah")).toBe(false);
    expect(isSystemAutoPlaceholder("nama_lengkap")).toBe(false);
    expect(isSystemAutoPlaceholder("nik")).toBe(false);
    expect(isSystemAutoPlaceholder("kantor_imigrasi")).toBe(false);
    expect(isSystemAutoPlaceholder("kanim")).toBe(false);
    expect(isSystemAutoPlaceholder("kota_kanim")).toBe(false);
  });

  it("should resolve systemOverrides for Nomor Surat and Tanggal Surat without manual inputs", () => {
    const template = {
      ...DEFAULT_SURAT_TEMPLATES[0]!,
      templateContent: "Nomor: {{Nomor Surat}}\nTanggal: {{Tanggal Surat}}\nNama: {{nama_lengkap}}",
    };
    const overrides = {
      nomorSurat: "001/SR-PASPOR/VTU/IX/2026",
      tanggalSurat: "12 September 2026",
    };

    const resolved = resolveAutocratFieldValues(
      template,
      null,
      null,
      {},
      overrides
    );

    expect(resolved["Nomor Surat"]).toBe("001/SR-PASPOR/VTU/IX/2026");
    expect(resolved["Tanggal Surat"]).toBe("12 September 2026");
  });

  it("should provide searchable Kantor Imigrasi and Layanan Paspor list", () => {
    const surabayaResults = searchKantorImigrasi("Surabaya");
    expect(surabayaResults.length).toBeGreaterThanOrEqual(1);
    expect(surabayaResults[0]?.nama).toContain("Surabaya");

    const soekarnoHattaResults = searchKantorImigrasi("Soekarno Hatta");
    expect(soekarnoHattaResults.length).toBeGreaterThanOrEqual(1);

    const mppResults = searchKantorImigrasi("MPP");
    expect(mppResults.length).toBeGreaterThanOrEqual(1);
  });

  it("should accurately lookup kota from kanim name via getKotaFromKanimName with backward compatibility", () => {
    // Nomenklatur baru resmi (Kepmen Imipas 2026 & imigrasi.go.id)
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas I Khusus TPI Juanda")).toBe("Surabaya");
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas I Khusus TPI Kualanamu")).toBe("Deli Serdang");
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas I Non TPI Medan")).toBe("Medan");

    // Backward compatibility untuk data lama di template
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas I Khusus TPI Surabaya")).toBe("Surabaya");
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas II Non TPI Sidoarjo")).toBe("Sidoarjo");
    expect(getKotaFromKanimName("Kantor Imigrasi Kelas I Khusus TPI Soekarno-Hatta")).toBe("Tangerang");
    expect(getKotaFromKanimName("Kanim Kelas I TPI Surakarta (Solo)")).toBe("Surakarta");
    expect(getKotaFromKanimName("Mal Pelayanan Publik (MPP) Siola Surabaya")).toBe("Surabaya");

    // Google Maps Place names
    expect(getKotaFromKanimName("Kanim Surabaya (TPI)")).toBe("Surabaya");
    expect(getKotaFromKanimName("Kanim Malang (TPI)")).toBe("Malang");
  });

  it("should auto-fill kota_kanim via VLOOKUP when admin fills kantor_imigrasi in manual form", () => {
    const template = {
      ...DEFAULT_SURAT_TEMPLATES[0]!,
      templateContent: "Kantor: {{kantor_imigrasi}}\nKota: {{kota_kanim}}",
      placeholders: [
        { key: "kantor_imigrasi", label: "Kantor Imigrasi", sourceType: "manual" as const, inputType: "kantor_imigrasi" as const },
        { key: "kota_kanim", label: "Kota Kantor Imigrasi", sourceType: "manual" as const, inputType: "city" as const },
      ],
    };

    // When admin selects a kanim and leaves kota_kanim empty:
    const resolved = resolveAutocratFieldValues(template, null, null, {
      kantor_imigrasi: "Kantor Imigrasi Kelas II Non TPI Sidoarjo",
    });

    expect(resolved.kantor_imigrasi).toBe("Kantor Imigrasi Kelas II Non TPI Sidoarjo");
    expect(resolved.kota_kanim).toBe("Sidoarjo");
  });

  it("should auto-fill manifest fields by default while still allowing manual edits to override them", () => {
    const template = DEFAULT_SURAT_TEMPLATES[0]!; // has nama_lengkap as manifest field
    const mockJamaah = { namaLengkap: "Muchamad Zamroni" };

    // Case 1: No manual edit -> auto-fills from manifest in Title Case
    const defaultResolved = resolveAutocratFieldValues(template, mockJamaah, null, {});
    expect(defaultResolved.nama_lengkap).toBe("Muchamad Zamroni");

    // Case 2: Admin edits the field in form -> manual edit overrides manifest!
    const customResolved = resolveAutocratFieldValues(template, mockJamaah, null, {
      nama_lengkap: "DR. H. MUCHAMAD ZAMRONI, M.SI",
    });
    expect(customResolved.nama_lengkap).toBe("DR. H. MUCHAMAD ZAMRONI, M.SI");
  });

  it("should format date into Indonesian 'MMMM YYYY' format accurately", () => {
    expect(formatMonthYear("2026-09-15")).toBe("September 2026");
    expect(formatMonthYear("2026-11-01")).toBe("November 2026");
    expect(formatMonthYear("2027-01-20")).toBe("Januari 2027");
    expect(formatMonthYear("Desember 2026")).toBe("Desember 2026");
    expect(formatMonthYear(new Date(2026, 8, 15))).toBe("September 2026");
  });

  it("should resolve keberangkatan.bulanKeberangkatan in (MMMM YYYY) format from manifest", () => {
    const template: any = {
      ...DEFAULT_SURAT_TEMPLATES[0]!,
      placeholders: [
        {
          key: "bulan_berangkat",
          label: "Bulan Keberangkatan",
          sourceType: "manifest",
          manifestField: "keberangkatan.bulanKeberangkatan",
        },
      ],
    };
    const mockKeberangkatan = {
      tanggalBerangkat: "2026-09-15",
    };

    const resolved = resolveAutocratFieldValues(template, null, mockKeberangkatan, {});
    expect(resolved.bulan_berangkat).toBe("September 2026");
  });

  it("should match placeholders with curly apostrophe like {{Nama Jama’ah}} to manifest field", () => {
    const template: any = {
      ...DEFAULT_SURAT_TEMPLATES[0]!,
      placeholders: [
        {
          key: "Nama Jama’ah",
          label: "Nama Jama'ah",
          sourceType: "manifest",
          manifestField: "jamaah.namaLengkap",
        },
      ],
    };
    const mockJamaah = {
      namaLengkap: "H. Faisal Wahyudi",
    };

    const resolved = resolveAutocratFieldValues(template, mockJamaah, null, {});
    expect(resolved["Nama Jama’ah"]).toBe("H. Faisal Wahyudi");

    // Also test rendering template containing curly apostrophe
    const text = "Nama Calon Jamaah: {{Nama Jama’ah}}";
    const rendered = renderAutocratMergedText(text, resolved);
    expect(rendered).toBe("Nama Calon Jamaah: H. Faisal Wahyudi");
  });

  it("should resolve Nomor Surat 1 and Nomor Surat 2 separately in multi-document templates", () => {
    const template: any = {
      ...DEFAULT_SURAT_TEMPLATES[0]!,
      templateContent: "SURAT 1 No: {{Nomor Surat 1}}\nSURAT 2 No: {{Nomor Surat 2}}",
    };

    const resolved = resolveAutocratFieldValues(template, null, null, {}, {
      nomorSurat: "001/VTU/EXT/IX/2026",
      nomorSurat2: "002/VTU/EXT/IX/2026",
    });

    expect(resolved["Nomor Surat 1"]).toBe("001/VTU/EXT/IX/2026");
    expect(resolved["Nomor Surat 2"]).toBe("002/VTU/EXT/IX/2026");

    const rendered = renderAutocratMergedText(template.templateContent, resolved);
    expect(rendered).toContain("SURAT 1 No: 001/VTU/EXT/IX/2026");
    expect(rendered).toContain("SURAT 2 No: 002/VTU/EXT/IX/2026");
  });

  it("should convert all manifest names, addresses, cities, and places into Title Case mode", () => {
    expect(toTitleCase("MUCHAMAD ZAMRONI")).toBe("Muchamad Zamroni");
    expect(toTitleCase("H. AHMAD SOFWAN, S.E.")).toBe("H. Ahmad Sofwan, S.E.");
    expect(toTitleCase("SIDOARJO")).toBe("Sidoarjo");
    expect(toTitleCase("KOTA SURABAYA")).toBe("Kota Surabaya");
    expect(toTitleCase("JL. RAYA TAMAN NO. 45, SIDOARJO, JAWA TIMUR")).toBe("Jl. Raya Taman No. 45, Sidoarjo, Jawa Timur");
    expect(toTitleCase("RT 005 / RW 002")).toBe("RT 005 / RW 002");
    expect(toTitleCase("DKI JAKARTA")).toBe("DKI Jakarta");
    expect(toTitleCase("KANTOR IMIGRASI KELAS I KHUSUS TPI SURABAYA")).toBe("Kantor Imigrasi Kelas I Khusus TPI Surabaya");

    const template = DEFAULT_SURAT_TEMPLATES[0]!;
    const mockJamaahUpper = {
      namaLengkap: "MUHAMMAD AL-FATIH",
      tempatLahir: "JAKARTA SELATAN",
      namaAyah: "H. AHMAD SOFWAN",
      alamat: "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG",
    };

    const resolved = resolveAutocratFieldValues(template, mockJamaahUpper, null, {});
    expect(resolved.nama_lengkap).toBe("Muhammad Al-Fatih");
    expect(resolved.tempat_lahir).toBe("Jakarta Selatan");
    expect(resolved.alamat).toBe("Dsn Kauman, 010/006, Kalipare, Kec. Kalipare, Kab. Malang");
  });

  it("should fallback to KTP document data when jamaah.alamat is dash or empty", () => {
    const template = DEFAULT_SURAT_TEMPLATES[0]!;
    const mockJamaahWithKtpDoc = {
      namaLengkap: "Muchamad Zamroni",
      alamat: "-",
      dokumen: [
        {
          jenis: "ktp",
          manualData: {
            alamatLengkap: "JL. ARIES MUNANDAR II / 17, RT.001/RW.003, Kel. KIDUL DALEM, Kec. KLOJEN, KOTA MALANG",
            tanggalLahir: "1992-08-12",
          },
        },
      ],
    };

    const resolved = resolveAutocratFieldValues(template, mockJamaahWithKtpDoc, null, {});
    expect(resolved.alamat).toBe("Jl. Aries Munandar II / 17, RT.001/RW.003, Kel. Kidul Dalem, Kec. Klojen, Kota Malang");
  });

  it("should auto-correct misconfigured Bulan Keberangkatan manifestField to keberangkatan.bulanKeberangkatan", () => {
    const template: any = {
      id: "test-tpl",
      nama: "Test Surat",
      placeholders: [
        {
          key: "Bulan Keberangkatan",
          label: "Bulan Keberangkatan",
          sourceType: "manifest",
          manifestField: "jamaah.namaLengkap", // Misconfigured accidentally
        },
      ],
      templateContent: "Bulan: {{Bulan Keberangkatan}}",
    };
    const mockKeberangkatan = {
      tanggalBerangkat: "2026-06-17",
    };

    const resolved = resolveAutocratFieldValues(template, null, mockKeberangkatan, {});
    expect(resolved["Bulan Keberangkatan"]).toBe("Juni 2026");
  });

  it("should correctly map template placeholders from uploaded documents using matchTagToManifestField", () => {
    expect(matchTagToManifestField("Nama").matchedManifest?.key).toBe("jamaah.namaLengkap");
    expect(matchTagToManifestField("No Identitas").matchedManifest?.key).toBe("jamaah.nik");
    expect(matchTagToManifestField("Tanggal Awal").matchedManifest?.key).toBe("keberangkatan.tanggalBerangkat");
    expect(matchTagToManifestField("Tanggal Akhir").matchedManifest?.key).toBe("keberangkatan.tanggalPulang");
    expect(matchTagToManifestField("Bulan Awal").matchedManifest?.key).toBe("keberangkatan.bulanKeberangkatan");
    expect(matchTagToManifestField("Pekerjaan").matchedManifest?.key).toBe("jamaah.pekerjaan");
    expect(matchTagToManifestField("Jenis No ID").defaultValue).toBe("NIK");
    expect(matchTagToManifestField("Instansi").sourceType).toBe("manual");
  });

  it("should auto-resolve values for template tags like Surat Cuti Pekerja seamlessly", () => {
    const template: any = {
      id: "tpl-cuti-pekerja",
      nama: "Surat Permohonan Cuti Pekerja",
      placeholders: [],
      templateContent: `Kepada Yth. Pimpinan {{Instansi}}
Nama: {{Nama}}
{{Jenis No ID}}: {{No Identitas}}
Jabatan: {{Jabatan}}
Pekerjaan: {{Pekerjaan}}
Periode: {{Tanggal Awal}} s/d {{Tanggal Akhir}}
Bulan: {{Bulan Awal}}`,
    };

    const mockJamaah = {
      namaLengkap: "Ranti Fransiska",
      nik: "3276015805900010",
      pekerjaan: "Empl & Mill Services",
    };

    const mockKeberangkatan = {
      tanggalBerangkat: "2026-08-31",
      tanggalPulang: "2026-09-09",
    };

    const manualFormData = {
      Instansi: "PT Tjiwi Kimia",
      Jabatan: "Staff Operasional",
    };

    const resolved = resolveAutocratFieldValues(template, mockJamaah, mockKeberangkatan, manualFormData);

    expect(resolved.Nama).toBe("Ranti Fransiska");
    expect(resolved["No Identitas"]).toBe("3276015805900010");
    expect(resolved["Jenis No ID"]).toBe("NIK");
    expect(resolved.Pekerjaan).toBe("Empl & Mill Services");
    expect(resolved.Instansi).toBe("PT Tjiwi Kimia");
    expect(resolved.Jabatan).toBe("Staff Operasional");
    expect(resolved["Tanggal Awal"]).toBe("31 Agustus 2026");
    expect(resolved["Tanggal Akhir"]).toBe("9 September 2026");
    expect(resolved["Bulan Awal"]).toBe("Agustus 2026");
  });

  describe("File Name Generation — Sourced from Autocrat Form Column (Gambar 3)", () => {
    it("should prioritize name from form column {Nama Jama'ah} over manifest card name", () => {
      // Manifest card has "Rini", but operator edited form column to "Rini Binti Sutrisno"
      const fieldsData = {
        "Nama Jama'ah": "Rini Binti Sutrisno",
        "Tempat Lahir": "Malang",
      };
      const manualData = {
        "Nama Jama'ah": "Rini Binti Sutrisno",
      };

      const extracted = extractNamaFromAutocratFields(fieldsData, manualData);
      expect(extracted).toBe("Rini Binti Sutrisno");

      const fileName = generateSuratFileName("237/VTA.P/A/IX/2026", fieldsData, manualData, {
        isTtd: true,
        ext: "pdf",
        fallbackNama: "Rini", // Manifest card name should NOT be used when column is filled
      });

      expect(fileName).toBe("237-VTA.P-A-IX-2026_TTD_Rini_Binti_Sutrisno.pdf");
      expect(fileName).not.toContain("TTD_Rini.pdf");
    });

    it("should respect formatNamaFile with placeholders using form column value", () => {
      const fieldsData = {
        "Nama Jama'ah": "Rini Binti Sutrisno",
      };
      const fileName = generateSuratFileName("237/VTA.P/A/IX/2026", fieldsData, null, {
        formatNamaFile: "Surat_Rekom_TTD_{{Nama Jama'ah}}",
        ext: "docx",
      });

      expect(fileName).toBe("Surat_Rekom_TTD_Rini_Binti_Sutrisno.docx");
    });

    it("should support name keys like nama_lengkap, Nama Lengkap, Nama Pegawai, Nama Pemohon", () => {
      expect(extractNamaFromAutocratFields({ nama_lengkap: "Ahmad Dahlan" })).toBe("Ahmad Dahlan");
      expect(extractNamaFromAutocratFields({ "Nama Pegawai": "Budi Santoso" })).toBe("Budi Santoso");
      expect(extractNamaFromAutocratFields({ "Nama Pemohon": "Siti Nurhaliza" })).toBe("Siti Nurhaliza");
    });

    it("should gracefully handle null jamaah and null keberangkatan when no package is selected", () => {
      const template = DEFAULT_SURAT_TEMPLATES[0]!;
      const resolved = resolveAutocratFieldValues(template, null, null, {});
      expect(resolved).toBeDefined();
      expect(resolved.nama_lengkap).toBe("-");
    });

    it("should correctly convert between ISO dates and Indonesian letter date format", () => {
      expect(formatIsoToIndonesianDate("1990-06-10")).toBe("10 Juni 1990");
      expect(parseDateToIsoString("10 Juni 1990")).toBe("1990-06-10");
      expect(parseDateToIsoString("10-06-1990")).toBe("1990-06-10");
      expect(parseDateToIsoString("1990-06-10")).toBe("1990-06-10");
    });

    it("should correctly convert between ISO month and Indonesian month year format", () => {
      expect(formatIsoToIndonesianMonthYear("2026-09")).toBe("September 2026");
      expect(parseMonthYearToIsoString("September 2026")).toBe("2026-09");
      expect(parseMonthYearToIsoString("2026-09")).toBe("2026-09");
    });

    it("should correctly format and parse date ranges in Indonesian official letter format", () => {
      // Same month & year
      expect(formatIsoToIndonesianDateRange("2026-10-10", "2026-10-25")).toBe("10 s/d 25 Oktober 2026");
      // Different month, same year
      expect(formatIsoToIndonesianDateRange("2026-10-28", "2026-11-10")).toBe("28 Oktober s/d 10 November 2026");
      // Different year
      expect(formatIsoToIndonesianDateRange("2026-12-28", "2027-01-10")).toBe("28 Desember 2026 s/d 10 Januari 2027");
      // Same date
      expect(formatIsoToIndonesianDateRange("2026-10-10", "2026-10-10")).toBe("10 Oktober 2026");

      // Parsing range string to ISOs
      expect(parseDateRangeToIsoStrings("10 s/d 25 Oktober 2026")).toEqual(["2026-10-10", "2026-10-25"]);
      expect(parseDateRangeToIsoStrings("28 Oktober s/d 10 November 2026")).toEqual(["2026-10-28", "2026-11-10"]);
      expect(parseDateRangeToIsoStrings("28 Desember 2026 s/d 10 Januari 2027")).toEqual(["2026-12-28", "2027-01-10"]);
    });
  });

  describe("Endorsement Name Resolution (Akta / Ayah Kandung Integration)", () => {
    it("should append father's name as last name when endorsement mode is active", () => {
      // Kasus KTP: "SHOFANI, ST", Akta Ayah: "ZAINUL"
      expect(formatJamaahNameWithEndorsement("SHOFANI, ST", "ZAINUL")).toBe("Shofani Zainul, St");
      expect(formatJamaahNameWithEndorsement("Shofani", "ZAINUL")).toBe("Shofani Zainul");
    });

    it("should not duplicate father's name if already present in jamaah's name", () => {
      expect(formatJamaahNameWithEndorsement("Shofani Zainul", "Zainul")).toBe("Shofani Zainul");
      expect(formatJamaahNameWithEndorsement("Muhammad Zainul", "Zainul Abidin")).toBe("Muhammad Zainul Abidin");
    });

    it("should filter father's honorific titles like H., Haji, Drs.", () => {
      expect(formatJamaahNameWithEndorsement("Shofani", "H. Zainul")).toBe("Shofani Zainul");
      expect(formatJamaahNameWithEndorsement("Shofani, ST", "H. Zainul")).toBe("Shofani Zainul, St");
    });

    it("should accurately count name words excluding titles and degrees (countNameWords)", () => {
      expect(countNameWords("Siti")).toBe(1);
      expect(countNameWords("SITI, S.Pd")).toBe(1);
      expect(countNameWords("H. Siti")).toBe(1);
      expect(countNameWords("Dr. Supriyadi, M.Kom.")).toBe(1);
      expect(countNameWords("Siti Aminah")).toBe(2);
      expect(countNameWords("Siti Aminah, S.E.")).toBe(2);
      expect(countNameWords("Muhammad Ridwan Nur")).toBe(3);
      expect(countNameWords("")).toBe(0);
      expect(countNameWords(null)).toBe(0);
    });

    it("should automatically append father's name from Akta/KK if KTP name has only 1 word for Surat Rekomendasi Paspor, regardless of perihal (ADR-0029)", () => {
      const rekomTemplate = DEFAULT_SURAT_TEMPLATES[0]!; // tpl-rekom-paspor
      const manualData = {
        Hal: "Rekomendasi Pembuatan / Penggantian Paspor Umroh", // Regular non-endorsement perihal
        nama_lengkap: "Siti",
        namaAyah: "Ahmad Sofwan",
      };
      const resolved = resolveAutocratFieldValues(rekomTemplate, null, null, manualData);
      expect(resolved.nama_lengkap).toBe("Siti Ahmad Sofwan");
    });

    it("should NOT append father's name if KTP name already has 2 or more words for Surat Rekomendasi Paspor on regular perihal", () => {
      const rekomTemplate = DEFAULT_SURAT_TEMPLATES[0]!;
      const manualData = {
        Hal: "Rekomendasi Pembuatan / Penggantian Paspor Umroh",
        nama_lengkap: "Siti Aminah",
        namaAyah: "Ahmad Sofwan",
      };
      const resolved = resolveAutocratFieldValues(rekomTemplate, null, null, manualData);
      expect(resolved.nama_lengkap).toBe("Siti Aminah");
    });

    it("should resolve father's name from Akta Kelahiran document (d.jenis === 'akta')", () => {
      const rekomTemplate = DEFAULT_SURAT_TEMPLATES[0]!;
      const mockJamaahWithAkta: any = {
        id: "jam-akta-1",
        namaLengkap: "Supriyadi",
        dokumen: [
          {
            jenis: "akta",
            ocrData: { namaAyah: "Sulaiman" },
          },
        ],
      };
      const resolved = resolveAutocratFieldValues(rekomTemplate, mockJamaahWithAkta, null, {});
      expect(resolved.nama_lengkap).toBe("Supriyadi Sulaiman");
    });

    it("should prioritize admin's manual typed revised name over OCR", () => {
      const rekomTemplate = DEFAULT_SURAT_TEMPLATES[0]!;
      const mockJamaah: any = {
        id: "jam-rev-1",
        namaLengkap: "Siti",
        namaAyah: "Ahmad",
      };
      // Admin manually revisions/types "Siti Rahmawati" into manualFormData
      const manualData = {
        nama_lengkap: "Siti Rahmawati",
      };
      const resolved = resolveAutocratFieldValues(rekomTemplate, mockJamaah, null, manualData);
      expect(resolved.nama_lengkap).toBe("Siti Rahmawati");
    });
  });

  describe("WhatsApp Template Generation & Parsing (Standardized Global Format for Cuti & Keterangan)", () => {
    it("should generate the standardized 6-point global format for Surat Cuti (Surat Permohonan Izin)", () => {
      const cutiTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "cuti-pekerja")!;
      expect(cutiTemplate).toBeDefined();

      const waText = generateWaTemplateText(cutiTemplate, cutiTemplate.placeholders);

      const expectedText = [
        "Mohon melengkapi data berikut untuk penerbitan dokumen Surat Permohonan Izin.",
        "Silakan isi jawaban di sebelah kanan tanda titik dua (:)",
        "",
        "1. Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Cuti",
        "2. Ditujukan Kepada : ",
        "3. Nama Yang Bersangkutan : ",
        "4. No Identitas NIP/NIK/NRP : ",
        "5. Jabatan/Pekerjaan : ",
        "6. Request Tanggal : ",
        "",
        "(Catatan: Mohon pastikan ejaan nama, nomor NIK/identitas, dan tanggal telah sesuai)",
        "Terima kasih atas kerja samanya. 🙏",
      ].join("\n");

      expect(waText).toBe(expectedText);
      expect(waText).toContain("Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Cuti");
      expect(waText).toContain("Nama Yang Bersangkutan :");
      expect(waText).toContain("No Identitas NIP/NIK/NRP :");
      expect(waText).toContain("Jabatan/Pekerjaan :");
      expect(waText).toContain("Request Tanggal :");
    });

    it("should generate the standardized 6-point global format for Surat Keterangan", () => {
      const ketTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "keterangan")!;
      expect(ketTemplate).toBeDefined();

      const waText = generateWaTemplateText(ketTemplate, ketTemplate.placeholders);

      expect(waText).toContain("Mohon melengkapi data berikut untuk penerbitan dokumen Surat Permohonan Izin.");
      expect(waText).toContain("1. Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Keterangan");
      expect(waText).toContain("2. Ditujukan Kepada :");
      expect(waText).toContain("3. Nama Yang Bersangkutan :");
      expect(waText).toContain("4. No Identitas NIP/NIK/NRP :");
      expect(waText).toContain("5. Jabatan/Pekerjaan :");
      expect(waText).toContain("6. Request Tanggal :");
    });

    it("should generate populated values when currentFormData is provided in global standardized format", () => {
      const cutiTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "cuti-pekerja")!;
      const formData = {
        nama_lengkap: "Ahmad Dahlan",
        nik: "3515081234560001",
        nama_perusahaan: "PT Pertamina",
        pekerjaan: "Staff Logistik",
        tanggal_berangkat: "10 November 2026",
        tanggal_pulang: "20 November 2026",
      };

      const waText = generateWaTemplateText(cutiTemplate, cutiTemplate.placeholders, formData);
      expect(waText).toContain("1. Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Cuti");
      expect(waText).toContain("2. Ditujukan Kepada : PT Pertamina");
      expect(waText).toContain("3. Nama Yang Bersangkutan : Ahmad Dahlan");
      expect(waText).toContain("4. No Identitas NIP/NIK/NRP : 3515081234560001");
      expect(waText).toContain("5. Jabatan/Pekerjaan : Staff Logistik");
      expect(waText).toContain("6. Request Tanggal : 10 November 2026 s/d 20 November 2026");
    });

    it("should allow raw placeholder generation when unifiedFormat is explicitly disabled", () => {
      const cutiTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "cuti-pekerja")!;
      const waText = generateWaTemplateText(cutiTemplate, cutiTemplate.placeholders, {}, { unifiedFormat: false });
      expect(waText).toContain("FORMULIR DATA: SURAT PERMOHONAN CUTI");
      expect(waText).toContain("1. Ditujukan Kepada : ");
      expect(waText).toContain("2. Nama Yang Cuti : ");
    });

    it("should not include PT header in general templates either", () => {
      const rekomTemplate = DEFAULT_SURAT_TEMPLATES[0]!;
      const waText = generateWaTemplateText(rekomTemplate, rekomTemplate.placeholders);
      expect(waText).not.toContain("PT. Vauza Tamma Abadi (VTU ABADI)");
      expect(waText).toContain("Assalamu'alaikum");
      expect(waText).toContain("FORMULIR DATA: SURAT REKOMENDASI PASPOR");
    });

    it("should dynamically generate form items strictly from whatever placeholders are configured in custom templates", () => {
      const customTemplate = {
        id: "tpl-custom-bebas",
        slug: "surat-kustom",
        nama: "Surat Keterangan Bebas",
        kategori: "internal" as const,
        deskripsi: "Template surat kustom",
        kodeNomorDefault: "SKB",
        templateContent: "Test {nama_pemohon} {instansi_tujuan} {alasan_izin}",
        perihalDefault: "Permohonan",
        kopSuratType: "ppiu_vtu" as const,
        penandatangan: {
          nama: "Faisal",
          jabatan: "Direktur",
          showStempel: true,
          showBarcode: true,
        },
        placeholders: [
          { key: "nama_pemohon", label: "Nama Pemohon", inputType: "text" as const, sourceType: "manual" as const },
          { key: "instansi_tujuan", label: "Instansi Tujuan", inputType: "text" as const, sourceType: "manual" as const },
          { key: "alasan_izin", label: "Alasan Permohonan Izin", inputType: "text" as const, sourceType: "manual" as const },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const waText = generateWaTemplateText(customTemplate, customTemplate.placeholders);

      expect(waText).toContain("FORMULIR DATA: SURAT KETERANGAN BEBAS");
      expect(waText).toContain("Mohon melengkapi data berikut untuk penerbitan dokumen Surat Keterangan Bebas.");
      expect(waText).toContain("1. Nama Pemohon : ");
      expect(waText).toContain("2. Instansi Tujuan : ");
      expect(waText).toContain("3. Alasan Permohonan Izin : ");
      expect(waText).not.toContain("Ditujukan Kepada");
    });

    it("should parse the unified 6-point global message accurately for Surat Cuti", () => {
      const cutiTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "cuti-pekerja")!;
      const rawWaReply = `
Mohon melengkapi data berikut untuk penerbitan dokumen Surat Permohonan Izin.
Silakan isi jawaban di sebelah kanan tanda titik dua (:)

1. Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Cuti
2. Ditujukan Kepada : PT Telkom Indonesia (Persero) Tbk
3. Nama Yang Bersangkutan : Ir. H. Joko Santoso
4. No Identitas NIP/NIK/NRP : 198503152010011002
5. Jabatan/Pekerjaan : Senior Systems Engineer
6. Request Tanggal : 15 s/d 25 November 2026

(Catatan: Mohon pastikan ejaan nama, nomor NIK/identitas, dan tanggal telah sesuai)
Terima kasih atas kerja samanya. 🙏
      `.trim();

      const parseRes = parseWaFormText(rawWaReply, cutiTemplate.placeholders);
      expect(parseRes.detectedCount).toBe(6);
      expect(parseRes.detectedLetterType).toBe("cuti");

      // Verify all field aliases mapped for Surat Cuti needs
      expect(parseRes.parsedMap.jenis_surat).toBe("Surat Cuti");
      expect(parseRes.parsedMap.ditujukan_kepada).toBe("PT Telkom Indonesia (Persero) Tbk");
      expect(parseRes.parsedMap.nama_perusahaan).toBe("PT Telkom Indonesia (Persero) Tbk");
      expect(parseRes.parsedMap.nama_yang_bersangkutan).toBe("Ir. H. Joko Santoso");
      expect(parseRes.parsedMap.nama_yang_cuti).toBe("Ir. H. Joko Santoso");
      expect(parseRes.parsedMap.nama_lengkap).toBe("Ir. H. Joko Santoso");
      expect(parseRes.parsedMap.no_identitas).toBe("198503152010011002");
      expect(parseRes.parsedMap.nik).toBe("198503152010011002");
      expect(parseRes.parsedMap.nip_nik).toBe("198503152010011002");
      expect(parseRes.parsedMap.pekerjaan).toBe("Senior Systems Engineer");
      expect(parseRes.parsedMap.jabatan_karyawan).toBe("Senior Systems Engineer");
      expect(parseRes.parsedMap.jabatan).toBe("Senior Systems Engineer");
      expect(parseRes.parsedMap.request_tanggal).toBe("15 s/d 25 November 2026");
      expect(parseRes.parsedMap.tanggal_cuti).toBe("15 s/d 25 November 2026");
      expect(parseRes.parsedMap.tanggal_berangkat).toBe("15 November 2026");
      expect(parseRes.parsedMap.tanggal_pulang).toBe("25 November 2026");
      expect(parseRes.parsedMap.lama_cuti_hari).toBe("11");
    });

    it("should parse the unified 6-point global message accurately for Surat Keterangan and sort required fields", () => {
      const ketTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "keterangan")!;
      const rawWaReply = `
Mohon melengkapi data berikut untuk penerbitan dokumen Surat Permohonan Izin.
Silakan isi jawaban di sebelah kanan tanda titik dua (:)

1. Surat Cuti / Surat Keterangan (pilih salah satu) : Surat Keterangan
2. Ditujukan Kepada : Dinas Perhubungan Kota Surabaya
3. Nama Yang Bersangkutan : Hj. Siti Nur Azizah
4. No Identitas NIP/NIK/NRP : 3578015509800003
5. Jabatan/Pekerjaan : PNS / Staf Ahli
6. Request Tanggal : 20 Desember 2026

(Catatan: Mohon pastikan ejaan nama, nomor NIK/identitas, dan tanggal telah sesuai)
Terima kasih atas kerja samanya. 🙏
      `.trim();

      const parseRes = parseWaFormText(rawWaReply, ketTemplate.placeholders);
      expect(parseRes.detectedCount).toBe(6);
      expect(parseRes.detectedLetterType).toBe("keterangan");

      // Verify Surat Keterangan extracts its required fields seamlessly
      expect(parseRes.parsedMap.nama_lengkap).toBe("Hj. Siti Nur Azizah");
      expect(parseRes.parsedMap.nik).toBe("3578015509800003");
      expect(parseRes.parsedMap.pekerjaan).toBe("PNS / Staf Ahli");
      expect(parseRes.parsedMap.tanggal_berangkat).toBe("20 Desember 2026");
      expect(parseRes.parsedMap.ditujukan_kepada).toBe("Dinas Perhubungan Kota Surabaya");
      expect(parseRes.parsedMap.instansi).toBe("Dinas Perhubungan Kota Surabaya");
      expect(parseRes.parsedMap.nama_instansi).toBe("Dinas Perhubungan Kota Surabaya");
      expect(parseRes.parsedMap.instansi_tujuan).toBe("Dinas Perhubungan Kota Surabaya");

      // Verify resolveAutocratFieldValues resolves {instansi} correctly
      const resolved = resolveAutocratFieldValues(
        ketTemplate,
        null,
        null,
        parseRes.parsedMap,
        { nomorSurat: "001/SK/2026", tanggalSurat: "26 Oktober 2026", tanggalHijriyah: "15 Rabiul Awwal 1448 H" }
      );
      expect(resolved.instansi).toBe("Dinas Perhubungan Kota Surabaya");
    });

    it("should output '-' for any unfilled/empty form field as indicator of empty (pertanda kosong)", () => {
      const cutiTemplate = DEFAULT_SURAT_TEMPLATES.find((t) => t.slug === "cuti-pekerja")!;
      // Simulate form where Ditujukan Kepada, Nama, NIK, and Tanggal Cuti are filled, but Jabatan is left empty
      const manualData = {
        "Ditujukan Kepada": "Kepala Kantor",
        "Nama yang cuti": "Rina Gustina",
        "No Identitas NIP/NIK/NRP": "3172026905811001",
        "Jabatan": "", // Empty input field
        "Tanggal Cuti": "25 Januari s.d 5 Februari 2027",
      };

      const extraPlaceholders = [
        { key: "Ditujukan Kepada", label: "Ditujukan Kepada", sourceType: "manual" as const, inputType: "text" as const },
        { key: "Nama yang cuti", label: "Nama yang cuti", sourceType: "manual" as const, inputType: "text" as const },
        { key: "No Identitas NIP/NIK/NRP", label: "No Identitas NIP/NIK/NRP", sourceType: "manual" as const, inputType: "text" as const },
        { key: "Jabatan", label: "Jabatan", sourceType: "manual" as const, inputType: "text" as const },
        { key: "Tanggal Cuti", label: "Tanggal Cuti", sourceType: "manual" as const, inputType: "text" as const },
      ];

      const resolved = resolveAutocratFieldValues(cutiTemplate, null, null, manualData, {}, extraPlaceholders);

      expect(resolved["Ditujukan Kepada"]).toBe("Kepala Kantor");
      expect(resolved["Nama yang cuti"]).toBe("Rina Gustina");
      expect(resolved["No Identitas NIP/NIK/NRP"]).toBe("3172026905811001");
      expect(resolved["Jabatan"]).toBe("-"); // Must be '-' pertanda kosong!
      expect(resolved["Tanggal Cuti"]).toBe("25 Januari s.d 5 Februari 2027");

      // Verify template rendering
      const templateContent = `
Ditujukan Kepada: <<Ditujukan Kepada>>
Nama: <<Nama yang cuti>>
Jabatan: <<Jabatan>>
Tanggal Cuti: <<Tanggal Cuti>>
      `.trim();

      const merged = renderAutocratMergedText(templateContent, resolved);
      expect(merged).toContain("Ditujukan Kepada: Kepala Kantor");
      expect(merged).toContain("Nama: Rina Gustina");
      expect(merged).toContain("Jabatan: -");
      expect(merged).toContain("Tanggal Cuti: 25 Januari s.d 5 Februari 2027");
    });

    it("should replace any unpopulated Autocrat tags in text with '-' pertanda kosong", () => {
      const templateContent = "Nama: {nama}\nJabatan: {jabatan}\nCatatan: <<catatan_tambahan>>";
      const resolved = {
        nama: "Muchamad Zamroni",
        jabatan: "", // explicitly empty
        // catatan_tambahan is not in resolved at all
      };

      const merged = renderAutocratMergedText(templateContent, resolved);
      expect(merged).toBe("Nama: Muchamad Zamroni\nJabatan: -\nCatatan: -");
    });
  });
});



