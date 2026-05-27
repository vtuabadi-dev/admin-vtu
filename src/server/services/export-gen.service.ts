// Export Generation Service
// CSV (Node streams), Excel (exceljs), PDF (pdfmake)

import { getStorageAdapter, exportFilePath } from "@/server/storage";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportType = "manifest" | "rooming" | "invoice" | "payment" | "jamaah" | "dokumen";

interface ExportRequest {
  id: string;
  format: ExportFormat;
  exportType: ExportType;
  requestedBy: string;
  filters?: Record<string, string>;
}

interface ExportResult {
  fileUrl: string;
  fileName: string;
  format: ExportFormat;
  sizeBytes: number;
}

// ── CSV Generator ─────────────────────────────────────────────

async function generateCSV(columns: string[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const header = columns.join(",") + "\n";
  const body = rows.map((row) =>
    columns.map((col) => {
      const val = row[col] ?? "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  ).join("\n");
  return Buffer.from(header + body, "utf-8");
}

// ── Excel Generator ───────────────────────────────────────────

async function generateXLSX(columns: string[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");

  sheet.columns = columns.map((col) => ({ header: col, key: col, width: Math.max(col.length + 4, 15) }));
  rows.forEach((row) => sheet.addRow(row as any));

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ── PDF Generator ─────────────────────────────────────────────

async function generatePDF(title: string, columns: string[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const PdfPrinter = (await import("pdfmake")).default;

  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };

  const docDefinition: any = {
    content: [
      { text: title, style: "header" },
      { text: `Generated: ${new Date().toLocaleString("id-ID")}`, style: "subheader" },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => "*"),
          body: [
            columns.map((c) => ({ text: c, style: "tableHeader" })),
            ...rows.map((row) => columns.map((col) => String(row[col] ?? ""))),
          ],
        },
      },
    ],
    styles: {
      header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 10, color: "#666", margin: [0, 0, 0, 15] },
      tableHeader: { bold: true, fontSize: 10, fillColor: "#E0E0E0" },
    },
    defaultStyle: { fontSize: 9 },
    pageOrientation: "landscape",
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

// ── Main Export Function ──────────────────────────────────────

export async function generateExport(req: ExportRequest, data: Record<string, unknown>[]): Promise<ExportResult> {
  if (!data.length) {
    // Provide minimal data if empty
    data = [{ message: "No data available" }];
  }

  const columns = Object.keys(data[0] || {});
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const title = `${req.exportType.toUpperCase()} Export`;

  let buffer: Buffer;
  let ext: string;
  let contentType: string;

  switch (req.format) {
    case "csv":
      buffer = await generateCSV(columns, data);
      ext = "csv";
      contentType = "text/csv";
      break;
    case "xlsx":
      buffer = await generateXLSX(columns, data);
      ext = "xlsx";
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    case "pdf":
      buffer = await generatePDF(title, columns, data);
      ext = "pdf";
      contentType = "application/pdf";
      break;
    default:
      throw new Error(`Unsupported format: ${req.format}`);
  }

  const fileName = `${req.exportType}-${timestamp}.${ext}`;
  const storagePath = exportFilePath(fileName);
  const storage = getStorageAdapter();
  const fileUrl = await storage.upload(storagePath, buffer, contentType);

  return { fileUrl, fileName, format: req.format, sizeBytes: buffer.length };
}
