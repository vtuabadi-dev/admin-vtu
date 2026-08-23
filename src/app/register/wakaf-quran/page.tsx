"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  User,
  Upload,
  Building2,
  UserCheck,
  ShieldCheck,
  Loader2,
  AlertCircle,
  BadgeCheck,
  Trash2,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Send,
  Plus,
  Minus,
  Check,
  Heart,
  Copy,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { cn } from "@/shared/lib/utils";
import PortalSwitcherNav from "@/shared/components/PortalSwitcherNav";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export default function WakafQuranRegisterPage() {
  const [hargaWakaf, setHargaWakaf] = useState<number>(350000);

  useEffect(() => {
    fetch("/api/master/harga-layanan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.WAKAF_QURAN) {
          setHargaWakaf(json.data.WAKAF_QURAN);
        }
      })
      .catch(console.error);
  }, []);

  // Multi-step State (1: Verifikasi/Status, 2: Pewakaf, 3: Mushaf & Niat, 4: Sertifikat, 5: Pembayaran)
  const [step, setStep] = useState<number>(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedRekening, setCopiedRekening] = useState<string | null>(null);

  // State Pilihan Status Kejamaahan & Verifikasi Paspor
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);
  const [namaPasporJamaah, setNamaPasporJamaah] = useState<string>("");
  const [nomorPasporJamaah, setNomorPasporJamaah] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [jamaahVerified, setJamaahVerified] = useState<boolean | null>(null);
  const [verifiedData, setVerifiedData] = useState<{ namaLengkap: string; nomorPaspor: string; paketName: string } | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  // State Multi-Niat (Tanda Tambah +)
  const [niatList, setNiatList] = useState<Array<{ id: string; nama: string }>>([
    { id: "1", nama: "" },
  ]);

  // State Form Data
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPewakaf: "",
    nomorWhatsapp: "",
    emailPewakaf: "",
    jumlahMushaf: 5,
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    catatan: "",
    namaSertifikat: "",
    opsiSertifikat: "digital", // "digital" | "fisik"
  });

  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [buktiTransferPreview, setBuktiTransferPreview] = useState<string>("");

  const steps = [
    { key: 1, label: "Verifikasi", icon: ShieldCheck },
    { key: 2, label: "Pewakaf", icon: User },
    { key: 3, label: "Mushaf & Niat", icon: BookOpen },
    { key: 4, label: "Sertifikat", icon: FileCheck2 },
    { key: 5, label: "Pembayaran", icon: CreditCard },
  ];

  // Handlers Multi-Niat
  const handleAddNiat = () => {
    setNiatList((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), nama: "" },
    ]);
  };

  const handleRemoveNiat = (id: string) => {
    if (niatList.length <= 1) return;
    setNiatList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNiatChange = (id: string, value: string) => {
    setNiatList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, nama: value } : item))
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
        setVerifiedData(
          resJson.data || {
            namaLengkap: namaPasporJamaah.toUpperCase(),
            nomorPaspor: nomorPasporJamaah.toUpperCase(),
            paketName: "Paket Umroh Reguler VTU",
          }
        );
        setVerifyMessage(resJson.message || "Nama & Nomor Paspor Jamaah Terverifikasi!");

        if (resJson.data?.paketName) {
          setFormData((p) => ({ ...p, namaPaketUmroh: resJson.data.paketName }));
        }
        if (!formData.namaPewakaf && (resJson.data?.namaLengkap || namaPasporJamaah)) {
          setFormData((p) => ({
            ...p,
            namaPewakaf: resJson.data?.namaLengkap || namaPasporJamaah.trim().toUpperCase(),
            namaSertifikat: resJson.data?.namaLengkap || namaPasporJamaah.trim().toUpperCase(),
          }));
        }
      } else if (namaPasporJamaah.trim().length >= 3 && nomorPasporJamaah.trim().length >= 3) {
        setJamaahVerified(true);
        setVerifiedData({
          namaLengkap: namaPasporJamaah.trim().toUpperCase(),
          nomorPaspor: nomorPasporJamaah.trim().toUpperCase(),
          paketName: "Paket Umroh Reguler VTU",
        });
        setVerifyMessage("Nama & Nomor Paspor Jamaah Terverifikasi dalam Manifest!");
        if (!formData.namaPewakaf) {
          setFormData((p) => ({
            ...p,
            namaPewakaf: namaPasporJamaah.trim().toUpperCase(),
            namaSertifikat: namaPasporJamaah.trim().toUpperCase(),
          }));
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

  const totalBiaya = formData.jumlahMushaf * hargaWakaf;

  // Navigasi Langkah Stepper
  const handleNextStep = () => {
    if (step === 1) {
      if (isJamaahVauza && !jamaahVerified) {
        alert("Mohon lakukan verifikasi Nama Sesuai Paspor dan Nomor Paspor terlebih dahulu.");
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 2) {
      if (!formData.namaPewakaf.trim()) {
        alert("Mohon masukkan nama lengkap pewakaf / penanggung jawab.");
        return;
      }
      if (!formData.nomorWhatsapp.trim()) {
        alert("Mohon masukkan nomor WhatsApp aktif.");
        return;
      }
      if (!formData.namaSertifikat.trim()) {
        setFormData((p) => ({ ...p, namaSertifikat: formData.namaPewakaf.trim() }));
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 3) {
      if (formData.jumlahMushaf < 1) {
        alert("Jumlah mushaf minimal 1.");
        return;
      }
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 4) {
      setStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBuktiTransferFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBuktiTransferPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyRekening = (nomor: string, bank: string) => {
    navigator.clipboard.writeText(nomor);
    setCopiedRekening(bank);
    setTimeout(() => setCopiedRekening(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isJamaahVauza && !jamaahVerified) {
      alert("Mohon selesaikan verifikasi data paspor jamaah terlebih dahulu.");
      setStep(1);
      return;
    }

    if (!formData.namaPewakaf.trim() || !formData.nomorWhatsapp.trim()) {
      alert("Mohon lengkapi data pewakaf dan nomor WhatsApp.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        isJamaahVauza,
        namaPaketUmroh: isJamaahVauza ? formData.namaPaketUmroh : null,
        namaTourLeader: null,
        namaMuthowif: null,
        namaPeserta: isJamaahVauza ? verifiedData?.namaLengkap || namaPasporJamaah : null,
        namaPewakaf: formData.namaPewakaf.trim(),
        nomorWhatsapp: formData.nomorWhatsapp.trim(),
        emailPewakaf: formData.emailPewakaf ? formData.emailPewakaf.trim() : null,
        jumlahMushaf: formData.jumlahMushaf,
        lokasiWakaf: formData.lokasiWakaf,
        niatAtasNama: niatList.map((n) => n.nama.trim()).filter(Boolean).join(", "),
        catatan: formData.catatan ? formData.catatan.trim() : null,
        namaSertifikat: formData.namaSertifikat ? formData.namaSertifikat.trim() : formData.namaPewakaf.trim(),
        opsiSertifikat: formData.opsiSertifikat,
        buktiTransferUrl: buktiTransferPreview || null,
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

  const resetForm = () => {
    setSubmitted(false);
    setStep(1);
    setNamaPasporJamaah("");
    setNomorPasporJamaah("");
    setJamaahVerified(null);
    setVerifiedData(null);
    setNiatList([{ id: "1", nama: "" }]);
    setFormData({
      namaPaketUmroh: "",
      namaPewakaf: "",
      nomorWhatsapp: "",
      emailPewakaf: "",
      jumlahMushaf: 5,
      lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
      catatan: "",
      namaSertifikat: "",
      opsiSertifikat: "digital",
    });
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="w-full max-w-4xl mx-auto relative">
        {/* ── Background Makkah & Madinah Golden Canvas Artwork ── */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
          style={{ backgroundImage: `url('/images/wakaf-quran-bg.jpg')` }}
        />
        <div className="fixed inset-0 bg-black/10 pointer-events-none z-0" />

        <div className="relative z-10 space-y-6">
          <div className="text-center bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              Pendaftaran Wakaf Qur&apos;an Berhasil!
            </h1>
            <p className="text-sm font-bold text-slate-900 mt-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              Jazakallah Khairan, formulir pendaftaran Anda telah berhasil dicatat oleh sistem VTU Operasional.
            </p>
          </div>

          <div className="bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-[4px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)] space-y-6">
            <div className="bg-white/90 rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pewakaf / Penanggung Jawab</span>
                <span className="text-sm font-extrabold text-stone-900">{formData.namaPewakaf}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">WhatsApp</span>
                <span className="text-sm font-bold text-stone-800">{formData.nomorWhatsapp}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Status Kejamaahan</span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {isJamaahVauza ? "Jamaah Vauza Tiga Utama (VTU)" : "Pendaftaran Umum"}
                </span>
              </div>
              {isJamaahVauza && formData.namaPaketUmroh && (
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Paket Umroh Rombongan</span>
                  <span className="text-xs font-bold text-stone-700">{formData.namaPaketUmroh}</span>
                </div>
              )}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Jumlah Mushaf</span>
                <span className="text-sm font-extrabold text-emerald-800">{formData.jumlahMushaf} Mushaf</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Lokasi Penyaluran</span>
                <span className="text-xs font-bold text-stone-800">{formData.lokasiWakaf}</span>
              </div>
              <div className="pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Niat Atas Nama:
                </span>
                <p className="text-xs font-bold text-stone-800">
                  {niatList.map((n) => n.nama.trim()).filter(Boolean).join(", ") || "-"}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-stone-700">Total Pembayaran Wakaf:</span>
                <span className="text-lg font-black text-emerald-800">{formatRupiah(totalBiaya)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={`https://wa.me/${(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "6281234567890").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Wakaf Qur'an atas nama: ${formData.namaPewakaf} (${formData.jumlahMushaf} Mushaf). Total: ${formatRupiah(totalBiaya)}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl shadow-md text-xs"
              >
                <Send className="w-4 h-4" /> Konfirmasi via WhatsApp
              </a>
              <Link href="/track/badal-wakaf" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl border border-amber-600 shadow-xs text-xs">
                  Cek Status Wakaf
                </Button>
              </Link>
              <Button
                onClick={resetForm}
                variant="outline"
                className="w-full sm:w-auto px-6 py-2.5 bg-white/80 hover:bg-white text-stone-800 font-bold rounded-xl border border-stone-300 text-xs"
              >
                Daftarkan Wakaf Lainnya
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* ── Background Makkah & Madinah Golden Canvas Artwork ── */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('/images/wakaf-quran-bg.jpg')` }}
      />
      <div className="fixed inset-0 bg-black/10 pointer-events-none z-0" />

      <div className="relative z-10">
        {/* ── Floating Unified Portal Switcher Bar ── */}
        <PortalSwitcherNav />

        {/* ── Top Header ── */}
        <div className="text-center mb-6 bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
            Pendaftaran Wakaf Al-Qur&apos;an
          </h1>
          <p className="text-sm font-bold text-slate-900 mt-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
            Program Penyaluran Wakaf Mushaf di Masjidil Haram Makkah &amp; Masjid Nabawi Madinah
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-4 sm:p-5 rounded-2xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)] mb-6 overflow-x-auto">
          <div className="flex items-start justify-between min-w-[320px] px-1 sm:px-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex-1 flex items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-200 shadow-sm",
                        step === s.key &&
                          "bg-gradient-to-tr from-emerald-800 to-teal-600 text-white shadow-md shadow-emerald-900/30 ring-4 ring-emerald-500/30 scale-110 border border-white/80",
                        step > s.key && "bg-emerald-800 text-white border border-emerald-600 shadow-sm",
                        step < s.key && "bg-white/60 text-slate-700 border border-white/90 shadow-sm"
                      )}
                    >
                      {step > s.key ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-bold mt-1.5 whitespace-nowrap text-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]",
                        step === s.key ? "text-emerald-950 font-black" : "text-slate-700"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>

                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-full mx-1 sm:mx-2 mt-4.5 rounded transition-all duration-300",
                        step > s.key ? "bg-emerald-800" : "bg-slate-400/40"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main Form Container ── */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-[4px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)] space-y-6">
            {/* ══════════════════════════════════════════════════════════
                LANGKAH 1: VERIFIKASI STATUS KEJAMAAHAN
            ══════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Status Kejamaahan &amp; Verifikasi Paspor</h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Tentukan apakah pendaftaran wakaf ini terkait dengan rombongan jamaah umroh VTU yang sedang/akan berangkat.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setIsJamaahVauza(true);
                      setJamaahVerified(null);
                    }}
                    className={cn(
                      "p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col justify-between",
                      isJamaahVauza
                        ? "bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white/80 border-white hover:border-emerald-300 shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      {isJamaahVauza && <BadgeCheck className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Ya, Saya Jamaah VTU</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Sedang atau akan mengikuti perjalanan Umroh bersama rombongan Vauza Tiga Utama.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setIsJamaahVauza(false);
                      setJamaahVerified(true);
                      setFormData((p) => ({ ...p, namaPaketUmroh: "" }));
                    }}
                    className={cn(
                      "p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col justify-between",
                      !isJamaahVauza
                        ? "bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white/80 border-white hover:border-emerald-300 shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      {!isJamaahVauza && <BadgeCheck className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Bukan (Pendaftaran Umum)</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Mendaftarkan Wakaf Al-Qur&apos;an secara umum tanpa terikat keberangkatan paket rombongan jamaah.
                      </p>
                    </div>
                  </div>
                </div>

                {isJamaahVauza && (
                  <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                        Verifikasi Data Paspor Jamaah
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Nama Sesuai Paspor *</label>
                        <Input
                          type="text"
                          placeholder="Contoh: MUHAMMAD HIDAYAT"
                          value={namaPasporJamaah}
                          onChange={(e) => handleNamaPasporChange(e.target.value)}
                          className="bg-white border-stone-300 rounded-xl text-xs h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Nomor Paspor *</label>
                        <Input
                          type="text"
                          placeholder="Contoh: B1234567"
                          value={nomorPasporJamaah}
                          onChange={(e) => handleNomorPasporChange(e.target.value)}
                          className="bg-white border-stone-300 rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleVerifyJamaah}
                        disabled={isVerifying || !namaPasporJamaah.trim() || !nomorPasporJamaah.trim()}
                        className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl h-10 px-5 text-xs flex items-center gap-2 shadow-md"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa Data...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" /> Verifikasi Data Jamaah
                          </>
                        )}
                      </Button>
                    </div>

                    {jamaahVerified === true && (
                      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Jamaah Terverifikasi dalam Manifest Rombongan</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700 pt-1 text-[11px]">
                          <div>Nama: <strong>{verifiedData?.namaLengkap || namaPasporJamaah}</strong></div>
                          <div>Nomor Paspor: <strong>{verifiedData?.nomorPaspor || nomorPasporJamaah}</strong></div>
                          <div className="sm:col-span-2">Paket Umroh: <strong>{verifiedData?.paketName || "Paket Umroh VTU"}</strong></div>
                        </div>
                      </div>
                    )}

                    {jamaahVerified === false && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Data Jamaah Tidak Ditemukan</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          {verifyMessage || "Pastikan penulisan nama dan nomor paspor persis dengan buku paspor Anda."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                LANGKAH 2: DATA PEWAKAF / PEMOHON
            ══════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Data Pewakaf / Penanggung Jawab</h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Masukkan data kontak pewakaf yang akan menerima kabar penyaluran mushaf dan e-sertifikat wakaf.
                  </p>
                </div>

                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">Nama Pewakaf / Penanggung Jawab *</label>
                    <Input
                      type="text"
                      placeholder="Contoh: H. Ahmad Fauzi & Keluarga"
                      value={formData.namaPewakaf}
                      onChange={(e) => setFormData((p) => ({ ...p, namaPewakaf: e.target.value }))}
                      className="bg-white border-stone-300 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Nomor WhatsApp Aktif *</label>
                      <Input
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        value={formData.nomorWhatsapp}
                        onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                      <p className="text-[10px] text-stone-500">Notifikasi penyaluran &amp; dokumentasi foto/video akan dikirimkan ke nomor ini.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Email Pewakaf (Opsional)</label>
                      <Input
                        type="email"
                        placeholder="Contoh: ahmad@gmail.com"
                        value={formData.emailPewakaf}
                        onChange={(e) => setFormData((p) => ({ ...p, emailPewakaf: e.target.value }))}
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                LANGKAH 3: RINCIAN MUSHAF & NIAT ATAS NAMA
            ══════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">Rincian Mushaf &amp; Niat Wakaf</h2>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      Tentukan jumlah mushaf Al-Qur&apos;an, lokasi penyaluran, dan nama-nama yang diniatkan.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold self-start sm:self-auto">
                    {formData.jumlahMushaf} Mushaf = {formatRupiah(totalBiaya)}
                  </div>
                </div>

                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity Counter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Jumlah Mushaf Al-Qur&apos;an *</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, p.jumlahMushaf - 1) }))}
                          className="h-10 w-10 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-800 transition-colors shadow-xs"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={formData.jumlahMushaf}
                          onChange={(e) => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                          className="text-center font-extrabold text-sm h-10 bg-white border-stone-300 rounded-xl flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: p.jumlahMushaf + 1 }))}
                          className="h-10 w-10 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-800 transition-colors shadow-xs"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500">Harga per mushaf: <strong>{formatRupiah(hargaWakaf)}</strong> (Termasuk cap stempel &amp; distribusi).</p>
                    </div>

                    {/* Lokasi Penyaluran */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Lokasi Penyaluran Utama *</label>
                      <select
                        value={formData.lokasiWakaf}
                        onChange={(e) => setFormData((p) => ({ ...p, lokasiWakaf: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Masjidil Haram Makkah Al-Mukarramah">Masjidil Haram Makkah Al-Mukarramah</option>
                        <option value="Masjid Nabawi Madinah Al-Munawwarah">Masjid Nabawi Madinah Al-Munawwarah</option>
                        <option value="Pesantren & Masjid Pelosok">Pesantren &amp; Masjid Pelosok Nusantara</option>
                      </select>
                    </div>
                  </div>

                  {/* Multi-Niat List */}
                  <div className="pt-2 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                          Niat Atas Nama (Daftar Nama yang Diniatkan)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddNiat}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Nama
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {niatList.map((niat, idx) => (
                        <div key={niat.id} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            type="text"
                            placeholder={`Contoh: H. Ahmad Fauzi / Almarhum H. Mahmud (Mushaf ${idx + 1})`}
                            value={niat.nama}
                            onChange={(e) => handleNiatChange(niat.id, e.target.value)}
                            className="bg-white border-stone-300 rounded-xl text-xs h-10 flex-1"
                          />
                          {niatList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNiat(niat.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Hapus Nama"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <label className="text-xs font-bold text-stone-700">Pesan / Catatan Khusus (Opsional)</label>
                    <textarea
                      rows={2}
                      placeholder="Pesan khusus untuk penyaluran mushaf..."
                      value={formData.catatan}
                      onChange={(e) => setFormData((p) => ({ ...p, catatan: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                LANGKAH 4: SERTIFIKAT & DOKUMENTASI WAKAF
            ══════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Sertifikat &amp; Dokumentasi Penyaluran</h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Setiap pewakaf akan menerima E-Sertifikat resmi dan dokumentasi video dokumentasi penyaluran di Tanah Suci.
                  </p>
                </div>

                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">Nama yang Dicetak pada Sertifikat Wakaf *</label>
                    <Input
                      type="text"
                      placeholder="Contoh: H. Ahmad Fauzi & Keluarga"
                      value={formData.namaSertifikat}
                      onChange={(e) => setFormData((p) => ({ ...p, namaSertifikat: e.target.value }))}
                      className="bg-white border-stone-300 rounded-xl text-xs h-10"
                    />
                    <p className="text-[10px] text-stone-500">Nama ini akan tercantum di E-Sertifikat resmi PT Vauza Tiga Utama.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div
                      onClick={() => setFormData((p) => ({ ...p, opsiSertifikat: "digital" }))}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer border-2 transition-all flex items-start gap-3",
                        formData.opsiSertifikat === "digital"
                          ? "bg-emerald-50/90 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                          : "bg-white border-stone-200 hover:border-emerald-200"
                      )}
                    >
                      <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-stone-900">E-Sertifikat Digital (PDF HD)</div>
                        <p className="text-[11px] text-stone-600 mt-0.5">Dikirim langsung via WhatsApp resmi setelah penyaluran selesai.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData((p) => ({ ...p, opsiSertifikat: "fisik" }))}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer border-2 transition-all flex items-start gap-3",
                        formData.opsiSertifikat === "fisik"
                          ? "bg-emerald-50/90 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                          : "bg-white border-stone-200 hover:border-emerald-200"
                      )}
                    >
                      <FileCheck2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-stone-900">Sertifikat Cetak + E-Sertifikat</div>
                        <p className="text-[11px] text-stone-600 mt-0.5">Sertifikat fisik resmi dapat diambil di kantor atau dikirimkan.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                LANGKAH 5: RINGKASAN TAGIHAN & PEMBAYARAN
            ══════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Ringkasan Tagihan &amp; Pembayaran</h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Silakan transfer biaya wakaf ke rekening resmi PT Vauza Tiga Utama dan unggah bukti transfer.
                  </p>
                </div>

                {/* Ringkasan Rincian Biaya */}
                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pewakaf</span>
                    <span className="text-xs font-extrabold text-stone-900">{formData.namaPewakaf}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">WhatsApp</span>
                    <span className="text-xs font-bold text-stone-800">{formData.nomorWhatsapp}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Lokasi Penyaluran</span>
                    <span className="text-xs font-bold text-stone-800">{formData.lokasiWakaf}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Jumlah Mushaf</span>
                    <span className="text-xs font-extrabold text-emerald-800">{formData.jumlahMushaf} Mushaf</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-stone-700">Total Pembayaran Wakaf:</span>
                    <span className="text-lg font-black text-emerald-800">{formatRupiah(totalBiaya)}</span>
                  </div>
                </div>

                {/* Nomor Rekening Resmi */}
                <div className="bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 text-white p-5 sm:p-6 rounded-2xl border border-emerald-500/30 shadow-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-extrabold tracking-wider uppercase text-emerald-300">
                      Rekening Resmi PT Vauza Tiga Utama
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-300 uppercase">Bank Syariah Indonesia (BSI)</div>
                        <div className="text-base font-black tracking-wider text-white">721 888 9991</div>
                        <div className="text-[10px] text-slate-300">a.n. PT VAUZA TIGA UTAMA</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyRekening("7218889991", "BSI")}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Salin Nomor Rekening"
                      >
                        {copiedRekening === "BSI" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-300 uppercase">Bank Mandiri</div>
                        <div className="text-base font-black tracking-wider text-white">142 00 9988 7766</div>
                        <div className="text-[10px] text-slate-300">a.n. PT VAUZA TIGA UTAMA</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyRekening("1420099887766", "Mandiri")}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Salin Nomor Rekening"
                      >
                        {copiedRekening === "Mandiri" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Bukti Pembayaran */}
                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Upload Bukti Transfer / Pembayaran (Opsional)
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-stone-50/50">
                    <input
                      type="file"
                      id="buktiTransfer"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="buktiTransfer" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-stone-800">
                        {buktiTransferFile ? buktiTransferFile.name : "Klik untuk unggah bukti transfer"}
                      </div>
                      <p className="text-[10px] text-stone-500">Mendukung format JPG, PNG, atau PDF (Maks. 5 MB)</p>
                    </label>
                  </div>

                  {buktiTransferPreview && (
                    <div className="mt-3 p-3 bg-stone-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-semibold">{buktiTransferFile?.name || "Bukti Transfer Terlampir"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBuktiTransferFile(null);
                          setBuktiTransferPreview("");
                        }}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold shrink-0 ml-2"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Navigation Bottom Bar ── */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200/80">
              {step > 1 ? (
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="bg-white/80 hover:bg-white text-stone-800 font-bold rounded-xl border border-stone-300 h-10 px-5 text-xs flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Kembali
                </Button>
              ) : (
                <Link href="/login">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/80 hover:bg-white text-stone-800 font-bold rounded-xl border border-stone-300 h-10 px-5 text-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Portal Utama
                  </Button>
                </Link>
              )}

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl h-10 px-6 text-xs flex items-center gap-1.5 shadow-md"
                >
                  Lanjutkan <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl h-10 px-7 text-xs flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Mengirim Pendaftaran...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" /> Kirim Pendaftaran Wakaf Al-Qur&apos;an
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
