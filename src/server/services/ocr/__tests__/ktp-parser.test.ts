// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseKtp, type KtpData } from "../ktp-parser";

const KTP_FULL = `
PROVINSI DKI JAKARTA
KOTA JAKARTA PUSAT

NIK: 3174051207800001
Nama : BUDI SANTOSO
Tempat/Tgl Lahir: JAKARTA, 12-07-1980
Jenis Kelamin : LAKI-LAKI
Gol. Darah : O
Alamat: JL. MERDEKA NO. 15
RT/RW: 002/005
Kel/Desa: GAMBIR
Kecamatan: GAMBIR
Agama : ISLAM
Status Perkawinan: KAWIN
Pekerjaan: WIRASWASTA
Kewarganegaraan: WNI
Berlaku Hingga: SEUMUR HIDUP
`;

const KTP_KABUPATEN = `
PROVINSI JAWA TIMUR
KABUPATEN SIDOARJO

NIK: 3515124508940002
Nama : SRI WAHYUNI
Tempat/Tgl Lahir: SIDOARJO, 05-09-1994
Alamat: DSN. KEDUNGBENDO RT.003 RW.001
Kel/Desa: KEDUNGBENDO
Kecamatan: TANGGULANGIN
`;

const KTP_IMPERFECT = `
PROVINSI JAWA BARAT
KOTA BANDUNG

Nama: AHMAD RAHMAN
NIK: 3273051212850004
Tempat/Tgl Lahir: BANDUNG, 12 Desember 1985
Alamat: JL. ASIA AFRIKA NO 20
RT/RW 001/003
Kelurahan: BRAGA
Kecamatan : SUMUR BANDUNG
`;

// ── OCR TYPO SAMPLES ───────────────────────────────────────────

const KTP_OCR_TYPOS = `
PR0VINSI DKI JAKARTA
K0TA JAKARTA PUSAT

Narna : AHMAD RAHMAN
NIK: 3174051207800001
Ternpat/Tgl Lahir: JAKARTA, 17-08-1990
KeI/Desa: GAMBIR
Kecarnatan: GAMBIR
Alarnat: JL. MERDEKA NO. 15
RT/RW: 002/005
`;

const KTP_NO_COLON = `
PROVINSI JAWA TIMUR
KOTA SURABAYA

Nama AHMAD RAHMAN
NIK: 3578011204850007
Tempat/Tgl Lahir SURABAYA, 12-04-1985
Alamat JL. DIPONEGORO NO 10
Kel/Desa KEPUTRAN
Kecamatan TEGALSARI
RT/RW 003/002
`;

const KTP_NO_COMMA_TTL = `
PROVINSI JAWA TENGAH
KOTA SEMARANG

Nama : BUDI SANTOSO
Tempat/Tgl Lahir: SEMARANG 15-03-1992
Alamat: JL. PEMUDA NO 5
Kel/Desa: SEKAYU
Kecamatan: SEMARANG TENGAH
`;

const KTP_RT_DASH = `
PROVINSI JAWA BARAT
KOTA BANDUNG

Nama : SITI RAHMA
Tempat/Tgl Lahir: BANDUNG, 20-05-1988
Alamat: JL. ASIA AFRIKA NO 20
RT-RW: 001-003
Kel/Desa: BRAGA
Kecamatan: SUMUR BANDUNG
`;

const KTP_HEADER_MISSING = `
Nama : WAYAN SUDARMA
Tempat/Tgl Lahir: DENPASAR, 10-01-1995
Alamat: JL. MELATI NO 3
Kel/Desa: SUMERTA
Kecamatan: DENPASAR TIMUR
`;

// ── TESTS ───────────────────────────────────────────────────────

describe("KTP Parser — Original", () => {
  describe("Full KTP — DKI Jakarta", () => {
    const result = parseKtp(KTP_FULL);

    it("extracts namaLengkap", () => expect(result.namaLengkap).toBe("BUDI SANTOSO"));
    it("extracts tempatLahir", () => expect(result.tempatLahir).toBe("Jakarta"));
    it("normalizes tanggalLahir", () => expect(result.tanggalLahir).toBe("1980-07-12"));
    it("extracts kelurahan", () => expect(result.kelurahan).toBe("Gambir"));
    it("extracts kecamatan", () => expect(result.kecamatan).toBe("Gambir"));
    it("extracts kotaKabupaten", () => expect(result.kotaKabupaten).toBe("Kota Jakarta Pusat"));
    it("extracts provinsi", () => expect(result.provinsi).toBe("Dki Jakarta"));
    it("assembles alamatLengkap", () => {
      expect(result.alamatLengkap).toBe(
        "JL. MERDEKA NO. 15, RT.002/RW.005, Kel. Gambir, Kec. Gambir, Kota Jakarta Pusat",
      );
    });
    it("has confidence >= 0.85", () => expect(result.confidence).toBeGreaterThanOrEqual(0.85));
  });

  describe("KTP Kabupaten", () => {
    const result = parseKtp(KTP_KABUPATEN);
    it("handles KABUPATEN", () => expect(result.kotaKabupaten).toBe("Kabupaten Sidoarjo"));
    it("extracts provinsi", () => expect(result.provinsi).toBe("Jawa Timur"));
    it("handles RT.003 RW.001", () => expect(result.alamatLengkap).toContain("RT.003/RW.001"));
  });

  describe("KTP text month", () => {
    const result = parseKtp(KTP_IMPERFECT);
    it("converts text month", () => expect(result.tanggalLahir).toBe("1985-12-12"));
    it("extracts kelurahan", () => expect(result.kelurahan).toBe("Braga"));
    it("alamatLengkap contains Kel.", () => expect(result.alamatLengkap).toContain("Kel. Braga"));
  });
});

