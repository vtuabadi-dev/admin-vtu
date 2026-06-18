// @vitest-environment node
// Unit test: KTP field extraction from Google Vision OCR text

import { describe, it, expect } from "vitest";
import { extractField } from "../google-vision.provider";

// ── Realistic OCR output from Google Vision (TEXT_DETECTION) ──

const KTP_SAMPLE_1 = `
PROVINSI DKI JAKARTA
KOTA JAKARTA PUSAT

NIK: 3174051207800001
Nama : BUDI SANTOSO
Tempat/Tgl Lahir: JAKARTA, 12-07-1980
Jenis Kelamin : LAKI-LAKI
Gol. Darah : O
Alamat: JL. MERDEKA NO. 15
RT/RW: 001/005
Kel/Desa: GAMBIR
Kecamatan: GAMBIR
Agama : ISLAM
Status Perkawinan: KAWIN
Pekerjaan: WIRASWASTA
Kewarganegaraan: WNI
Berlaku Hingga: SEUMUR HIDUP
`;

const KTP_SAMPLE_2 = `
NIK : 3275051512920003
Nama : SITI RAHMAWATI
Tempat/Tgl Lahir: BANDUNG, 15-12-1992
Jenis kelamin : PEREMPUAN
Alamat : JL. ASIA AFRIKA NO. 20
`;

const KTP_SAMPLE_3 = `
NIK: 3372012208650005
Nama: AHMAD HIDAYAT
Tempat / Tgl Lahir: SEMARANG, 22-08-1965
`;

const PASSPORT_SAMPLE = `
PASSPORT
REPUBLIC OF INDONESIA

Surname: SANTOSO
Given Names: BUDI
Passport No: C1234567
Date of Birth: 12-07-1980
Place of Birth: JAKARTA
Expiry Date: 15-03-2027
`;

// ── Tests ──────────────────────────────────────────────────────

describe("Google Vision — KTP Field Extraction", () => {
  describe("KTP Sample 1 (standard format)", () => {
    it("extracts namaLengkap from 'Nama :'", () => {
      expect(extractField(KTP_SAMPLE_1, "namaLengkap")).toBe("BUDI SANTOSO");
    });

    it("extracts NIK from 'NIK:'", () => {
      expect(extractField(KTP_SAMPLE_1, "nik")).toBe("3174051207800001");
    });

    it("extracts tempatLahir from combined 'Tempat/Tgl Lahir'", () => {
      const result = extractField(KTP_SAMPLE_1, "tempatLahir");
      expect(result).toBe("JAKARTA");
    });

    it("extracts tanggalLahir from combined 'Tempat/Tgl Lahir'", () => {
      const result = extractField(KTP_SAMPLE_1, "tanggalLahir");
      expect(result).toBe("12-07-1980");
    });
  });

  describe("KTP Sample 2 (alternate spacing)", () => {
    it("extracts namaLengkap with space before colon", () => {
      expect(extractField(KTP_SAMPLE_2, "namaLengkap")).toBe("SITI RAHMAWATI");
    });

    it("extracts tempatLahir from 'Tempat/Tgl Lahir: BANDUNG, ...'", () => {
      expect(extractField(KTP_SAMPLE_2, "tempatLahir")).toBe("BANDUNG");
    });

    it("extracts tanggalLahir from combined field", () => {
      expect(extractField(KTP_SAMPLE_2, "tanggalLahir")).toBe("15-12-1992");
    });
  });

  describe("KTP Sample 3 (spaced separator)", () => {
    it("extracts tempatLahir with 'Tempat / Tgl Lahir' spacing", () => {
      expect(extractField(KTP_SAMPLE_3, "tempatLahir")).toBe("SEMARANG");
    });

    it("extracts tanggalLahir with spaced separator", () => {
      expect(extractField(KTP_SAMPLE_3, "tanggalLahir")).toBe("22-08-1965");
    });
  });

  describe("Paspor (non-KTP — regression check)", () => {
    it("still extracts namaLengkap from 'Surname/Given Names'", () => {
      expect(extractField(PASSPORT_SAMPLE, "namaLengkap")).toBe("SANTOSO");
    });

    it("still extracts nomorPaspor", () => {
      expect(extractField(PASSPORT_SAMPLE, "nomorPaspor")).toBe("C1234567");
    });

    it("still extracts tempatLahir from 'Place of Birth'", () => {
      expect(extractField(PASSPORT_SAMPLE, "tempatLahir")).toBe("JAKARTA");
    });

    it("still extracts tanggalLahir from 'Date of Birth'", () => {
      expect(extractField(PASSPORT_SAMPLE, "tanggalLahir")).toBe("12-07-1980");
    });

    it("still extracts masaBerlaku from 'Expiry Date'", () => {
      expect(extractField(PASSPORT_SAMPLE, "masaBerlaku")).toBe("15-03-2027");
    });
  });

  describe("Edge cases", () => {
    it("returns empty string for unknown field", () => {
      expect(extractField(KTP_SAMPLE_1, "unknownField")).toBe("");
    });

    it("returns empty string for empty text", () => {
      expect(extractField("", "namaLengkap")).toBe("");
    });

    it("handles 'Tgl Lahir' without 'Tempat' prefix", () => {
      expect(extractField("Tgl Lahir: 01-01-1990", "tanggalLahir")).toBe("01-01-1990");
    });

    it("handles 'Tempat Lahir' without 'Tgl' (non-KTP)", () => {
      expect(extractField("Tempat Lahir: MEDAN", "tempatLahir")).toBe("MEDAN");
    });
  });
});

// ── Integration: simulate full recognize() output ─────────────

describe("Google Vision — Full KTP to JSON", () => {
  it("produces expected JSON from KTP Sample 1", () => {
    // Simulate what recognize() would return
    const fields = [
      { field: "namaLengkap", value: extractField(KTP_SAMPLE_1, "namaLengkap") },
      { field: "nik", value: extractField(KTP_SAMPLE_1, "nik") },
      { field: "tanggalLahir", value: extractField(KTP_SAMPLE_1, "tanggalLahir") },
      { field: "tempatLahir", value: extractField(KTP_SAMPLE_1, "tempatLahir") },
    ];

    expect(fields).toEqual([
      { field: "namaLengkap", value: "BUDI SANTOSO" },
      { field: "nik", value: "3174051207800001" },
      { field: "tanggalLahir", value: "12-07-1980" },
      { field: "tempatLahir", value: "JAKARTA" },
    ]);
  });
});
