"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserPlus, Loader2, RefreshCw, Copy, Check, Mail, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { formatDate } from "@/shared/lib/utils";
import type { OperationalRole } from "@/shared/types";
import { RolePermissionMatrix } from "./components/RolePermissionMatrix";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: OperationalRole;
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
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
          <Button onClick={() => setIsModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah Admin
          </Button>
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
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  ROLE_BADGE_CLASSES[user.role] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {ROLE_LABELS[user.role] || user.role}
                              </span>
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
                              {user.isInvitePending && inviteUrl ? (
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
                              ) : (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
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
                <label className="font-bold text-foreground">Role / Tanggung Jawab *</label>
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
    </div>
  );
}
