"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Download,
  Printer,
  CheckCheck,
  GripVertical,
  Save,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { cn, formatDate } from "@/shared/lib/utils";
import {
  getManifestById,
  getKeberangkatanById,
  getJamaahList,
  getGroupList,
} from "@/services/mock/handlers";
import {
  validateManifestFinalization,
  type ManifestValidationResult,
} from "@/shared/lib/manifest-validation";
import type { Manifest, ManifestRow, Keberangkatan } from "@/shared/types";

export default function ManifestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [validation, setValidation] = useState<ManifestValidationResult | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: "nomorKursi" | "nomorKamar";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getManifestById(id);
      if (m) {
        setManifest(m);
        setRows([...m.data]);
        const [kbr, allJamaah, allGroups] = await Promise.all([
          getKeberangkatanById(m.keberangkatanId),
          getJamaahList(),
          getGroupList(),
        ]);
        setKeberangkatan(kbr ?? null);

        if (kbr) {
          const pkgGroupIds = new Set(
            allGroups.filter((g) => g.paketKeberangkatanId === kbr.id).map((g) => g.id)
          );
          const pkgJamaah = allJamaah.filter((j) => pkgGroupIds.has(j.groupId));
          setValidation(validateManifestFinalization(m, pkgJamaah));
        }
      } else {
        setManifest(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startEdit(rowId: string, field: "nomorKursi" | "nomorKamar", currentValue: string | undefined) {
    setEditingCell({ rowId, field });
    setEditValue(currentValue ?? "");
  }

  function saveEdit() {
    if (!editingCell) return;
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === editingCell.rowId) {
          return { ...row, [editingCell.field]: editValue };
        }
        return row;
      })
    );
    setEditingCell(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Memuat data manifest...
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/manifest")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Master Manifest
        </Button>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Manifest tidak ditemukan
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/manifest")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Master Manifest
      </Button>

      {/* Manifest Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{manifest.namaManifest}</CardTitle>
              <CardDescription className="text-base">{manifest.kode}</CardDescription>
            </div>
            <StatusBadge status={manifest.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Keberangkatan:</span>
              <p className="font-medium">{keberangkatan?.kode ?? "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Paket:</span>
              <p className="font-medium">{keberangkatan?.namaPaket ?? "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal Berangkat:</span>
              <p className="font-medium">
                {keberangkatan ? formatDate(keberangkatan.tanggalBerangkat) : "-"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Maskapai:</span>
              <p className="font-medium">{keberangkatan?.maskapai ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center gap-2">
        <RequirePermission module="manifest" action="canEdit">
          <Button size="sm" variant="outline">
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        </RequirePermission>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/admin/manifest/${id}/export`)}
        >
          <Download className="mr-1 h-3 w-3" />
          Export CSV
        </Button>
        <Button size="sm" variant="outline">
          <Printer className="mr-1 h-3 w-3" />
          Cetak
        </Button>
        {manifest.status === "draft" && (
          <RequirePermission module="manifest" action="canEdit">
            <Button
              size="sm"
              variant="default"
              disabled={validation ? !validation.canFinalize : false}
              title={
                validation && !validation.canFinalize
                  ? "Selesaikan semua checklist blocking terlebih dahulu"
                  : "Finalkan manifest ini"
              }
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Finalkan
            </Button>
          </RequirePermission>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{rows.length} jamaah</span>
        </div>
      </div>

      {/* Finalization Validation */}
      {validation && manifest.status === "draft" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              <ShieldCheck className="inline h-4 w-4 mr-1.5" />
              Validasi Finalisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {validation.checks.map((check) => (
                <div
                  key={check.key}
                  className={cn(
                    "flex items-start gap-2.5 p-3 rounded-md border text-sm",
                    check.passed
                      ? "border-success/20 bg-success/5"
                      : check.blocking
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-warning/20 bg-warning/5"
                  )}
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-px" />
                  ) : check.blocking ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-px" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-px" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{check.label}</p>
                    {check.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                    )}
                    {check.blocking && !check.passed && (
                      <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive mt-1">
                        BLOCKING
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manifest Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm dense-table">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors bg-muted/30">
                  <th className="h-9 w-8 px-2 text-left align-middle font-medium text-muted-foreground" />
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    No.
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    Nama Lengkap
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    No. Paspor
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    Tempat Lahir
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    Tgl. Lahir
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    No. Kursi
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    No. Kamar
                  </th>
                  <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    {/* Drag handle */}
                    <td className="px-2 py-1.5 align-middle">
                      <span className="block cursor-grab text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs text-muted-foreground">
                      {row.nomorUrut}
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs font-medium">
                      {row.namaLengkap}
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs font-mono">
                      {row.nomorPaspor}
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs">
                      {row.tempatLahir}
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs">
                      {row.tanggalLahir}
                    </td>
                    {/* Editable: No. Kursi */}
                    <td className="px-3 py-1.5 align-middle text-xs">
                      {editingCell?.rowId === row.id && editingCell?.field === "nomorKursi" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 w-20 text-xs"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <button onClick={saveEdit} className="p-0.5 hover:text-primary">
                            <Save className="h-3 w-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-0.5 hover:text-muted-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="block min-w-[3rem] rounded px-1 py-0.5 text-left hover:bg-muted transition-colors cursor-text"
                          onClick={() => startEdit(row.id, "nomorKursi", row.nomorKursi)}
                        >
                          {row.nomorKursi || <span className="text-muted-foreground italic">—</span>}
                        </button>
                      )}
                    </td>
                    {/* Editable: No. Kamar */}
                    <td className="px-3 py-1.5 align-middle text-xs">
                      {editingCell?.rowId === row.id && editingCell?.field === "nomorKamar" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 w-20 text-xs"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <button onClick={saveEdit} className="p-0.5 hover:text-primary">
                            <Save className="h-3 w-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-0.5 hover:text-muted-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="block min-w-[3rem] rounded px-1 py-0.5 text-left hover:bg-muted transition-colors cursor-text"
                          onClick={() => startEdit(row.id, "nomorKamar", row.nomorKamar)}
                        >
                          {row.nomorKamar || <span className="text-muted-foreground italic">—</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-middle text-xs text-muted-foreground">
                      {row.catatan || <span className="italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
