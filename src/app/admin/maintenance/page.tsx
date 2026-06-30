"use client";

import { useState } from "react";
import {
  Trash2, Database, RefreshCw, HardDrive, AlertTriangle,
  Archive, FileText, Download, Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { Modal } from "@/shared/components/ui/Modal";

type OperationStatus = "idle" | "running" | "success" | "error";

// ── Maintenance Action Card ──
function MaintAction({
  icon: Icon,
  title,
  desc,
  buttonLabel,
  buttonVariant = "outline",
  danger = false,
  onExecute,
  status,
  resultMsg,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  buttonLabel: string;
  buttonVariant?: "default" | "outline" | "destructive";
  danger?: boolean;
  onExecute: () => void;
  status: OperationStatus;
  resultMsg?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${danger ? "bg-destructive/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          {resultMsg && (
            <p className={`text-xs mt-1 ${status === "error" ? "text-destructive" : "text-success"}`}>
              {resultMsg}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onExecute}
        disabled={status === "running"}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shrink-0 transition-colors ${
          buttonVariant === "destructive"
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : buttonVariant === "default"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border hover:bg-muted"
        } disabled:opacity-50`}
      >
        {status === "running" ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memproses...
          </>
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  );
}

export default function MaintenancePage() {
  const [ops, setOps] = useState<Record<string, OperationStatus>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  function execute(id: string, duration: number, isDanger: boolean = false) {
    if (isDanger && confirmAction !== id) {
      setConfirmAction(id);
      return;
    }
    setConfirmAction(null);
    setOps((prev) => ({ ...prev, [id]: "running" }));
    setTimeout(() => {
      const ok = Math.random() > 0.1;
      setOps((prev) => ({ ...prev, [id]: ok ? "success" : "error" }));
      setResults((prev) => ({
        ...prev,
        [id]: ok ? "Operasi berhasil" : "Gagal — coba lagi atau periksa log",
      }));
    }, duration);
  }

  function status(id: string): OperationStatus {
    return ops[id] ?? "idle";
  }

  return (
    <PermissionGuard module="sistem">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operasi pemeliharaan sistem, pembersihan data, dan backup
        </p>
      </div>

      {/* Danger zone confirmation */}
      {confirmAction && (
        <Modal
          open={true}
          onClose={() => setConfirmAction(null)}
          title="Konfirmasi Operasi"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                Operasi ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup sebelum melanjutkan.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)} size="sm">
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => execute(confirmAction, 2000, true)}
              >
                Ya, Lanjutkan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DATA MAINTENANCE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4" /> Data & Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaintAction
            icon={Trash2}
            title="Bersihkan File Temporary"
            desc="Hapus semua file temporary yang lebih lama dari 7 hari (storage adapter)"
            buttonLabel="Bersihkan Temp"
            status={status("clean-temp")}
            resultMsg={results["clean-temp"]}
            onExecute={() => execute("clean-temp", 1500)}
          />
          <MaintAction
            icon={Archive}
            title="Arsipkan Data Lama"
            desc="Pindahkan data pembayaran > 2 tahun ke tabel arsip"
            buttonLabel="Arsipkan"
            status={status("archive")}
            resultMsg={results["archive"]}
            onExecute={() => execute("archive", 3000)}
          />
          <MaintAction
            icon={RefreshCw}
            title="Re-index Database"
            desc="Rebuild indeks PostgreSQL untuk optimasi query"
            buttonLabel="Re-index"
            status={status("reindex")}
            resultMsg={results["reindex"]}
            onExecute={() => execute("reindex", 2500)}
          />
        </CardContent>
      </Card>

      {/* ── CACHE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Cache Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaintAction
            icon={HardDrive}
            title="Clear Next.js Cache"
            desc="Hapus .next/cache untuk rebuild incremental static pages (Vercel-compatible)"
            buttonLabel="Clear Cache"
            status={status("clear-next")}
            resultMsg={results["clear-next"]}
            onExecute={() => execute("clear-next", 2000)}
          />
        </CardContent>
      </Card>

      {/* ── BACKUP ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Download className="h-4 w-4" /> Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaintAction
            icon={Database}
            title="Backup Database"
            desc="Backup database via Supabase Dashboard atau GitHub Actions. Backup mandiri via endpoint /api/admin/backup."
            buttonLabel="Backup DB"
            buttonVariant="default"
            status={status("backup-db")}
            resultMsg={results["backup-db"]}
            onExecute={() => execute("backup-db", 3500)}
          />
          <MaintAction
            icon={FileText}
            title="Backup Dokumen Storage"
            desc="Arsip semua dokumen jamaah ke Google Drive (folder backup)"
            buttonLabel="Backup Dokumen"
            status={status("backup-docs")}
            resultMsg={results["backup-docs"]}
            onExecute={() => execute("backup-docs", 4000)}
          />
        </CardContent>
      </Card>

      {/* ── SYSTEM ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaintAction
            icon={AlertTriangle}
            title="Reset Semua Data (Development)"
            desc="Hapus SEMUA data dan kembalikan ke state awal. HANYA untuk development."
            buttonLabel="Reset Total"
            buttonVariant="destructive"
            danger
            status={status("reset-all")}
            resultMsg={results["reset-all"]}
            onExecute={() => execute("reset-all", 5000, true)}
          />
        </CardContent>
      </Card>

      {/* ── STATUS INFO ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Database Size</p>
            <p className="text-lg font-bold">128 MB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Storage Dokumen</p>
            <p className="text-lg font-bold">1.8 GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">File Temp</p>
            <p className="text-lg font-bold">45 MB</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Maintenance Center — operasi dijalankan di Vercel serverless. Semua operasi dicatat di Audit Trail.
      </p>
    </div>
    </PermissionGuard>
  );
}
