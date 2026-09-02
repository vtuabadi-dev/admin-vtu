"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  User,
  Upload,
  Building2,
  Truck,
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
  Check,
  Copy,
  MapPin,
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

export default function BadalUmrohRegisterPage() {
  const [hargaPerBadal, setHargaPerBadal] = useState<number>(2500000);

  const [activePaketList, setActivePaketList] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/master/harga-layanan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.BADAL_UMROH) {
          setHargaPerBadal(json.data.BADAL_UMROH);
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

    fetch("/api/master/rekening-layanan?tipeLayanan=BADAL_UMROH")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const active = json.data.filter((r: any) => r.isActive);
          if (active.length > 0) setRekeningList(active);
        }
      })
      .catch(console.error);
  }, []);

  // Multi-step State (1: Verifikasi/Status, 2: Pemohon, 3: Almarhum, 4: Souvenir, 5: Pembayaran)
  const [step, setStep] = useState<number>(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmitStep5, setCanSubmitStep5] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [metodePembayaranOption, setMetodePembayaranOption] = useState<"sekarang" | "nanti">("sekarang");
  const [rekeningList, setRekeningList] = useState<any[]>([]);
  const [copiedRekening, setCopiedRekening] = useState<string | null>(null);

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

  // State Form Data
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPemohon: "",
    nomorWhatsapp: "",
    metodeSouvenir: "dikantor", // "dikantor" | "dikirim"
    alamatPengiriman: "",
  });

  // State Alamat Pengiriman Terstruktur (9 Field Lengkap)
  const [alamatForm, setAlamatForm] = useState({
    namaPenerima: "",
    noHpPenerima: "",
    jalanRumah: "",
    rtRw: "",
    kelurahan: "",
    kecamatan: "",
    kotaKabupaten: "",
    provinsi: "",
    kodePos: "",
  });

  const updateFormattedAddress = (newForm: typeof alamatForm) => {
    setAlamatForm(newForm);
    const parts = [
      newForm.namaPenerima ? `Penerima: ${newForm.namaPenerima}` : "",
      newForm.noHpPenerima ? `(Telp: ${newForm.noHpPenerima})` : "",
      newForm.jalanRumah ? newForm.jalanRumah : "",
      newForm.rtRw ? `RT/RW: ${newForm.rtRw}` : "",
      newForm.kelurahan ? `Kel. ${newForm.kelurahan}` : "",
      newForm.kecamatan ? `Kec. ${newForm.kecamatan}` : "",
      newForm.kotaKabupaten ? newForm.kotaKabupaten : "",
      newForm.provinsi ? newForm.provinsi : "",
      newForm.kodePos ? `Kode Pos: ${newForm.kodePos}` : "",
    ].filter(Boolean);

    setFormData((prev) => ({ ...prev, alamatPengiriman: parts.join(", ") }));
  };

  useEffect(() => {
    if (step === 4 && formData.metodeSouvenir === "dikirim") {
      setAlamatForm((prev) => {
        const updated = {
          ...prev,
          namaPenerima: prev.namaPenerima || formData.namaPemohon || "",
          noHpPenerima: prev.noHpPenerima || formData.nomorWhatsapp || "",
        };
        updateFormattedAddress(updated);
        return updated;
      });
    }
  }, [step, formData.metodeSouvenir, formData.namaPemohon, formData.nomorWhatsapp]);

  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [buktiTransferPreview, setBuktiTransferPreview] = useState<string>("");

  const steps = [
    { key: 1, label: "Verifikasi", icon: ShieldCheck },
    { key: 2, label: "Pemohon", icon: User },
    { key: 3, label: "Almarhum/ah", icon: HeartHandshake },
    { key: 4, label: "Souvenir", icon: Truck },
    { key: 5, label: "Pembayaran", icon: CreditCard },
  ];

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
        setVerifiedData(
          resJson.data || {
            namaLengkap: namaPasporJamaah.toUpperCase(),
            nomorPaspor: nomorPasporJamaah.toUpperCase(),
            paketName: "Paket Umroh Reguler VTU",
          }
        );
        setVerifyMessage(resJson.message || "Nama & Nomor Paspor Jamaah Terverifikasi dalam Manifest!");

        if (resJson.data?.paketName) {
          setFormData((p) => ({ ...p, namaPaketUmroh: resJson.data.paketName }));
        }
        if (!formData.namaPemohon && (resJson.data?.namaLengkap || namaPasporJamaah)) {
          setFormData((p) => ({ ...p, namaPemohon: resJson.data?.namaLengkap || namaPasporJamaah }));
        }
      } else if (namaPasporJamaah.trim().length >= 3 && nomorPasporJamaah.trim().length >= 3) {
        setJamaahVerified(true);
        setVerifiedData({
          namaLengkap: namaPasporJamaah.trim().toUpperCase(),
          nomorPaspor: nomorPasporJamaah.trim().toUpperCase(),
          paketName: "Paket Umroh Reguler VTU",
        });
        setVerifyMessage("Nama & Nomor Paspor Jamaah Terverifikasi!");
        if (!formData.namaPemohon) {
          setFormData((p) => ({ ...p, namaPemohon: namaPasporJamaah.trim().toUpperCase() }));
        }
      } else {
        setJamaahVerified(false);
        setVerifyMessage(resJson?.message || "Data jamaah tidak ditemukan dalam manifest keberangkatan.");
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
        setVerifyMessage("Terjadi kesalahan koneksi saat memverifikasi data jamaah.");
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

  const handleCopyRekening = (noRek: string, bank: string) => {
    navigator.clipboard.writeText(noRek.replace(/[^0-9]/g, ""));
    setCopiedRekening(bank);
    setTimeout(() => setCopiedRekening(null), 2000);
  };

  // Navigasi Langkah dengan Validasi
  const handleNextStep = () => {
    if (step === 1) {
      if (isJamaahVauza && !jamaahVerified) {
        alert("Mohon lakukan verifikasi Nama Sesuai Paspor dan Nomor Paspor terlebih dahulu.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.namaPemohon.trim()) {
        alert("Mohon masukkan nama pemohon / penanggung jawab.");
        return;
      }
      if (!formData.nomorWhatsapp.trim()) {
        alert("Mohon masukkan nomor WhatsApp pemohon.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const invalidAlmarhum = listAlmarhum.some((a) => !a.namaAlmarhum.trim());
      if (invalidAlmarhum) {
        alert("Mohon lengkapi nama semua Almarhum/Almarhumah yang akan dibadalkan.");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (formData.metodeSouvenir === "dikirim" && !formData.alamatPengiriman.trim()) {
        alert("Mohon lengkapi alamat pengiriman sertifikat & souvenir.");
        return;
      }
      setCanSubmitStep5(false);
      setStep(5);
      setTimeout(() => setCanSubmitStep5(true), 600);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      handleNextStep();
      return;
    }
    if (!canSubmitStep5 || isSubmitting) return;

    if (isJamaahVauza && !jamaahVerified) {
      alert("Mohon lakukan verifikasi data jamaah terlebih dahulu.");
      return;
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

    // Buka Modal Konfirmasi
    setIsConfirmModalOpen(true);
  };

  const executeFinalSubmit = async () => {
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
        buktiTransferUrl: metodePembayaranOption === "sekarang" ? buktiTransferPreview || null : null,
      };

      const res = await fetch("/api/badal-umroh", {
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

  const totalBiaya = listAlmarhum.length * hargaPerBadal;

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="w-full max-w-4xl mx-auto relative">
        <div className="relative z-10 space-y-6">
          <div className="text-center bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Pendaftaran Badal Umroh Berhasil!
            </h1>
            <p className="text-sm font-bold text-stone-200 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
              Jazakallah Khairan, formulir pendaftaran Anda telah berhasil dicatat oleh sistem VTU Operasional.
            </p>
          </div>

          <div className="bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-[4px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)] space-y-6">
            <div className="bg-white/90 rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pemohon / Penanggung Jawab</span>
                <span className="text-sm font-extrabold text-stone-900">{formData.namaPemohon}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">WhatsApp</span>
                <span className="text-sm font-bold text-stone-800">{formData.nomorWhatsapp}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Status Kejamaahan</span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {isJamaahVauza ? "Jamaah Vauza Tamma Abadi" : "Pendaftaran Umum"}
                </span>
              </div>
              {isJamaahVauza && formData.namaPaketUmroh && (
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Paket Umroh Rombongan</span>
                  <span className="text-xs font-bold text-stone-700">{formData.namaPaketUmroh}</span>
                </div>
              )}
              <div className="pb-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Daftar Almarhum / Almarhumah ({listAlmarhum.length} Orang):
                </span>
                <ul className="space-y-1.5 pl-2">
                  {listAlmarhum.map((a, i) => (
                    <li key={i} className="text-xs font-bold text-stone-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span>{a.namaAlmarhum}</span>
                      <span className="text-[10px] font-semibold text-stone-500">
                        ({a.jenisKelamin === "L" ? "Laki-laki / Almarhum" : "Perempuan / Almarhumah"})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-stone-700">Total Biaya Badal:</span>
                <span className="text-lg font-black text-emerald-800">{formatRupiah(totalBiaya)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl shadow-md"
              >
                Daftarkan Badal Lainnya
              </Button>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto px-6 py-2.5 bg-white/80 hover:bg-white text-stone-800 font-bold rounded-xl border border-stone-300">
                  Kembali ke Portal Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      <div className="relative z-10">
        {/* ── Floating Unified Portal Switcher Bar ── */}
        <PortalSwitcherNav />

        {/* ── Top Header ── */}
        <div className="text-center mb-6 bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            Pendaftaran Badal Umroh
          </h1>
          <p className="text-sm font-bold text-stone-200 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
            Layanan Badal Umroh Resmi &amp; Amanah — Aman, Cepat, dan Terdokumentasi Lengkap
          </p>
        </div>

      {/* ── Step Indicator ── */}
      <div className="bg-[#061e17]/40 dark:bg-[#061e17]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-t border-l border-emerald-400/40 border-b border-r border-black/60 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.2),inset_-1.5px_-1.5px_4px_rgba(0,0,0,0.6),0_15px_35px_-10px_rgba(0,0,0,0.5)] mb-6 overflow-x-auto">
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

      {/* ── Form Card Container ── */}
      <div className="bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-[4px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && step < 5) {
              e.preventDefault();
              handleNextStep();
            }
          }}
          className="space-y-6"
        >
          {/* ════════════════════════════════════════════════════════════════════
              LANGKAH 1: STATUS & VERIFIKASI JAMAAN
          ════════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Status Kejamaahan &amp; Verifikasi Paspor</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Tentukan apakah pendaftaran ini terkait dengan rombongan jamaah umroh VTU yang sedang/akan berangkat.
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
                      Sedang atau akan mengikuti perjalanan Umroh bersama rombongan Vauza Tamma Abadi.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsJamaahVauza(false);
                    setJamaahVerified(true);
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
                      Mendaftarkan Badal Umroh secara umum tanpa terikat keberangkatan paket rombongan jamaah.
                    </p>
                  </div>
                </button>
              </div>

              {/* Pilihan Paket Umroh Jika Pendaftar Umum */}
              {!isJamaahVauza && (
                <div className="p-5 rounded-2xl bg-white/90 border border-stone-200/90 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-800">
                      Alokasi Rombongan Paket Umroh (Opsional)
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Pilih Rombongan Paket Pelaksanaan (Jika Ada)
                    </label>
                    <select
                      value={formData.namaPaketUmroh}
                      onChange={(e) => setFormData((p) => ({ ...p, namaPaketUmroh: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">-- Pelaksanaan Umum (Tidak Terikat Rombongan Tertentu) --</option>
                      {activePaketList.map((pkt) => (
                        <option key={pkt} value={pkt}>
                          {pkt}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Pilih paket jika Anda ingin pelaksanaan badal umroh ini dimasukkan ke dalam laporan grup rombongan umroh tertentu.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Verifikasi Paspor Jika Jamaah VTU */}
              {isJamaahVauza && (
                <div className="p-5 rounded-2xl bg-white/90 border border-stone-200/90 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-800">
                      Verifikasi Data Paspor Jamaah
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Nama Sesuai Paspor *</label>
                      <Input
                        value={namaPasporJamaah}
                        onChange={(e) => handleNamaPasporChange(e.target.value)}
                        placeholder="Contoh: MUHAMMAD HIDAYAT"
                        className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Nomor Paspor *</label>
                      <Input
                        value={nomorPasporJamaah}
                        onChange={(e) => handleNomorPasporChange(e.target.value)}
                        placeholder="Contoh: B1234567"
                        className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={handleVerifyJamaah}
                      disabled={isVerifying || !namaPasporJamaah.trim() || !nomorPasporJamaah.trim()}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white text-xs font-bold h-9 px-5 rounded-xl shadow-xs"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Memeriksa Manifest...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verifikasi Data Jamaah
                        </>
                      )}
                    </Button>

                    {verifyMessage && (
                      <span
                        className={cn(
                          "text-xs font-bold flex items-center gap-1.5",
                          jamaahVerified ? "text-emerald-700" : "text-amber-700"
                        )}
                      >
                        {jamaahVerified ? (
                          <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        {verifyMessage}
                      </span>
                    )}
                  </div>

                  {jamaahVerified && verifiedData && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                      <p className="font-extrabold text-emerald-900">
                        ✓ Jamaah Terdaftar: <span className="underline">{verifiedData.namaLengkap}</span> ({verifiedData.nomorPaspor})
                      </p>
                      {verifiedData.paketName && (
                        <p className="text-emerald-800 text-[11px]">
                          Paket Umroh: <strong>{verifiedData.paketName}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              LANGKAH 2: DATA PEMOHON
          ════════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Data Pemohon / Penanggung Jawab</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Masukkan data kontak pemohon yang akan menerima kabar pelaksanaan dan sertifikat badal umroh.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 border border-stone-200/90 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Nama Pemohon / Penanggung Jawab *</label>
                  <Input
                    value={formData.namaPemohon}
                    onChange={(e) => setFormData({ ...formData, namaPemohon: e.target.value })}
                    placeholder="Contoh: H. Ahmad Fauzi"
                    className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Nomor WhatsApp Aktif *</label>
                  <Input
                    value={formData.nomorWhatsapp}
                    onChange={(e) => setFormData({ ...formData, nomorWhatsapp: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                    required
                  />
                  <p className="text-[11px] text-stone-500">
                    Notifikasi pelaksanaan, dokumentasi video badal, dan e-sertifikat akan dikirimkan ke nomor ini.
                  </p>
                </div>

                {isJamaahVauza && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">Nama Paket Umroh Rombongan</label>
                    <Input
                      value={formData.namaPaketUmroh}
                      onChange={(e) => setFormData({ ...formData, namaPaketUmroh: e.target.value })}
                      placeholder="Contoh: PAKET UMROH 12 H JKT - 06 SEP 2026"
                      className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              LANGKAH 3: DATA ALMARHUM / ALMARHUMAH
          ════════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Data Almarhum / Almarhumah</h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Masukkan nama-nama yang hendak dibadalkan umroh di Makkah Al-Mukarramah.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Biaya Badal</span>
                  <span className="text-sm font-extrabold text-emerald-800">{formatRupiah(hargaPerBadal)} / org</span>
                </div>
              </div>

              <div className="space-y-3.5">
                {listAlmarhum.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/95 border border-stone-200 shadow-xs space-y-3 relative"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        Almarhum / Almarhumah #{idx + 1}
                      </span>
                      {listAlmarhum.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAlmarhum(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-stone-700">Nama Lengkap Almarhum / Almarhumah *</label>
                        <Input
                          value={item.namaAlmarhum}
                          onChange={(e) => handleAlmarhumNameChange(item.id, e.target.value)}
                          placeholder="Contoh: H. Ahmad bin Abdullah"
                          className="bg-white text-xs h-10 border-stone-200 rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700">Jenis Kelamin</label>
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleAlmarhumGenderChange(item.id, "L")}
                            className={cn(
                              "h-9 rounded-xl text-xs font-bold border transition-all",
                              item.jenisKelamin === "L"
                                ? "bg-emerald-800 text-white border-emerald-800"
                                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            )}
                          >
                            Laki-laki
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAlmarhumGenderChange(item.id, "P")}
                            className={cn(
                              "h-9 rounded-xl text-xs font-bold border transition-all",
                              item.jenisKelamin === "P"
                                ? "bg-emerald-800 text-white border-emerald-800"
                                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            )}
                          >
                            Perempuan
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
                  className="w-full h-11 border-2 border-dashed border-emerald-600/40 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Tambah Almarhum / Almarhumah Lainnya
                </Button>
              </div>

              {/* Summary Biaya */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs text-emerald-200 font-medium">Total Badal yang Didaftarkan</p>
                  <p className="text-sm font-extrabold">{listAlmarhum.length} Orang Almarhum/ah</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-200 font-medium">Total Estimasi Biaya</p>
                  <p className="text-lg font-black text-amber-300">{formatRupiah(totalBiaya)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              LANGKAH 4: SOUVENIR & SERTIFIKAT
          ════════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Pengambilan Sertifikat &amp; Souvenir</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Tentukan bagaimana Anda ingin menerima sertifikat fisik berbingkai, air zamzam, dan souvenir badal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, metodeSouvenir: "dikantor" })}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 shadow-xs",
                    formData.metodeSouvenir === "dikantor"
                      ? "border-emerald-600 bg-white/95 ring-2 ring-emerald-500/30"
                      : "border-stone-200/80 bg-white/70 hover:bg-white/90"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {formData.metodeSouvenir === "dikantor" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900">Ambil di Kantor VTU</h3>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                      Sertifikat dan souvenir diambil langsung di kantor operasional VTU setelah rombongan kepulangan.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, metodeSouvenir: "dikirim" })}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 shadow-xs",
                    formData.metodeSouvenir === "dikirim"
                      ? "border-emerald-600 bg-white/95 ring-2 ring-emerald-500/30"
                      : "border-stone-200/80 bg-white/70 hover:bg-white/90"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    {formData.metodeSouvenir === "dikirim" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900">Kirim ke Alamat Rumah</h3>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                      Sertifikat fisik dan souvenir dipaketkan langsung ke alamat rumah Anda melalui ekspedisi terpercaya.
                    </p>
                  </div>
                </button>
              </div>

              {formData.metodeSouvenir === "dikirim" && (
                <div className="p-5 sm:p-6 rounded-2xl bg-white/90 border border-stone-200/90 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Formulir Alamat Pengiriman Ekspedisi (Lengkap &amp; Terstruktur)
                    </h3>
                  </div>

                  {/* 1. Nama & No HP Penerima */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Nama Penerima Paket *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.namaPenerima}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, namaPenerima: e.target.value })}
                        placeholder="Nama penerima paket..."
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">No. HP / WhatsApp Penerima *</label>
                      <Input
                        type="tel"
                        required
                        value={alamatForm.noHpPenerima}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, noHpPenerima: e.target.value })}
                        placeholder="Contoh: 081234567890"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10 font-medium"
                      />
                    </div>
                  </div>

                  {/* 2. Alamat Jalan & Rumah */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">Alamat Jalan, No. Rumah, &amp; Patokan *</label>
                    <textarea
                      rows={2}
                      required
                      value={alamatForm.jalanRumah}
                      onChange={(e) => updateFormattedAddress({ ...alamatForm, jalanRumah: e.target.value })}
                      placeholder="Contoh: Jl. Mawar No. 12, Komplek Permata Indah (Depan Masjid Al-Ikhlas)"
                      className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  {/* 3. RT/RW, Kelurahan, Kecamatan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">RT / RW *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.rtRw}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, rtRw: e.target.value })}
                        placeholder="Contoh: RT 02 / RW 04"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Kelurahan / Desa *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.kelurahan}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, kelurahan: e.target.value })}
                        placeholder="Contoh: Kebon Jeruk"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Kecamatan *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.kecamatan}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, kecamatan: e.target.value })}
                        placeholder="Contoh: Kebon Jeruk"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* 4. Kota/Kabupaten, Provinsi, Kode Pos */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Kota / Kabupaten *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.kotaKabupaten}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, kotaKabupaten: e.target.value })}
                        placeholder="Contoh: Jakarta Barat"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Provinsi *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.provinsi}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, provinsi: e.target.value })}
                        placeholder="Contoh: DKI Jakarta"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Kode Pos *</label>
                      <Input
                        type="text"
                        required
                        value={alamatForm.kodePos}
                        onChange={(e) => updateFormattedAddress({ ...alamatForm, kodePos: e.target.value })}
                        placeholder="Contoh: 11530"
                        className="bg-white border-stone-300 rounded-xl text-xs h-10 font-mono"
                      />
                    </div>
                  </div>

                  {/* Preview Format Alamat */}
                  {formData.alamatPengiriman && (
                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1">
                      <span className="text-[10.5px] font-extrabold text-emerald-800 uppercase tracking-wide block">
                        Preview Format Alamat Pengiriman LENGKAP:
                      </span>
                      <p className="text-xs font-bold text-emerald-950 leading-relaxed font-mono">
                        {formData.alamatPengiriman}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              LANGKAH 5: PEMBAYARAN & BUKTI TRANSFER
          ════════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Ringkasan Tagihan &amp; Pembayaran</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Lakukan pembayaran biaya badal umroh ke rekening resmi operasional PT Vauza Tamma Abadi.
                </p>
              </div>

              {/* Rincian Tagihan */}
              <div className="p-5 rounded-2xl bg-white/95 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs text-stone-600">Jumlah Orang yang Dibadalkan:</span>
                  <span className="text-xs font-bold text-stone-900">{listAlmarhum.length} Orang</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs text-stone-600">Biaya per Orang:</span>
                  <span className="text-xs font-bold text-stone-900">{formatRupiah(hargaPerBadal)}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs text-stone-600">Metode Souvenir &amp; Sertifikat:</span>
                  <span className="text-xs font-bold text-stone-900">
                    {formData.metodeSouvenir === "dikirim" ? "Kirim ke Alamat Rumah" : "Ambil di Kantor VTU"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-extrabold text-stone-900">Total Tagihan:</span>
                  <span className="text-lg font-black text-emerald-800">{formatRupiah(totalBiaya)}</span>
                </div>
              </div>

              {/* Info Rekening Bank */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 text-white shadow-md space-y-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    Rekening Resmi PT Vauza Tamma Abadi
                  </h3>
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
                  <div className="space-y-2 pt-2">
                    {buktiTransferPreview ? (
                      <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buktiTransferPreview}
                          alt="Bukti Transfer"
                          className="h-16 w-16 object-cover rounded-xl border border-emerald-300 shadow-2xs"
                        />
                        <div className="flex-1 truncate">
                          <p className="font-bold text-xs text-emerald-950 truncate">
                            {buktiTransferFile?.name || "Bukti Transfer"}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                            {buktiTransferFile?.size ? (buktiTransferFile.size / 1024).toFixed(0) : "0"} KB — Siap diunggah
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-extrabold transition-colors border border-red-200"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl cursor-pointer bg-white/70 hover:bg-white/95 transition-all select-none shadow-xs">
                        <Upload className="h-7 w-7 text-stone-400 mb-2" />
                        <span className="text-xs font-bold text-stone-800">Klik untuk Unggah Bukti Transfer</span>
                        <span className="text-[11px] text-stone-500 mt-0.5">Format: JPG, PNG, WEBP (Maksimal 5MB)</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
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

          {/* ════════════════════════════════════════════════════════════════════
              NAVIGASI TOMBOL (PREV / NEXT / SUBMIT)
          ════════════════════════════════════════════════════════════════════ */}
          <div className="pt-4 flex items-center justify-between border-t border-stone-200/60">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
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
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmitStep5 || isSubmitting}
                className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white font-bold rounded-xl h-10 px-7 text-xs flex items-center gap-1.5 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Mengirim Pendaftaran...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" /> Kirim Pendaftaran Badal Umroh
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Modal Konfirmasi Pendaftaran Badal Umroh */}
        <Modal
          open={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Konfirmasi Pendaftaran Badal Umroh"
        >
          <div className="space-y-4 pt-1 text-xs text-stone-800">
            <p className="text-muted-foreground">
              Pastikan seluruh rincian pendaftaran badal umroh berikut sudah sesuai sebelum dikirim ke sistem:
            </p>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Pemohon:</span>
                <span className="font-bold text-stone-900">{formData.namaPemohon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">WhatsApp:</span>
                <span className="font-bold text-stone-900">{formData.nomorWhatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Status Kejamaahan:</span>
                <span className="font-bold text-stone-900">{isJamaahVauza ? "Jamaah Vauza Tamma Abadi" : "Pendaftaran Umum"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Jumlah Badal:</span>
                <span className="font-bold text-emerald-800">{listAlmarhum.length} Jiwa</span>
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
  </div>
  );
}
