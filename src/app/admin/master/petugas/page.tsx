"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Table } from "@/shared/components/ui/Table";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import {
  Users,
  Phone,
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  CreditCard,
} from "lucide-react";

type Petugas = {
  id: string;
  nama: string;
  noHp: string | null;
  tipe: string;
  isActive: boolean;
  kode?: string | null;
  pasporUrl?: string | null;
  pasporDriveId?: string | null;
  fotoUrl?: string | null;
  fotoDriveId?: string | null;
  nomorPaspor?: string | null;
  tglDikeluarkan?: string | null;
  tglHabis?: string | null;
  kotaPaspor?: string | null;
  nik?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: string | null;
};

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function toInputDateFormat(val?: string | null): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0] || "";
  } catch {
    return "";
  }
}

function getPassportStatus(tglHabis?: string | null): { label: string; colorClass: string } {
  if (!tglHabis) return { label: "Belum Ada", colorClass: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400" };
  const d = new Date(tglHabis);
  if (isNaN(d.getTime())) return { label: "Format Invalid", colorClass: "bg-stone-100 text-stone-600" };
  const now = new Date();
  const diffMonths = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (diffMonths < 0) {
    return { label: "Expired", colorClass: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800" };
  } else if (diffMonths < 6) {
    return { label: "Segera Expired", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800" };
  }
  return { label: "Aktif", colorClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" };
}

export default function MasterPetugasPage() {
  const [activeTab, setActiveTab] = useState<"TOUR_LEADER" | "MUTHOWIF">("TOUR_LEADER");
  
  const [data, setData] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Basic Form Fields
  const [formNama, setFormNama] = useState("");
  const [formNoHp, setFormNoHp] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Passport & Identity Extracted Form Fields
  const [formNomorPaspor, setFormNomorPaspor] = useState("");
  const [formTglDikeluarkan, setFormTglDikeluarkan] = useState("");
  const [formTglHabis, setFormTglHabis] = useState("");
  const [formKotaPaspor, setFormKotaPaspor] = useState("");
  const [formNik, setFormNik] = useState("");
  const [formTempatLahir, setFormTempatLahir] = useState("");
  const [formTanggalLahir, setFormTanggalLahir] = useState("");
  const [formJenisKelamin, setFormJenisKelamin] = useState("");

  // File states (Drag & Drop)
  const [pasporFile, setPasporFile] = useState<File | null>(null);
  const [pasporPreview, setPasporPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // OCR state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);

  // Drag states
  const [isDraggingPaspor, setIsDraggingPaspor] = useState(false);
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);

  const pasporInputRef = useRef<HTMLInputElement | null>(null);
  const fotoInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Import Excel States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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
    // Reset all OCR states
    setOcrScanning(false);
    setOcrSuccessMsg(null);
    setOcrErrorMsg(null);
    setPasporFile(null);
    setFotoFile(null);

    if (petugas) {
      setEditingId(petugas.id);
      setFormNama(petugas.nama || "");
      setFormNoHp(petugas.noHp || "");
      setFormIsActive(petugas.isActive);
      setFormNomorPaspor(petugas.nomorPaspor || "");
      setFormTglDikeluarkan(toInputDateFormat(petugas.tglDikeluarkan));
      setFormTglHabis(toInputDateFormat(petugas.tglHabis));
      setFormKotaPaspor(petugas.kotaPaspor || "");
      setFormNik(petugas.nik || "");
      setFormTempatLahir(petugas.tempatLahir || "");
      setFormTanggalLahir(toInputDateFormat(petugas.tanggalLahir));
      setFormJenisKelamin(petugas.jenisKelamin || "");
      setPasporPreview(petugas.pasporUrl || null);
      setFotoPreview(petugas.fotoUrl || null);
    } else {
      setEditingId(null);
      setFormNama("");
      setFormNoHp("");
      setFormIsActive(true);
      setFormNomorPaspor("");
      setFormTglDikeluarkan("");
      setFormTglHabis("");
      setFormKotaPaspor("");
      setFormNik("");
      setFormTempatLahir("");
      setFormTanggalLahir("");
      setFormJenisKelamin("");
      setPasporPreview(null);
      setFotoPreview(null);
    }
    setModalOpen(true);
  }

  // Handle Foto Drag & Drop / Selection
  function handleFotoSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Format file tidak didukung. Harap pilih berkas gambar (JPG, PNG, WEBP).");
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  // Handle Paspor Drag & Drop / Selection with Live OCR Extraction
  async function handlePasporSelected(file: File) {
    setPasporFile(file);
    if (file.type.startsWith("image/")) {
      setPasporPreview(URL.createObjectURL(file));
    } else {
      setPasporPreview("pdf");
    }

    // Trigger OCR extraction automatically
    setOcrScanning(true);
    setOcrSuccessMsg(null);
    setOcrErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/master/petugas/ocr-paspor", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const d = json.data;
        if (d.nomorPaspor) setFormNomorPaspor(d.nomorPaspor);
        if (d.tanggalTerbitPaspor) setFormTglDikeluarkan(toInputDateFormat(d.tanggalTerbitPaspor));
        if (d.tanggalKadaluarsa) setFormTglHabis(toInputDateFormat(d.tanggalKadaluarsa));
        if (d.tempatTerbitPaspor) setFormKotaPaspor(d.tempatTerbitPaspor);
        if (d.nik) setFormNik(d.nik);
        if (d.tempatLahir) setFormTempatLahir(d.tempatLahir);
        if (d.tanggalLahir) setFormTanggalLahir(toInputDateFormat(d.tanggalLahir));
        if (d.jenisKelamin) setFormJenisKelamin(d.jenisKelamin);
        if (d.namaLengkap && !formNama) {
          setFormNama(d.namaLengkap);
        }

        const confidencePercent = Math.round((d.confidence || 0.9) * 100);
        setOcrSuccessMsg(`Data paspor berhasil diekstrak otomatis (${confidencePercent}% akurasi). Silakan periksa kolom formulir.`);
      } else {
        setOcrErrorMsg(json.message || "Gagal mengekstrak teks paspor secara otomatis. Anda tetap dapat mengisi data secara manual.");
      }
    } catch (err: any) {
      setOcrErrorMsg("Koneksi ke engine OCR terganggu. Silakan isi data secara manual.");
    } finally {
      setOcrScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formNama.trim()) {
      alert("Nama lengkap wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("nama", formNama.trim());
      formData.append("noHp", formNoHp.trim());
      formData.append("tipe", activeTab);
      formData.append("isActive", String(formIsActive));
      formData.append("nomorPaspor", formNomorPaspor.trim());
      formData.append("tglDikeluarkan", formTglDikeluarkan);
      formData.append("tglHabis", formTglHabis);
      formData.append("kotaPaspor", formKotaPaspor.trim());
      formData.append("nik", formNik.trim());
      formData.append("tempatLahir", formTempatLahir.trim());
      formData.append("tanggalLahir", formTanggalLahir);
      formData.append("jenisKelamin", formJenisKelamin);

      if (pasporFile) {
        formData.append("paspor", pasporFile);
      }
      if (fotoFile) {
        formData.append("foto", fotoFile);
      }

      let res;
      if (editingId) {
        res = await fetch(`/api/master/petugas/${editingId}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await fetch("/api/master/petugas", {
          method: "POST",
          body: formData,
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
      alert("Terjadi kesalahan sistem saat menyimpan petugas");
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

  function handleDownloadTemplate() {
    window.open("/api/master/petugas/template", "_blank");
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return alert("Pilih file Excel terlebih dahulu");

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("defaultTipe", activeTab);

      const res = await fetch("/api/master/petugas/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert(json.message);
        setImportModalOpen(false);
        setImportFile(null);
        fetchData();
      } else {
        alert(json.message || "Gagal mengimpor data Excel");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan sistem saat impor");
    } finally {
      setImporting(false);
    }
  }

  // Columns for Tour Leader with Document and Passport details
  const tourLeaderColumns = [
    {
      key: "nama",
      header: "TOUR LEADER & KONTAK",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shadow-xs">
            {row.fotoUrl ? (
              <img
                src={row.fotoUrl}
                alt={row.nama}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <Users className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <span className="font-semibold text-foreground block">{row.nama}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Phone className="h-3 w-3" />
              <span className="font-mono">{row.noHp || "-"}</span>
              {row.nik && (
                <>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span className="font-mono">NIK: {row.nik}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "paspor",
      header: "PASPOR & MASA BERLAKU",
      accessor: (row: Petugas) => {
        const status = getPassportStatus(row.tglHabis);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-sky-600" />
              <span className="font-mono font-medium text-xs">
                {row.nomorPaspor || <span className="text-muted-foreground italic">Belum terisi</span>}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.colorClass}`}>
                {status.label}
              </span>
            </div>
            {row.tglHabis && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span>Berlaku s/d:</span>
                <span className="font-semibold text-foreground">{formatDisplayDate(row.tglHabis)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "dokumen",
      header: "BERKAS (GOOGLE DRIVE)",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          {row.pasporUrl ? (
            <a
              href={row.pasporUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-medium hover:bg-sky-100 transition-colors"
              title="Lihat Berkas Paspor di Google Drive"
            >
              <FileText className="h-3.5 w-3.5 text-sky-600" /> Paspor <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">- Paspor -</span>
          )}
          {row.fotoUrl ? (
            <a
              href={row.fotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 text-xs font-medium hover:bg-stone-100 transition-colors"
              title="Lihat Pas Foto di Google Drive"
            >
              <Camera className="h-3.5 w-3.5 text-stone-600" /> Foto <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">- Foto -</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      accessor: (row: Petugas) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-400"
          }`}
        >
          {row.isActive ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "aksi",
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

  // Standard columns for Muthowif
  const muthowifColumns = [
    {
      key: "nama",
      header: "NAMA",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{row.nama}</span>
        </div>
      ),
    },
    {
      key: "noHp",
      header: "NO TELEPON",
      accessor: (row: Petugas) => (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono">{row.noHp || "-"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      accessor: (row: Petugas) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-800"
          }`}
        >
          {row.isActive ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "aksi",
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

  if (error) return <ErrorState title="Gagal Memuat Data" message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Petugas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola daftar Tour Leader dan Muthowif dengan integrasi berkas Paspor & Pas Foto ke Google Drive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Import Excel
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Tambah {activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}
          </Button>
        </div>
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
          {loading ? (
            <div className="flex justify-center items-center p-8 text-sm text-muted-foreground">
              Memuat data...
            </div>
          ) : (
            <Table
              columns={activeTab === "TOUR_LEADER" ? tourLeaderColumns : muthowifColumns}
              data={data}
              keyField="id"
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Form Tambah / Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit ${activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}` : `Tambah ${activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"}`}
        size={activeTab === "TOUR_LEADER" ? "xl" : "default"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
          {activeTab === "TOUR_LEADER" && (
            <>
              {/* Folder Storage Notice Banner */}
              <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg flex items-center justify-between text-xs text-sky-800 dark:text-sky-300">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>
                    Berkas Paspor & Foto akan disimpan otomatis ke Google Drive:{" "}
                    <code className="font-mono bg-sky-100 dark:bg-sky-900 px-1 py-0.5 rounded font-bold">
                      184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G
                    </code>
                  </span>
                </div>
              </div>

              {/* Upload Dropzones Section (Pas Foto & Paspor) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. DROPZONE PAS FOTO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-sky-600" /> Pas Foto Tour Leader (Drag & Drop)
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingFoto(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingFoto(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingFoto(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFotoSelected(file);
                    }}
                    onClick={() => fotoInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isDraggingFoto
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30 scale-[0.99]"
                        : "border-stone-300 dark:border-stone-700 hover:border-sky-400 hover:bg-stone-50 dark:hover:bg-stone-900/50"
                    }`}
                  >
                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFotoSelected(file);
                      }}
                    />

                    {fotoPreview ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-sky-600 shadow-md">
                          <img src={fotoPreview} alt="Preview Foto" className="h-full w-full object-cover" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Foto Siap Diunggah
                        </p>
                        <p className="text-[11px] text-muted-foreground">Klik atau seret untuk mengganti</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 gap-1.5 text-muted-foreground">
                        <Camera className="h-8 w-8 text-stone-400" />
                        <p className="text-xs font-medium text-foreground">Seret & lepas Pas Foto di sini</p>
                        <p className="text-[11px]">atau klik untuk memilih file (PNG, JPG)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. DROPZONE PASPOR + AI OCR TRIGGER */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-sky-600" /> Paspor Tour Leader + Ekstrak AI OCR
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaspor(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaspor(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaspor(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePasporSelected(file);
                    }}
                    onClick={() => pasporInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isDraggingPaspor
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30 scale-[0.99]"
                        : "border-stone-300 dark:border-stone-700 hover:border-sky-400 hover:bg-stone-50 dark:hover:bg-stone-900/50"
                    }`}
                  >
                    <input
                      ref={pasporInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePasporSelected(file);
                      }}
                    />

                    {ocrScanning ? (
                      <div className="flex flex-col items-center justify-center py-3 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                        <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                          Mengekstrak data paspor via AI OCR...
                        </p>
                        <p className="text-[11px] text-muted-foreground">Membaca nomor paspor, masa berlaku, dan identitas</p>
                      </div>
                    ) : pasporPreview ? (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="h-16 w-24 rounded border overflow-hidden bg-stone-100 flex items-center justify-center shadow-xs">
                          {pasporPreview === "pdf" ? (
                            <FileText className="h-8 w-8 text-rose-500" />
                          ) : (
                            <img src={pasporPreview} alt="Preview Paspor" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paspor Terpilih
                        </p>
                        <p className="text-[11px] text-muted-foreground">Klik atau seret untuk mengganti</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 gap-1.5 text-muted-foreground">
                        <Sparkles className="h-8 w-8 text-sky-500" />
                        <p className="text-xs font-medium text-foreground">Seret & lepas Berkas Paspor di sini</p>
                        <p className="text-[11px]">AI otomatis memindai & mengisi data ke formulir</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* OCR Feedback Alerts */}
              {ocrSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{ocrSuccessMsg}</span>
                </div>
              )}

              {ocrErrorMsg && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{ocrErrorMsg}</span>
                </div>
              )}

              {/* Passport Extracted Information (Editable by Admin) */}
              <div className="p-3.5 bg-muted/30 rounded-xl border space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-sky-600" /> Data Paspor Hasil Ekstraksi
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Dapat disesuaikan jika diperlukan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Input
                    label="Nomor Paspor"
                    value={formNomorPaspor}
                    onChange={(e) => setFormNomorPaspor(e.target.value.toUpperCase())}
                    placeholder="Contoh: X1234567"
                    className="font-mono"
                  />
                  <Input
                    label="Tgl Dikeluarkan"
                    type="date"
                    value={formTglDikeluarkan}
                    onChange={(e) => setFormTglDikeluarkan(e.target.value)}
                  />
                  <Input
                    label="Tgl Habis Berlaku"
                    type="date"
                    value={formTglHabis}
                    onChange={(e) => setFormTglHabis(e.target.value)}
                  />
                  <Input
                    label="Kantor / Kota Paspor"
                    value={formKotaPaspor}
                    onChange={(e) => setFormKotaPaspor(e.target.value)}
                    placeholder="Contoh: JAKARTA SELATAN"
                  />
                  <Input
                    label="NIK (No. KTP)"
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value)}
                    placeholder="16 digit NIK"
                    className="font-mono"
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none">Jenis Kelamin</label>
                    <select
                      value={formJenisKelamin}
                      onChange={(e) => setFormJenisKelamin(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Pilih...</option>
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <Input
                    label="Tempat Lahir"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    placeholder="Contoh: SURABAYA"
                  />
                  <Input
                    label="Tanggal Lahir"
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Primary Petugas Information */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Identitas Utama Petugas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nama Lengkap"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                required
                placeholder="Masukkan nama lengkap petugas..."
              />
              <Input
                label="Nomor Telepon / WhatsApp"
                value={formNoHp}
                onChange={(e) => setFormNoHp(e.target.value)}
                placeholder="Contoh: 08123456789"
              />
            </div>

            {editingId && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Status Aktif</span>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 ${
                    formIsActive ? "bg-sky-600" : "bg-gray-200 dark:bg-stone-700"
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
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700 text-white">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Menyimpan & Mengunggah...
                </>
              ) : (
                "Simpan Petugas"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={`Import Excel (${activeTab === "TOUR_LEADER" ? "Tour Leader" : "Muthowif"})`}
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs space-y-2">
            <p className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-sky-600" /> Format File Excel Standard
            </p>
            <p className="text-sky-700 dark:text-sky-300">
              Gunakan format Excel standar untuk mengunggah banyak petugas sekaligus. Data kolom wajib: <strong>Nama Lengkap</strong>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="mt-1 bg-white dark:bg-stone-900"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-sky-600" /> Download Template Excel (.xlsx)
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Pilih File Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer border rounded-md p-1"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={importing || !importFile} className="bg-sky-600 hover:bg-sky-700 text-white">
              {importing ? "Mengimpor..." : "Proses Import"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
