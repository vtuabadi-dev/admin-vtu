"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users,
  CheckSquare,
  Square,
  AlertTriangle,
  Play,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import {
  getKeberangkatanList,
  getJamaahList,
  getGroupList,
} from "@/services/mock/handlers";
import type { Keberangkatan, Jamaah, RegistrationGroup } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

type BulkAction = "approve_dokumen" | "send_reminder" | "assign_hotel" | "export_manifest" | null;

interface BulkActionResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

const ACTION_LABELS: Record<string, string> = {
  approve_dokumen: "Setujui Dokumen",
  send_reminder: "Kirim Reminder",
  assign_hotel: "Atur Hotel",
  export_manifest: "Ekspor Manifest",
};

export default function BulkOperationsPage() {
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);
  const [allGroups, setAllGroups] = useState<RegistrationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedKbrId, setSelectedKbrId] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<BulkAction>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<BulkActionResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    async function load() {
      const [kbr, jamaah, groups] = await Promise.all([
        getKeberangkatanList(),
        getJamaahList(),
        getGroupList(),
      ]);
      setKeberangkatanList(kbr);
      setAllJamaah(jamaah);
      setAllGroups(groups);
      setLoading(false);
    }
    load();
  }, []);

  const filteredJamaah = useMemo(() => {
    if (!selectedKbrId) return [];
    const groupIds = new Set(
      allGroups
        .filter((g) => g.paketKeberangkatanId === selectedKbrId)
        .map((g) => g.id)
    );
    return allJamaah.filter((j) => groupIds.has(j.groupId));
  }, [selectedKbrId, allJamaah, allGroups]);

  const selectedKbr = useMemo(
    () => keberangkatanList.find((k) => k.id === selectedKbrId),
    [keberangkatanList, selectedKbrId]
  );

  const selectAll = filteredJamaah.length > 0 && selectedIds.size === filteredJamaah.length;
  const someSelected = selectedIds.size > 0;

  const handleToggleAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredJamaah.map((j) => j.id)));
    }
  }, [selectAll, filteredJamaah]);

  const handleToggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedAction) return;
    setShowConfirm(false);
    setProcessing(true);

    // Simulate bulk processing
    const selected = filteredJamaah.filter((j) => selectedIds.has(j.id));
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const resultData: BulkActionResult = {
      total: selected.length,
      success: selected.length,
      failed: 0,
      errors: [],
    };

    setResult(resultData);
    setProcessing(false);
    setShowResult(true);
    setSelectedIds(new Set());
    setSelectedAction(null);
  }, [selectedAction, filteredJamaah, selectedIds]);

  const canExecute = selectedKbrId && selectedAction && someSelected;

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
        <h1 className="text-2xl font-bold tracking-tight">Bulk Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operasi massal untuk jamaah dalam satu paket keberangkatan
        </p>
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pilih Paket</label>
              <Select
                value={selectedKbrId}
                onChange={(e) => {
                  setSelectedKbrId(e.target.value);
                  setSelectedIds(new Set());
                  setSelectedAction(null);
                }}
                className="w-64"
                placeholder="-- Pilih paket keberangkatan --"
                options={keberangkatanList.map((k) => ({
                  value: k.id,
                  label: `${k.kode} — ${k.namaPaket}`,
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pilih Aksi</label>
              <Select
                value={selectedAction ?? ""}
                onChange={(e) => setSelectedAction((e.target.value || null) as BulkAction)}
                className="w-48"
                placeholder="-- Pilih aksi bulk --"
                options={[
                  { value: "approve_dokumen", label: "Setujui Dokumen" },
                  { value: "send_reminder", label: "Kirim Reminder" },
                  { value: "assign_hotel", label: "Atur Hotel" },
                  { value: "export_manifest", label: "Ekspor Manifest" },
                ]}
              />
            </div>
            <Button
              disabled={!canExecute}
              onClick={() => setShowConfirm(true)}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Jalankan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Package Info */}
      {selectedKbr && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">{selectedKbr.namaPaket}</p>
            <p className="text-xs text-muted-foreground">
              {selectedKbr.kode} · {selectedKbr.tanggalBerangkat} · {filteredJamaah.length} jamaah
            </p>
          </div>
        </div>
      )}

      {/* Jamaah List */}
      {selectedKbrId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Daftar Jamaah ({filteredJamaah.length})
                {someSelected && (
                  <span className="ml-2 text-xs font-normal text-info">
                    {selectedIds.size} terpilih
                  </span>
                )}
              </CardTitle>
              {filteredJamaah.length > 0 && (
                <Button size="sm" variant="ghost" onClick={handleToggleAll}>
                  {selectAll ? (
                    <Square className="mr-1.5 h-4 w-4" />
                  ) : (
                    <CheckSquare className="mr-1.5 h-4 w-4" />
                  )}
                  {selectAll ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredJamaah.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada jamaah dalam paket ini
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 w-10 px-2 text-center align-middle font-medium text-muted-foreground">
                        <span
                          className="cursor-pointer inline-flex"
                          onClick={handleToggleAll}
                        >
                          {selectAll ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : someSelected ? (
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                        Nama
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                        No. Peserta
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                        Paspor
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJamaah.map((j, idx) => {
                      const isSelected = selectedIds.has(j.id);
                      return (
                        <tr
                          key={j.id}
                          className={cn(
                            "border-b transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleToggleOne(j.id)}
                        >
                          <td className="p-2 text-center align-middle">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="p-3 align-middle text-sm font-medium">
                            {j.namaLengkap}
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground">
                            {j.nomorPeserta}
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground">
                            {j.nomorPaspor}
                          </td>
                          <td className="p-3 align-middle">
                            <StatusBadge status={j.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-80">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm font-medium">Memproses...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedAction ? ACTION_LABELS[selectedAction] : ""}{" "}
                untuk {selectedIds.size} jamaah
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Konfirmasi Bulk Operation"
        description="Pastikan data yang dipilih sudah benar"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paket:</span>
              <span className="font-medium">{selectedKbr?.namaPaket}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aksi:</span>
              <span className="font-medium">
                {selectedAction ? ACTION_LABELS[selectedAction] : ""}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jamaah:</span>
              <span className="font-medium">{selectedIds.size} terpilih</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs text-muted-foreground">
              Aksi ini akan memproses {selectedIds.size} jamaah sekaligus. Pastikan data sudah
              benar.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Batal
            </Button>
            <Button onClick={handleExecute}>
              <Play className="mr-1.5 h-4 w-4" />
              Jalankan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Result Modal */}
      <Modal
        open={showResult}
        onClose={() => setShowResult(false)}
        title="Hasil Bulk Operation"
        size="sm"
      >
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border p-3 bg-success/5">
                <p className="text-2xl font-bold text-success">{result.success}</p>
                <p className="text-xs text-muted-foreground">Berhasil</p>
              </div>
              <div className="rounded-lg border p-3 bg-destructive/5">
                <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Gagal</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/20 p-3 bg-destructive/5 max-h-32 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowResult(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
