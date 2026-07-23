"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, KeyRound, Phone, HeartHandshake, BookOpen, Clock, ExternalLink, Download, Sparkles, AlertCircle, Upload, CheckCircle2, Plus, Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";

export default function TrackBadalWakafPage() {
  const [step, setStep] = useState<"phone" | "otp" | "data">("phone");
  const [nomorWhatsapp, setNomorWhatsapp] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [waLink, setWaLink] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [resultData, setResultData] = useState<{
    badalList: any[];
    wakafList: any[];
    totalFound: number;
  }>({ badalList: [], wakafList: [], totalFound: 0 });

  const [activeTab, setActiveTab] = useState<"badal" | "wakaf">("badal");

  // Modal Upload Bukti & Form Tambah Wakaf
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

  // Step 1: Kirim Kode OTP WA
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!nomorWhatsapp) {
      setErrorMsg("Mohon masukkan nomor WhatsApp Anda.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorWhatsapp }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoCode(data.code);
        setWaLink(data.waLink);
        setSuccessMsg(data.message);
        setStep("otp");
      } else {
        setErrorMsg(data.message || "Gagal mengirim OTP");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan koneksi saat mengirim OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verifikasi OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg("Mohon masukkan 6 digit kode OTP yang benar.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorWhatsapp, code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        setResultData(data.data);
        setStep("data");
      } else {
        setErrorMsg(data.message || "Kode OTP salah atau kadaluarsa.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat verifikasi OTP.");
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
        // Refresh data
        const verifyRes = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorWhatsapp, code: otpCode }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.success) setResultData(verifyJson.data);
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
        namaTourLeader: firstItem?.namaTourLeader || null,
        namaMuthowif: firstItem?.namaMuthowif || null,
        namaPeserta: firstItem?.namaPeserta || firstItem?.namaPemohon || "Jamaah",
        namaPewakaf: firstItem?.namaPewakaf || firstItem?.namaPemohon || "Jamaah",
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
        const verifyRes = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorWhatsapp, code: otpCode }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.success) setResultData(verifyJson.data);
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
            <CardTitle className="text-xl font-bold">Portal Cek Status & Pembayaran Badal Umroh / Wakaf</CardTitle>
            <p className="text-emerald-100 text-xs mt-1">
              Verifikasi Kode OTP WA untuk Membuka Riwayat Order, Upload Bukti Pembayaran, & Cek Dokumen.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── STEP 1: Minta Nomor WA ── */}
            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-4 text-xs max-w-md mx-auto py-4">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm text-foreground">Langkah 1: Masukkan Nomor WhatsApp</h3>
                  <p className="text-muted-foreground text-xs">
                    Kode OTP 6-digit akan dikirimkan ke WhatsApp Anda untuk verifikasi privasi data.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" /> Nomor WhatsApp Pendaftar
                  </label>
                  <Input
                    type="tel"
                    required
                    value={nomorWhatsapp}
                    onChange={(e) => setNomorWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="text-sm font-semibold tracking-wider"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5"
                >
                  {loading ? "Mengirim OTP..." : "Kirim Kode OTP WA"}
                </Button>
              </form>
            )}

            {/* ── STEP 2: Verifikasi Kode OTP ── */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs max-w-md mx-auto py-4">
                <div className="text-center space-y-1">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Langkah 2: Masukkan 6 Digit Kode OTP</h3>
                  <p className="text-muted-foreground text-xs">
                    Kode OTP dikirim ke nomor WA <span className="font-semibold text-emerald-600">{nomorWhatsapp}</span>.
                  </p>
                </div>

                {successMsg && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium text-xs text-center">{successMsg}</p>
                )}
                {demoCode && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-200 text-center text-xs space-y-1">
                    <p className="font-semibold flex items-center justify-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Kode OTP WA Anda: <span className="text-base font-black tracking-widest text-amber-900 dark:text-amber-100">{demoCode}</span>
                    </p>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline pt-0.5"
                      >
                        Buka Notifikasi WhatsApp <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <label className="font-medium text-foreground text-center block">Kode OTP 6 Digit</label>
                  <Input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="4 8 2 9 1 0"
                    className="text-center font-mono font-black text-xl tracking-widest h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5"
                  >
                    {loading ? "Verifikasi OTP..." : "Verifikasi OTP & Buka Data Saya"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="w-full text-center text-xs text-muted-foreground hover:underline pt-1"
                  >
                    Ubah Nomor WhatsApp
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Tampilkan Data Terverifikasi & Upload Bukti ── */}
            {step === "data" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" /> OTP WA Terverifikasi
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      Data Terdaftar (+{nomorWhatsapp})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAddWakafOpen(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs"
                    >
                      <Plus className="h-4 w-4" /> Tambah Order Wakaf
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setStep("phone")}>
                      Keluar
                    </Button>
                  </div>
                </div>

                {resultData.totalFound === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
                    <h4 className="font-bold text-sm text-foreground">Belum Ada Data Pendaftaran Ditemukan</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Nomor WhatsApp {nomorWhatsapp} belum terdaftar pada sistem Badal Umroh maupun Wakaf Al-Qur&apos;an.
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <Link href="/register/badal-umroh">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Daftar Badal Umroh</Button>
                      </Link>
                      <Link href="/register/wakaf-quran">
                        <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">Daftar Wakaf Qur&apos;an</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b mb-4">
                      <button
                        onClick={() => setActiveTab("badal")}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                          activeTab === "badal"
                            ? "border-emerald-600 text-emerald-600"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <HeartHandshake className="h-4 w-4" /> Badal Umroh ({resultData.badalList.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("wakaf")}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                          activeTab === "wakaf"
                            ? "border-sky-600 text-sky-600"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BookOpen className="h-4 w-4" /> Wakaf Al-Qur&apos;an ({resultData.wakafList.length})
                      </button>
                    </div>

                    {/* Content Badal */}
                    {activeTab === "badal" && (
                      <div className="space-y-4">
                        {resultData.badalList.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">Tidak ada pendaftaran Badal Umroh pada nomor ini.</p>
                        ) : (
                          resultData.badalList.map((item) => (
                            <div key={item.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{item.namaAlmarhum}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {item.jenisKelamin === "L" ? "Almarhum (Laki-laki)" : "Almarhumah (Perempuan)"} — {item.hubungan}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={
                                    item.paymentStatus === "Lunas" ? "bg-emerald-600 text-white" :
                                    item.paymentStatus === "Menunggu Konfirmasi" ? "bg-amber-500 text-white" : "bg-rose-600 text-white"
                                  }>
                                    Status Bayar: {item.paymentStatus || "Belum Bayar"}
                                  </Badge>
                                  <Badge variant="outline">{item.status}</Badge>
                                </div>
                              </div>

                              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <p className="text-muted-foreground">Pendaftar / Pemohon:</p>
                                  <p className="font-semibold text-foreground">{item.namaPeserta || item.namaPemohon}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Paket Badal:</p>
                                  <p className="font-semibold text-foreground">{item.paketBadal}</p>
                                </div>
                                {item.isJamaahVauza && (
                                  <div className="sm:col-span-2 pt-1 border-t border-border">
                                    <p className="text-muted-foreground">Info Klaster Jamaah Vauza:</p>
                                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                                      {item.namaPaketUmroh} (TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"})
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Upload Bukti Bayar / Action Links */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                                {item.paymentStatus !== "Lunas" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTarget({ type: "badal", id: item.id });
                                      setUploadModalOpen(true);
                                    }}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                                  >
                                    <Upload className="h-3.5 w-3.5" /> Upload Bukti Pembayaran
                                  </Button>
                                )}

                                {item.sertifikatUrl && (
                                  <a
                                    href={item.sertifikatUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 transition-colors"
                                  >
                                    <Download className="h-3.5 w-3.5" /> Download Sertifikat
                                  </a>
                                )}

                                {item.videoUrl && (
                                  <a
                                    href={item.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Putar Video Execution
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Content Wakaf */}
                    {activeTab === "wakaf" && (
                      <div className="space-y-4">
                        {resultData.wakafList.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">Tidak ada pendaftaran Wakaf Qur&apos;an pada nomor ini.</p>
                        ) : (
                          resultData.wakafList.map((item) => (
                            <div key={item.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-sm text-sky-700 dark:text-sky-400">{item.jumlahMushaf} Mushaf Al-Qur&apos;an</h4>
                                  <p className="text-xs text-muted-foreground">{item.lokasiWakaf}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={
                                    item.paymentStatus === "Lunas" ? "bg-emerald-600 text-white" :
                                    item.paymentStatus === "Menunggu Konfirmasi" ? "bg-amber-500 text-white" : "bg-rose-600 text-white"
                                  }>
                                    Status Bayar: {item.paymentStatus || "Belum Bayar"}
                                  </Badge>
                                  <Badge variant="outline">{item.status}</Badge>
                                </div>
                              </div>

                              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <p className="text-muted-foreground">Pewakaf:</p>
                                  <p className="font-semibold text-foreground">{item.namaPeserta || item.namaPewakaf}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Niat Atas Nama:</p>
                                  <p className="font-semibold text-foreground">{item.niatAtasNama || "-"}</p>
                                </div>
                                {item.isJamaahVauza && (
                                  <div className="sm:col-span-2 pt-1 border-t border-border">
                                    <p className="text-muted-foreground">Info Klaster Jamaah Vauza:</p>
                                    <p className="font-semibold text-sky-700 dark:text-sky-300">
                                      {item.namaPaketUmroh} (TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"})
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Upload Bukti & Action Links */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                                {item.paymentStatus !== "Lunas" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTarget({ type: "wakaf", id: item.id });
                                      setUploadModalOpen(true);
                                    }}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                                  >
                                    <Upload className="h-3.5 w-3.5" /> Upload Bukti Pembayaran
                                  </Button>
                                )}

                                {item.fotoPenyerahanUrl && (
                                  <a
                                    href={item.fotoPenyerahanUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-md hover:bg-sky-700 transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Lihat Foto Penyerahan Wakaf
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── MODAL UPLOAD BUKTI PEMBAYARAN ── */}
      <Modal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Bukti Pembayaran">
        <form onSubmit={handleUploadBuktiSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Tempel URL / Link Foto Bukti Transfer</label>
            <Input
              type="url"
              required
              value={buktiUrlInput}
              onChange={(e) => setBuktiUrlInput(e.target.value)}
              placeholder="https://image-cloud.com/bukti-transfer.jpg"
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Unggah foto bukti struk/transfer Anda ke cloud image (seperti ImgBB/Google Drive) lalu tempelkan linknya di sini.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isUploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isUploading ? "Mengunggah..." : "Kirim Bukti Pembayaran"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL TAMBAH ORDER WAKAF BARU ── */}
      <Modal open={addWakafOpen} onClose={() => setAddWakafOpen(false)} title="Tambah Pesanan Wakaf Al-Qur'an Baru">
        <form onSubmit={handleCreateNewWakaf} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Jumlah Mushaf (Angka Saja)</label>
            <Input
              type="number"
              min={1}
              required
              value={newWakafForm.jumlahMushaf}
              onChange={(e) => setNewWakafForm((p) => ({ ...p, jumlahMushaf: parseInt(e.target.value, 10) || 1 }))}
              className="font-bold text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Lokasi Penyaluran</label>
            <select
              value={newWakafForm.lokasiWakaf}
              onChange={(e) => setNewWakafForm((p) => ({ ...p, lokasiWakaf: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="Masjidil Haram Makkah Al-Mukarramah">Masjidil Haram Makkah Al-Mukarramah</option>
              <option value="Masjid Nabawi Madinah Al-Munawwarah">Masjid Nabawi Madinah Al-Munawwarah</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Niat Atas Nama (Pisahkan dengan koma jika lebih dari satu)</label>
            <Input
              type="text"
              placeholder="Contoh: Alm. H. Ahmad, Hj. Fatimah, Keluarga Besar Sugianto"
              onChange={(e) => setNewWakafForm((p) => ({ ...p, niatList: e.target.value.split(",") }))}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddWakafOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isUploading} className="bg-sky-600 hover:bg-sky-700 text-white">
              {isUploading ? "Memproses..." : "Tambah Order Wakaf"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
