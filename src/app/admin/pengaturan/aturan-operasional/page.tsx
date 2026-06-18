"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { RichTextEditor } from "@/shared/components/RichTextEditor";
import { cn } from "@/shared/lib/utils";
import {
  FileText, Plus, Edit3, CheckCircle, X, Loader2, AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type DocType = "TERMS_CONDITIONS" | "PAYMENT_POLICY" | "CANCELLATION_POLICY" | "REFUND_POLICY";

interface OperationalDoc {
  id: string;
  type: string;
  title: string;
  version: string;
  content: string;
  status: string;
  effectiveDate: string | null;
  createdBy: string | null;
  createdAt: string;
}

const DOC_TYPE_CONFIG: Record<DocType, { label: string; icon: typeof FileText }> = {
  TERMS_CONDITIONS: { label: "Syarat & Ketentuan Registrasi", icon: FileText },
  PAYMENT_POLICY: { label: "Kebijakan Pembayaran", icon: FileText },
  CANCELLATION_POLICY: { label: "Kebijakan Pembatalan", icon: FileText },
  REFUND_POLICY: { label: "Kebijakan Refund", icon: FileText },
};

// ── Component ──────────────────────────────────────────────
export default function AturanOperasionalPage() {
  const [docs, setDocs] = useState<OperationalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<DocType>("TERMS_CONDITIONS");
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formError, setFormError] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/operational-documents?type=${selectedType}`);
      const data = await res.json();
      if (data.success) setDocs(data.data ?? []);
    } catch { /* */ }
    setLoading(false);
  }, [selectedType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Create new version ──────────────────────────────────
  const handleCreate = async () => {
    if (!formTitle.trim() || !formVersion.trim() || !formContent.trim()) {
      setFormError("Judul, versi, dan konten wajib diisi.");
      return;
    }
    setActionLoading("create");
    try {
      const res = await fetch("/api/admin/operational-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          title: formTitle,
          version: formVersion,
          content: formContent,
          status: "DRAFT",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        resetForm();
        fetchDocs();
      } else {
        setFormError(data.message ?? "Gagal membuat dokumen");
      }
    } catch {
      setFormError("Gagal menyimpan. Coba lagi.");
    }
    setActionLoading(null);
  };

  // ── Activate version ────────────────────────────────────
  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/operational-documents/${id}`, { method: "PATCH" });
      fetchDocs();
    } catch { /* */ }
    setActionLoading(null);
  };

  // ── Edit ────────────────────────────────────────────────
  const handleEdit = (doc: OperationalDoc) => {
    setEditId(doc.id);
    setFormTitle(doc.title);
    setFormVersion(doc.version);
    setFormContent(doc.content);
    setFormError("");
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setActionLoading("update");
    try {
      await fetch(`/api/admin/operational-documents/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      });
      setEditId(null);
      resetForm();
      fetchDocs();
    } catch { /* */ }
    setActionLoading(null);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormVersion("");
    setFormContent("");
    setFormError("");
    setEditId(null);
    setShowCreate(false);
  };

  const activeDoc = docs.find((d) => d.status === "ACTIVE");
  const typeConfig = DOC_TYPE_CONFIG[selectedType];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aturan Operasional</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola dokumen operasional, syarat & ketentuan, dan template
        </p>
      </div>

      {/* Type selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.entries(DOC_TYPE_CONFIG) as [DocType, any][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setSelectedType(key); resetForm(); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors",
              selectedType === key
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Active version info */}
      {activeDoc && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">Versi Aktif: {activeDoc.version}</p>
                <p className="text-xs text-green-600">
                  Berlaku sejak {activeDoc.effectiveDate ? new Date(activeDoc.effectiveDate).toLocaleDateString("id-ID") : "-"}
                </p>
              </div>
            </div>
            <Badge variant="success">AKTIF</Badge>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Daftar Versi — {typeConfig.label}</CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Versi Baru
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Belum ada dokumen. Klik &quot;Versi Baru&quot; untuk membuat.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left bg-gray-50">
                  <th className="py-2 px-4 font-medium text-xs text-gray-500">Versi</th>
                  <th className="py-2 px-4 font-medium text-xs text-gray-500">Judul</th>
                  <th className="py-2 px-4 font-medium text-xs text-gray-500">Status</th>
                  <th className="py-2 px-4 font-medium text-xs text-gray-500">Tanggal</th>
                  <th className="py-2 px-4 font-medium text-xs text-gray-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-xs font-semibold">{doc.version}</td>
                    <td className="py-2 px-4 text-xs">{doc.title}</td>
                    <td className="py-2 px-4">
                      <Badge variant={doc.status === "ACTIVE" ? "success" : doc.status === "ARCHIVED" ? "muted" : "warning"} size="sm">
                        {doc.status === "ACTIVE" ? "Aktif" : doc.status === "ARCHIVED" ? "Arsip" : "Draft"}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(doc)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        {(doc.status === "DRAFT" || doc.status === "ARCHIVED") && (
                          <button
                            onClick={() => handleActivate(doc.id)}
                            disabled={actionLoading === doc.id}
                            className="p-1 hover:bg-green-50 rounded"
                            title="Aktifkan"
                          >
                            {actionLoading === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Form */}
      {(showCreate || editId) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {editId ? `Edit — v${formVersion}` : `Versi Baru — ${typeConfig.label}`}
            </CardTitle>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Judul Dokumen</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Syarat & Ketentuan Registrasi"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Versi</label>
                <input
                  type="text"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0"
                  disabled={!!editId}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Isi Dokumen</label>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Tulis isi syarat & ketentuan di sini..."
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Batal</Button>
              <Button
                size="sm"
                onClick={editId ? handleUpdate : handleCreate}
                disabled={actionLoading === "create" || actionLoading === "update"}
              >
                {actionLoading === "create" || actionLoading === "update" ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : editId ? (
                  <Edit3 className="w-4 h-4 mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {editId ? "Simpan Perubahan" : "Buat Versi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
