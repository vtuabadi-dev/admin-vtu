"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BookText,
  UserCheck,
  Building2,
  Clock,
  Calendar,
  CheckCircle2,
  Sparkles,
  Search,
  Plus,
  Send,
  Copy,
  Loader2,
  RefreshCw,
  Phone,
  MapPin,
  User,
  HeartHandshake,
  Check,
  Share2,
  MessageCircle,
  Link2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { useSession } from "@/shared/hooks/use-session";
import { DAFTAR_KANTOR_CABANG, getKantorCabang } from "@/shared/lib/kantor-cabang";
import { getWhatsAppUrl } from "@/shared/lib/utils";

interface BukuTamuItem {
  id: string;
  namaTamu: string;
  nomorWa: string;
  kotaAsal?: string | null;
  keperluan?: string | null;
  kantorCabang: string;
  adminId: string;
  adminName: string;
  waktuKunjungan: string;
  statusKunjungan: "SEDANG_BERKUNJUNG" | "SELESAI";
  hasilKunjungan?: "CLOSING" | "MINAT" | null;
  minatBulan?: string | null;
  minatJenisPaket?: string | null;
  minatTanggal?: string | null;
  catatanHasil?: string | null;
  createdAt: string;
}

const DAFTAR_BULAN_PILIHAN = [
  "Oktober 2026",
  "November 2026",
  "Desember 2026",
  "Januari 2027",
  "Februari 2027",
  "Maret 2027 (Ramadhan 1448 H)",
  "April 2027 (Syawal 1448 H)",
  "Mei 2027",
  "Juni 2027",
  "Juli 2027 (Awal Musim 1449 H)",
  "Agustus 2027",
  "September 2027",
  "Oktober 2027",
  "November 2027",
  "Desember 2027",
];

const DAFTAR_PAKET_MINAT = [
  "Paket Reguler 9 Hari",
  "Paket Reguler 12 Hari",
  "Paket Reguler 16 Hari",
  "Paket Umroh Plus Turki",
  "Paket Umroh Plus Dubai",
  "Paket Umroh Plus Thaif & Kereta Cepat",
  "Paket Ramadhan Awal / Tengah",
  "Paket Lailatul Qadar / Akhir Ramadhan",
  "Paket VIP / Bintang 5 Khusus",
];

