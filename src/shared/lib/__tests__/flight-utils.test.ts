import { describe, it, expect } from "vitest";
import { detectFlightType } from "../flight-utils";
import type { FlightSegment } from "@/shared/types";

describe("detectFlightType", () => {
  it("mengembalikan null jika segmen kosong atau tidak ada bandara", () => {
    expect(detectFlightType([])).toBeNull();
    expect(
      detectFlightType([
        {
          tanggal: "2026-09-01",
          kodeFlight: "",
          pnr: "",
          asal: "",
          tujuan: "",
          jamBerangkat: "",
          jamTiba: "",
        },
      ])
    ).toBeNull();
  });

  it("mengembalikan Direct untuk rute Surabaya langsung ke Jeddah / Madinah", () => {
    const directSurabaya: FlightSegment[] = [
      {
        tanggal: "2026-09-06",
        kodeFlight: "SV-381",
        pnr: "PNR123",
        asal: "SUB",
        tujuan: "JED",
        jamBerangkat: "10:00",
        jamTiba: "16:30",
      },
      {
        tanggal: "2026-09-18",
        kodeFlight: "SV-382",
        pnr: "PNR123",
        asal: "MED",
        tujuan: "SUB",
        jamBerangkat: "19:00",
        jamTiba: "09:00+1",
      },
    ];
    expect(detectFlightType(directSurabaya)).toBe("Direct");
  });

  it("mengembalikan Direct untuk rute Jakarta langsung ke Jeddah / Madinah", () => {
    const directJakarta: FlightSegment[] = [
      {
        tanggal: "2026-09-10",
        kodeFlight: "GA-980",
        pnr: "GA123",
        asal: "CGK",
        tujuan: "MED",
        jamBerangkat: "11:30",
        jamTiba: "17:30",
      },
      {
        tanggal: "2026-09-22",
        kodeFlight: "GA-981",
        pnr: "GA123",
        asal: "JED",
        tujuan: "CGK",
        jamBerangkat: "21:00",
        jamTiba: "11:00+1",
      },
    ];
    expect(detectFlightType(directJakarta)).toBe("Direct");
  });

  it("mengembalikan Transit untuk penerbangan via Brunei (Royal Brunei)", () => {
    const transitRoyalBrunei: FlightSegment[] = [
      {
        tanggal: "2026-09-06",
        kodeFlight: "BI-796",
        pnr: "17J4HP",
        asal: "SUB",
        tujuan: "BWN",
        jamBerangkat: "05:00",
        jamTiba: "09:15",
      },
      {
        tanggal: "2026-09-06",
        kodeFlight: "BI-816",
        pnr: "17J4HP",
        asal: "BWN",
        tujuan: "JED",
        jamBerangkat: "11:15",
        jamTiba: "17:30",
      },
      {
        tanggal: "2026-09-17",
        kodeFlight: "BI-815",
        pnr: "17J4HP",
        asal: "JED",
        tujuan: "BWN",
        jamBerangkat: "19:00",
        jamTiba: "11:00+1",
      },
      {
        tanggal: "2026-09-18",
        kodeFlight: "BI-795",
        pnr: "17J4HP",
        asal: "BWN",
        tujuan: "SUB",
        jamBerangkat: "14:00",
        jamTiba: "16:15",
      },
    ];
    expect(detectFlightType(transitRoyalBrunei)).toBe("Transit");
  });

  it("mengembalikan Transit untuk paket starting Surabaya via feeder Jakarta", () => {
    const feederSurabayaJakarta: FlightSegment[] = [
      {
        tanggal: "2026-09-06",
        kodeFlight: "GA-305",
        pnr: "SPLIT1",
        asal: "SUB",
        tujuan: "CGK",
        jamBerangkat: "06:00",
        jamTiba: "07:30",
        isFeeder: true,
      },
      {
        tanggal: "2026-09-06",
        kodeFlight: "GA-980",
        pnr: "MAIN1",
        asal: "CGK",
        tujuan: "JED",
        jamBerangkat: "11:00",
        jamTiba: "17:00",
      },
      {
        tanggal: "2026-09-17",
        kodeFlight: "GA-981",
        pnr: "MAIN1",
        asal: "JED",
        tujuan: "CGK",
        jamBerangkat: "21:00",
        jamTiba: "11:00+1",
      },
      {
        tanggal: "2026-09-18",
        kodeFlight: "GA-318",
        pnr: "SPLIT1",
        asal: "CGK",
        tujuan: "SUB",
        jamBerangkat: "14:00",
        jamTiba: "15:30",
        isFeeder: true,
      },
    ];
    expect(detectFlightType(feederSurabayaJakarta)).toBe("Transit");
  });

  it("mengembalikan Transit untuk rute internasional via Doha, Dubai, Singapura, atau Kuala Lumpur", () => {
    const transitDoha: FlightSegment[] = [
      {
        tanggal: "2026-09-01",
        kodeFlight: "QR-957",
        pnr: "QR123",
        asal: "CGK",
        tujuan: "DOH",
        jamBerangkat: "18:25",
        jamTiba: "23:15",
      },
      {
        tanggal: "2026-09-02",
        kodeFlight: "QR-1184",
        pnr: "QR123",
        asal: "DOH",
        tujuan: "JED",
        jamBerangkat: "02:00",
        jamTiba: "04:30",
      },
    ];
    expect(detectFlightType(transitDoha)).toBe("Transit");
  });
});
