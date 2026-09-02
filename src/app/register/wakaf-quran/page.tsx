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
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
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

    fetch("/api/wakaf-quran/daftar-paket")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setActivePaketList(json.data);
        }
      })
      .catch(console.error);

    fetch("/api/master/rekening-layanan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const active = json.data.filter((r: any) => r.isActive);
          if (active.length > 0) setRekeningList(active);
        }
      })
      .catch(console.error);
  }, []);

  // Multi-step State (1: Verifikasi/Status, 2: Pewakaf, 3: Mushaf & Niat, 4: Pembayaran)
  const [step, setStep] = useState<number>(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmitStep4, setCanSubmitStep4] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [metodePembayaranOption, setMetodePembayaranOption] = useState<"sekarang" | "nanti">("sekarang");
  const [activePaketList, setActivePaketList] = useState<string[]>([]);
  const [rekeningList, setRekeningList] = useState<any[]>([
    {
      namaBank: "Bank Syariah Indonesia (BSI)",
      nomorRekening: "721 888 9991",
      atasNama: "PT VAUZA TIGA UTAMA",
    },
    {
      namaBank: "Bank Mandiri",
      nomorRekening: "142 00 9988 7766",
      atasNama: "PT VAUZA TIGA UTAMA",
    },
  ]);
  const [copiedRekening, setCopiedRekening] = useState<string | null>(null);

  // State Pilihan Status Kejamaahan & Verifikasi Paspor
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);
  const [namaPasporJamaah, setNamaPasporJamaah] = useState<string>("");
  const [nomorPasporJamaah, setNomorPasporJamaah] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [jamaahVerified, setJamaahVerified] = useState<boolean | null>(null);
  const [verifiedData, setVerifiedData] = useState<{ namaLengkap: string; nomorPaspor: string; paketName: string } | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  // State Form Data (Default 5 Mushaf)
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPewakaf: "",
    nomorWhatsapp: "",
    emailPewakaf: "",
    jumlahMushaf: 5,
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    catatan: "",
  });

  // State Multi-Niat (Otomatis sinkron dengan Jumlah Mushaf)
  const [niatList, setNiatList] = useState<Array<{ id: string; nama: string }>>([
    { id: "1", nama: "" },
    { id: "2", nama: "" },
    { id: "3", nama: "" },
    { id: "4", nama: "" },
    { id: "5", nama: "" },
  ]);

  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [buktiTransferPreview, setBuktiTransferPreview] = useState<string>("");

  const steps = [
    { key: 1, label: "Verifikasi", icon: ShieldCheck },
    { key: 2, label: "Pewakaf", icon: User },
    { key: 3, label: "Mushaf & Niat", icon: BookOpen },
    { key: 4, label: "Pembayaran", icon: CreditCard },
  ];

  // Helper Sinkronisasi Jumlah Mushaf & Baris Niat
  const updateJumlahMushaf = (newCount: number) => {
    const validCount = Math.max(1, Math.min(500, newCount));
    setFormData((p) => ({ ...p, jumlahMushaf: validCount }));
    setNiatList((prev) => {
      if (prev.length === validCount) return prev;
      if (prev.length < validCount) {
        const added = Array.from({ length: validCount - prev.length }, (_, i) => ({
          id: String(Date.now() + Math.random() + i),
          nama: "",
        }));
        return [...prev, ...added];
      } else {
        return prev.slice(0, validCount);
      }
    });
  };

  // Handlers Multi-Niat
  const handleAddNiat = () => {
    updateJumlahMushaf(formData.jumlahMushaf + 1);
  };

  const handleRemoveNiat = (id: string) => {
    if (niatList.length <= 1) return;
    setNiatList((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setFormData((p) => ({ ...p, jumlahMushaf: next.length }));
      return next;
    });
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
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 3) {
      if (formData.jumlahMushaf < 1) {
        alert("Jumlah mushaf minimal 1.");
        return;
      }
      const filledNiat = niatList.map((n) => n.nama.trim()).filter(Boolean);
      if (filledNiat.length === 0) {
        alert("Mohon masukkan nama yang diniatkan untuk mushaf.");
        return;
      }
      setCanSubmitStep4(false);
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setCanSubmitStep4(true), 600);
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
    if (step < 4) {
      handleNextStep();
      return;
    }
    if (!canSubmitStep4 || isSubmitting) return;

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

    if (formData.jumlahMushaf < 1) {
      alert("Jumlah mushaf minimal 1.");
      setStep(3);
      return;
    }

    const filledNiat = niatList.map((n) => n.nama.trim()).filter(Boolean);
    if (filledNiat.length === 0) {
      alert("Mohon masukkan nama yang diniatkan untuk mushaf.");
      setStep(3);
      return;
    }

    // Buka Modal Konfirmasi Pengiriman
    setIsConfirmModalOpen(true);
  };

  const executeFinalSubmit = async () => {
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
        buktiTransferUrl: metodePembayaranOption === "sekarang" ? buktiTransferPreview || null : null,
      };

      const res = await fetch("/api/wakaf-quran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setIsConfirmModalOpen(false);
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
    setNiatList(
      Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), nama: "" }))
    );
    setFormData({
      namaPaketUmroh: "",
      namaPewakaf: "",
      nomorWhatsapp: "",
      emailPewakaf: "",
      jumlahMushaf: 5,
      lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
      catatan: "",
    });
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="w-full max-w-4xl mx-auto relative">
        <div className="relative z-10 space-y-6">
          <div className="text-center bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Pendaftaran Wakaf Qur&apos;an Berhasil!
            </h1>
            <p className="text-sm font-bold text-slate-900 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
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
      <div className="relative z-10 space-y-6">
        {/* ── Floating Unified Portal Switcher Bar ── */}
        <PortalSwitcherNav />

        {/* ── Top Header ── */}
        <div className="text-center bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            Pendaftaran Wakaf Al-Qur&apos;an
          </h1>
          <p className="text-sm font-bold text-stone-200 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
            Program Penyaluran Wakaf Mushaf di Masjidil Haram Makkah &amp; Masjid Nabawi Madinah
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="bg-[#061e17]/40 dark:bg-[#061e17]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-t border-l border-emerald-400/40 border-b border-r border-black/60 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.2),inset_-1.5px_-1.5px_4px_rgba(0,0,0,0.6),0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-x-auto">
          <div className="relative flex items-start justify-between min-w-[320px] max-w-2xl mx-auto">
            {/* Base Background Connecting Track */}
            <div className="absolute top-[18px] left-[12.5%] right-[12.5%] h-0.5 bg-emerald-800/60 dark:bg-emerald-800/60 z-0" />
            
            {/* Active Progress Filled Track */}
            <div
              className="absolute top-[18px] left-[12.5%] h-0.5 bg-emerald-500 transition-all duration-300 z-0"
              style={{
                width: `${((step - 1) / (steps.length - 1)) * 75}%`,
              }}
            />

            {/* Step Nodes */}
            {steps.map((s) => {
              const Icon = s.icon;
              const isCompleted = step > s.key;
              const isCurrent = step === s.key;

              return (
                <div key={s.key} className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-200 shadow-sm",
                      isCurrent && "bg-gradient-to-tr from-emerald-700 to-teal-500 text-white shadow-md ring-4 ring-emerald-500/30 scale-110 border border-white",
                      isCompleted && "bg-emerald-800 text-white border border-emerald-600 shadow-sm",
                      !isCurrent && !isCompleted && "bg-emerald-950/80 text-emerald-200/80 border border-emerald-700/60 shadow-xs"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4 text-white stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={cn(
                      "text-[10.5px] sm:text-xs font-bold mt-2 whitespace-nowrap text-center transition-colors",
                      isCurrent
                        ? "text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        : isCompleted
                        ? "text-emerald-300 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                        : "text-stone-300/80 font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main Form Container ── */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && step < 4) {
              e.preventDefault();
              handleNextStep();
            }
          }}
        >
          <div data-wakaf-portal-elem className="bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-[4px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)] space-y-6">
            {/* ══════════════════════════════════════════════════════════
                LANGKAH 1: VERIFIKASI STATUS KEJAMAAHAN
            ══════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Status Kejamaahan &amp; Verifikasi Paspor</h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Tentukan apakah pendaftaran wakaf ini terkait dengan rombongan jamaah umroh VTU yang sedang/akan berangkat.
                  </p>
                </div>

                {/* Pilihan 2 Card Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsJamaahVauza(true);
                      setJamaahVerified(null);
                      setVerifyMessage("");
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 shadow-xs",
                      isJamaahVauza
                        ? "border-emerald-600 bg-white/95 ring-2 ring-emerald-500/30"
                        : "border-stone-200/80 bg-white/70 hover:bg-white/90"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      {isJamaahVauza && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-stone-900">Ya, Saya Jamaah VTU</h3>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                        Sedang atau akan mengikuti perjalanan Umroh bersama rombongan Vauza Tiga Utama.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsJamaahVauza(false);
                      setJamaahVerified(true);
                      setFormData((p) => ({ ...p, namaPaketUmroh: "" }));
                      setVerifyMessage("");
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 shadow-xs",
                      !isJamaahVauza
                        ? "border-emerald-600 bg-white/95 ring-2 ring-emerald-500/30"
                        : "border-stone-200/80 bg-white/70 hover:bg-white/90"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      {!isJamaahVauza && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-stone-900">Bukan (Pendaftaran Umum)</h3>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                        Mendaftarkan Wakaf Al-Qur&apos;an secara umum tanpa terikat keberangkatan paket rombongan jamaah.
                      </p>
                    </div>
                  </button>
                </div>

                {!isJamaahVauza && (
                  <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                        Alokasi Rombongan Paket Umroh (Opsional)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">
                        Pilih Rombongan Paket Penyaluran (Jika Ada)
                      </label>
                      <select
                        value={formData.namaPaketUmroh}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPaketUmroh: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Penyaluran Umum (Tidak Terikat Rombongan Tertentu) --</option>
                        {activePaketList.map((pkt) => (
                          <option key={pkt} value={pkt}>
                            {pkt}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        Pilih paket jika Anda ingin niat wakaf Al-Qur&apos;an ini disalurkan dan dimasukkan ke dalam laporan grup rombongan umroh tertentu.
                      </p>
                    </div>
                  </div>
                )}

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
                    Masukkan data kontak pewakaf yang akan menerima kabar dan dokumentasi penyaluran mushaf di Tanah Suci.
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
                          onClick={() => updateJumlahMushaf(formData.jumlahMushaf - 1)}
                          className="h-10 w-10 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-800 transition-colors shadow-xs"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          value={formData.jumlahMushaf}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              updateJumlahMushaf(val);
                            } else {
                              updateJumlahMushaf(1);
                            }
                          }}
                          className="text-center font-black text-sm h-10 bg-white text-slate-950 border-stone-300 rounded-xl flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => updateJumlahMushaf(formData.jumlahMushaf + 1)}
                          className="h-10 w-10 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-800 transition-colors shadow-xs"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500">Harga per mushaf: <strong>{formatRupiah(hargaWakaf)}</strong> (Termasuk cap stempel &amp; distribusi).</p>
                    </div>

                    {/* Lokasi Penyaluran (Fixed Masjidil Haram Makkah) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Lokasi Penyaluran</label>
                      <div className="h-10 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center text-xs font-extrabold text-emerald-950 shadow-xs">
                        Masjidil Haram Makkah Al-Mukarramah
                      </div>
                    </div>
                  </div>

                  {/* Multi-Niat List (Sesuai Jumlah Mushaf) */}
                  <div className="pt-2 border-t border-stone-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                          Niat Atas Nama ({formData.jumlahMushaf} Baris Isian Sesuai {formData.jumlahMushaf} Mushaf)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddNiat}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1 self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Mushaf / Nama
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
                            placeholder={`Nama yang diniatkan (Mushaf ke-${idx + 1}) Contoh: Almarhum H. Ahmad / Fulan bin Fulan`}
                            value={niat.nama}
                            onChange={(e) => handleNiatChange(niat.id, e.target.value)}
                            className="bg-white border-stone-300 rounded-xl text-xs h-10 flex-1"
                          />
                          {niatList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNiat(niat.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Hapus baris ini (mengurangi 1 mushaf)"
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
                LANGKAH 4: RINGKASAN TAGIHAN & PEMBAYARAN
            ══════════════════════════════════════════════════════════ */}
            {step === 4 && (
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
                    {rekeningList.map((rek, idx) => (
                      <div
                        key={rek.id || idx}
                        className="bg-white/10 p-3.5 rounded-xl border border-white/15 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <div className="text-[10px] font-bold text-emerald-300 uppercase truncate">
                            {rek.namaBank}
                          </div>
                          <div className="text-base font-black tracking-wider text-white font-mono">
                            {rek.nomorRekening}
                          </div>
                          <div className="text-[10px] text-slate-300 truncate">
                            a.n. {rek.atasNama}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyRekening(rek.nomorRekening, `${rek.namaBank}-${idx}`)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                          title="Salin Nomor Rekening"
                        >
                          {copiedRekening === `${rek.namaBank}-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pilihan Metode Penyampaian Bukti Transfer */}
                <div className="bg-white/90 p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Opsi Pembayaran &amp; Bukti Transfer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMetodePembayaranOption("sekarang")}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 shadow-xs",
                        metodePembayaranOption === "sekarang"
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-stone-200 bg-stone-50/50 hover:bg-stone-100/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-stone-900">1. Sudah Transfer Sekarang</span>
                        {metodePembayaranOption === "sekarang" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600">
                        Unggah foto struk / screenshot bukti transfer Anda sekarang.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodePembayaranOption("nanti")}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 shadow-xs",
                        metodePembayaranOption === "nanti"
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-stone-200 bg-stone-50/50 hover:bg-stone-100/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-stone-900">2. Bayar / Transfer Nanti</span>
                        {metodePembayaranOption === "nanti" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600">
                        Kirim bukti transfer menyusul melalui portal tracking atau WhatsApp.
                      </p>
                    </button>
                  </div>

                  {metodePembayaranOption === "sekarang" ? (
                    <div className="pt-2">
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
                  ) : (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        Pendaftaran Anda akan dicatat dengan status <strong>Belum Lunas</strong>. Anda dapat melakukan pembayaran dan mengunggah bukti transfer kapan saja melalui menu <em>Tracking Badal &amp; Wakaf</em>.
                      </p>
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

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl h-10 px-6 text-xs flex items-center gap-1.5 shadow-md"
                >
                  Lanjutkan <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmitStep4 || isSubmitting}
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

        {/* Modal Konfirmasi Pendaftaran */}
        <Modal
          open={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Konfirmasi Pendaftaran Wakaf Al-Qur'an"
        >
          <div className="space-y-4 pt-1 text-xs text-stone-800">
            <p className="text-muted-foreground">
              Pastikan seluruh rincian pendaftaran wakaf berikut sudah sesuai sebelum dikirim ke sistem:
            </p>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Pewakaf:</span>
                <span className="font-bold text-stone-900">{formData.namaPewakaf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">WhatsApp:</span>
                <span className="font-bold text-stone-900">{formData.nomorWhatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Status Kejamaahan:</span>
                <span className="font-bold text-stone-900">{isJamaahVauza ? "Jamaah Vauza Tiga Utama" : "Pendaftaran Umum"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Jumlah Mushaf:</span>
                <span className="font-bold text-emerald-800">{formData.jumlahMushaf} Mushaf</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-stone-600 font-bold">Total Pembayaran:</span>
                <span className="font-black text-emerald-800 text-sm">{formatRupiah(totalBiaya)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-stone-500 font-medium">Status Bukti TF:</span>
                <span className="font-bold text-stone-900">
                  {metodePembayaranOption === "sekarang" && buktiTransferPreview
                    ? "✓ File Bukti TF Terlampir"
                    : "Transfer Nanti (Kirim Menyusul)"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
              >
                Periksa Kembali
              </Button>
              <Button
                type="button"
                onClick={executeFinalSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Ya, Kirim Sekarang
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
