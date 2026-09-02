"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserPlus, Loader2, RefreshCw, Copy, Check, Mail, Send, ShieldPlus, Edit3 } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { formatDate } from "@/shared/lib/utils";
import type { OperationalRole } from "@/shared/types";
import { RolePermissionMatrix } from "./components/RolePermissionMatrix";
import { ModulePermissionEditor } from "./components/ModulePermissionEditor";
import type { ModulePermission } from "@/app/api/admin/roles/route";

const INITIAL_MODULE_PERMISSIONS: ModulePermission[] = [
  { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
  { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
  { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
];

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: OperationalRole;
  secondaryRoles?: string[];
  mustChangePassword: boolean;
  isInvitePending?: boolean;
  inviteToken?: string;
  inviteExpires?: string;
  createdAt: string;
}

const ROLE_LABELS: Record<OperationalRole, string> = {
  super_admin: "Super Admin",
  admin_operasional: "Admin Operasional",
  admin_pembayaran: "Admin Pembayaran",
  admin_manifest: "Admin Manifest",
  admin_dokumen: "Admin Dokumen",
  admin_badal: "Admin Badal Umroh & Wakaf",
  tour_leader: "Tour Leader",
  jamaah: "Jamaah",
};

const ROLE_BADGE_CLASSES: Record<OperationalRole, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800",
  admin_operasional: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  admin_pembayaran: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  admin_manifest: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
  admin_dokumen: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800",
  admin_badal: "bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800",
  tour_leader: "bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800",
  jamaah: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800",
};

const AVAILABLE_SECONDARY_ROLES: { role: OperationalRole; label: string }[] = [
  { role: "admin_operasional", label: "Admin Operasional" },
  { role: "admin_pembayaran", label: "Admin Pembayaran / Keuangan" },
  { role: "admin_manifest", label: "Admin Manifest Flight & Rooming" },
  { role: "admin_dokumen", label: "Admin Dokumen & AI OCR" },
  { role: "admin_badal", label: "Admin Badal Umroh & Wakaf" },
  { role: "tour_leader", label: "Tour Leader / Pembimbing Lapangan" },
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Add Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin_operasional" as OperationalRole,
    secondaryRoles: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Edit User Role State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "admin_operasional" as OperationalRole,
    secondaryRoles: [] as string[],
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Modal Add Custom Role State
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    label: "",
    description: "",
    enterpriseLevel: "ADMIN",
    baseRole: "admin_operasional",
    permissions: INITIAL_MODULE_PERMISSIONS as ModulePermission[],
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [roleSuccessMsg, setRoleSuccessMsg] = useState<string | null>(null);

  // Modal Success / Copy Invite Link State
  const [createdInvite, setCreatedInvite] = useState<{
    name: string;
    email: string;
    role: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setUsers(json.data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setFormData({
        name: "",
        email: "",
        role: "admin_operasional",
        secondaryRoles: [],
      });
      setIsModalOpen(false);

      // Open Created Invite Copy Modal
      setCreatedInvite({
        name: json.data.name,
        email: json.data.email,
        role: ROLE_LABELS[json.data.role as OperationalRole] || json.data.role,
        inviteUrl: json.inviteUrl || `${window.location.origin}/setup-password?token=${json.data.inviteToken}`,
      });

      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Gagal menambah admin.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      secondaryRoles: user.secondaryRoles || [],
    });
    setEditFormError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormError(null);
    setEditSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditFormError(err.message || "Gagal memperbarui role pengelola.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormError(null);
    setRoleSuccessMsg(null);

    if (!roleFormData.label.trim()) {
      setRoleFormError("Nama role harus diisi.");
      return;
    }

    try {
      setRoleSubmitting(true);
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleFormData),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setRoleSuccessMsg(`Role kustom "${roleFormData.label}" berhasil dibuat!`);
      setTimeout(() => {
        setIsAddRoleModalOpen(false);
        setRoleFormData({
          label: "",
          description: "",
          enterpriseLevel: "ADMIN",
          baseRole: "admin_operasional",
          permissions: INITIAL_MODULE_PERMISSIONS,
        });
        setRoleSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setRoleFormError(err.message || "Gagal membuat role baru.");
    } finally {
      setRoleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Manajemen User &amp; Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola akun pengelola operasional, undangan admin baru, dan konfigurasi hak akses modul sistem VTU
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {activeTab === "users" ? (
            <Button onClick={() => setIsModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah Admin
            </Button>
          ) : (
            <Button onClick={() => setIsAddRoleModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <ShieldPlus className="h-4 w-4 mr-2" />
              Tambah Role
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Akun Pengguna &amp; Undangan</span>
          <Badge variant="outline" className="text-[10px] font-mono font-bold ml-1">
            {users.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Konfigurasi Role &amp; Hak Akses</span>
        </button>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="operational">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pengelola</p>
                  <p className="text-xl font-bold">{users.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="operational">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                  <p className="text-xl font-bold">
                    {users.filter((u) => u.role === "super_admin").length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card variant="operational">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Undangan Pending</p>
                  <p className="text-xl font-bold">
                    {users.filter((u) => u.isInvitePending).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card variant="operational">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Daftar Akun Pengguna &amp; Status Undangan</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Memuat data user...</span>
                </div>
              ) : error ? (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm m-4">
                  {error}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Belum ada user terdaftar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b">
                      <tr>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3">Email Login</th>
                        <th className="px-4 py-3">Role / Hak Akses</th>
                        <th className="px-4 py-3 text-center">Status Akun</th>
                        <th className="px-4 py-3">Tanggal Dibuat</th>
                        <th className="px-4 py-3 text-center">Aksi Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {users.map((user) => {
                        const inviteUrl = user.inviteToken
                          ? `${window.location.origin}/setup-password?token=${user.inviteToken}`
                          : null;
                        return (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">{user.name}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">
                              {user.email}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    ROLE_BADGE_CLASSES[user.role] || "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {ROLE_LABELS[user.role] || user.role}
                                </span>
                                {user.secondaryRoles && user.secondaryRoles.length > 0 && user.secondaryRoles.map((sRole) => (
                                  <span
                                    key={sRole}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                    title="Role Tambahan (Akses Sekunder)"
                                  >
                                    + {ROLE_LABELS[sRole as OperationalRole] || sRole}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {user.isInvitePending ? (
                                <Badge variant="warning" className="text-[10px] font-bold animate-pulse">
                                  ✉️ Undangan Pending
                                </Badge>
                              ) : user.mustChangePassword ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Password Sementara
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px]">
                                  Aktif
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {user.isInvitePending && inviteUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10.5px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1"
                                    onClick={() => handleCopyLink(inviteUrl)}
                                    title="Salin Link Undangan ke Clipboard"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Salin Link
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white gap-1"
                                  onClick={() => openEditModal(user)}
                                  title="Edit Role & Akses Pengelola"
                                >
                                  <Edit3 className="w-3 h-3 text-primary" />
                                  Edit Role
                                </Button>
                              </div>
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
        </>
      ) : (
        <RolePermissionMatrix />
      )}

      {/* Modal Add Admin (Simplified — No Initial Password) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-card rounded-xl border shadow-xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <UserPlus className="h-5 w-5 text-primary" />
                Tambah Admin Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                {formError}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Masukkan nama lengkap, email, dan role pengelola. Sistem akan membuat tautan undangan aman (berlaku 72 jam) agar pengelola baru dapat menentukan password pribadi mereka secara mandiri.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Nama Lengkap *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Hidayat"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Email Login *</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ahmad@vtu.id"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Role Utama (Primary Role) *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as OperationalRole })
                  }
                  className="w-full h-9 px-2.5 rounded-md border bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="super_admin">Super Admin (Akses Penuh System)</option>
                  <option value="admin_operasional">Admin Operasional</option>
                  <option value="admin_pembayaran">Admin Pembayaran / Keuangan</option>
                  <option value="admin_manifest">Admin Manifest</option>
                  <option value="admin_dokumen">Admin Dokumen</option>
                  <option value="admin_badal">Admin Badal Umroh &amp; Wakaf</option>
                  <option value="tour_leader">Tour Leader</option>
                </select>
              </div>

              {/* Secondary / Double Roles Checkboxes */}
              {formData.role !== "super_admin" && (
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-foreground">Akses Tambahan (Secondary / Double Roles)</label>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih role sekunder jika pengelola ini merangkap kewenangan di modul lain.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border text-xs">
                    {AVAILABLE_SECONDARY_ROLES.map(({ role: rKey, label: rLabel }) => {
                      if (rKey === formData.role) return null;
                      const isChecked = formData.secondaryRoles?.includes(rKey);
                      return (
                        <label key={rKey} className="flex items-center gap-2 cursor-pointer hover:text-primary">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = formData.secondaryRoles || [];
                              const updated = e.target.checked
                                ? [...current, rKey]
                                : current.filter((r) => r !== rKey);
                              setFormData({ ...formData, secondaryRoles: updated });
                            }}
                            className="rounded border-slate-700 text-primary focus:ring-primary"
                          />
                          <span className="text-[11px] font-medium">{rLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="gap-1.5 font-bold">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat Undangan...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Simpan &amp; Kirim Undangan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Admin & Role Akses */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-card rounded-xl border shadow-xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Role &amp; Akses Pengelola
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                {editFormError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
              <p className="font-semibold text-foreground">{editingUser.name}</p>
              <p className="font-mono text-muted-foreground text-[11px]">{editingUser.email}</p>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Role Utama (Primary Role) *</label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value as OperationalRole })
                  }
                  className="w-full h-9 px-2.5 rounded-md border bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="super_admin">Super Admin (Akses Penuh System)</option>
                  <option value="admin_operasional">Admin Operasional</option>
                  <option value="admin_pembayaran">Admin Pembayaran / Keuangan</option>
                  <option value="admin_manifest">Admin Manifest</option>
                  <option value="admin_dokumen">Admin Dokumen</option>
                  <option value="admin_badal">Admin Badal Umroh &amp; Wakaf</option>
                  <option value="tour_leader">Tour Leader</option>
                </select>
              </div>

              {/* Secondary / Double Roles Checkboxes */}
              {editFormData.role !== "super_admin" && (
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-foreground">Akses Tambahan (Secondary / Double Roles)</label>
                  <p className="text-[11px] text-muted-foreground">
                    Atur role sekunder tambahan bagi {editingUser.name}.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border text-xs">
                    {AVAILABLE_SECONDARY_ROLES.map(({ role: rKey, label: rLabel }) => {
                      if (rKey === editFormData.role) return null;
                      const isChecked = editFormData.secondaryRoles?.includes(rKey);
                      return (
                        <label key={rKey} className="flex items-center gap-2 cursor-pointer hover:text-primary">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = editFormData.secondaryRoles || [];
                              const updated = e.target.checked
                                ? [...current, rKey]
                                : current.filter((r) => r !== rKey);
                              setEditFormData({ ...editFormData, secondaryRoles: updated });
                            }}
                            className="rounded border-slate-700 text-primary focus:ring-primary"
                          />
                          <span className="text-[11px] font-medium">{rLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  disabled={editSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={editSubmitting} className="gap-1.5 font-bold">
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan Role"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Copy Created Invite Link */}
      {createdInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-card rounded-xl border shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Check className="h-5 w-5 bg-emerald-500/10 p-0.5 rounded-full" />
                <h3 className="text-base font-bold text-foreground">Undangan Admin Berhasil Dibuat</h3>
              </div>
              <button
                onClick={() => setCreatedInvite(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1 text-emerald-900 dark:text-emerald-300">
              <p className="font-bold">Undangan telah dikirimkan ke email {createdInvite.email}</p>
              <p className="text-[11px] opacity-90">
                Email otomatis berisi tautan penyiapan password telah dikirimkan. Anda juga dapat menyalin tautan di bawah ini untuk dikirimkan secara manual via WhatsApp / Telegram.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-muted/40 p-2 rounded border">
                <span className="text-muted-foreground">Nama Pengelola:</span>
                <span className="font-bold text-foreground">{createdInvite.name}</span>
              </div>
              <div className="flex justify-between items-center bg-muted/40 p-2 rounded border">
                <span className="text-muted-foreground">Role Akses:</span>
                <span className="font-bold text-emerald-600">{createdInvite.role}</span>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-bold text-foreground">Tautan Undangan Setup Password (Berlaku 72 Jam):</label>
                <div className="flex gap-2 items-center">
                  <input
                    readOnly
                    value={createdInvite.inviteUrl}
                    className="flex-1 h-9 bg-muted px-2.5 font-mono text-[11px] rounded border focus:outline-none select-all"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3 font-bold gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleCopyLink(createdInvite.inviteUrl)}
                  >
                    {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedToken ? "Disalin!" : "Salin Link"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button size="sm" onClick={() => setCreatedInvite(null)}>
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Custom Role */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldPlus className="w-5 h-5 text-purple-600" />
                Tambah Role &amp; Konfigurasi Hak Akses Modul
              </h2>
              <button
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {roleFormError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                {roleFormError}
              </div>
            )}

            {roleSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {roleSuccessMsg}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Nama Role Operasional *</label>
                  <Input
                    required
                    placeholder="Contoh: Admin Keuangan Vendor"
                    value={roleFormData.label}
                    onChange={(e) => setRoleFormData({ ...roleFormData, label: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Tingkat Akses Enterprise (Enterprise Level)</label>
                  <select
                    value={roleFormData.enterpriseLevel}
                    onChange={(e) => setRoleFormData({ ...roleFormData, enterpriseLevel: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="ADMIN">ADMIN — Pengelola Operasional Standar</option>
                    <option value="OWNER">OWNER — Penanggung Jawab Manajerial</option>
                    <option value="STAFF">STAFF — Staf Pelaksana Khusus</option>
                    <option value="VIEWER">VIEWER — Akses Pantau / Baca Data</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Deskripsi &amp; Tanggung Jawab Role</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan cakupan tugas dan tanggung jawab dari role baru ini..."
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full p-2.5 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Interactive Module Permissions Customizer Grid */}
              <ModulePermissionEditor
                permissions={roleFormData.permissions}
                onChange={(updatedPerms) => setRoleFormData({ ...roleFormData, permissions: updatedPerms })}
              />

              <div className="pt-3 flex justify-end gap-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddRoleModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={roleSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  {roleSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Menyimpan Role...
                    </>
                  ) : (
                    "Simpan Role & Hak Akses"
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
