// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  normalizePassportDate,
  parseMrzLines,
  parsePassport,
  cleanTempatTerbit,
} from "../passport-parser";

describe("Passport Parser Unit Tests", () => {
  describe("normalizePassportDate", () => {
    it("normalizes English month abbreviation (e.g. 10 DEC 2024)", () => {
      expect(normalizePassportDate("10 DEC 2024")).toBe("2024-12-10");
      expect(normalizePassportDate("10 DEC 2034")).toBe("2034-12-10");
      expect(normalizePassportDate("12 AUG 1992")).toBe("1992-08-12");
      expect(normalizePassportDate("15 OCT 2025")).toBe("2025-10-15");
      expect(normalizePassportDate("01 MAY 2023")).toBe("2023-05-01");
    });

    it("normalizes Indonesian month names (e.g. 10 DES 2024, 10 DESEMBER 2024)", () => {
      expect(normalizePassportDate("10 DES 2024")).toBe("2024-12-10");
      expect(normalizePassportDate("10 DESEMBER 2024")).toBe("2024-12-10");
      expect(normalizePassportDate("12 AGU 1992")).toBe("1992-08-12");
      expect(normalizePassportDate("12 AGUSTUS 1992")).toBe("1992-08-12");
      expect(normalizePassportDate("05 MEI 2021")).toBe("2021-05-05");
    });

    it("normalizes numerical DD-MM-YYYY or DD/MM/YYYY dates", () => {
      expect(normalizePassportDate("10-12-2024")).toBe("2024-12-10");
      expect(normalizePassportDate("10/12/2024")).toBe("2024-12-10");
      expect(normalizePassportDate("12-08-1992")).toBe("1992-08-12");
      expect(normalizePassportDate("2024-12-10")).toBe("2024-12-10");
    });

    it("returns empty string on empty/null input", () => {
      expect(normalizePassportDate("")).toBe("");
      expect(normalizePassportDate(null)).toBe("");
      expect(normalizePassportDate(undefined)).toBe("");
    });
  });

  describe("parseMrzLines", () => {
    it("parses user's passport MRZ (Muchamad Zamroni)", () => {
      const mrzText = `
REPUBLIK INDONESIA / REPUBLIC OF INDONESIA
P<IDNZAMRONI<<MUCHAMAD<<<<<<<<<<<<<<<<<<<<<<
X4573266<8IDN9208120M34121013573021208000218
`;
      const result = parseMrzLines(mrzText);
      expect(result).not.toBeNull();
      expect(result?.passportNumber).toBe("X4573266");
      expect(result?.nationality).toBe("IDN");
      expect(result?.fullName).toBe("MUCHAMAD ZAMRONI");
      expect(result?.dateOfBirth).toBe("1992-08-12");
      expect(result?.sex).toBe("Laki-laki");
      expect(result?.expiryDate).toBe("2034-12-10");
      expect(result?.personalNumber).toContain("3573021208");
    });

    it("parses MRZ with standard 10-year validity", () => {
      const mrz = `
P<IDNSAPUTRA<<AHMAD<RIZKI<<<<<<<<<<<<<<<<<<<
C1234567<5IDN8505154M35051523271011505850001
`;
      const result = parseMrzLines(mrz);
      expect(result?.passportNumber).toBe("C1234567");
      expect(result?.fullName).toBe("AHMAD RIZKI SAPUTRA");
      expect(result?.dateOfBirth).toBe("1985-05-15");
      expect(result?.expiryDate).toBe("2035-05-15");
    });
  });

  describe("cleanTempatTerbit", () => {
    it("cleans prefixes like KANIM / KANTOR IMIGRASI", () => {
      expect(cleanTempatTerbit("MALANG")).toBe("MALANG");
      expect(cleanTempatTerbit("KANIM KELAS I TPI MALANG")).toBe("MALANG");
      expect(cleanTempatTerbit("KANTOR IMIGRASI JAKARTA PUSAT")).toBe("JAKARTA PUSAT");
      expect(cleanTempatTerbit("KANTOR YANG MENGELUARKAN: SURABAYA")).toBe("SURABAYA");
      expect(cleanTempatTerbit("1A51CC8508DAPW MALANG")).toBe("MALANG");
    });
  });

  describe("parsePassport", () => {
    it("parses full text matching Indonesian Passport layout (Muchamad Zamroni)", () => {
      const rawText = `
REPUBLIK INDONESIA
PASPOR / PASSPORT
TIPE / TYPE: P
KODE NEGARA / COUNTRY CODE: IDN
NO. PASPOR / PASSPORT NO.: X4573266
NAMA LENGKAP / FULL NAME: MUCHAMAD ZAMRONI
KEWARGANEGARAAN / NATIONALITY: INDONESIA
TGL. LAHIR / DATE OF BIRTH: 12 AUG 1992
TEMPAT LAHIR / PLACE OF BIRTH: MALANG
JENIS KELAMIN / SEX: L/M
TGL. PENGELUARAN / DATE OF ISSUE: 10 DEC 2024
BERLAKU S/D / DATE OF EXPIRY: 10 DEC 2034
NO. REG: 1A51CC8508DAPW
KANTOR YANG MENGELUARKAN / ISSUING AUTHORITY: MALANG

P<IDNZAMRONI<<MUCHAMAD<<<<<<<<<<<<<<<<<<<<<<
X4573266<8IDN9208120M34121013573021208000218
`;

      const result = parsePassport(rawText, null);

      expect(result.nomorPaspor).toBe("X4573266");
      expect(result.namaLengkap).toBe("MUCHAMAD ZAMRONI");
      expect(result.tempatTerbitPaspor).toBe("MALANG");
      expect(result.tanggalTerbitPaspor).toBe("2024-12-10");
      expect(result.tanggalKadaluarsa).toBe("2034-12-10");
      expect(result.tempatLahir).toBe("MALANG");
      expect(result.tanggalLahir).toBe("1992-08-12");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("handles multiline OCR text with ISSUING OFFICE and TGL. HABIS BERLAKU without colons", () => {
      const rawText = `
REPUBLIK INDONESIA
REPUBLIC OF INDONESIA
PASPOR
PASSPORT
JENIS / TYPE
P
KODE NEGARA / COUNTRY CODE
IDN
NO. PASPOR / PASSPORT NO.
X4573266
NAMA LENGKAP / FULL NAME
MUCHAMAD ZAMRONI
KEWARGANEGARAAN / NATIONALITY
INDONESIA
TGL. LAHIR / DATE OF BIRTH
12 AUG 1992
TEMPAT LAHIR / PLACE OF BIRTH
MALANG
TGL. PENGELUARAN / DATE OF ISSUE
10 DEC 2024
TGL. HABIS BERLAKU / DATE OF EXPIRY
10 DEC 2034
NO. REG.
1A51CC8508DAPW
KANTOR YANG MENGELUARKAN / ISSUING OFFICE
MALANG

P<IDNZAMRONI<<MUCHAMAD<<<<<<<<<<<<<<<<<<<<<<
X4573266<8IDN9208120M34121013573021208000218
`;

      const result = parsePassport(rawText, null);

      expect(result.nomorPaspor).toBe("X4573266");
      expect(result.namaLengkap).toBe("MUCHAMAD ZAMRONI");
      expect(result.tempatTerbitPaspor).toBe("MALANG");
      expect(result.tanggalTerbitPaspor).toBe("2024-12-10");
      expect(result.tanggalKadaluarsa).toBe("2034-12-10");
      expect(result.tempatLahir).toBe("MALANG");
      expect(result.tanggalLahir).toBe("1992-08-12");
    });
  });
});
