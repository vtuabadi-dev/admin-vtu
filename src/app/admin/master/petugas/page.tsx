"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Table } from "@/shared/components/ui/Table";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import { Users, Phone, Search, Plus, Pencil, Trash2 } from "lucide-react";

type Petugas = {
  id: string;
  nama: string;
  noHp: string | null;
  tipe: string;
  isActive: boolean;
};

export default function MasterPetugasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"TOUR_LEADER" | "MUTHOWIF">("TOUR_LEADER");
  
  const [data, setData] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formNama, setFormNama] = useState("");
  const [formNoHp, setFormNoHp] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/petugas?tipe=${activeTab}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.message || "Gagal memuat data");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(petugas?: Petugas) {
    if (petugas) {
      setEditingId(petugas.id);
      setFormNama(petugas.nama);
      setFormNoHp(petugas.noHp || "");
      setFormIsActive(petugas.isActive);
    } else {
      setEditingId(null);
      setFormNama("");
      setFormNoHp("");
      setFormIsActive(true);
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        nama: formNama,
        noHp: formNoHp,
        tipe: activeTab,
        isActive: formIsActive,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/master/petugas/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/master/petugas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (res.ok && json.success) {
        setModalOpen(false);
        fetchData();
      } else {
        alert(json.message || "Gagal menyimpan petugas");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus petugas ini?")) return;
    try {
      const res = await fetch(`/api/master/petugas/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchData();
      } else {
        alert(json.message || "Gagal menghapus petugas");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan sistem");
    }
  }

  const columns = [
    {
      header: "NAMA",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{row.nama}</span>
        </div>
      ),
    },
    {
      header: "NO TELEPON",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono">{row.noHp || "-"}</span>
        </div>
      ),
    },
    {
      header: "STATUS",
      accessor: (row: Petugas) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-800"
        }`}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      header: "AKSI",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenModal(row)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) return <ErrorState title="Gagal Memuat Data" description={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Petugas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola daftar Tour Leader dan Muthowif untuk paket keberangkatan.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-sky-600 hover:bg-sky-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Tambah {activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center border rounded-md overflow-hidden bg-muted/20">
              <button
                onClick={() => setActiveTab("TOUR_LEADER")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "TOUR_LEADER" ? "bg-sky-600 text-white" : "hover:bg-muted"
                }`}
              >
                Tour Leader
              </button>
              <button
                onClick={() => setActiveTab("MUTHOWIF")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "MUTHOWIF" ? "bg-sky-600 text-white" : "hover:bg-muted"
                }`}
              >
                Muthowif
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            keyField="id"
            isLoading={loading}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit ${activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}` : `Tambah ${activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
            required
            placeholder="Masukkan nama lengkap..."
          />
          <Input
            label="Nomor Telepon / WhatsApp"
            value={formNoHp}
            onChange={(e) => setFormNoHp(e.target.value)}
            placeholder="Contoh: 08123456789"
          />
          {editingId && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium">Status Aktif</span>
              <button
                type="button"
                onClick={() => setFormIsActive(!formIsActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 ${
                  formIsActive ? "bg-sky-600" : "bg-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formIsActive ? "translate-x-2" : "-translate-x-2"
                  }`}
                />
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Petugas"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