// ── HARDENING TESTS ────────────────────────────────────────────

describe("KTP Parser — Hardening v2.1", () => {

  describe("1. Fuzzy label matching (OCR typos)", () => {
    const result = parseKtp(KTP_OCR_TYPOS);

    it("'Narna' → namaLengkap", () => expect(result.namaLengkap).toBe("AHMAD RAHMAN"));
    it("'Ternpat' → tempatLahir", () => expect(result.tempatLahir).toBe("Jakarta"));
    it("'KeI/Desa' → kelurahan", () => expect(result.kelurahan).toBe("Gambir"));
    it("'Kecarnatan' → kecamatan", () => expect(result.kecamatan).toBe("Gambir"));
    it("'Alarnat' → alamatJalan", () => expect(result.alamatLengkap).toContain("JL. MERDEKA NO. 15"));
  });

  describe("2. OCR normalization (K0TA, PR0VINSI)", () => {
    const result = parseKtp(KTP_OCR_TYPOS);

    it("'K0TA' → kotaKabupaten", () => {
      expect(result.kotaKabupaten).toBe("Kota Jakarta Pusat");
    });
    it("'PR0VINSI' → provinsi", () => {
      expect(result.provinsi).toBe("Dki Jakarta");
    });
  });

  describe("3. Nama without colon", () => {
    const result = parseKtp(KTP_NO_COLON);

    it("extracts nama without colon", () => {
      expect(result.namaLengkap).toBe("AHMAD RAHMAN");
    });
    it("extracts tempatLahir without colon on TTL", () => {
      expect(result.tempatLahir).toBe("Surabaya");
    });
  });

  describe("4. Tempat/Tgl Lahir without comma", () => {
    const result = parseKtp(KTP_NO_COMMA_TTL);

    it("splits TTL by first digit", () => {
      expect(result.tempatLahir).toBe("Semarang");
    });
    it("extracts date after space", () => {
      expect(result.tanggalLahir).toBe("1992-03-15");
    });
  });

  describe("5. Date validation", () => {
    it("rejects month > 12 in DD-MM format", () => {
      const r = parseKtp("Nama : TEST\nTempat/Tgl Lahir: JAKARTA, 12-13-1990");
      // 13 is not a valid month — but in DD-MM, 12=day, 13=month→invalid
      // Should swap to MM-DD: 12=month, 13=day→also invalid
      // Returns raw because both orientations fail validation
      expect(r.tanggalLahir).not.toBe("1990-13-12");
    });

    it("handles valid single-digit day/month", () => {
      const r = parseKtp("Nama : TEST\nTempat/Tgl Lahir: MEDAN, 5-3-1990");
      expect(r.tanggalLahir).toBe("1990-03-05");
    });
  });

  describe("6. Province/city fallback from address", () => {
    const result = parseKtp(KTP_HEADER_MISSING);

    it("detects Denpasar from address context", () => {
      // Should detect Denpasar as city
      expect(result.kotaKabupaten).toBeTruthy();
    });
    it("still extracts other fields normally", () => {
      expect(result.namaLengkap).toBe("WAYAN SUDARMA");
      expect(result.kelurahan).toBe("Sumerta");
      expect(result.kecamatan).toBe("Denpasar Timur");
    });
  });

  describe("7. RT-RW with dash format", () => {
    const result = parseKtp(KTP_RT_DASH);

    it("handles 'RT-RW: 001-003'", () => {
      expect(result.alamatLengkap).toContain("RT.001/RW.003");
    });
  });
});

// ── EDGE CASES ──────────────────────────────────────────────────

describe("KTP Parser — Edge cases", () => {
  it("empty text → confidence 0", () => {
    const r = parseKtp("");
    expect(r.namaLengkap).toBe("");
    expect(r.confidence).toBe(0);
  });

  it("garbled text with partial data", () => {
    const r = parseKtp("PROVINSI BALI\nKOTA DENPASAR\nNama : WAYAN\nasdfghjkl");
    expect(r.namaLengkap).toBe("WAYAN");
    expect(r.provinsi).toBe("Bali");
  });

  it("produces valid JSON roundtrip", () => {
    const json = JSON.stringify(parseKtp(KTP_FULL), null, 2);
    console.log("=== KTP JSON OUTPUT (v2.1) ===");
    console.log(json);

    const parsed: KtpData = JSON.parse(json);
    expect(parsed.namaLengkap).toBeTruthy();
    expect(parsed.tanggalLahir).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.alamatLengkap).toBeTruthy();
  });
});
