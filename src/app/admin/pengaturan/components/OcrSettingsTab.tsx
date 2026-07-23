"use client";

import { useState, useEffect, useCallback } from "react";

import { Tabs } from "@/shared/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { StatCard } from "@/shared/components/ui/StatCard";
import {
  Plus, Trash2, Edit3, Power, PowerOff, Activity,
  BarChart3, Clock, Zap, Shield, RefreshCw
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface OcrProvider {
  id: string;
  label: string;
  providerType: "google_vision" | "external_api";
  apiKey: string;
  apiUrl: string | null;
  apiHeaderName: string | null;
  apiHeaderPrefix: string | null;
  isActive: boolean;
  rotationOrder: number;
  rotationCount: number;
  dailyUsage: number;
  dailyLimit: number | null;
  healthStatus: "active" | "cooldown" | "disabled" | "error";
  cooldownUntil: string | null;
  lastUsedAt: string | null;
  successRate: number;
  totalRequests: number;
  averageLatencyMs: number;
  rotationOrder2?: number;
}

interface ProviderStats {
  providerId: string;
  label: string;
  providerType: string;
  healthStatus: string;
  isActive: boolean;
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  dailyUsage: number;
  dailyLimit: number | null;
  lastUsedAt: string | null;
  rotationOrder: number;
}

interface SummaryStats {
  totalProviders: number;
  activeProviders: number;
  totalRequestsToday: number;
  totalErrorsToday: number;
  successRateToday: number;
  averageLatencyToday: number;
  cacheHitRate: number;
}

interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  hitRate: number;
  hits: number;
  misses: number;
}

