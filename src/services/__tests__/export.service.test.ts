import { describe, it, expect } from "vitest";
import { generateExportData, escapeCsvField } from "../export.service";
import type { ExportConfig, ExportColumn } from "../contracts";

const columns: ExportColumn[] = [
  { key: "nama", header: "Nama" },
  { key: "jumlah", header: "Jumlah" },
  { key: "status", header: "Status" },
];

const config: ExportConfig = {
  format: "csv",
  columns,
  fileName: "test-export",
};

describe("generateExportData", () => {
  it("produces correct CSV content with headers", () => {
    const rows = [
      { nama: "Ali", jumlah: 100, status: "OK" },
      { nama: "Budi", jumlah: 200, status: "Pending" },
    ];
    const result = generateExportData(config, rows, (r) => [
      r.nama,
      String(r.jumlah),
      r.status,
    ]);
    expect(result.fileName).toBe("test-export");
    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.content).toBe(
      "Nama,Jumlah,Status\nAli,100,OK\nBudi,200,Pending\n"
    );
  });

  it("escapes fields containing commas", () => {
    const rows = [{ nama: "Ali, Jr.", jumlah: 100, status: "OK" }];
    const result = generateExportData(config, rows, (r) => [
      r.nama,
      String(r.jumlah),
      r.status,
    ]);
    expect(result.content).toContain('"Ali, Jr."');
  });

  it("escapes fields containing quotes", () => {
    const rows = [{ nama: 'Ali "The Great"', jumlah: 100, status: "OK" }];
    const result = generateExportData(config, rows, (r) => [
      r.nama,
      String(r.jumlah),
      r.status,
    ]);
    expect(result.content).toContain('"Ali ""The Great"""');
  });

  it("column count in content matches column definitions", () => {
    const rows = [{ nama: "Test", jumlah: 1, status: "OK" }];
    const result = generateExportData(config, rows, (r) => [
      r.nama,
      String(r.jumlah),
      r.status,
    ]);
    const lines = result.content.trim().split("\n");
    lines.forEach((line) => {
      expect(line.split(",").length).toBe(3);
    });
  });

  it("handles empty rows array", () => {
    const result = generateExportData(config, [], () => []);
    expect(result.content).toBe("Nama,Jumlah,Status\n");
  });
});

describe("escapeCsvField", () => {
  it("returns empty string for falsy values", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("returns plain string unchanged", () => {
    expect(escapeCsvField("Hello")).toBe("Hello");
  });

  it("wraps in quotes when value contains comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("doubles inner quotes", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
  });
});
