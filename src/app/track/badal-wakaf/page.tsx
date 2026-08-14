"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Phone, HeartHandshake, BookOpen, ExternalLink, Download, AlertCircle, Upload, Plus, User, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";

export default function TrackBadalWakafPage() {
  const [step, setStep] = useState<"login" | "data">("login");
  const [namaPemohon, setNamaPemohon] = useState("");
  const [nomorWhatsapp, setNomorWhatsapp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resultData, setResultData] = useState<{
    namaPemohon: string;
    nomorWhatsapp: string;
    badalList: any[];
    wakafList: any[];
    totalFound: number;
  }>({ namaPemohon: "", nomorWhatsapp: "", badalList: [], wakafList: [], totalFound: 0 });

  const [activeTab, setActiveTab] = useState<"badal" | "wakaf">("badal");

  // Modal Upload Bukti Pembayaran
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ type: "badal" | "wakaf"; id: string } | null>(null);
  const [buktiUrlInput, setBuktiUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Modal Tambah Order Wakaf Baru
  const [addWakafOpen, setAddWakafOpen] = useState(false);
  const [newWakafForm, setNewWakafForm] = useState({
    jumlahMushaf: 5,
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    niatList: [""],
    catatan: "",
  });

  // Login Handler menggunakan Kombinasi Nama Pendaftar & Nomor WA
  const handleTrackLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!namaPemohon.trim()) {
      setErrorMsg("Mohon masukkan Nama Lengkap Pendaftar.");
      return;
    }
    if (!nomorWhatsapp.trim()) {
      setErrorMsg("Mohon masukkan Nomor WhatsApp Pendaftar.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/badal-umroh/track-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaPemohon, nomorWhatsapp }),
      });

      const data = await res.json();
      if (data.success && data.data?.totalFound > 0) {
        setResultData(data.data);
        setStep("data");
      } else {
        setErrorMsg(data.message || "Pendaftaran tidak ditemukan. Pastikan kombinasi Nama Pendaftar & No. WA sudah benar.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan koneksi saat memeriksa data pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  // Upload Bukti Pembayaran
  const handleUploadBuktiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget || !buktiUrlInput) return;
    try {
      setIsUploading(true);
      const endpoint = selectedTarget.type === "badal" ? "/api/badal-umroh/upload-bukti" : "/api/wakaf-quran/upload-bukti";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTarget.id, buktiBayarUrl: buktiUrlInput }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Bukti pembayaran berhasil diunggah! Status pembayaran kini Menunggu Konfirmasi Admin.");
        setUploadModalOpen(false);
        setBuktiUrlInput("");
        // Refresh data login
        const refreshRes = await fetch("/api/badal-umroh/track-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ namaPemohon, nomorWhatsapp }),
        });
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) setResultData(refreshJson.data);
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengunggah bukti bayar.");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Order Wakaf Baru Langsung dari Portal
  const handleCreateNewWakaf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      const firstItem = resultData.wakafList[0] || resultData.badalList[0];
      const payload = {
        isJamaahVauza: firstItem?.isJamaahVauza || false,
        namaPaketUmroh: firstItem?.namaPaketUmroh || null,
        namaPemohon: namaPemohon,
        nomorWhatsapp: nomorWhatsapp,
        jumlahMushaf: newWakafForm.jumlahMushaf,
        lokasiWakaf: newWakafForm.lokasiWakaf,
        niatAtasNama: newWakafForm.niatList.filter((n) => n.trim()).join(", "),
        catatan: newWakafForm.catatan,
      };

      const res = await fetch("/api/wakaf-quran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert("Pesanan Wakaf Qur'an Baru berhasil dibuat!");
        setAddWakafOpen(false);
        // Refresh list
        const refreshRes = await fetch("/api/badal-umroh/track-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ namaPemohon, nomorWhatsapp }),
        });
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) setResultData(refreshJson.data);
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menambah pesanan wakaf.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Portal Utama / Login
        </Link>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-700 text-white p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Portal Cek Status Badal Umroh & Wakaf Qur&apos;an</CardTitle>
            <p className="text-emerald-100 text-xs mt-1 max-w-md mx-auto">
              Masukkan Kombinasi Nama Pendaftar & Nomor WhatsApp Sebagai Sandi Unik Akses Pengecekan Riwayat Order & Sertifikat.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in-0 duration-200">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* ── STEP 1: FORM LOGIN (Kombinasi Nama Pendaftar & No. WA) ── */}
            {step === "login" && (
              <form onSubmit={handleTrackLogin} className="space-y-4 text-xs max-w-md mx-auto py-4">
                <div className="text-center space-y-1.5 pb-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-1">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Kombinasi Sandi Akses Pendaftar</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Hanya pendaftar yang sudah pernah mengajukan pendaftaran Badal atau Wakaf yang dapat mengakses portal ini.
                  </p>
                </div>

                {/* 1. Nama Lengkap Pendaftar */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-600" /> Nama Lengkap Pendaftar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={namaPemohon}
                    onChange={(e) => setNamaPemohon(e.target.value)}
                    placeholder="Masukkan nama pendaftar..."
                    className="text-xs h-10"
                  />
                </div>

                {/* 2. Nomor WhatsApp Pendaftar */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" /> Nomor WhatsApp Pendaftar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    value={nomorWhatsapp}
                    onChange={(e) => setNomorWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="text-xs h-10 font-medium"
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 shadow-xs"
                  >
                    {loading ? "Memeriksa Pendaftaran..." : "Masuk & Cek Pendaftaran Saya"}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Belum mendaftar?{" "}
                    <Link href="/register/badal-umroh" className="text-emerald-600 hover:underline font-bold">
                      Daftar Badal Umroh Baru
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {/* ── STEP 2: DASHBOARD TERVERIFIKASI ── */}
            {step === "data" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100/80 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Pendaftar Resmi Terverifikasi ✓
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1.5">
                      Pendaftar: <span className="text-emerald-700">{resultData.namaPemohon}</span> ({resultData.nomorWhatsapp})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAddWakafOpen(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="h-4 w-4" /> Tambah Order Wakaf
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setStep("login")} className="text-xs">
                      Keluar / Logout
                    </Button>
                  </div>
                </div>

                {/* Tabs Switcher: Badal Umroh vs Wakaf Quran */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab("badal")}
                    className={`px-4 py-2.5 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all ${
                      activeTab === "badal"
                        ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <HeartHandshake className="h-4 w-4" />
                    Badal Umroh ({resultData.badalList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("wakaf")}
                    className={`px-4 py-2.5 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all ${
                      activeTab === "wakaf"
                        ? "border-sky-600 text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    Wakaf Qur&apos;an ({resultData.wakafList.length})
                  </button>
                </div>

                {/* Tab Content: Badal Umroh */}
                {activeTab === "badal" && (
                  <div className="space-y-4">
                    {resultData.badalList.length === 0 ? (
                      <div className="text-center py-10 border rounded-lg bg-muted/20 space-y-2">
                        <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="font-semibold text-sm text-foreground">Belum Ada Order Badal Umroh</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Anda belum memiliki riwayat pendaftaran Badal Umroh. Silakan buat pendaftaran Badal Umroh baru.
                        </p>
                        <Link href="/register/badal-umroh" className="inline-block pt-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            Daftar Badal Umroh Sekarang
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      resultData.badalList.map((item) => (
                        <Card key={item.id} className="border shadow-xs overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                              <div>
                                <span className="text-[11px] text-muted-foreground">Almarhum / Almarhumah:</span>
                                <h4 className="text-sm font-bold text-foreground">
                                  {item.namaAlmarhum}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({item.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"})
                                  </span>
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    item.status === "Selesai"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : item.status === "Diproses"
                                      ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }
                                >
                                  Pelaksanaan: {item.status}
                                </Badge>

                                <Badge
                                  className={
                                    item.paymentStatus === "Lunas"
                                      ? "bg-emerald-600 text-white"
                                      : item.paymentStatus === "Menunggu Konfirmasi"
                                      ? "bg-amber-500 text-white"
                                      : "bg-rose-500 text-white"
                                  }
                                >
                                  Bayar: {item.paymentStatus || "Belum Bayar"}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-muted-foreground">Status Kejamaahan:</p>
                                  <p className="font-semibold text-foreground">
                                    {item.isJamaahVauza ? `Jamaah Vauza (${item.namaPaketUmroh || "Umroh"})` : "Pendaftaran Umum"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Petugas Pelaksana:</p>
                                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {item.petugasBadal || "Menunggu Penugasan"}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Catatan & Penyerahan Souvenir:</p>
                                <p className="font-medium text-foreground">{item.catatan || "-"}</p>
                              </div>
                            </div>

                            {/* Bukti & Sertifikat Dokumen */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t text-xs">
                              <div className="flex items-center gap-2">
                                {item.buktiBayarUrl ? (
                                  <a
                                    href={item.buktiBayarUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Lihat Bukti Bayar
                                  </a>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedTarget({ type: "badal", id: item.id });
                                      setUploadModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-rose-600 hover:underline font-bold"
                                  >
                                    <Upload className="h-3.5 w-3.5" /> Unggah Bukti Bayar
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {item.sertifikatUrl && (
                                  <a
                                    href={item.sertifikatUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                                  >
                                    <Download className="h-3 w-3" /> Unduh Sertifikat
                                  </a>
                                )}
                                {item.videoUrl && (
                                  <a
                                    href={item.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600 text-white rounded text-[11px] font-bold hover:bg-sky-700"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Video Pelaksanaan
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}

                {/* Tab Content: Wakaf Quran */}
                {activeTab === "wakaf" && (
                  <div className="space-y-4">
                    {resultData.wakafList.length === 0 ? (
                      <div className="text-center py-10 border rounded-lg bg-muted/20 space-y-2">
                        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="font-semibold text-sm text-foreground">Belum Ada Order Wakaf Qur&apos;an</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Anda belum memiliki riwayat pendaftaran Wakaf Qur&apos;an di Makkah/Madinah.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setAddWakafOpen(true)}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs mt-2"
                        >
                          Tambah Wakaf Qur&apos;an Sekarang
                        </Button>
                      </div>
                    ) : (
                      resultData.wakafList.map((item) => (
                        <Card key={item.id} className="border shadow-xs overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                              <div>
                                <span className="text-[11px] text-muted-foreground">Niat Atas Nama / Wakaf:</span>
                                <h4 className="text-sm font-bold text-foreground">{item.niatAtasNama || item.namaPewakaf}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-sky-100 text-sky-800 font-bold">
                                  {item.jumlahMushaf} Mushaf Al-Qur&apos;an
                                </Badge>
                                <Badge
                                  className={
                                    item.status === "Selesai"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }
                                >
                                  Status: {item.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Lokasi Penyaluran Wakaf:</p>
                                <p className="font-semibold text-foreground">{item.lokasiWakaf || "Masjidil Haram Makkah"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Status Pembayaran:</p>
                                <p className="font-bold text-emerald-600">{item.paymentStatus || "Lunas"}</p>
                              </div>
                            </div>

                            {item.sertifikatUrl && (
                              <div className="pt-2 flex justify-end border-t">
                                <a
                                  href={item.sertifikatUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                                >
                                  <Download className="h-3 w-3" /> Unduh Sertifikat Wakaf
                                </a>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Upload Bukti Pembayaran */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Unggah Bukti Pembayaran"
      >
        <form onSubmit={handleUploadBuktiSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">URL / Link Bukti Transfer Pembayaran</label>
            <Input
              type="text"
              required
              value={buktiUrlInput}
              onChange={(e) => setBuktiUrlInput(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isUploading} className="bg-emerald-600 text-white">
              {isUploading ? "Mengunggah..." : "Simpan Bukti Pembayaran"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Order Wakaf */}
      <Modal
        open={addWakafOpen}
        onClose={() => setAddWakafOpen(false)}
        title="Tambah Pesanan Wakaf Qur'an Baru"
      >
        <form onSubmit={handleCreateNewWakaf} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Jumlah Mushaf Al-Qur&apos;an</label>
            <Input
              type="number"
              min={1}
              required
              value={newWakafForm.jumlahMushaf}
              onChange={(e) => setNewWakafForm((p) => ({ ...p, jumlahMushaf: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Niat Atas Nama (Wakaf)</label>
            <Input
              type="text"
              required
              value={newWakafForm.niatList[0]}
              onChange={(e) => setNewWakafForm((p) => ({ ...p, niatList: [e.target.value] }))}
              placeholder="Fulan bin Fulan..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddWakafOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isUploading} className="bg-sky-600 text-white">
              {isUploading ? "Memproses..." : "Kirim Pesanan Wakaf"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