interface UsageLogEntry {
  id: string;
  providerId: string;
  providerLabel?: string;
  requestType: string;
  documentType: string | null;
  success: boolean;
  confidence: number | null;
  latencyMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ── Helpers ─────────────────────────────────────────────

function healthBadge(status: string) {
  const map: Record<string, { variant: "success" | "warning" | "destructive" | "muted"; label: string }> = {
    active: { variant: "success", label: "Active" },
    cooldown: { variant: "warning", label: "Cooldown" },
    disabled: { variant: "muted", label: "Disabled" },
    error: { variant: "destructive", label: "Error" },
  };
  const m = map[status] ?? { variant: "muted" as const, label: status };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Provider Form Modal ─────────────────────────────────

function ProviderFormModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: OcrProvider | null;
}) {
  const [form, setForm] = useState({
    label: "",
    providerType: "google_vision" as string,
    apiKey: "",
    apiUrl: "",
    apiHeaderName: "Authorization",
    apiHeaderPrefix: "Bearer",
    rotationOrder: 0,
    rotationCount: 2,
    dailyLimit: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        label: initial.label,
        providerType: initial.providerType,
        apiKey: initial.apiKey,
        apiUrl: initial.apiUrl || "",
        apiHeaderName: initial.apiHeaderName || "Authorization",
        apiHeaderPrefix: initial.apiHeaderPrefix || "Bearer",
        rotationOrder: initial.rotationOrder,
        rotationCount: initial.rotationCount,
        dailyLimit: initial.dailyLimit?.toString() || "",
      });
    } else {
      setForm({
        label: "",
        providerType: "google_vision",
        apiKey: "",
        apiUrl: "",
        apiHeaderName: "Authorization",
        apiHeaderPrefix: "Bearer",
        rotationOrder: 0,
        rotationCount: 2,
        dailyLimit: "",
      });
    }
  }, [initial, open]);

  const handleSave = () => {
    onSave({
      label: form.label,
      providerType: form.providerType,
      apiKey: form.apiKey,
      apiUrl: form.apiUrl || undefined,
      apiHeaderName: form.apiHeaderName || undefined,
      apiHeaderPrefix: form.apiHeaderPrefix || undefined,
      rotationOrder: form.rotationOrder,
      rotationCount: form.rotationCount,
      dailyLimit: form.dailyLimit ? parseInt(form.dailyLimit) : null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Provider" : "Tambah Provider"} size="lg">
      <div className="space-y-4">
        <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Google Vision #1" />
        <Select
          label="Provider Type"
          options={[
            { value: "google_vision", label: "Google Vision" },
            { value: "external_api", label: "External API" },
          ]}
          value={form.providerType}
          onChange={(e) => setForm({ ...form, providerType: e.target.value })}
        />
        <Input label="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Masukkan API key" />
        {form.providerType === "external_api" && (
          <>
            <Input label="API URL" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} placeholder="https://ocr.example.com/api/ocr" />
            <Input label="Auth Header Name" value={form.apiHeaderName} onChange={(e) => setForm({ ...form, apiHeaderName: e.target.value })} />
            <Input label="Auth Header Prefix" value={form.apiHeaderPrefix} onChange={(e) => setForm({ ...form, apiHeaderPrefix: e.target.value })} />
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rotation Order" type="number" value={String(form.rotationOrder)} onChange={(e) => setForm({ ...form, rotationOrder: parseInt(e.target.value) || 0 })} />
          <Input label="Rotation Count" type="number" value={String(form.rotationCount)} onChange={(e) => setForm({ ...form, rotationCount: parseInt(e.target.value) || 2 })} />
        </div>
        <Input label="Daily Limit (kosongkan = unlimited)" type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} placeholder="Unlimited" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>{initial ? "Simpan" : "Tambah"}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Providers Tab ───────────────────────────────────────

function ProvidersTab() {
  const [providers, setProviders] = useState<OcrProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OcrProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ocr/providers");
      const data = await res.json();
      if (data.success) setProviders(data.data);
    } catch (err) {
      console.error("Failed to fetch providers", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleSave = async (formData: any) => {
    const url = editing
      ? `/api/admin/ocr/providers/${editing.id}`
      : "/api/admin/ocr/providers";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setEditing(null);
        fetchProviders();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Gagal menyimpan: " + (err as Error).message);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ocr/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const data = await res.json();
      if (data.success) fetchProviders();
      else alert(data.message);
    } catch (err) {
      alert("Gagal: " + (err as Error).message);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/ocr/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      alert(data.data?.message || (data.success ? "Connected!" : "Failed"));
    } catch (err) {
      alert("Test failed: " + (err as Error).message);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus provider ini?")) return;
    try {
      await fetch(`/api/admin/ocr/providers/${id}`, { method: "DELETE" });
      fetchProviders();
    } catch (err) {
      alert("Gagal menghapus: " + (err as Error).message);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat provider...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{providers.length} provider terdaftar</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Tambah Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Belum ada provider OCR. Tambah provider untuk memulai.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Label</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Daily Usage</th>
                <th className="px-4 py-2.5 text-right font-medium">Success Rate</th>
                <th className="px-4 py-2.5 text-right font-medium">Avg Latency</th>
                <th className="px-4 py-2.5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground">{p.rotationOrder}</td>
                  <td className="px-4 py-2.5 font-medium">{p.label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground capitalize">{p.providerType.replace("_", " ")}</td>
                  <td className="px-4 py-2.5">{healthBadge(p.healthStatus)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {p.dailyUsage}{p.dailyLimit ? ` / ${p.dailyLimit}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant={p.successRate >= 0.8 ? "success" : p.successRate >= 0.5 ? "warning" : "destructive"}>
                      {formatPercent(p.successRate)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMs(p.averageLatencyMs)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleTest(p.id)} disabled={testingId === p.id} className="p-1 hover:bg-muted rounded" title="Test Connection">
                        {testingId === p.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-1 hover:bg-muted rounded" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggle(p.id)} className="p-1 hover:bg-muted rounded" title={p.isActive ? "Nonaktifkan" : "Aktifkan"}>
                        {p.isActive ? <PowerOff className="h-3.5 w-3.5 text-warning" /> : <Power className="h-3.5 w-3.5 text-success" />}
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 hover:bg-muted rounded" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProviderFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          initial={editing}
        />
      )}
    </div>
  );
}

// ── Statistics Tab ───────────────────────────────────────

function StatisticsTab() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [sumRes, provRes] = await Promise.all([
          fetch("/api/admin/ocr/stats?type=summary"),
          fetch("/api/admin/ocr/stats?type=providers"),
        ]);
        const sumData = await sumRes.json();
        const provData = await provRes.json();
        if (sumData.success) setSummary(sumData.data);
        if (provData.success) setProviderStats(provData.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat statistik...</p>;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total Providers" value={summary.totalProviders} icon={Shield} />
          <StatCard label="Requests Today" value={summary.totalRequestsToday} icon={Activity} />
          <StatCard label="Success Rate" value={formatPercent(summary.successRateToday)} icon={BarChart3} />
          <StatCard label="Errors Today" value={summary.totalErrorsToday} icon={Zap} />
          <StatCard label="Avg Latency" value={formatMs(summary.averageLatencyToday)} icon={Clock} />
        </div>
      )}

      <h3 className="text-sm font-semibold mt-6">Per-Provider Stats</h3>
      {providerStats.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data statistik provider.</p>
      ) : (
        <div className="space-y-3">
          {providerStats.map((ps) => (
            <Card key={ps.providerId}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ps.label}</span>
                    {healthBadge(ps.healthStatus)}
                    {!ps.isActive && <Badge variant="muted">Inactive</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Last used: {ps.lastUsedAt ? new Date(ps.lastUsedAt).toLocaleString("id-ID") : "Never"}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Requests</span>
                    <p className="font-mono font-medium">{ps.totalRequests}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate</span>
                    <p className="font-mono font-medium">{formatPercent(ps.successRate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Latency</span>
                    <p className="font-mono font-medium">{formatMs(ps.averageLatencyMs)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Usage</span>
                    <p className="font-mono font-medium">{ps.dailyUsage}{ps.dailyLimit ? ` / ${ps.dailyLimit}` : ""}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rotation Order</span>
                    <p className="font-mono font-medium">#{ps.rotationOrder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Usage Log Tab ────────────────────────────────────────

function UsageLogTab() {
  const [logs, setLogs] = useState<UsageLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/ocr/stats?type=logs&page=${page}&pageSize=${pageSize}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Memuat log...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Belum ada usage log.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-medium">Provider</th>
                  <th className="px-4 py-2.5 text-left font-medium">Doc Type</th>
                  <th className="px-4 py-2.5 text-center font-medium">Success</th>
                  <th className="px-4 py-2.5 text-right font-medium">Latency</th>
                  <th className="px-4 py-2.5 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-xs font-mono">{new Date(log.createdAt).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5">{log.providerLabel || log.providerId.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{log.documentType || "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {log.success
                        ? <Badge variant="success">OK</Badge>
                        : <Badge variant="destructive">FAIL</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMs(log.latencyMs)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.errorCode ? `${log.errorCode}: ` : ""}{log.errorMessage || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total: {total} entries</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Cache Tab ────────────────────────────────────────────

function CacheTab() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCacheStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ocr/cache");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error("Failed to fetch cache stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCacheStats(); }, [fetchCacheStats]);

  const handleFlush = async () => {
    if (!confirm("Hapus semua cache OCR? Cache akan diisi ulang saat ada request baru.")) return;
    try {
      const res = await fetch("/api/admin/ocr/cache", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert(`${data.data.deleted} cache entries dihapus.`);
        fetchCacheStats();
      }
    } catch (err) {
      alert("Gagal flush cache: " + (err as Error).message);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat cache stats...</p>;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Entries" value={stats.totalEntries} icon={Zap} />
          <StatCard label="Active (not expired)" value={stats.activeEntries} icon={Activity} />
          <StatCard label="Hits" value={stats.hits} icon={BarChart3} />
          <StatCard label="Misses" value={stats.misses} icon={Clock} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cache Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cache menyimpan hasil OCR berdasarkan SHA-256 hash dari gambar.
            Gambar yang sama tidak akan diproses ulang selama TTL cache (24 jam default).
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleFlush} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Flush All Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function OcrSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integrasi API OCR</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola provider OCR, monitoring, dan cache. Perubahan langsung berlaku tanpa deploy ulang.
        </p>
      </div>

      <Tabs
        tabs={[
          { value: "providers", label: "Providers" },
          { value: "statistics", label: "Statistics" },
          { value: "logs", label: "Usage Log" },
          { value: "cache", label: "Cache" },
        ]}
      >
        {(activeTab) => {
          switch (activeTab) {
            case "providers": return <ProvidersTab />;
            case "statistics": return <StatisticsTab />;
            case "logs": return <UsageLogTab />;
            case "cache": return <CacheTab />;
            default: return null;
          }
        }}
      </Tabs>
    </div>
  );
}
