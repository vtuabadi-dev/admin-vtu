"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  FileText,
  Hotel,
  CreditCard,
  Users,
  X,
  CheckSquare,
  Square,
  LayoutTemplate,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { getKeberangkatanList, getGroupList, getExportData } from "@/server/actions/api";
import type { Keberangkatan, RegistrationGroup, ExportDataType, ExportFormat } from "@/shared/types";
import { generateCSVContent, downloadAsCSV } from "@/shared/lib/export-utils";
import { cn } from "@/shared/lib/utils";

const MANIFEST_TEMPLATES = [
  { value: "siskopatuh", label: "SISKOPATUH" },
  { value: "visa", label: "Visa" },
  { value: "blockseat", label: "Blockseat" },
];

const ROOMING_TEMPLATES = [
  { value: "hotel", label: "Hotel" },
  { value: "rooming", label: "Rooming" },
];

const getTemplatesForType = (type: ExportDataType) => {
  switch (type) {
    case "manifest":
      return MANIFEST_TEMPLATES;
    case "rooming":
      return ROOMING_TEMPLATES;
    case "invoice":
      return [{ value: "invoice" as const, label: "Invoice" }];
    case "payment":
      return [{ value: "payment_recap" as const, label: "Rekap Pembayaran" }];
    case "jamaah":
      return [{ value: "jamaah_data" as const, label: "Data Jamaah" }];
  }
};

const TEMPLATE_COLUMNS: Record<string, string[]> = {
  siskopatuh: ["Nama", "No. Paspor", "Kewarganegaraan", "Tgl Lahir", "No. Penerbangan", "Hotel Mekkah", "Hotel Madinah"],
  visa: ["Nama", "No. Paspor", "Tgl Expired Paspor", "Kewarganegaraan", "Tgl Lahir", "Jenis Kelamin", "Warna Kulit", "Tinggi", "Pekerjaan"],
  blockseat: ["Nama", "No. Peserta", "Group", "No. Penerbangan", "Maskapai", "Seat"],
  hotel: ["Nama", "Hotel Mekkah", "No. Kamar Mekkah", "Hotel Madinah", "No. Kamar Madinah", "Group"],
  rooming: ["Nama", "Hotel", "No. Kamar", "Tipe Kamar", "Sekamar Dengan", "Group"],
  invoice: ["No. Invoice", "Group", "Jumlah", "Tipe", "Status", "Tgl Dibuat"],
  payment_recap: ["Group", "Total Tagihan", "Total Dibayar", "Sisa", "Status", "Jamaah"],
  jamaah_data: ["Nama", "No. Peserta", "No. Paspor", "NIK", "Tgl Lahir", "Group", "Status"],
};

const DATA_TYPE_OPTIONS: { value: ExportDataType; label: string; icon: typeof FileText }[] = [
  { value: "manifest", label: "Manifest", icon: FileText },
  { value: "rooming", label: "Rooming", icon: Hotel },
  { value: "invoice", label: "Invoice", icon: FileSpreadsheet },
  { value: "payment", label: "Rekap Pembayaran", icon: CreditCard },
  { value: "jamaah", label: "Data Jamaah", icon: Users },
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
  { value: "pdf", label: "PDF" },
];

