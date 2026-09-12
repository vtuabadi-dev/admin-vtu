import { describe, it, expect } from "vitest";
import {
  extractPlaceholdersFromText,
  extractDocxTextFromXml,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  DEFAULT_SURAT_TEMPLATES,
  isSystemAutoPlaceholder,
} from "@/shared/lib/surat-autocrat-engine";
import { searchKantorImigrasi } from "@/shared/lib/kantor-imigrasi";

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

    expect(resolved.nama_lengkap).toBe("MUCHAMAD ZAMRONI");
    expect(resolved.nik).toBe("3515082103850001");
    expect(resolved.tempat_lahir).toBe("Sidoarjo");
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
});
