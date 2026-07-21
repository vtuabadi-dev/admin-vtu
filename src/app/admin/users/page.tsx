"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserPlus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { formatDate } from "@/shared/lib/utils";
import type { OperationalRole } from "@/shared/types";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: OperationalRole;
  mustChangePassword: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<OperationalRole, string> = {
  super_admin: "Super Admin",
  admin_operasional: "Admin Operasional",
  admin_pembayaran: "Admin Pembayaran",
  admin_manifest: "Admin Manifest",
  admin_dokumen: "Admin Dokumen",
  tour_leader: "Tour Leader",
  jamaah: "Jamaah",
};

const ROLE_BADGE_CLASSES: Record<OperationalRole, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 border-purple-200",
  admin_operasional: "bg-blue-500/10 text-blue-600 border-blue-200",
  admin_pembayaran: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  admin_manifest: "bg-amber-500/10 text-amber-600 border-amber-200",
  admin_dokumen: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  tour_leader: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  jamaah: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin_operasional" as OperationalRole,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        password: "",
        role: "admin_operasional",
      });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Gagal menambah admin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Manajemen User & Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola akun pengelola operasional dan hak akses pengguna sistem VTU
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
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admin Operasional & Staff</p>
              <p className="text-xl font-bold">
                {users.filter((u) => u.role !== "super_admin" && u.role !== "jamaah").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card variant="operational">
        <CardHeader>
          <CardTitle className="text-base">Daftar Akun Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Memuat data user...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role / Hak Akses</th>
                    <th className="px-4 py-3">Wajib Ganti Pass</th>
                    <th className="px-4 py-3">Tanggal Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            ROLE_BADGE_CLASSES[user.role] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.mustChangePassword ? (
                          <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Ya (Password Sementara)
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-medium">Tidak</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Add Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-card rounded-xl border shadow-xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Tambah Admin Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Nama Lengkap</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Hidayat"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Email Login</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ahmad@vtu.id"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Password Awal</label>
                <Input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Role / Tanggung Jawab</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as OperationalRole })
                  }
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="super_admin">Super Admin (Akses Penuh System)</option>
                  <option value="admin_operasional">Admin Operasional</option>
                  <option value="admin_pembayaran">Admin Pembayaran / Keuangan</option>
                  <option value="admin_manifest">Admin Manifest</option>
                  <option value="admin_dokumen">Admin Dokumen</option>
                  <option value="tour_leader">Tour Leader</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Admin"
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
