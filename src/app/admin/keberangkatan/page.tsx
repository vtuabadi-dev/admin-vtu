"use client";

import { useEffect, useState, useMemo } from "react";
import { Plane, CalendarDays, Hotel, MapPin, Plus, Search, Trash2, Info, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
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

const BULAN_LABEL: Record<number, string> = {
  1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
  5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
  9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

export default function KeberangkatanListPage() {
  const router = useRouter();
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    new Date().getMonth() + 1
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, []);

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
        await deleteKeberangkatan(id);
        setKeberangkatan((prev) => prev.filter((k) => k.id !== id));
      } catch (error) {
        alert("Gagal menghapus paket: " + (error as Error).message);
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
          (k.paketUmroh?.namaPaket || "").toLowerCase().includes(q) ||
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keberangkatan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola jadwal dan paket keberangkatan umroh
          </p>
        </div>
        <Button onClick={() => router.push("/admin/keberangkatan/tambah")}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Keberangkatan
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
            <Card key={k.id} variant="operational">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{k.paketUmroh?.namaPaket || "-"}</CardTitle>
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
              <CardContent className="space-y-4">
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

                {/* Maskapai */}
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maskapai</p>
                    <p className="font-medium">
                      {k.maskapaiId || "-"}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({k.nomorPenerbangan})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Hotel */}
                <div className="flex items-start gap-2 text-sm">
                  <Hotel className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      Hotel
                    </p>
                    <div className="flex flex-wrap gap-1">
                        <span
                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                        >
                          {k.hotelMekkahId || "-"} &mdash; {k.hotelMadinahId || "-"}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-t" />

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
                    <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    Detail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/admin/manifest`)}
                  >
                    <Plane className="mr-1.5 h-3.5 w-3.5" />
                    Manifest
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 px-2"
                    title="Hapus Paket"
                    onClick={() => handleDelete(k.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}
