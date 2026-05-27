import type { ExportRequest, ExportDataType, ExportFormat } from "@/shared/types";

const HEADER_MAPS: Record<ExportDataType, string[]> = {
  manifest: [
    "No. Urut",
    "Nama Lengkap",
    "No. Paspor",
    "Tempat Lahir",
    "Tanggal Lahir",
    "No. Kursi",
    "No. Kamar",
    "Catatan",
  ],
  rooming: [
    "No. Kamar",
    "Tipe Kamar",
    "Lantai",
    "Nama Penghuni",
    "Jenis Kelamin",
    "Hotel Mekkah",
    "Hotel Madinah",
    "Status",
  ],
  invoice: [
    "No. Invoice",
    "Group",
    "Tipe",
    "Jumlah",
    "Sisa Tagihan",
    "Status",
    "Jatuh Tempo",
    "Tanggal Dibuat",
  ],
  payment: [
    "Tanggal",
    "Group",
    "Invoice",
    "Jumlah",
    "Metode",
    "Status",
    "Catatan",
  ],
  jamaah: [
    "No. Peserta",
    "Nama Lengkap",
    "Jenis Kelamin",
    "Tempat Lahir",
    "Tanggal Lahir",
    "NIK",
    "No. Paspor",
    "Masa Berlaku Paspor",
    "Hotel Mekkah",
    "Hotel Madinah",
    "Status",
    "Group",
  ],
};

const EMPTY_ROWS: string[][] = [];

export function getExportHeaders(type: ExportDataType): string[] {
  return HEADER_MAPS[type] ?? [];
}

export function generateCSVContent(headers: string[], rows: string[][]): string {
  const escape = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) => row.map(escape).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function downloadAsCSV(content: string, filename: string): void {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(headers: string[], rows: string[][], fileName: string): void {
  const csvRows = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))];
  downloadAsCSV(csvRows.join("\n"), `${fileName}.csv`);
}

export function getExportFileName(type: ExportDataType, format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${type}-${date}.${format}`;
}

export async function prepareExportData(
  request: ExportRequest,
  // These would come from mock handlers
  getManifestData: () => Promise<string[][]>,
  getRoomingData: () => Promise<string[][]>,
  getInvoiceData: () => Promise<string[][]>,
  getPaymentData: () => Promise<string[][]>,
  getJamaahData: () => Promise<string[][]>
): Promise<{ headers: string[]; rows: string[][] }> {
  const headers = getExportHeaders(request.type);

  let rows: string[][];
  switch (request.type) {
    case "manifest":
      rows = await getManifestData();
      break;
    case "rooming":
      rows = await getRoomingData();
      break;
    case "invoice":
      rows = await getInvoiceData();
      break;
    case "payment":
      rows = await getPaymentData();
      break;
    case "jamaah":
      rows = await getJamaahData();
      break;
    default:
      rows = EMPTY_ROWS;
  }

  return { headers, rows };
}
