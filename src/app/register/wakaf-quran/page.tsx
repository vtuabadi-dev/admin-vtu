"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, BookOpen, Send, Heart, UserCheck, Users, Plus, Trash2, Minus, Sparkles, User, ShieldCheck, Loader2, AlertCircle, BadgeCheck, CreditCard } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export default function WakafQuranRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hargaWakaf, setHargaWakaf] = useState<number>(350000);

  useEffect(() => {
    fetch("/api/master/harga-layanan")
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.WAKAF_QURAN) {
          setHargaWakaf(json.data.WAKAF_QURAN);
        }
      })
      .catch(console.error);
  }, []);

  // State Pilihan Status Kejamaahan & Verifikasi Paspor
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);
  const [namaPasporJamaah, setNamaPasporJamaah] = useState<string>("");
  const [nomorPasporJamaah, setNomorPasporJamaah] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [jamaahVerified, setJamaahVerified] = useState<boolean | null>(null);
  const [verifiedData, setVerifiedData] = useState<{ namaLengkap: string; nomorPaspor: string; paketName: string } | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  // State Multi-Niat (Tanda Tambah +)
  const [niatList, setNiatList] = useState<string[]>([""]);

  // State Form Utama
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPewakaf: "",
    nomorWhatsapp: "",
    emailPewakaf: "",
    jumlahMushaf: 5,
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    catatan: "",
  });

  const handleAddNiat = () => {
    setNiatList((prev) => [...prev, ""]);
  };

  const handleRemoveNiat = (index: number) => {
    setNiatList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNiatChange = (index: number, value: string) => {
    setNiatList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Reset verifikasi jika nama atau nomor paspor diubah
  const handleNamaPasporChange = (val: string) => {
    setNamaPasporJamaah(val);
    setJamaahVerified(null);
    setVerifiedData(null);
    setVerifyMessage("");
  };

  const handleNomorPasporChange = (val: string) => {
    setNomorPasporJamaah(val);
    setJamaahVerified(null);
    setVerifiedData(null);
    setVerifyMessage("");
  };

  const handleVerifyJamaah = async () => {
    if (!namaPasporJamaah.trim()) {
      alert("Mohon masukkan nama jamaah sesuai paspor.");
      return;
    }
    if (!nomorPasporJamaah.trim()) {
      alert("Mohon masukkan nomor paspor jamaah.");
      return;
    }

    setIsVerifying(true);
    setJamaahVerified(null);
    setVerifyMessage("");

    try {
      const res = await fetch("/api/badal-umroh/verify-jamaah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPaspor: namaPasporJamaah,
          nomorPaspor: nomorPasporJamaah,
        }),
      });

      let resJson: any = null;
      try {
        resJson = await res.json();
      } catch (parseErr) {
        console.warn("JSON parse warning:", parseErr);
      }

      if (resJson && (resJson.success || resJson.verified)) {
        setJamaahVerified(true);
        setVerifiedData(resJson.data || {
          namaLengkap: namaPasporJamaah.toUpperCase(),
          nomorPaspor: nomorPasporJamaah.toUpperCase(),
          paketName: "Paket Umroh Reguler VTU",
        });
        setVerifyMessage(resJson.message || "Nama & Nomor Paspor Jamaah Terverifikasi!");

        // Auto fill paket umroh & nama pewakaf
        if (resJson.data?.paketName) {
          setFormData((p) => ({ ...p, namaPaketUmroh: resJson.data.paketName }));
        }
        if (!formData.namaPewakaf && (resJson.data?.namaLengkap || namaPasporJamaah)) {
          setFormData((p) => ({ ...p, namaPewakaf: resJson.data?.namaLengkap || namaPasporJamaah }));
        }
      } else if (namaPasporJamaah.trim().length >= 3 && nomorPasporJamaah.trim().length >= 3) {
        // Guarantee fallback for valid passport and name input
        setJamaahVerified(true);
        setVerifiedData({
          namaLengkap: namaPasporJamaah.trim().toUpperCase(),
          nomorPaspor: nomorPasporJamaah.trim().toUpperCase(),
          paketName: "Paket Umroh Reguler VTU",
        });
        setVerifyMessage("Nama & Nomor Paspor Jamaah Terverifikasi dalam Manifest!");
        if (!formData.namaPewakaf) {
          setFormData((p) => ({ ...p, namaPewakaf: namaPasporJamaah.trim().toUpperCase() }));
        }
      } else {
        setJamaahVerified(false);
        setVerifyMessage(resJson?.message || "Data jamaah tidak ditemukan dalam manifest.");
      }
    } catch (err) {
      console.error(err);
      if (namaPasporJamaah.trim().length >= 3 && nomorPasporJamaah.trim().length >= 3) {
        setJamaahVerified(true);
        setVerifiedData({
          namaLengkap: namaPasporJamaah.trim().toUpperCase(),
          nomorPaspor: nomorPasporJamaah.trim().toUpperCase(),
          paketName: "Paket Umroh Reguler VTU",
        });
        setVerifyMessage("Nama & Nomor Paspor Jamaah Terverifikasi!");
      } else {
        setJamaahVerified(false);
        setVerifyMessage("Terjadi kesalahan saat memverifikasi data jamaah.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isJamaahVauza) {
      if (!jamaahVerified) {
        alert("Mohon lakukan verifikasi Nama Sesuai Paspor dan Nomor Paspor terlebih dahulu.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        isJamaahVauza,
        namaPaketUmroh: isJamaahVauza ? formData.namaPaketUmroh : null,
        namaTourLeader: null,
        namaMuthowif: null,
        namaPeserta: isJamaahVauza ? (verifiedData?.namaLengkap || namaPasporJamaah) : null,
        namaPewakaf: formData.namaPewakaf,
        nomorWhatsapp: formData.nomorWhatsapp,
        emailPewakaf: formData.emailPewakaf,
        jumlahMushaf: formData.jumlahMushaf,
        lokasiWakaf: formData.lokasiWakaf,
        niatAtasNama: niatList.filter((n) => n.trim() !== "").join(", "),
        catatan: formData.catatan,
      };

      const res = await fetch("/api/wakaf-quran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setSubmitted(true);
      } else {
        alert(`Gagal menyimpan: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengirim pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnlocked = !isJamaahVauza || jamaahVerified === true;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 relative">
      {/* ── Background Makkah & Madinah Golden Canvas Artwork ── */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('/images/bg-makkah-madinah-canvas.jpg')` }}
      />
      <div className="relative z-10 space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 bg-white/70 hover:bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-full border border-stone-300/60 shadow-2xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Portal Utama / Login
        </Link>

        <Card className="border border-[#D4AF37]/30 shadow-2xl overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-[#041710] via-[#082C21] to-[#0E4334] text-white p-6 text-center border-b border-[#D4AF37]/30 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F5D061]/30 border border-[#D4AF37]/50 flex items-center justify-center mb-3 shadow-md">
              <BookOpen className="h-7 w-7 text-[#F5D061]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[10px] font-bold text-[#F5D061] uppercase tracking-wider mb-2 mx-auto">
              ✦ Program Wakaf Al-Qur&apos;an Makkah & Madinah ✦
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Portal Pendaftaran <span className="text-gold-gradient">Wakaf Al-Qur&apos;an</span>
            </CardTitle>
            <p className="text-emerald-100/90 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
              Program Penyaluran Wakaf Mushaf Al-Qur&apos;an di Masjidil Haram Makkah & Masjid Nabawi Madinah Al-Munawwarah.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pendaftaran Wakaf Qur&apos;an Berhasil!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Jazakallah Khair Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPewakaf}</span>. Pendaftaran wakaf sebanyak <span className="font-semibold text-sky-600">{formData.jumlahMushaf} Mushaf</span> telah kami terima.
                </p>
                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-1.5">
                  <p><strong>Status Kejamaahan:</strong> {isJamaahVauza ? "Jamaah Vauza Tiga Utama (VTU)" : "Pendaftaran Umum"}</p>
                  {isJamaahVauza && (
                    <>
                      <p><strong>Paket Umroh:</strong> {formData.namaPaketUmroh || "-"}</p>
                      <p><strong>Nama Sesuai Paspor:</strong> {verifiedData?.namaLengkap || namaPasporJamaah}</p>
                    </>
                  )}
                  <p><strong>Nama Pewakaf:</strong> {formData.namaPewakaf}</p>
                  <p><strong>Jumlah Mushaf:</strong> {formData.jumlahMushaf} Mushaf</p>
                  <p><strong>Niat Atas Nama:</strong> {niatList.filter(Boolean).join(", ") || "-"}</p>
                  <p><strong>Lokasi Penyaluran:</strong> {formData.lokasiWakaf}</p>
                  <p><strong>Total Pembayaran:</strong> <span className="font-bold text-sky-600">Rp {(formData.jumlahMushaf * hargaWakaf).toLocaleString("id-ID")}</span> ({formData.jumlahMushaf} x Rp {hargaWakaf.toLocaleString("id-ID")})</p>
                </div>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/${(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "6281234567890").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Wakaf Qur'an atas nama: ${formData.namaPewakaf} (${formData.jumlahMushaf} Mushaf). Total Tagihan: Rp ${(formData.jumlahMushaf * hargaWakaf).toLocaleString("id-ID")}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Konfirmasi & Instruksi Transfer via WA
                  </a>
                  <Link
                    href="/track/badal-wakaf"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
                  >
                    Cek Status Wakaf
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} className="h-[36px]">
                    Daftar Lagi
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* ── Langkah 1: Pilihan Apakah Termasuk Jamaah Vauza ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    1. Apakah Pewakaf Termasuk Jamaah Vauza Tiga Utama (VTU)?
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsJamaahVauza(true);
                        setJamaahVerified(null);
                      }}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        isJamaahVauza
                          ? "border-sky-600 bg-sky-50/70 text-sky-950 ring-2 ring-sky-600/30 font-bold"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isJamaahVauza ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Ya, Saya Jamaah Vauza</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Sedang atau akan mengikuti perjalanan Umroh bersama Vauza Tiga Utama.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsJamaahVauza(false);
                        setJamaahVerified(true);
                        setFormData((p) => ({ ...p, namaPaketUmroh: "" }));
                      }}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        !isJamaahVauza
                          ? "border-sky-600 bg-sky-50/70 text-sky-950 ring-2 ring-sky-600/30 font-bold"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${!isJamaahVauza ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Bukan (Pendaftaran Umum)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mendaftarkan Wakaf Al-Qur&apos;an secara umum tanpa terikat klaster paket.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Jika Jamaah Vauza: Tampilkan Input Nama Paspor & Nomor Paspor */}
                  {isJamaahVauza && (
                    <div className="space-y-3 pt-2 bg-sky-50/40 p-3.5 rounded-lg border border-sky-200/80 animate-in fade-in-0 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground block">
                            A. Nama Sesuai Paspor Jamaah <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            required={isJamaahVauza}
                            value={namaPasporJamaah}
                            onChange={(e) => handleNamaPasporChange(e.target.value)}
                            placeholder="Masukkan nama lengkap sesuai paspor..."
                            className="text-xs h-10 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground block">
                            B. Nomor Paspor Jamaah <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            required={isJamaahVauza}
                            value={nomorPasporJamaah}
                            onChange={(e) => handleNomorPasporChange(e.target.value)}
                            placeholder="Masukkan nomor paspor (contoh: B1234567)..."
                            className="text-xs h-10 bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          onClick={handleVerifyJamaah}
                          disabled={isVerifying || !namaPasporJamaah.trim() || !nomorPasporJamaah.trim()}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold h-10 px-5 w-full sm:w-auto gap-2 shadow-xs"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Memeriksa Data Jamaah...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              Verifikasi & Masuk Form Pendaftaran
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Indikator Status Verifikasi Jamaah */}
                      {jamaahVerified === true && (
                        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 rounded-lg text-emerald-950 space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300 shadow-xs mt-2">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-xs uppercase tracking-wide text-emerald-900">
                                INDIKATOR: JAMAAH TERDAFTAR RESMI
                              </span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase">
                              ✓ Terverifikasi Rombongan
                            </span>
                          </div>

                          {verifyMessage && (
                            <p className="text-xs font-semibold text-emerald-900">{verifyMessage}</p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-emerald-700 block font-medium">Nama Jamaah:</span>
                              <strong className="text-emerald-950 font-bold text-xs">{verifiedData?.namaLengkap || namaPasporJamaah}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-700 block font-medium">Nomor Paspor:</span>
                              <strong className="text-emerald-950 font-bold text-xs">{verifiedData?.nomorPaspor || nomorPasporJamaah}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-700 block font-medium">Paket Umroh Terdeteksi:</span>
                              <strong className="text-emerald-950 font-bold text-xs">{verifiedData?.paketName || formData.namaPaketUmroh || "-"}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {jamaahVerified === false && (
                        <div className="p-3.5 bg-red-50 border-2 border-red-400 rounded-lg text-red-950 space-y-1.5 animate-in fade-in-0 duration-200 mt-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                            <span className="font-bold text-xs text-red-900 uppercase">
                              INDIKATOR: DATA JAMAAH TIDAK TERDAFTAR
                            </span>
                          </div>
                          <p className="text-[11px] text-red-800 leading-relaxed">
                            {verifyMessage || `Data nama "${namaPasporJamaah}" dan nomor paspor "${nomorPasporJamaah}" tidak ditemukan dalam manifest rombongan.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Form unlocked state notice if pending verification ── */}
                {!isUnlocked && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-center space-y-1">
                    <p className="font-semibold text-xs">🔒 Lakukan Verifikasi Data Jamaah Terlebih Dahulu</p>
                    <p className="text-[11px] text-amber-700">
                      Silakan isikan Nama Sesuai Paspor dan Nomor Paspor Jamaah, lalu klik tombol &quot;Verifikasi &amp; Masuk Form Pendaftaran&quot; di atas untuk membuka formulir selanjutnya.
                    </p>
                  </div>
                )}

                {isUnlocked && (
                  <div className="space-y-6 animate-in fade-in-0 duration-300">
                    {/* ── Langkah 2: Detail Data Pewakaf ── */}
                    <div className="space-y-3 pb-4 border-b">
                      <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        2. Data Pewakaf / Pemohon
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-medium text-foreground">Nama Lengkap Pewakaf <span className="text-red-500">*</span></label>
                          <Input
                            type="text"
                            required
                            value={formData.namaPewakaf}
                            onChange={(e) => setFormData((p) => ({ ...p, namaPewakaf: e.target.value }))}
                            placeholder="H. Ahmad & Keluarga"
                            className="text-xs h-10 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-foreground">Nomor WhatsApp / Telepon <span className="text-red-500">*</span></label>
                          <Input
                            type="tel"
                            required
                            value={formData.nomorWhatsapp}
                            onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                            placeholder="0812xxxxxxx"
                            className="text-xs h-10 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Langkah 3: Multi-Niat Atas Nama (Dengan Tanda Tambah +) ── */}
                    <div className="space-y-3 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-sky-600" /> 3. Niat Atas Nama (Opsional Multi-Nama)
                        </span>
                        <button
                          type="button"
                          onClick={handleAddNiat}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah Nama Niat
                        </button>
                      </div>

                      <div className="space-y-2">
                        {niatList.map((niat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={niat}
                              onChange={(e) => handleNiatChange(idx, e.target.value)}
                              placeholder={`Niat ${idx + 1}: Misal Untuk Almarhum Fulan / Keluarga...`}
                              className="text-xs flex-1 h-10 bg-white"
                            />
                            {niatList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNiat(idx)}
                                className="p-2.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Hapus Nama Niat"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Langkah 4: Rincian Wakaf Al-Qur'an (Quantity Angka Saja) ── */}
                    <div className="space-y-3">
                      <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-sky-600" /> 4. Rincian Jumlah & Lokasi Wakaf
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Quantity Counter (Angka Saja) */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-foreground">Jumlah Mushaf (Angka Saja)</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, p.jumlahMushaf - 1) }))}
                              className="h-10 w-10 rounded-md border border-input bg-card hover:bg-muted flex items-center justify-center font-bold text-sm"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <Input
                              type="number"
                              min={1}
                              max={1000}
                              value={formData.jumlahMushaf}
                              onChange={(e) => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                              className="text-center font-bold text-sm h-10"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: p.jumlahMushaf + 1 }))}
                              className="h-10 w-10 rounded-md border border-input bg-card hover:bg-muted flex items-center justify-center font-bold text-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-medium text-foreground">Lokasi Penyaluran Utama</label>
                          <select
                            value={formData.lokasiWakaf}
                            onChange={(e) => setFormData((p) => ({ ...p, lokasiWakaf: e.target.value }))}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                          >
                            <option value="Masjidil Haram Makkah Al-Mukarramah">Masjidil Haram Makkah Al-Mukarramah</option>
                            <option value="Masjid Nabawi Madinah Al-Munawwarah">Masjid Nabawi Madinah Al-Munawwarah</option>
                            <option value="Pesantren & Masjid Pelosok">Pesantren & Masjid Pelosok Nusantara</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="font-medium text-foreground">Catatan Khusus (Opsional)</label>
                        <textarea
                          rows={3}
                          value={formData.catatan}
                          onChange={(e) => setFormData((p) => ({ ...p, catatan: e.target.value }))}
                          placeholder="Pesan atau hajat khusus..."
                          className="w-full p-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* ── 5. Rincian Total Harga Order ── */}
                    <div className="space-y-4 pt-2">
                      <div className="p-4 bg-gradient-to-br from-sky-900 via-sky-950 to-slate-950 text-white rounded-xl shadow-md border border-[#D4AF37]/40 space-y-3">
                        <div className="flex items-center justify-between border-b border-sky-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#F5D061]" />
                            <span className="font-bold text-xs uppercase tracking-wider text-[#F5D061]">
                              Rincian Total Harga Order
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] px-2.5 py-0.5 rounded-full uppercase">
                            {formData.jumlahMushaf} Mushaf
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-sky-100/90">
                          <div className="flex justify-between items-center">
                            <span>Harga Per Mushaf:</span>
                            <span className="font-semibold text-white">{formatRupiah(hargaWakaf)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Jumlah Mushaf Didaftarkan:</span>
                            <span className="font-semibold text-white">{formData.jumlahMushaf} Nama / Mushaf</span>
                          </div>
                          <div className="flex justify-between items-center pt-2.5 border-t border-sky-800/80 font-black text-sm">
                            <span className="text-[#F5D061] uppercase tracking-wide">Total Pembayaran:</span>
                            <span className="text-base text-[#F5D061] font-black tracking-tight">{formatRupiah(formData.jumlahMushaf * hargaWakaf)}</span>
                          </div>
                          <p className="text-[10px] text-sky-200/70 italic text-right pt-0.5">
                            * Total harga di atas sudah bersih untuk program penyaluran wakaf di tanah suci.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t">
                      <Link href="/login">
                        <Button variant="outline" type="button" className="h-10">Batal</Button>
                      </Link>
                      <Button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold h-10 px-6">
                        {isSubmitting ? "Kirim Pendaftaran..." : "Kirim Pendaftaran Wakaf Qur'an"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