export default function BukuTamuPage() {
  const { user } = useSession();

  const [tamuList, setTamuList] = useState<BukuTamuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kantorFilter, setKantorFilter] = useState("all");

  // Current logged in admin profile details
  const [adminProfile, setAdminProfile] = useState<{
    name: string;
    kantorCabang: string;
  }>({
    name: user?.name || "Admin VTU",
    kantorCabang: "Malang",
  });

  // Modal Catat Tamu Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    namaTamu: "",
    nomorWa: "",
    kotaAsal: "",
    keperluan: "Konsultasi Paket Umroh",
  });

  // Modal Tutup Kunjungan (Closing / Minat)
  const [closingModalTamu, setClosingModalTamu] = useState<BukuTamuItem | null>(null);
  const [submittingClose, setSubmittingClose] = useState(false);
  const [closeForm, setCloseForm] = useState({
    hasilKunjungan: "CLOSING" as "CLOSING" | "MINAT",
    minatBulan: "",
    minatJenisPaket: "",
    minatTanggal: "",
    catatanHasil: "",
  });

  // Copy link toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Bagikan Link Buku Tamu
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Fetch admin profile for accurate office placement
  useEffect(() => {
    async function fetchAdminInfo() {
      try {
        const res = await fetch("/api/admin/profile");
        const json = await res.json();
        if (json.success && json.data) {
          setAdminProfile({
            name: json.data.name || user?.name || "Admin VTU",
            kantorCabang: json.data.kantorCabang || "Malang",
          });
        }
      } catch (err) {
        console.warn("Could not fetch admin profile", err);
      }
    }
    fetchAdminInfo();
  }, [user]);

  // Fetch Buku Tamu List
  const fetchTamuList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMode === "mine") params.set("filter", "mine");
      if (kantorFilter !== "all") params.set("kantor", kantorFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/buku-tamu?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTamuList(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat buku tamu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTamuList();
  }, [filterMode, kantorFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTamuList();
  };

  // Submit Catat Tamu Baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.namaTamu.trim() || !addForm.nomorWa.trim()) {
      alert("Nama tamu dan nomor WhatsApp wajib diisi.");
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await fetch("/api/buku-tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          kantorCabang: adminProfile.kantorCabang,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setAddForm({
          namaTamu: "",
          nomorWa: "",
          kotaAsal: "",
          keperluan: "Konsultasi Paket Umroh",
        });
        fetchTamuList();
      } else {
        alert(json.message || "Gagal mencatat tamu baru.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Tutup Kunjungan Modal
  const openCloseModal = (tamu: BukuTamuItem) => {
    setClosingModalTamu(tamu);
    setCloseForm({
      hasilKunjungan: "CLOSING",
      minatBulan: "",
      minatJenisPaket: "",
      minatTanggal: "",
      catatanHasil: "",
    });
  };

  // Submit Tutup Kunjungan
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingModalTamu) return;

    if (closeForm.hasilKunjungan === "MINAT" && !closeForm.minatBulan) {
      alert("Untuk hasil minat, silakan pilih dropdown bulan keberangkatan terlebih dahulu.");
      return;
    }

    try {
      setSubmittingClose(true);
      const payload: any = {
        statusKunjungan: "SELESAI",
        hasilKunjungan: closeForm.hasilKunjungan,
        catatanHasil: closeForm.catatanHasil.trim() || null,
      };

      if (closeForm.hasilKunjungan === "MINAT") {
        payload.minatBulan = closeForm.minatBulan;
        payload.minatJenisPaket = closeForm.minatJenisPaket || null;
        payload.minatTanggal = closeForm.minatTanggal || null;
      }

      const res = await fetch(`/api/buku-tamu/${closingModalTamu.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setClosingModalTamu(null);
        fetchTamuList();
      } else {
        alert(json.message || "Gagal menutup aktivitas tamu.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmittingClose(false);
    }
  };

  // Helper to ensure customer links always use the official production domain (not temporary Vercel preview hashes)
  const getPublicBaseUrl = () => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return window.location.origin;
      }
    }
    return "https://www.vtu.my.id";
  };

  // Helper WA message generation
  const generateRegistrationWaUrl = (tamu: BukuTamuItem) => {
    const origin = getPublicBaseUrl();
    const regUrl = `${origin}/pendaftaran`;
    const cleanPhone = tamu.nomorWa.replace(/[^0-9]/g, "");
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith("0")) formattedPhone = "62" + formattedPhone.slice(1);
    else if (formattedPhone.startsWith("8")) formattedPhone = "62" + formattedPhone;

    const pesan = `*Bismillah, Assalamu'alaikum Warahmatullahi Wabarakatuh.*

Yth. Bapak/Ibu *${tamu.namaTamu}*,
Terima kasih atas kunjungan silaturahmi Anda ke kantor *VTU ABADI Travel (Kantor ${tamu.kantorCabang})* bersama tim kami (*${tamu.adminName}*).

Untuk memudahkan proses booking seat dan pendaftaran online keberangkatan Umroh, silakan klik tautan formulir pendaftaran resmi berikut:
👉 *Formulir Pendaftaran:*
${regUrl}

_💡 Catatan: Jika link di atas belum berwarna biru atau belum bisa diklik, silakan kirim balasan chat ini atau tekan 'Tambah ke kontak' terlebih dahulu 🙏_

Bila memerlukan bantuan pengisian berkas atau konsultasi jadwal paket, kami siap mendampingi Anda hingga keberangkatan ke Baitullah.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
*VTU ABADI Travel — Melayani Sepenuh Hati*`;

    return getWhatsAppUrl(formattedPhone, pesan);
  };

  // Helper Public Guestbook Link & WA
  const getPublicGuestbookLink = (phone?: string) => {
    const origin = getPublicBaseUrl();
    const params = new URLSearchParams();
    if (phone && phone.trim()) {
      params.set("phone", phone.trim());
    }
    if (adminProfile.name) {
      params.set("admin", adminProfile.name);
    }
    if (adminProfile.kantorCabang) {
      params.set("kantor", adminProfile.kantorCabang);
    }
    return `${origin}/buku-tamu?${params.toString()}`;
  };

  const getShareWaUrl = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith("0")) formattedPhone = "62" + formattedPhone.slice(1);
    else if (formattedPhone.startsWith("8")) formattedPhone = "62" + formattedPhone;

    const link = getPublicGuestbookLink(phone);
    const pesan = `*Bismillah, Assalamu'alaikum Warahmatullahi Wabarakatuh.*

Kepada Yth. Calon Tamu / Jamaah Baitullah,
Terima kasih atas silaturahmi Anda dengan *VTU ABADI Travel (Kantor ${adminProfile.kantorCabang})*.

Untuk pencatatan buku tamu kunjungan dan konsultasi rencana ibadah Umroh Anda, silakan klik tautan:
👉 *Isi Buku Tamu:*
${link}

*(Nomor WhatsApp Anda telah terisi secara otomatis pada formulir)*

_💡 Catatan: Jika link di atas belum berwarna biru atau belum bisa diklik, silakan kirim balasan chat ini atau tekan 'Tambah ke kontak' terlebih dahulu 🙏_

Bila ada hal yang ingin ditanyakan, kami dengan senang hati melayani Anda.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
*VTU ABADI Travel — Melayani Sepenuh Hati*`;

    return getWhatsAppUrl(formattedPhone, pesan);
  };

  const handleCopyShareLink = async (phone?: string) => {
    const link = getPublicGuestbookLink(phone);
    const hyperHtml = `<a href="${link}">Isi Buku Tamu</a>`;
    const hyperPlain = `Isi Buku Tamu: ${link}`;

    try {
      if (typeof window !== "undefined" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blobHtml = new Blob([hyperHtml], { type: "text/html" });
        const blobPlain = new Blob([hyperPlain], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobPlain,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(hyperPlain);
      }
    } catch {
      await navigator.clipboard.writeText(hyperPlain);
    }

    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleCopyRegLink = (tamu: BukuTamuItem) => {
    const origin = getPublicBaseUrl();
    const regUrl = `${origin}/pendaftaran`;
    navigator.clipboard.writeText(regUrl);
    setCopiedId(tamu.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tamuList.length;
    const aktif = tamuList.filter((t) => t.statusKunjungan === "SEDANG_BERKUNJUNG").length;
    const closing = tamuList.filter((t) => t.hasilKunjungan === "CLOSING").length;
    const minat = tamuList.filter((t) => t.hasilKunjungan === "MINAT").length;
    return { total, aktif, closing, minat };
  }, [tamuList]);

  const currentOfficeObj = getKantorCabang(adminProfile.kantorCabang);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <BookText className="w-6 h-6 text-primary" />
              Buku Tamu Operasional
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
              <MapPin className="w-3 h-3 mr-1" />
              Kantor Anda: {currentOfficeObj.nama}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pencatatan langsung tamu yang berkunjung di kantor cabang, riwayat penanganan admin, dan penutupan hasil minat/closing
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setSharePhone("");
              setIsShareModalOpen(true);
            }}
            className="gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold shadow-sm"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            Bagikan Link Buku Tamu
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Catat Tamu Baru
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-stone-800 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Kunjungan</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase">Sedang Berkunjung</p>
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">{stats.aktif}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Closing Langsung</p>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{stats.closing}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 dark:border-blue-900/40 bg-blue-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">Minat (Follow-Up)</p>
              <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{stats.minat}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Toggle: Semua Tamu vs Tamu Saya */}
            <div className="inline-flex p-1 bg-muted rounded-lg border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filterMode === "all"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua Tamu ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("mine")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filterMode === "mine"
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hanya Tamu yang Saya Terima
              </button>
            </div>

            {/* Filter Kantor & Search Input */}
            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <select
                value={kantorFilter}
                onChange={(e) => setKantorFilter(e.target.value)}
                className="h-9 px-2.5 rounded-md border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
              >
                <option value="all">Semua Kantor Cabang</option>
                {DAFTAR_KANTOR_CABANG.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kantor {k.nama}
                  </option>
                ))}
              </select>

              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama tamu, WA, atau admin..."
                  className="pl-8 h-9 text-xs"
                />
              </form>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTamuList}
                className="h-9 px-2.5 shrink-0"
                title="Refresh Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABEL BUKU TAMU */}
      <Card className="border">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Daftar Buku Tamu Kunjungan</span>
            <span className="text-xs font-normal text-muted-foreground">
              Menampilkan {tamuList.length} tamu berkunjung
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">Memuat catatan buku tamu...</span>
            </div>
          ) : tamuList.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <BookText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Belum ada catatan tamu</p>
              <p className="text-xs text-muted-foreground">
                {filterMode === "mine"
                  ? "Anda belum menerima kunjungan tamu, atau belum ada tamu yang dicatat."
                  : "Belum ada kunjungan tamu di kantor ini. Klik tombol 'Catat Tamu Baru' untuk mulai."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b font-bold">
                  <tr>
                    <th className="px-4 py-3">Nama Tamu & Kontak</th>
                    <th className="px-4 py-3">Waktu Kunjungan</th>
                    <th className="px-4 py-3">Kantor Cabang</th>
                    <th className="px-4 py-3">Diterima Oleh</th>
                    <th className="px-4 py-3">Keperluan / Catatan</th>
                    <th className="px-4 py-3 text-center">Status &amp; Hasil</th>
                    <th className="px-4 py-3 text-right">Aksi Pendaftaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tamuList.map((tamu) => {
                    const isSedangBerkunjung = tamu.statusKunjungan === "SEDANG_BERKUNJUNG";
                    const isClosing = tamu.hasilKunjungan === "CLOSING";
                    const isMinat = tamu.hasilKunjungan === "MINAT";

                    return (
                      <tr key={tamu.id} className="hover:bg-muted/30 transition-colors">
                        {/* Nama Tamu & Kontak */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground text-sm">{tamu.namaTamu}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {tamu.nomorWa}
                            </span>
                            {tamu.kotaAsal && (
                              <span className="text-[11px] text-muted-foreground">
                                • {tamu.kotaAsal}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Waktu Kunjungan */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {new Date(tamu.waktuKunjungan).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Pukul{" "}
                            {new Date(tamu.waktuKunjungan).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            WIB
                          </div>
                        </td>

                        {/* Kantor Cabang */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300">
                            <Building2 className="w-3 h-3 mr-1 text-amber-600" />
                            Kantor {tamu.kantorCabang}
                          </Badge>
                        </td>

                        {/* Diterima Oleh */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{tamu.adminName}</span>
                          </div>
                          {user?.name === tamu.adminName && (
                            <span className="text-[10px] text-primary font-bold">(Anda)</span>
                          )}
                        </td>

                        {/* Keperluan / Catatan */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-foreground line-clamp-1">{tamu.keperluan || "Konsultasi Umroh"}</div>
                          {tamu.catatanHasil && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">
                              Hasil: &quot;{tamu.catatanHasil}&quot;
                            </div>
                          )}
                        </td>

                        {/* Status & Hasil Kunjungan */}
                        <td className="px-4 py-3 text-center">
                          {isSedangBerkunjung ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 animate-pulse">
                                ● Sedang Berkunjung
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCloseModal(tamu)}
                                className="h-7 text-[11px] px-2 py-0 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 font-bold"
                              >
                                Tutup Kunjungan
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {isClosing && (
                                <Badge variant="success" className="font-bold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Closing
                                </Badge>
                              )}
                              {isMinat && (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-bold text-[11px]">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Minat: {tamu.minatBulan || "Umroh"}
                                  </Badge>
                                  {(tamu.minatJenisPaket || tamu.minatTanggal) && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {tamu.minatJenisPaket}
                                      {tamu.minatTanggal && ` (${new Date(tamu.minatTanggal).toLocaleDateString("id-ID")})`}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Aksi Link Pendaftaran (Pojok Kanan) */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={generateRegistrationWaUrl(tamu)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                              title="Kirim Link Pendaftaran via WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirim Link WA</span>
                            </a>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyRegLink(tamu)}
                              className="h-7 px-2 text-[11px]"
                              title="Salin Tautan Formulir Pendaftaran"
                            >
                              {copiedId === tamu.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
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

      {/* MODAL CATAT TAMU BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md bg-card rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <BookText className="w-5 h-5 text-primary" />
                Catat Tamu Kunjungan Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-600" />
                Diterima di Kantor {adminProfile.kantorCabang}
              </div>
              <p className="text-muted-foreground">
                Admin penerima tercatat secara otomatis: <strong>{adminProfile.name}</strong>
              </p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Nama Lengkap Tamu *</label>
                <Input
                  required
                  value={addForm.namaTamu}
                  onChange={(e) => setAddForm({ ...addForm, namaTamu: e.target.value })}
                  placeholder="Contoh: Bpk. H. Ahmad Fauzi"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Nomor WhatsApp Tamu *</label>
                <Input
                  required
                  type="tel"
                  value={addForm.nomorWa}
                  onChange={(e) => setAddForm({ ...addForm, nomorWa: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Digunakan untuk pengiriman link pendaftaran dan materi katalog paket.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Kota Asal / Domisili (Opsional)</label>
                <Input
                  value={addForm.kotaAsal}
                  onChange={(e) => setAddForm({ ...addForm, kotaAsal: e.target.value })}
                  placeholder="Contoh: Malang Kota, Pasuruan, Surabaya"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Keperluan / Rencana Ibadah</label>
                <textarea
                  rows={2}
                  value={addForm.keperluan}
                  onChange={(e) => setAddForm({ ...addForm, keperluan: e.target.value })}
                  placeholder="Rencana ibadah, tanya harga paket, konsultasi keluarga..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submittingAdd}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingAdd}
                  className="gap-1.5 font-bold bg-primary text-primary-foreground"
                >
                  {submittingAdd ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {submittingAdd ? "Menyimpan..." : "Simpan Tamu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TUTUP AKTIVITAS KUNJUNGAN (CLOSING / MINAT) */}
      {closingModalTamu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg bg-card rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Tutup Aktivitas Terima Tamu
              </h3>
              <button
                type="button"
                onClick={() => setClosingModalTamu(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1">
              <div className="font-bold text-foreground text-sm">{closingModalTamu.namaTamu}</div>
              <div className="text-muted-foreground font-mono">
                No. WA: {closingModalTamu.nomorWa} • Kantor {closingModalTamu.kantorCabang}
              </div>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-4 text-xs">
              {/* Dropdown Hasil Kunjungan: Closing / Minat */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Hasil Kunjungan Tamu *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      closeForm.hasilKunjungan === "CLOSING"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "bg-muted/30 border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hasilKunjungan"
                      value="CLOSING"
                      checked={closeForm.hasilKunjungan === "CLOSING"}
                      onChange={() => setCloseForm({ ...closeForm, hasilKunjungan: "CLOSING" })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs">Closing Langsung</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Langsung booking seat / daftar
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      closeForm.hasilKunjungan === "MINAT"
                        ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 font-bold"
                        : "bg-muted/30 border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hasilKunjungan"
                      value="MINAT"
                      checked={closeForm.hasilKunjungan === "MINAT"}
                      onChange={() => setCloseForm({ ...closeForm, hasilKunjungan: "MINAT" })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs">Minat (Follow-Up)</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Berminat di bulan tertentu
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* JIKA MINAT: DROPDOWN BULAN & ISIAN OPSIONAL */}
              {closeForm.hasilKunjungan === "MINAT" && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3 animate-in fade-in-50">
                  <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Preferensi Jadwal Minat Jamaah
                  </div>

                  {/* 1. Dropdown Bulan Apa (Wajib untuk Minat) */}
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Minat di Bulan Apa? (Wajib) *</label>
                    <select
                      required
                      value={closeForm.minatBulan}
                      onChange={(e) => setCloseForm({ ...closeForm, minatBulan: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-md border bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Bulan Keberangkatan --</option>
                      {DAFTAR_BULAN_PILIHAN.map((bln) => (
                        <option key={bln} value={bln}>
                          {bln}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10.5px] text-muted-foreground italic">
                    * Catatan: Setelah bulan terisi, isian paket dan tanggal di bawah bersifat opsional.
                  </p>

                  {/* 2. Reguler atau Plus Apa (Opsional) */}
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Reguler atau Plus Apa? (Opsional)</label>
                    <select
                      value={closeForm.minatJenisPaket}
                      onChange={(e) => setCloseForm({ ...closeForm, minatJenisPaket: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-md border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Bebas / Belum Menentukan Varian --</option>
                      {DAFTAR_PAKET_MINAT.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Estimasi Tanggal Keberangkatan (Opsional) */}
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Estimasi Tanggal (Opsional)</label>
                    <Input
                      type="date"
                      value={closeForm.minatTanggal}
                      onChange={(e) => setCloseForm({ ...closeForm, minatTanggal: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Catatan Hasil Kunjungan */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Catatan Hasil Kunjungan (Opsional)</label>
                <textarea
                  rows={2}
                  value={closeForm.catatanHasil}
                  onChange={(e) => setCloseForm({ ...closeForm, catatanHasil: e.target.value })}
                  placeholder="Contoh: Menginginkan kamar Double, akan rembug keluarga malam ini..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClosingModalTamu(null)}
                  disabled={submittingClose}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingClose}
                  className="gap-1.5 font-bold bg-primary text-primary-foreground"
                >
                  {submittingClose ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {submittingClose ? "Menutup..." : "Simpan & Tutup Kunjungan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL BAGIKAN LINK BUKU TAMU KE CUSTOMER */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg bg-card rounded-2xl border shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                  Bagikan Link Buku Tamu ke Customer
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kirim link via WA agar calon jamaah mengisi form dengan nomor WA terisi otomatis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Input Nomor WA Customer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Nomor WhatsApp Customer</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Opsional, untuk auto-fill nomor di HP customer)
                </span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="Contoh: 081234567890 atau 6281234567890"
                  className="pl-9 h-9 text-xs font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Jika diisi, ketika customer membuka link dari WhatsApp, nomor WA mereka akan <strong>langsung terisi otomatis</strong> di form.
              </p>
            </div>

            {/* Preview Link Box */}
            <div className="p-3.5 rounded-xl bg-muted/50 border space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span>Preview Hyperlink:</span>
                <span className="text-emerald-600 font-bold">
                  {sharePhone.trim() ? "✓ Terhubung No. WA" : "Link Umum"}
                </span>
              </div>

              {/* Visual Hyperlink Card */}
              <div className="p-3 rounded-xl bg-background border flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={getPublicGuestbookLink(sharePhone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                      title="Klik untuk membuka pratinjau"
                    >
                      <span>Isi Buku Tamu</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      {getPublicGuestbookLink(sharePhone)}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyShareLink(sharePhone)}
                  className="h-8 text-xs gap-1.5 font-bold shrink-0 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Hyperlink</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between px-1">
                <span>Tersalin sebagai teks bertautan: <strong>&quot;Isi Buku Tamu&quot;</strong></span>
                <span>Kantor: <strong>{adminProfile.kantorCabang}</strong></span>
              </div>
            </div>

            {/* Info 3 Kolom */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Formulir Minimalis 3 Kolom untuk Customer:
              </div>
              <ul className="list-disc list-inside text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5 ml-1">
                <li><strong>1. Nama Lengkap Jamaah</strong> (wajib diisi customer)</li>
                <li><strong>2. Nomor WhatsApp</strong> (terisi otomatis dari link)</li>
                <li><strong>3. Keperluan / Rencana Ibadah</strong> (dengan tombol pilihan cepat)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(false)}
              >
                Tutup
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyShareLink(sharePhone)}
                className="gap-1.5 font-bold border-emerald-600/40 text-emerald-700 dark:text-emerald-300"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedShareLink ? "Hyperlink Tersalin!" : "Salin Hyperlink \"Isi Buku Tamu\""}
              </Button>

              {sharePhone.trim() && (
                <a
                  href={getShareWaUrl(sharePhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Kirim via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