export default function ExportCenterPage() {
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [groupList, setGroupList] = useState<RegistrationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [dataType, setDataType] = useState<ExportDataType>("manifest");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [template, setTemplate] = useState<string>("");
  const [filterKbrId, setFilterKbrId] = useState<string>("");
  const [filterGroupId, setFilterGroupId] = useState<string>("");
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      const [kbr, grp] = await Promise.all([getKeberangkatanList(), getGroupList()]);
      setKeberangkatanList(kbr);
      setGroupList(grp);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadPreview() {
      setPreviewLoading(true);
      const result = await getExportData({
        type: dataType,
        format,
        filterKeberangkatanId: filterKbrId || undefined,
        filterGroupId: filterGroupId || undefined,
      });
      setPreviewHeaders(result.headers);
      setPreviewRows(result.rows);
      setSelectedColumns(new Set(result.headers.map((_, i) => i)));
      setPreviewLoading(false);
    }
    setTemplate("");
    loadPreview();
  }, [dataType, format, filterKbrId, filterGroupId]);

  // Auto-select columns based on template
  useEffect(() => {
    if (!template || previewHeaders.length === 0) return;
    const cols = TEMPLATE_COLUMNS[template];
    if (!cols) return;
    const indices = new Set<number>();
    previewHeaders.forEach((h, i) => {
      if (cols.some((c) => h.toLowerCase().includes(c.toLowerCase()))) {
        indices.add(i);
      }
    });
    if (indices.size > 0) setSelectedColumns(indices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, previewHeaders]);

  const visibleHeaders = useMemo(
    () => previewHeaders.filter((_, i) => selectedColumns.has(i)),
    [previewHeaders, selectedColumns]
  );

  const visibleRows = useMemo(
    () =>
      previewRows.map((row) => row.filter((_, i) => selectedColumns.has(i))),
    [previewRows, selectedColumns]
  );

  function toggleColumn(idx: number) {
    const next = new Set(selectedColumns);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedColumns(next);
  }

  function handleDownload() {
    if (format !== "csv") return;
    const csv = generateCSVContent(visibleHeaders, visibleRows);
    downloadAsCSV(csv, `${dataType}-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasFilters = Boolean(filterKbrId || filterGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pusat export data operasional
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Data Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Tipe Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {DATA_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDataType(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                      dataType === opt.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Format */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1.5">
                {FORMAT_OPTIONS.map((f) => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={format === f.value ? "default" : "outline"}
                    onClick={() => setFormat(f.value)}
                    disabled={f.value !== "csv"}
                    className="flex-1"
                  >
                    {f.label}
                    {f.value !== "csv" && (
                      <span className="ml-1 text-[9px] opacity-70">soon</span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <LayoutTemplate className="inline h-4 w-4 mr-1.5" />
                Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Pilih template..."
                options={getTemplatesForType(dataType)}
              />
              {template && (
                <p className="text-xs text-muted-foreground mt-2">
                  Template menentukan kolom default dan sorting data export
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                label="Paket Keberangkatan"
                options={[
                  { value: "", label: "Semua Paket" },
                  ...keberangkatanList.map((k) => ({
                    value: k.id,
                    label: `${k.kode} — ${k.paketUmroh?.namaPaket || "-"}`,
                  })),
                ]}
                value={filterKbrId}
                onChange={(e) => setFilterKbrId(e.target.value)}
              />
              <Select
                label="Grup"
                options={[
                  { value: "", label: "Semua Grup" },
                  ...groupList.map((g) => ({
                    value: g.id,
                    label: `${g.kodeRegistrasi} — ${g.namaGroup}`,
                  })),
                ]}
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterKbrId("");
                    setFilterGroupId("");
                  }}
                  className="w-full text-xs"
                >
                  <X className="mr-1.5 h-3 w-3" />
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Download */}
          <Button
            className="w-full"
            onClick={handleDownload}
            disabled={format !== "csv" || visibleRows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download {format.toUpperCase()}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Column Selector */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Pratinjau
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {visibleRows.length} baris · {selectedColumns.size}/{previewHeaders.length} kolom
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {previewHeaders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {previewHeaders.map((h, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleColumn(idx)}
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                        selectedColumns.has(idx)
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selectedColumns.has(idx) ? (
                        <CheckSquare className="mr-1 h-3 w-3" />
                      ) : (
                        <Square className="mr-1 h-3 w-3" />
                      )}
                      {h}
                    </button>
                  ))}
                </div>
              )}

              {previewLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Memuat pratinjau...</p>
              ) : visibleRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Tidak ada data untuk ditampilkan
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {visibleHeaders.map((h, idx) => (
                          <th key={idx} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.slice(0, 50).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
