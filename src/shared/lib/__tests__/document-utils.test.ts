import { describe, it, expect } from "vitest";
import {
  calculateAge,
  isSingleWordName,
  computeDynamicDocumentRequirements,
} from "../document-utils";

describe("Dynamic Document Mapping & Requirements", () => {
  it("calculates age accurately", () => {
    expect(calculateAge("2000-01-01")).toBeGreaterThanOrEqual(24);
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
  });

  it("identifies single word names", () => {
    expect(isSingleWordName("ZAMRONI")).toBe(true);
    expect(isSingleWordName("  SITI  ")).toBe(true);
    expect(isSingleWordName("MUCHAMAD ZAMRONI")).toBe(false);
    expect(isSingleWordName("")).toBe(false);
    expect(isSingleWordName(null)).toBe(false);
  });

  it("Scenario 1: Standard adult jamaah (age 30, multi-word, quad room)", () => {
    const jamaah = {
      namaLengkap: "Ahmad Zaki",
      tanggalLahir: "1994-05-15",
      dokumen: [
        { jenis: "paspor", status: "verified" },
        { jenis: "pas_foto", status: "verified" },
        { jenis: "vaksin", status: "verified" },
        { jenis: "ktp", status: "verified" },
      ],
    };

    const res = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 4 });
    expect(res.isKtpRequired).toBe(true);
    expect(res.isLansiaRequired).toBe(false);
    expect(res.isDoubleUpgradeRequired).toBe(false);
    expect(res.isSingleWordRequired).toBe(false);
    expect(res.totalRequired).toBe(4);
    expect(res.totalCompleted).toBe(4);
    expect(res.percentage).toBe(100);
    expect(res.allMandatoryComplete).toBe(true);
  });

  it("Scenario 2: Child jamaah (age 10) - KTP is NOT required", () => {
    const today = new Date();
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()).toISOString();

    const jamaah = {
      namaLengkap: "Faqih Pratama",
      tanggalLahir: tenYearsAgo,
      dokumen: [
        { jenis: "paspor", status: "verified" },
        { jenis: "pas_foto", status: "verified" },
        { jenis: "vaksin", status: "verified" },
      ],
    };

    const res = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 3 });
    expect(res.isKtpRequired).toBe(false);
    expect(res.totalRequired).toBe(3); // Only Paspor, Pas Foto, Vaksin
    expect(res.totalCompleted).toBe(3);
    expect(res.percentage).toBe(100);
    expect(res.allMandatoryComplete).toBe(true);
  });

  it("Scenario 3: Senior / Lansia (age 65) - Surat Lansia is REQUIRED", () => {
    const today = new Date();
    const sixtyFiveYearsAgo = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate()).toISOString();

    const jamaah = {
      namaLengkap: "Haji Sulaiman",
      tanggalLahir: sixtyFiveYearsAgo,
      dokumen: [
        { jenis: "paspor", status: "verified" },
        { jenis: "pas_foto", status: "verified" },
        { jenis: "vaksin", status: "verified" },
        { jenis: "ktp", status: "verified" },
      ],
    };

    const resWithoutLansia = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 1 });
    expect(resWithoutLansia.isLansiaRequired).toBe(true);
    expect(resWithoutLansia.totalRequired).toBe(5); // Paspor, Pas Foto, Vaksin, KTP, Surat Lansia
    expect(resWithoutLansia.totalCompleted).toBe(4);
    expect(resWithoutLansia.allMandatoryComplete).toBe(false);
    expect(resWithoutLansia.missingRequirements).toContain("Surat Pernyataan Lansia");

    // Add surat lansia
    jamaah.dokumen.push({ jenis: "surat_lansia", status: "verified" });
    const resWithLansia = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 1 });
    expect(resWithLansia.totalCompleted).toBe(5);
    expect(resWithLansia.allMandatoryComplete).toBe(true);
    expect(resWithLansia.percentage).toBe(100);
  });

  it("Scenario 4: 2 Pax Group in Double Room - KK or Buku Nikah is REQUIRED (OR rule)", () => {
    const jamaah = {
      namaLengkap: "Samsurya Gandi",
      tanggalLahir: "1985-02-10",
      dokumen: [
        { jenis: "paspor", status: "verified" },
        { jenis: "pas_foto", status: "verified" },
        { jenis: "vaksin", status: "verified" },
        { jenis: "ktp", status: "verified" },
      ],
    };

    // 2 Pax with Double Room: Needs 5 documents (Paspor, Pas Foto, Vaksin, KTP, KK/Buku Nikah)
    const resBefore = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 2, roomType: "double" });
    expect(resBefore.isDoubleUpgradeRequired).toBe(true);
    expect(resBefore.totalRequired).toBe(5);
    expect(resBefore.totalCompleted).toBe(4);
    expect(resBefore.allMandatoryComplete).toBe(false);

    // Provide KK -> Should fulfill the requirement!
    jamaah.dokumen.push({ jenis: "kk", status: "verified" });
    const resWithKk = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 2, roomType: "double" });
    expect(resWithKk.totalCompleted).toBe(5);
    expect(resWithKk.allMandatoryComplete).toBe(true);
    expect(resWithKk.percentage).toBe(100);
  });

  it("Scenario 5: Single-word name (e.g. ZAMRONI) - Dokumen Tambahan (KK/Buku Nikah/Akta) is REQUIRED", () => {
    const jamaah = {
      namaLengkap: "ZAMRONI",
      tanggalLahir: "1990-08-20",
      dokumen: [
        { jenis: "paspor", status: "verified" },
        { jenis: "pas_foto", status: "verified" },
        { jenis: "vaksin", status: "verified" },
        { jenis: "ktp", status: "verified" },
      ],
    };

    const resBefore = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 4 });
    expect(resBefore.isSingleWordRequired).toBe(true);
    expect(resBefore.totalRequired).toBe(5); // +1 for 1-word endorsement
    expect(resBefore.allMandatoryComplete).toBe(false);

    // Provide Akta Lahir -> Fulfills the requirement!
    jamaah.dokumen.push({ jenis: "akta", status: "verified" });
    const resWithAkta = computeDynamicDocumentRequirements(jamaah, { groupPaxCount: 4 });
    expect(resWithAkta.totalCompleted).toBe(5);
    expect(resWithAkta.allMandatoryComplete).toBe(true);
    expect(resWithAkta.percentage).toBe(100);
  });
});
