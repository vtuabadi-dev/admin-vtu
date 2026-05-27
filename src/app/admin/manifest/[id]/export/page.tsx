"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  File,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Tabs } from "@/shared/components/ui/Tabs";
import { getManifestById } from "@/services/mock/handlers";
import { generateCSVContent, downloadAsCSV } from "@/shared/lib/export-utils";
import type { Manifest, ManifestRow } from "@/shared/types";

interface ColumnOption {
  key: string;
  label: string;
  default: boolean;
}

const allColumns: ColumnOption[] = [
  { key: "nomorUrut", label: "No. Urut", default: true },
  { key: "namaLengkap", label: "Nama Lengkap", default: true },
  { key: "nomorPaspor", label: "No. Paspor", default: true },
  { key: "tempatLahir", label: "Tempat Lahir", default: true },
  { key: "tanggalLahir", label: "Tanggal Lahir", default: true },
  { key: "nomorKursi", label: "No. Kursi", default: true },
  { key: "nomorKamar", label: "No. Kamar", default: true },
  { key: "catatan", label: "Catatan", default: false },
];

function getRowValue(row: ManifestRow, key: string): string | undefined {
  switch (key) {
    case "nomorUrut": return String(row.nomorUrut);
    case "namaLengkap": return row.namaLengkap;
    case "nomorPaspor": return row.nomorPaspor;
    case "tempatLahir": return row.tempatLahir;
    case "tanggalLahir": return row.tanggalLahir;
    case "nomorKursi": return row.nomorKursi;
    case "nomorKamar": return row.nomorKamar;
    case "catatan": return row.catatan;
    default: return undefined;
  }
}

const headerMap: Record<string, string> = {
  nomorUrut: "No",
  namaLengkap: "Nama Lengkap",
  nomorPaspor: "No Paspor",
  tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir",
  nomorKursi: "No Kursi",
  nomorKamar: "No Kamar",
  catatan: "Catatan",
};

export default function ManifestExportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCols, setSelectedCols] = useState<string[]>(
    allColumns.filter((c) => c.default).map((c) => c.key)
  );
  const [exportFormat, setExportFormat] = useState("csv");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getManifestById(id);
      if (m) {
        setManifest(m);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleColumn(key: string) {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleDownload() {
    if (!manifest) return;

    if (exportFormat !== "csv") {
      alert(`Download format ${exportFormat.toUpperCase()} akan tersedia segera.`);
      return;
    }

    const headers = selectedCols.map((key) => headerMap[key] ?? key);
    const rows = manifest.data.map((row) =>
      selectedCols.map((key) => String(getRowValue(row, key) ?? ""))
    );
    const csv = generateCSVContent(headers, rows);
    downloadAsCSV(csv, `${manifest.kode}.csv`);
  }

  const formatTabs = [
    { value: "csv", label: "CSV" },
    { value: "excel", label: "Excel" },
    { value: "pdf", label: "PDF" },
  ];

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Memuat data...
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/manifest")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Manifest tidak ditemukan
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/manifest/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Detail Manifest
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Manifest</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {manifest.namaManifest} ({manifest.kode})
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Column Selector */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pilih Kolom</CardTitle>
              <CardDescription>
                Centang kolom yang akan ditampilkan di export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allColumns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                  >
                    {selectedCols.includes(col.key) ? (
                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {col.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Terpilih: {selectedCols.length} dari {allColumns.length} kolom
              </div>
            </CardContent>
          </Card>

          {/* Format selector and download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Format Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs
                tabs={formatTabs}
                defaultTab="csv"
                onTabChange={(val) => setExportFormat(val)}
              >
                {() => null}
              </Tabs>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs">
                {exportFormat === "csv" && <FileSpreadsheet className="h-4 w-4 text-success" />}
                {exportFormat === "excel" && <FileText className="h-4 w-4 text-info" />}
                {exportFormat === "pdf" && <File className="h-4 w-4 text-destructive" />}
                <span className="text-muted-foreground">
                  {exportFormat === "csv" && "Comma Separated Values (.csv)"}
                  {exportFormat === "excel" && "Microsoft Excel (.xlsx) — coming soon"}
                  {exportFormat === "pdf" && "PDF Document (.pdf) — coming soon"}
                </span>
              </div>
              <Button className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pratinjau Export</CardTitle>
              <CardDescription>
                Menampilkan {manifest.data.length} baris data — {selectedCols.length} kolom terpilih
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-xs dense-table">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b bg-muted/30">
                      {selectedCols.map((key) => {
                        const col = allColumns.find((c) => c.key === key);
                        return (
                          <th
                            key={key}
                            className="h-8 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {col?.label ?? key}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {manifest.data.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/30">
                        {selectedCols.map((key) => {
                          const val = getRowValue(row, key);
                          return (
                            <td key={key} className="h-7 px-2 align-middle whitespace-nowrap">
                              {val ?? "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
