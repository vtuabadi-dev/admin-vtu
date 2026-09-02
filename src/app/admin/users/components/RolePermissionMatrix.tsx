"use client";

import { useState, useEffect } from "react";
import { Shield, Check, X, Search, Lock, Settings, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import type { RoleConfigItem, ModulePermission } from "@/app/api/admin/roles/route";
import { ModulePermissionEditor } from "./ModulePermissionEditor";

export function RolePermissionMatrix() {
  const [roleConfigs, setRoleConfigs] = useState<RoleConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("all");

  // State for Editing Role Permissions
  const [editingRole, setEditingRole] = useState<RoleConfigItem | null>(null);
  const [editPermissions, setEditPermissions] = useState<ModulePermission[]>([]);
  const [editDescription, setEditDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (json.success) {
        setRoleConfigs(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi role", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openEditModal = (roleItem: RoleConfigItem) => {
    setEditingRole(roleItem);
    setEditPermissions(JSON.parse(JSON.stringify(roleItem.permissions || [])));
    setEditDescription(roleItem.description || "");
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    try {
      setSubmitting(true);
      setSaveErrorMsg(null);
      setSaveSuccessMsg(null);

      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKey: editingRole.role,
          permissions: editPermissions,
          description: editDescription,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSaveSuccessMsg(`Hak akses role "${editingRole.label}" berhasil diperbarui!`);
      setTimeout(() => {
        setEditingRole(null);
        fetchRoles();
      }, 1000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Gagal memperbarui hak akses role.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roleConfigs.filter((rc) => {
    const matchesSearch =
      rc.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoleFilter = selectedRoleKey === "all" || rc.role === selectedRoleKey;
    return matchesSearch && matchesRoleFilter;
  });

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Memuat matriks hak akses &amp; konfigurasi role...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-2xs">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Matriks Hak Akses &amp; Kewenangan Modul Operasional
          </h3>
          <p className="text-xs text-muted-foreground">
            Daftar aturan kewenangan (*Role-Based Access Control / RBAC*) yang berlaku pada sistem VTU.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari role atau modul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={selectedRoleKey}
            onChange={(e) => setSelectedRoleKey(e.target.value)}
            className="h-8 px-2 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value="all">Semua Role</option>
            {roleConfigs.map((rc) => (
              <option key={rc.role} value={rc.role}>
                {rc.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((rc) => (
          <Card key={rc.role} variant="operational" className="relative overflow-hidden flex flex-col justify-between">
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b pb-2.5">
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    {rc.label}
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Level: {rc.enterpriseLevel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${rc.badgeClass}`}>
                    {rc.label}
                  </span>
                  {/* RODA GIGI (GEAR ICON) CONFIG BUTTON */}
                  <button
                    type="button"
                    onClick={() => openEditModal(rc)}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs hover:shadow"
                    title={`Atur & Edit Hak Akses Modul ${rc.label}`}
                  >
                    <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed min-h-[40px]">
                {rc.description}
              </p>

              <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Jumlah Modul Aktif:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {rc.permissions.filter((p) => p.canView).length} / {rc.permissions.length} Modul
                </span>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border-t flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5"
                onClick={() => openEditModal(rc)}
              >
                <Settings className="w-3.5 h-3.5" />
                Atur Hak Akses Modul
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Complete Matrix Table */}
      <Card variant="operational">
        <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Tabel Matriks Akses Modul Operasional
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rincian hak akses per modul: Lihat (View), Tambah (Create), Edit (Update), Setujui (Approve), Ekspor (Export), Hapus (Delete).
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 w-48">Nama Role Operasional</th>
                  <th className="py-3 px-3">Modul Sistem</th>
                  <th className="py-3 px-2 text-center w-16">Lihat</th>
                  <th className="py-3 px-2 text-center w-16">Tambah</th>
                  <th className="py-3 px-2 text-center w-16">Edit</th>
                  <th className="py-3 px-2 text-center w-16">Setujui</th>
                  <th className="py-3 px-2 text-center w-16">Ekspor</th>
                  <th className="py-3 px-2 text-center w-16">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                {filteredRoles.flatMap((rc) =>
                  rc.permissions.map((p, idx) => (
                    <tr key={`${rc.role}-${p.moduleKey}`} className="hover:bg-muted/30 transition-colors">
                      {idx === 0 && (
                        <td
                          rowSpan={rc.permissions.length}
                          className="py-3 px-4 font-bold border-r align-top bg-muted/10 space-y-2"
                        >
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border mb-1 ${rc.badgeClass}`}>
                            {rc.label}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-normal leading-normal">
                            {rc.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10 gap-1 w-full"
                            onClick={() => openEditModal(rc)}
                          >
                            <Settings className="w-3 h-3" />
                            Edit Matrix
                          </Button>
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-semibold text-foreground border-r">
                        {p.moduleLabel}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canView ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canCreate ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canEdit ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canApprove ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canExport ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.canDelete ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-rose-500/10 text-rose-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Permission Matrix Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                Konfigurasi Hak Akses Modul — {editingRole.label}
              </h3>
              <button
                onClick={() => setEditingRole(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {saveErrorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                {saveErrorMsg}
              </div>
            )}

            {saveSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {saveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Deskripsi Role</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Module Permission Editor Grid Component */}
              <ModulePermissionEditor
                permissions={editPermissions}
                onChange={setEditPermissions}
              />

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRole(null)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Menyimpan Matrix...
                    </>
                  ) : (
                    "Simpan Konfigurasi Hak Akses"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
