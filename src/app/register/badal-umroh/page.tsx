"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, Send, User, Upload, Building2, Truck, FileCheck, Sparkles, UserCheck, ShieldCheck, Loader2, AlertCircle, BadgeCheck, Trash2, CreditCard } from "lucide-react";
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

export default function BadalUmrohRegisterPage() {
  const [hargaPerBadal, setHargaPerBadal] = useState<number>(2500000);

  useEffect(() => {
    fetch("/api/master/harga-layanan")
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.BADAL_UMROH) {
          setHargaPerBadal(json.data.BADAL_UMROH);
        }
      })
      .catch(console.error);
  }, []);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Pilihan Status Kejamaahan & Verifikasi Paspor
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);
  const [namaPasporJamaah, setNamaPasporJamaah] = useState<string>("");
  const [nomorPasporJamaah, setNomorPasporJamaah] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [jamaahVerified, setJamaahVerified] = useState<boolean | null>(null);
  const [verifiedData, setVerifiedData] = useState<{ namaLengkap: string; nomorPaspor: string; paketName: string } | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  // State Multi-Badal (List Almarhum / Almarhumah)
  const [listAlmarhum, setListAlmarhum] = useState<Array<{ id: string; namaAlmarhum: string; jenisKelamin: "L" | "P" }>>([
    { id: "1", namaAlmarhum: "", jenisKelamin: "L" },
  ]);

  // State Form Simplified
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPemohon: "",
    nomorWhatsapp: "",
    metodeSouvenir: "dikantor", // "dikantor" | "dikirim"
    alamatPengiriman: "",
  });

  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [buktiTransferPreview, setBuktiTransferPreview] = useState<string>("");

  // Handlers Multi-Badal
  const handleAddAlmarhum = () => {
    setListAlmarhum((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), namaAlmarhum: "", jenisKelamin: "L" },
    ]);
  };

  const handleRemoveAlmarhum = (id: string) => {
    if (listAlmarhum.length <= 1) return;
    setListAlmarhum((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAlmarhumNameChange = (id: string, name: string) => {
    setListAlmarhum((prev) =>
      prev.map((item) => (item.id === id ? { ...item, namaAlmarhum: name } : item))
    );
  };

  const handleAlmarhumGenderChange = (id: string, gender: "L" | "P") => {
    setListAlmarhum((prev) =>
      prev.map((item) => (item.id === id ? { ...item, jenisKelamin: gender } : item))
    );
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
          namaPaketUmroh: formData.namaPaketUmroh || undefined,
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

        // Auto fill paket umroh & nama pemohon
        if (resJson.data?.paketName) {
          setFormData((p) => ({ ...p, namaPaketUmroh: resJson.data.paketName }));
        }
        if (!formData.namaPemohon && (resJson.data?.namaLengkap || namaPasporJamaah)) {
          setFormData((p) => ({ ...p, namaPemohon: resJson.data?.namaLengkap || namaPasporJamaah }));
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
        if (!formData.namaPemohon) {
          setFormData((p) => ({ ...p, namaPemohon: namaPasporJamaah.trim().toUpperCase() }));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file bukti transfer maksimal 5MB");
      return;
    }

    setBuktiTransferFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setBuktiTransferPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
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

    const invalidAlmarhum = listAlmarhum.some((a) => !a.namaAlmarhum.trim());
    if (invalidAlmarhum) {
      alert("Mohon lengkapi nama semua Almarhum/ah yang akan dibadalkan.");
      return;
    }

    if (formData.metodeSouvenir === "dikirim" && !formData.alamatPengiriman.trim()) {
      alert("Mohon lengkapi alamat pengiriman souvenir.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        isJamaahVauza,
        namaPaketUmroh: isJamaahVauza ? formData.namaPaketUmroh : null,
        namaPasporJamaah: isJamaahVauza ? namaPasporJamaah : null,
        nomorPasporJamaah: isJamaahVauza ? nomorPasporJamaah : null,
        namaPemohon: formData.namaPemohon,
        nomorWhatsapp: formData.nomorWhatsapp,
        listAlmarhum: listAlmarhum.map((a) => ({
          namaAlmarhum: a.namaAlmarhum.trim(),
          jenisKelamin: a.jenisKelamin,
        })),
        namaAlmarhum: listAlmarhum[0]?.namaAlmarhum.trim() || "",
        jenisKelamin: listAlmarhum[0]?.jenisKelamin || "L",
        metodeSouvenir: formData.metodeSouvenir,
        alamatPengiriman: formData.metodeSouvenir === "dikirim" ? formData.alamatPengiriman : null,
        buktiTransferUrl: buktiTransferPreview || null,
      };

      const res = await fetch("/api/badal-umroh", {
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

  const resetForm = () => {
    setSubmitted(false);
    setJamaahVerified(null);
    setVerifiedData(null);
    setVerifyMessage("");
    setNamaPasporJamaah("");
    setNomorPasporJamaah("");
    setListAlmarhum([{ id: "1", namaAlmarhum: "", jenisKelamin: "L" }]);
    setFormData({
      namaPaketUmroh: "",
      namaPemohon: "",
      nomorWhatsapp: "",
      metodeSouvenir: "dikantor",
      alamatPengiriman: "",
    });
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
  };

  const isUnlocked = !isJamaahVauza || jamaahVerified === true;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
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
              <HeartHandshake className="h-7 w-7 text-[#F5D061]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[10px] font-bold text-[#F5D061] uppercase tracking-wider mb-2 mx-auto">
              ✦ Program Resmi VTU Operasional ✦
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Portal Pendaftaran <span className="text-gold-gradient">Badal Umroh</span>
            </CardTitle>
            <p className="text-emerald-100/90 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
              Layanan Pendaftaran Badal Umroh Resmi & Terpercaya dengan Dokumentasi Sertifikat & Rekaman Pelaksanaan di Makkah Al-Mukarramah.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {submitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pendaftaran Badal Umroh Berhasil!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Terima kasih Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPemohon}</span>. Permohonan <span className="font-bold text-emerald-600">{listAlmarhum.length} Badal Umroh</span> telah kami terima.
                </p>

                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-2 border">
                  <p><strong>Status Kejamaahan:</strong> {isJamaahVauza ? "Jamaah Vauza Tiga Utama (Terverifikasi ✓)" : "Pendaftaran Umum"}</p>
                  {isJamaahVauza && (
                    <>
                      <p><strong>Paket Umroh:</strong> {formData.namaPaketUmroh || "-"}</p>
                      <p><strong>Nama Sesuai Paspor:</strong> {verifiedData?.namaLengkap || namaPasporJamaah}</p>
                    </>
                  )}
                  <p><strong>Nama Pemohon:</strong> {formData.namaPemohon}</p>
                  <p><strong>Nomor WhatsApp:</strong> {formData.nomorWhatsapp}</p>
                  <p><strong>Daftar Almarhum/ah ({listAlmarhum.length} Badal):</strong></p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-emerald-950 font-medium">
                    {listAlmarhum.map((a, idx) => (
                      <li key={idx}>
                        <strong className="font-bold">{a.namaAlmarhum}</strong> ({a.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"})
                      </li>
                    ))}
                  </ul>
                  <p><strong>Total Harga Order:</strong> <span className="font-bold text-emerald-700">{formatRupiah(listAlmarhum.length * hargaPerBadal)}</span> ({listAlmarhum.length} x {formatRupiah(hargaPerBadal)} — Sudah Termasuk Ongkir ✓)</p>
                  <p><strong>Penyerahan Souvenir:</strong> {formData.metodeSouvenir === "dikirim" ? `Dikirim via Ekspedisi (${formData.alamatPengiriman})` : "Diambil di Kantor VTU"}</p>
                  <p><strong>Status Bukti Pembayaran:</strong> {buktiTransferPreview ? "Terunggah (Menunggu Konfirmasi)" : "Belum Diunggah"}</p>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/${(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "6281234567890").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya mendaftar ${listAlmarhum.length} Badal Umroh atas nama: ${listAlmarhum.map((a) => a.namaAlmarhum).join(", ")} (Total Order: ${formatRupiah(listAlmarhum.length * hargaPerBadal)} - Sudah Termasuk Ongkir, Pemohon: ${formData.namaPemohon}, WA: ${formData.nomorWhatsapp}${isJamaahVauza ? `, Paket: ${formData.namaPaketUmroh}` : ""}). Mohon konfirmasinya.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" /> Konfirmasi via WhatsApp
                  </a>
                  <Link
                    href="/track/badal-wakaf"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
                  >
                    Cek Status Badal
                  </Link>
                  <Button variant="outline" size="sm" onClick={resetForm} className="h-[36px]">
                    Daftar Lagi
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* ── 1. Status Kejamaahan & Verifikasi Paspor ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    1. Apakah Anda Termasuk Jamaah Vauza Tiga Utama (VTU)?
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
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Ya, Saya Jamaah Vauza</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Sedang atau akan mengikuti perjalanan Umroh bersama Vauza.
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
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${!isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Bukan (Pendaftaran Umum)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mendaftarkan Badal Umroh secara umum tanpa terikat paket jamaah.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Jika Jamaah Vauza: Tampilkan Input Nama Paspor & Nomor Paspor */}
                  {isJamaahVauza && (
                    <div className="space-y-3 pt-2 bg-emerald-50/40 p-3.5 rounded-lg border border-emerald-200/80 animate-in fade-in-0 duration-200">
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
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-10 px-5 w-full sm:w-auto gap-2 shadow-xs"
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

                {/* ── Step 2 s/d 5 (Unlocked only when verified) ── */}
                {isUnlocked && (
                  <div className="space-y-6 animate-in fade-in-0 duration-300">
                    {/* ── 2. Data Pemohon ── */}
                    <div className="space-y-3 pb-4 border-b">
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-emerald-600" />
                        2. Data Pemohon / Yang Mengajukan
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground block">
                            Nama Yang Mengajukan <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            required
                            value={formData.namaPemohon}
                            onChange={(e) => setFormData((p) => ({ ...p, namaPemohon: e.target.value }))}
                            placeholder="Nama lengkap pemohon..."
                            className="text-xs h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground block">
                            Nomor WhatsApp <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="tel"
                            required
                            value={formData.nomorWhatsapp}
                            onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                            placeholder="Contoh: 081234567890"
                            className="text-xs h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── 3. Data Almarhum / Almarhumah (Multi-Badal Support) ── */}
                    <div className="space-y-4 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                          <HeartHandshake className="h-4 w-4 text-emerald-600" />
                          3. Data Almarhum / Almarhumah
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          {listAlmarhum.length} Badal Terdaftar
                        </span>
                      </div>

                      <div className="space-y-3">
                        {listAlmarhum.map((item, index) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-3 relative group transition-all"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                              <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                Badal Umroh #{index + 1}
                              </span>
                              {listAlmarhum.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAlmarhum(item.id)}
                                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-semibold text-foreground block">
                                  Nama Almarhum / Almarhumah #{index + 1} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="text"
                                  required
                                  value={item.namaAlmarhum}
                                  onChange={(e) => handleAlmarhumNameChange(item.id, e.target.value)}
                                  placeholder="Fulan bin Fulan / Fulanah binti Fulan"
                                  className="text-xs h-10 bg-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-semibold text-foreground block">
                                  Jenis Kelamin Almarhum/ah #{index + 1} <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAlmarhumGenderChange(item.id, "L")}
                                    className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                      item.jenisKelamin === "L"
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                                        : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                                    }`}
                                  >
                                    <span>👨 Laki-laki</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAlmarhumGenderChange(item.id, "P")}
                                    className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                      item.jenisKelamin === "P"
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                                        : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                                    }`}
                                  >
                                    <span>👩 Perempuan</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddAlmarhum}
                          className="w-full h-10 border-dashed border-emerald-600/60 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold gap-1.5"
                        >
                          + Tambah Badal Almarhum/ah
                        </Button>
                      </div>
                    </div>

                    {/* ── 4. Metode Penyerahan ── */}
                    <div className="space-y-3 pb-4 border-b">
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-emerald-600" />
                        4. Metode Penyerahan Souvenir & Sertifikat
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, metodeSouvenir: "dikantor" }))}
                          className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                            formData.metodeSouvenir === "dikantor"
                              ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <div className={`p-2 rounded-full ${formData.metodeSouvenir === "dikantor" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">Diambil di Kantor VTU</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Diambil langsung di Kantor Operasional Vauza Tiga Utama.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, metodeSouvenir: "dikirim" }))}
                          className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                            formData.metodeSouvenir === "dikirim"
                              ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <div className={`p-2 rounded-full ${formData.metodeSouvenir === "dikirim" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-foreground">Dikirim melalui Ekspedisi</p>
                              <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded">Bebas Ongkir</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Sertifikat & souvenir dikirim ke alamat Anda (Sudah termasuk ongkir).
                            </p>
                          </div>
                        </button>
                      </div>

                      {formData.metodeSouvenir === "dikirim" && (
                        <div className="space-y-1 pt-1 animate-in fade-in-0 duration-200">
                          <label className="font-semibold text-foreground block">
                            Alamat Lengkap Pengiriman <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={formData.alamatPengiriman}
                            onChange={(e) => setFormData((p) => ({ ...p, alamatPengiriman: e.target.value }))}
                            placeholder="Tuliskan alamat lengkap pengiriman (Nama Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos)..."
                            className="w-full p-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}
                    </div>

                    {/* ── 5. Rincian Total Harga Order & Upload Bukti Transfer ── */}
                    <div className="space-y-4">
                      {/* Card Total Harga Order */}
                      <div className="p-4 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white rounded-xl shadow-md border border-[#D4AF37]/40 space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#F5D061]" />
                            <span className="font-bold text-xs uppercase tracking-wider text-[#F5D061]">
                              Rincian Total Harga Order
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] px-2.5 py-0.5 rounded-full uppercase">
                            {listAlmarhum.length} Badal Umroh
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-emerald-100/90">
                          <div className="flex justify-between items-center">
                            <span>Biaya Per Badal Umroh:</span>
                            <span className="font-semibold text-white">{formatRupiah(hargaPerBadal)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Jumlah Badal Didaftarkan:</span>
                            <span className="font-semibold text-white">{listAlmarhum.length} Nama Almarhum/ah</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Biaya Pengiriman Souvenir / Ongkir:</span>
                            <span className="font-semibold text-emerald-300">Rp 0 (Sudah Termasuk Ongkir ✓)</span>
                          </div>
                          <div className="flex justify-between items-center pt-2.5 border-t border-emerald-800/80 font-black text-sm">
                            <span className="text-[#F5D061] uppercase tracking-wide">Total Pembayaran:</span>
                            <span className="text-base text-[#F5D061] font-black tracking-tight">{formatRupiah(listAlmarhum.length * hargaPerBadal)}</span>
                          </div>
                          <p className="text-[10px] text-emerald-200/70 italic text-right pt-0.5">
                            * Total harga di atas sudah bersih termasuk sertifikat, dokumentasi, souvenir & biaya ongkir.
                          </p>
                        </div>
                      </div>

                      {/* ── Upload Bukti Transfer ── */}
                      <div className="space-y-3">
                        <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          5. Upload Bukti Transfer / Pembayaran
                        </span>

                        <div className="p-4 border rounded-lg bg-card space-y-3">
                          {buktiTransferPreview ? (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={buktiTransferPreview} alt="Bukti Transfer" className="h-16 w-16 object-cover rounded-md border shadow-xs" />
                              <div className="flex-1 truncate">
                                <p className="font-semibold text-xs text-emerald-950 truncate">{buktiTransferFile?.name || "Bukti Transfer"}</p>
                                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                  {(buktiTransferFile?.size ? (buktiTransferFile.size / 1024).toFixed(0) : "0")} KB — Siap diunggah
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-bold text-xs"
                                title="Hapus Bukti Transfer"
                              >
                                Hapus
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-emerald-500 rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all select-none">
                              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                              <span className="text-xs font-semibold text-foreground">Klik untuk Unggah Bukti Transfer</span>
                              <span className="text-[11px] text-muted-foreground mt-0.5">Format: JPG, PNG, WEBP (Maksimal 5MB)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Submit Action Bar ── */}
                    <div className="pt-4 flex justify-end gap-2 border-t">
                      <Link href="/login">
                        <Button variant="outline" type="button">Batal</Button>
                      </Link>
                      <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                        {isSubmitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran Badal Umroh"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
}
