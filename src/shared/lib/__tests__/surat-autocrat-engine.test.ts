import { describe, it, expect } from "vitest";
import {
  extractPlaceholdersFromText,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  DEFAULT_SURAT_TEMPLATES,
} from "@/shared/lib/surat-autocrat-engine";

describe("Surat Autocrat Merge Engine", () => {
  it("should extract {placeholders} and {{placeholders}} from template text accurately", () => {
    const text = "Yth. {nama_lengkap} dengan NIK {nik} dan Paspor {{nomor_paspor}} paket {nama_paket}.";
    const tags = extractPlaceholdersFromText(text);
    expect(tags).toEqual(["nama_lengkap", "nik", "nomor_paspor", "nama_paket"]);
  });

  it("should resolve manifest fields automatically when jamaah and package data are provided", () => {
    const template = DEFAULT_SURAT_TEMPLATES[0]; // Rekom Paspor
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
});
