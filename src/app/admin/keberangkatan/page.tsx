"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, CalendarDays, Hotel, Search, Trash2, Info, Copy, Check, Pencil, FileText, UserCheck, UserPlus, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/shared/components/ui/Modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import { getKeberangkatanList, deleteKeberangkatan } from "@/server/actions/api";
import type { Keberangkatan } from "@/shared/types";
import { formatDate, cn } from "@/shared/lib/utils";
import { useOperationalStore } from "@/stores/operational-store";

const BULAN_LABEL: Record<number, string> = {
  1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
  5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
  9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

export default function KeberangkatanListPage() {
  const storeIsLoaded = useOperationalStore((s) => s.isLoaded);
  const storeKbrList = useOperationalStore((s) => s.keberangkatanList);

  const router = useRouter();
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan[]>(storeKbrList);
  const [loading, setLoading] = useState(!storeIsLoaded);
  const [error, setError] = useState<Error | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errors: string[];
  } | null>(null);



  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getKeberangkatanList();
      setKeberangkatan(data);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error("Database Connection Error"));
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) return alert("Pilih file Excel terlebih dahulu");
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/admin/keberangkatan/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult({
          successCount: json.createdCount,
          errors: json.errors || [],
        });
        load(); // Refresh the list
      } else {
        alert(json.message || "Gagal mengimpor data Excel");
      }
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan saat mengimpor file");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (storeIsLoaded) {
      setKeberangkatan(storeKbrList);
      setLoading(false);
    } else {
      load();
    }
  }, [storeIsLoaded, storeKbrList]);

  // Tutup popover ID Paket saat klik di luar
  useEffect(() => {
    if (!openInfoId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const btn = document.getElementById(`info-btn-${openInfoId}`);
      if (btn && !btn.closest("[data-info-popover]") && !btn.contains(e.target as Node)) {
        setOpenInfoId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openInfoId]);

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus paket ini?")) {
      try {
        const res = await deleteKeberangkatan(id);
        if (res && res.success === false) {
          alert(res.message);
        } else {
          setKeberangkatan((prev) => prev.filter((k) => k.id !== id));
          useOperationalStore.getState().setKeberangkatanList(
            useOperationalStore.getState().keberangkatanList.filter((k) => k.id !== id)
          );
        }
      } catch (error: any) {
        alert("Gagal menghapus paket: " + (error?.message || "Terjadi kesalahan sistem"));
      }
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    for (const k of keberangkatan) {
      months.add(new Date(k.tanggalBerangkat).getMonth() + 1);
    }
    return Array.from(months).sort((a, b) => a - b);
  }, [keberangkatan]);

  const filteredKeberangkatan = useMemo(() => {
    let result = keberangkatan;
    if (selectedMonth !== null) {
      result = result.filter(
        (k) => new Date(k.tanggalBerangkat).getMonth() + 1 === selectedMonth
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (k) =>
          (k.namaPaket || k.paketUmroh?.namaPaket || "").toLowerCase().includes(q) ||
          k.kode.toLowerCase().includes(q) ||
          (k.maskapaiId && k.maskapaiId.toLowerCase().includes(q)) ||
          (k.hotelMekkahId && k.hotelMekkahId.toLowerCase().includes(q)) ||
          (k.hotelMadinahId && k.hotelMadinahId.toLowerCase().includes(q))
      );
    }
    return result;
  }, [keberangkatan, selectedMonth, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data keberangkatan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <ErrorState onRetry={load} message={error.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keberangkatan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola jadwal dan paket keberangkatan umroh
          </p>
        </div>
        <Button
          onClick={() => {
            setImportFile(null);
            setImportResult(null);
            setIsImportModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import Excel
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari paket, kode, maskapai, hotel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Keberangkatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{keberangkatan.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Kuota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {keberangkatan.reduce((s, k) => s + (k.maxSeat || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Terisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {keberangkatan.reduce((s, k) => s + k.terisi, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Month Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={selectedMonth === null ? "default" : "outline"}
          onClick={() => setSelectedMonth(null)}
        >
          Semua ({keberangkatan.length})
        </Button>
        {availableMonths.map((m) => {
          const count = keberangkatan.filter(
            (k) => new Date(k.tanggalBerangkat).getMonth() + 1 === m
          ).length;
          return (
            <Button
              key={m}
              size="sm"
              variant={selectedMonth === m ? "default" : "outline"}
              onClick={() => setSelectedMonth(m)}
            >
              {BULAN_LABEL[m]} ({count})
            </Button>
          );
        })}
      </div>

      {/* Keberangkatan Cards */}
      {filteredKeberangkatan.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Tidak ada paket keberangkatan bulan{" "}
          {selectedMonth ? BULAN_LABEL[selectedMonth] : ""} ini
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredKeberangkatan.map((k) => {
          const maxSeat = k.maxSeat || 0;
          const persen = maxSeat > 0 ? Math.round((k.terisi / maxSeat) * 100) : 0;
          const progressColor =
            persen >= 90
              ? "bg-success"
              : persen >= 50
                ? "bg-warning"
                : "bg-primary";

          return (
            <Card key={k.id} variant="operational" className="flex flex-col h-full border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{k.namaPaket || k.paketUmroh?.namaPaket || "-"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {k.kode}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Tombol ID Paket Tersembunyi */}
                    <div className="relative">
                      <button
                        id={`info-btn-${k.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenInfoId(openInfoId === k.id ? null : k.id);
                        }}
                        className={cn(
                          "inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold border transition-colors",
                          openInfoId === k.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/60 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                        )}
                        title="Lihat ID Paket"
                        aria-label="Tampilkan ID Paket"
                      >
                        !
                      </button>
                      {openInfoId === k.id && (
                        <div
                          className="absolute right-0 top-8 z-50 w-72 rounded-lg border bg-popover shadow-lg p-3 animate-in fade-in-0 zoom-in-95"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                              <Info className="h-3 w-3" /> ID Paket
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenInfoId(null); }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Tutup"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-1.5">
                            <code className="text-xs font-mono flex-1 break-all text-foreground select-all">
                              {k.id}
                            </code>
                            <button
                              onClick={(e) => handleCopyId(k.id, e)}
                              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                              title="Salin ID"
                              aria-label="Salin ID Paket"
                            >
                              {copiedId === k.id
                                ? <Check className="h-3.5 w-3.5 text-success" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Single Source of Truth — tidak berubah seumur hidup paket
                          </p>
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold",
                        persen >= 80
                          ? "bg-success/10 text-success"
                          : persen >= 50
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                      )}
                      title={`Skor kesiapan: ${persen}% (estimasi)`}
                    >
                      {persen}
                    </span>
                    <StatusBadge status={k.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between p-5 space-y-4">
                {/* Content Top & Middle (Stretches to fill vertical height) */}
                <div className="space-y-4 flex-1">
                  {/* Tanggal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Berangkat</p>
                        <p className="font-medium">
                          {formatDate(k.tanggalBerangkat)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pulang</p>
                        <p className="font-medium">
                          {formatDate(k.tanggalPulang)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Petugas Lapangan (Tour Leader & Muthowif) */}
                  {(() => {
                    const meta = (k as any).driveFolderIds || {};
                    const tl = meta.tourLeader?.nama || (k as any).tourLeader?.nama;
                    const muth = meta.muthowif?.nama || (k as any).muthowif?.nama;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 border p-2.5 rounded-md">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-muted-foreground font-medium shrink-0">TL:</span>
                          <span className={cn("font-semibold truncate", tl ? "text-foreground" : "text-muted-foreground/70 italic")}>
                            {tl || "Belum ada"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-muted-foreground font-medium shrink-0">Muthowif:</span>
                          <span className={cn("font-semibold truncate", muth ? "text-foreground" : "text-muted-foreground/70 italic")}>
                            {muth || "Belum ada"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Hotel */}
                  <div className="flex items-start gap-2 text-sm">
                    <Hotel className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold">
                        Komposisi Hotel (Mekkah & Madinah)
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {(() => {
                          let optionsList = k.hotelOptions;
                          if (typeof optionsList === "string") {
                            try { optionsList = JSON.parse(optionsList); } catch { optionsList = []; }
                          }
                          if (Array.isArray(optionsList) && optionsList.length > 0) {
                            // Clean out garbage empty TBA cluster items if valid clusters exist
                            const validOptions = optionsList.filter((opt: any) => {
                              const hasMek = opt.hotelMekkah && opt.hotelMekkah !== "TBA";
                              const hasMed = opt.hotelMadinah && opt.hotelMadinah !== "TBA";
                              const hasPrice = Number(opt.hargaBase || 0) > 0;
                              return hasMek || hasMed || hasPrice;
                            });
                            const listToRender = validOptions.length > 0 ? validOptions : optionsList;

                            return listToRender.map((opt: any, idx: number) => (
                              <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs bg-card border p-1.5 rounded-md shadow-xs">
                                {opt.clusterName && opt.clusterName !== "Reguler" && (
                                  <span className="font-bold text-primary text-[10px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase">
                                    {opt.clusterName}
                                  </span>
                                )}
                                <span className="font-semibold text-foreground">
                                  {opt.hotelMekkah || k.hotelMekkah || "TBA"} <span className="text-muted-foreground font-normal text-[11px]">(Mekkah)</span>
                                </span>
                                <span className="text-muted-foreground font-semibold">&mdash;</span>
                                <span className="font-semibold text-foreground">
                                  {opt.hotelMadinah || k.hotelMadinah || "TBA"} <span className="text-muted-foreground font-normal text-[11px]">(Madinah)</span>
                                </span>
                              </div>
                            ));
                          }
                          return (
                            <div className="flex flex-wrap gap-1">
                              <span className="inline-flex items-center rounded-md bg-muted/40 border px-2 py-1 text-xs font-medium">
                                {k.hotelMekkah || "TBA"} &mdash; {k.hotelMadinah || "TBA"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Pinned Section: Kuota Progress & Action Buttons */}
                <div className="space-y-4 mt-auto pt-3 border-t border-border">
                  {/* Kuota Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kuota Terisi</span>
                      <span className="font-semibold">
                        {k.terisi}/{maxSeat} ({persen}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          progressColor
                        )}
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/keberangkatan/${k.id}`)}
                    >
                      <Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Itinerary
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/manifest?paketId=${k.id}&from=paket-aktif`)}
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Manifest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      title="Lengkapi & Edit Data Operasional Paket"
                      onClick={() => router.push(`/admin/keberangkatan/${k.id}/edit`)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0 px-2.5"
                      title="Hapus Paket"
                      onClick={() => handleDelete(k.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
      {/* Modal Import Excel */}
      <Modal
        open={isImportModalOpen}
        onClose={() => {
          if (!importing) setIsImportModalOpen(false);
        }}
        title="Import Paket via Excel"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Unggah file Excel untuk membuat paket keberangkatan baru secara instan.
          </p>

          <div className="bg-muted/40 border rounded-lg p-3.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Template Format Excel</span>
            <a
              href="/api/admin/keberangkatan/template"
              className="inline-flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 hover:underline gap-1"
            >
              Download Template (.xlsx)
            </a>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Pilih File Excel
            </label>
            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={importing}
              />
              <div className="flex flex-col items-center justify-center text-center space-y-1.5 pointer-events-none">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {importFile ? importFile.name : "Pilih atau Seret File Excel (.xlsx)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Format file wajib sesuai template
                </p>
              </div>
            </div>
          </div>

          {importResult && (
            <div className="space-y-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Hasil Import:
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                ✓ Berhasil mengimpor <strong>{importResult.successCount}</strong> paket keberangkatan.
              </p>
              {importResult.errors.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    Detail Kesalahan ({importResult.errors.length} Baris):
                  </p>
                  <div className="max-h-28 overflow-y-auto text-[10px] text-red-500 font-mono space-y-0.5 border border-red-100 dark:border-red-950 rounded p-2 bg-red-50/50 dark:bg-red-950/10">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              disabled={importing}
            >
              Tutup
            </Button>
            <Button
              onClick={handleImportExcel}
              disabled={importing || !importFile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing ? "Mengimpor..." : "Mulai Import"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
