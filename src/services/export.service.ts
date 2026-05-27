import type { ExportConfig, ExportResult } from "./contracts";

export function generateExportData<T>(
  config: ExportConfig,
  rows: T[],
  accessor: (row: T) => string[]
): ExportResult {
  const headers = config.columns.map((c) => c.header);
  const csvRows = rows.map((row) => {
    const values = accessor(row);
    return values.map((v) => escapeCsvField(v)).join(",");
  });

  const content = [headers.join(","), ...csvRows].join("\n") + "\n";

  const mimeTypes: Record<ExportConfig["format"], string> = {
    csv: "text/csv;charset=utf-8",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };

  return {
    fileName: config.fileName,
    content,
    mimeType: mimeTypes[config.format],
  };
}

function escapeCsvField(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export { escapeCsvField };
