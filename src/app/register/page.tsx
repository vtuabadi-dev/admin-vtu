"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Phone,
  Mail,
  FileText,
  Users,
  Package,
  PenTool,
  ClipboardCheck,
  Upload,
  X,
  Loader2,
  UserPlus,
  Minus,
  Plus,
  AlertTriangle,
} from "lucide-react";
import type { JenisKelamin, Keberangkatan } from "@/shared/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Konfigurasi jumlah jamaah — ubah di sini jika kebijakan berubah
const MIN_GROUP_SIZE = 1;
const MAX_GROUP_SIZE = 100;
const LARGE_GROUP_THRESHOLD = 30;
const VERY_LARGE_GROUP_THRESHOLD = 60;

interface MemberForm {
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  hubungan: string;
}

export default function RegisterPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Representative data
  const [namaPerwakilan, setNamaPerwakilan] = useState("");
  const [nomorTelepon, setNomorTelepon] = useState("");
  const [emailPerwakilan, setEmailPerwakilan] = useState("");

  // Step 2: Terms (4 mandatory checkboxes) — fetched dynamically
  const [termsDoc, setTermsDoc] = useState<{ title: string; content: string; version: string } | null>(null);
  const [termsVersion, setTermsVersion] = useState("");
  const [termsSyarat, setTermsSyarat] = useState(false);
  const [termsPembayaran, setTermsPembayaran] = useState(false);
  const [termsPembatalan, setTermsPembatalan] = useState(false);
  const [termsData, setTermsData] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  // Step 3: PAX count
  const [paxCount, setPaxCount] = useState(1);

  // Step 4: Members
  const [members, setMembers] = useState<MemberForm[]>([
    { namaLengkap: "", jenisKelamin: "L", hubungan: "" },
  ]);

  // Step 5: Package
  const [paketList, setPaketList] = useState<Keberangkatan[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [roomUpgrade, setRoomUpgrade] = useState("");
  const [hotelUpgrade, setHotelUpgrade] = useState("");
  const [loadingPaket, setLoadingPaket] = useState(false);

  // Step 6: Signature
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Step 7: Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    kodeRegistrasi?: string;
    message?: string;
  } | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load packages on mount
  useEffect(() => {
    const loadPaket = async () => {
      setLoadingPaket(true);
      try {
        const res = await fetch("/api/keberangkatan");
        const data = await res.json();
        if (data.success) setPaketList(data.data ?? []);
      } catch {
        // Will show empty state
      } finally {
        setLoadingPaket(false);
      }
    };
    loadPaket();
  }, []);

  // Load active Terms & Conditions from CMS
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const res = await fetch("/api/operational-documents?type=TERMS_CONDITIONS");
        const data = await res.json();
        if (data.success && data.data) {
          setTermsDoc(data.data);
          setTermsVersion(data.data.version ?? "1.0");
        }
      } catch {
        // Fallback: no terms loaded, will use empty state
      }
    };
    loadTerms();
  }, []);

  // Sync members when paxCount changes
  useEffect(() => {
    setMembers((prev) => {
      if (prev.length === paxCount) return prev;
      if (prev.length < paxCount) {
        const added = Array.from({ length: paxCount - prev.length }, () => ({
          namaLengkap: "",
          jenisKelamin: "L" as JenisKelamin,
          hubungan: "",
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, paxCount);
    });
  }, [paxCount]);

  const updateMember = (index: number, field: keyof MemberForm, value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  // Validation per step
  const validateStep = useCallback((s: Step): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!namaPerwakilan.trim()) errs.namaPerwakilan = "Nama perwakilan wajib diisi";
      if (!nomorTelepon.trim()) errs.nomorTelepon = "Nomor telepon wajib diisi";
      if (!emailPerwakilan.trim()) errs.emailPerwakilan = "Email wajib diisi";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPerwakilan)) errs.emailPerwakilan = "Format email tidak valid";
    }

    if (s === 2) {
      if (!termsSyarat || !termsPembayaran || !termsPembatalan || !termsData) {
        errs.terms = "Anda harus menyetujui seluruh syarat & ketentuan";
      }
    }

    if (s === 3) {
      if (!paxCount || paxCount < MIN_GROUP_SIZE) errs.paxCount = `Jumlah minimal ${MIN_GROUP_SIZE} jamaah`;
      else if (paxCount > MAX_GROUP_SIZE) errs.paxCount = `Jumlah maksimal ${MAX_GROUP_SIZE} jamaah per pendaftaran`;
    }

    if (s === 4) {
      members.forEach((m, i) => {
        if (!m.namaLengkap.trim()) errs[`member_${i}_nama`] = "Nama wajib diisi";
      });
    }

    if (s === 5) {
      if (!selectedPaketId) errs.paket = "Paket keberangkatan wajib dipilih";
    }

    if (s === 6) {
      if (!signaturePath && !signatureFile) errs.signature = "Tanda tangan wajib diunggah";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [namaPerwakilan, nomorTelepon, emailPerwakilan, termsSyarat, termsPembayaran, termsPembatalan, termsData, members, selectedPaketId, signaturePath, signatureFile]);

  const nextStep = () => {
    if (validateStep(step)) {
      // Record terms acceptance timestamp when leaving step 2
      if (step === 2 && !termsAcceptedAt) {
        setTermsAcceptedAt(new Date().toISOString());
      }
      setStep((s) => Math.min(7, s + 1) as Step);
    }
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1) as Step);

  // Handle signature upload
  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setUploadError("Hanya file PNG, JPG, atau JPEG yang diizinkan");
      return;
    }

    if (file.size > 100 * 1024) {
      setUploadError("Tanda tangan terlalu besar. Maksimal 100 KB.");
      return;
    }

    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));

    // Upload immediately
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/register/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setSignaturePath(data.data.storagePath);
        setSignedAt(new Date().toISOString());
      } else {
        setUploadError(data.message ?? "Upload gagal");
        setSignatureFile(null);
        setSignaturePreview("");
      }
    } catch {
      setUploadError("Upload gagal. Periksa koneksi Anda.");
      setSignatureFile(null);
      setSignaturePreview("");
    } finally {
      setUploading(false);
    }
  };

  const clearSignature = () => {
    setSignatureFile(null);
    setSignaturePreview("");
    setSignaturePath("");
    setUploadError("");
  };

  // Submit registration
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPerwakilan,
          nomorTelepon,
          emailPerwakilan,
          termsAccepted: termsSyarat && termsPembayaran && termsPembatalan && termsData,
          termsSyarat,
          termsPembayaran,
          termsPembatalan,
          termsData,
          termsAcceptedAt,
          termsVersion,
          paxCount,
          members: members.map((m) => ({
            namaLengkap: m.namaLengkap,
            jenisKelamin: m.jenisKelamin,
            hubungan: m.hubungan || undefined,
          })),
          paketId: selectedPaketId,
          roomUpgrade: roomUpgrade || undefined,
          hotelUpgrade: hotelUpgrade || undefined,
          signaturePath,
          signedAt,
        }),
      });

      const data = await res.json();
      setSubmitResult(data);
    } catch {
      setSubmitResult({ success: false, message: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step labels
  const steps = [
    { key: 1, label: "Perwakilan", icon: User },
    { key: 2, label: "Syarat", icon: FileText },
    { key: 3, label: "Jumlah", icon: Users },
    { key: 4, label: "Data Jamaah", icon: UserPlus },
    { key: 5, label: "Paket", icon: Package },
    { key: 6, label: "Tanda Tangan", icon: PenTool },
    { key: 7, label: "Review", icon: ClipboardCheck },
  ];

  // Success screen
  if (submitResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registrasi Berhasil!</h1>
          <p className="text-gray-500 mb-4">
            Permohonan registrasi grup Anda telah diterima. Tim kami akan meninjau dan menghubungi Anda.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Kode Registrasi</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{submitResult.kodeRegistrasi}</p>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Simpan kode registrasi Anda untuk referensi. Status dapat ditanyakan melalui WhatsApp.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (submitResult && !submitResult.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registrasi Gagal</h1>
          <p className="text-gray-500 mb-6">{submitResult.message}</p>
          <button
            onClick={() => { setSubmitResult(null); setStep(7); }}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const selectedPaket = paketList.find((p) => p.id === selectedPaketId);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Registrasi Grup Umroh</h1>
          <p className="text-sm text-gray-500 mt-1">Daftarkan rombongan Anda dalam 7 langkah</p>
        </div>

        {/* Step indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "flex flex-col items-center",
                    step === s.key && "text-blue-600",
                    step > s.key && "text-green-600",
                    step < s.key && "text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      step === s.key && "bg-blue-100 text-blue-600",
                      step > s.key && "bg-green-100 text-green-600",
                      step < s.key && "bg-gray-100 text-gray-400"
                    )}
                  >
                    {step > s.key ? <Check className="w-4 h-4" /> : s.key}
                  </div>
                  <span className="text-[10px] mt-1 hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("w-6 h-0.5 mx-1", step > s.key ? "bg-green-300" : "bg-gray-200")} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Step 1: Representative */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Data Perwakilan Grup</h2>
              <p className="text-sm text-gray-500">Masukkan data perwakilan yang akan menjadi kontak utama grup.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perwakilan</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={namaPerwakilan}
                    onChange={(e) => setNamaPerwakilan(e.target.value.toUpperCase())}
                    className={cn(
                      "w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm uppercase",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.namaPerwakilan ? "border-red-300" : "border-gray-300"
                    )}
                    placeholder="NAMA LENGKAP"
                  />
                </div>
                {errors.namaPerwakilan && <p className="text-xs text-red-500 mt-1">{errors.namaPerwakilan}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={nomorTelepon}
                    onChange={(e) => setNomorTelepon(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.nomorTelepon ? "border-red-300" : "border-gray-300"
                    )}
                    placeholder="0812-3456-7890"
                  />
                </div>
                {errors.nomorTelepon && <p className="text-xs text-red-500 mt-1">{errors.nomorTelepon}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={emailPerwakilan}
                    onChange={(e) => setEmailPerwakilan(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.emailPerwakilan ? "border-red-300" : "border-gray-300"
                    )}
                    placeholder="perwakilan@email.com"
                  />
                </div>
                {errors.emailPerwakilan && <p className="text-xs text-red-500 mt-1">{errors.emailPerwakilan}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Syarat & Ketentuan</h2>
              {termsDoc ? (
                <>
                  <div
                    className="border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto text-sm text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: termsDoc.content }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Versi {termsDoc.version || termsVersion} — {termsDoc.title}
                  </p>
                </>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto flex items-center justify-center text-sm text-gray-400 italic">
                  Memuat Syarat & Ketentuan...
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsSyarat}
                    onChange={(e) => setTermsSyarat(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Saya telah membaca dan memahami syarat & ketentuan di atas.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsPembayaran}
                    onChange={(e) => setTermsPembayaran(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Saya memahami kebijakan pembayaran (DP 30%, jadwal pelunasan, dan metode pembayaran).
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsPembatalan}
                    onChange={(e) => setTermsPembatalan(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Saya memahami kebijakan pembatalan dan refund yang berlaku.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsData}
                    onChange={(e) => setTermsData(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Saya menyetujui pengolahan data pribadi dan komunikasi WhatsApp dari pihak travel.
                  </span>
                </label>
              </div>
              {errors.terms && <p className="text-xs text-red-500 mt-2">{errors.terms}</p>}
            </div>
          )}

          {/* Step 3: PAX Count */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Jumlah Anggota Rombongan</h2>
              <p className="text-sm text-gray-500">Masukkan jumlah jamaah yang akan didaftarkan dalam rombongan ini.</p>

              {/* Numeric Input */}
              <div className="flex items-center justify-center gap-4 py-4">
                <button
                  type="button"
                  onClick={() => setPaxCount((prev) => Math.max(MIN_GROUP_SIZE, prev - 1))}
                  disabled={paxCount <= MIN_GROUP_SIZE}
                  className="w-14 h-14 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="w-6 h-6" />
                </button>

                <div className="text-center">
                  <input
                    type="number"
                    value={paxCount}
                    min={MIN_GROUP_SIZE}
                    max={MAX_GROUP_SIZE}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= MIN_GROUP_SIZE && val <= MAX_GROUP_SIZE) {
                        setPaxCount(val);
                      } else if (e.target.value === "") {
                        setPaxCount(MIN_GROUP_SIZE);
                      }
                    }}
                    className={cn(
                      "w-24 h-14 text-center text-2xl font-bold rounded-xl border-2",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.paxCount ? "border-red-300" : "border-gray-200"
                    )}
                    style={{ MozAppearance: "textfield" }}
                  />
                  <p className="text-xs text-gray-400 mt-1">orang</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPaxCount((prev) => Math.min(MAX_GROUP_SIZE, prev + 1))}
                  disabled={paxCount >= MAX_GROUP_SIZE}
                  className="w-14 h-14 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {errors.paxCount && <p className="text-xs text-red-500 text-center">{errors.paxCount}</p>}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <Users className="w-4 h-4 inline mr-1" />
                  {paxCount} jamaah akan didaftarkan. Anda akan diminta mengisi data masing-masing jamaah pada langkah berikutnya.
                </p>
              </div>

              {/* Large group warnings */}
              {paxCount > VERY_LARGE_GROUP_THRESHOLD && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Rombongan sangat besar. Tim travel mungkin akan menghubungi Anda untuk koordinasi lebih lanjut.
                  </p>
                </div>
              )}
              {paxCount > LARGE_GROUP_THRESHOLD && paxCount <= VERY_LARGE_GROUP_THRESHOLD && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Rombongan besar terdeteksi. Pastikan seluruh data jamaah telah disiapkan sebelum melanjutkan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Members */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Data Jamaah</h2>
              <p className="text-sm text-gray-500">Isi data setiap anggota rombongan. Semua nama akan otomatis menjadi HURUF BESAR.</p>

              {members.map((member, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Jamaah #{i + 1} {i === 0 && "(Ketua Grup)"}
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={member.namaLengkap}
                      onChange={(e) => updateMember(i, "namaLengkap", e.target.value.toUpperCase())}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg text-sm uppercase",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500",
                        errors[`member_${i}_nama`] ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="NAMA LENGKAP"
                    />
                    {errors[`member_${i}_nama`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`member_${i}_nama`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`gender_${i}`}
                          value="L"
                          checked={member.jenisKelamin === "L"}
                          onChange={() => updateMember(i, "jenisKelamin", "L")}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Laki-laki</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`gender_${i}`}
                          value="P"
                          checked={member.jenisKelamin === "P"}
                          onChange={() => updateMember(i, "jenisKelamin", "P")}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Perempuan</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hubungan (opsional)</label>
                    <select
                      value={member.hubungan}
                      onChange={(e) => updateMember(i, "hubungan", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih hubungan...</option>
                      <option value="keluarga">Keluarga</option>
                      <option value="teman">Teman</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Package */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Pilih Paket Keberangkatan</h2>
              <p className="text-sm text-gray-500">Pilih paket umroh yang tersedia.</p>

              {loadingPaket ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : paketList.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada paket keberangkatan tersedia.</p>
              ) : (
                <div className="space-y-3">
                  {paketList.filter(p => p.status !== 'cancelled').map((paket) => (
                    <button
                      key={paket.id}
                      type="button"
                      onClick={() => setSelectedPaketId(paket.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-colors",
                        selectedPaketId === paket.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{paket.paketUmroh?.namaPaket || "-"}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(paket.tanggalBerangkat).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                            {" — "}
                            {new Date(paket.tanggalPulang).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{paket.maskapaiId || "-"} • {paket.nomorPenerbangan}</p>
                            Hotel: {paket.hotelMekkahId || "-"} / {paket.hotelMadinahId || "-"}
                        </div>
                        <div className="text-right">
                            Rp {(paket.paketUmroh?.hargaBase || 0).toLocaleString("id-ID")}
                          <p className="text-xs text-gray-400">/orang</p>
                            Kuota: {paket.terisi}/{paket.maxSeat}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPaketId && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Preferensi Kamar</p>
                  <p className="text-xs text-gray-500">Pilih tipe kamar yang diinginkan untuk rombongan Anda.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "mix", label: "MIX", desc: "Penempatan kamar akan diatur oleh pihak travel." },
                      { value: "quad", label: "QUAD", desc: "4 orang per kamar (1 kamar berempat)." },
                      { value: "triple", label: "TRIPLE", desc: "3 orang per kamar (1 kamar bertiga)." },
                      { value: "double", label: "DOUBLE", desc: "2 orang per kamar (1 kamar berdua)." },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRoomUpgrade(roomUpgrade === opt.value ? "" : opt.value)}
                        className={cn(
                          "text-left p-3 rounded-lg border-2 transition-colors",
                          roomUpgrade === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <p className={cn(
                          "text-sm font-semibold",
                          roomUpgrade === opt.value ? "text-blue-700" : "text-gray-700"
                        )}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hotel Upgrade (opsional)</label>
                    <select
                      value={hotelUpgrade}
                      onChange={(e) => setHotelUpgrade(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>
              )}

              {errors.paket && <p className="text-xs text-red-500">{errors.paket}</p>}
            </div>
          )}

          {/* Step 6: Signature */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Tanda Tangan Digital</h2>
              <p className="text-sm text-gray-500">
                Unggah foto tanda tangan PIC pada kertas putih. Format PNG, JPG, atau JPEG. Maksimal 100 KB.
              </p>

              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center",
                  signaturePreview ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400",
                  uploadError && "border-red-300 bg-red-50"
                )}
              >
                {signaturePreview ? (
                  <div className="space-y-3">
                    <img
                      src={signaturePreview}
                      alt="Tanda tangan"
                      className="max-h-40 mx-auto rounded border border-gray-200"
                    />
                    <p className="text-sm text-green-600 font-medium">Tanda tangan terunggah</p>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Hapus & unggah ulang
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        <Upload className="w-4 h-4" />
                        Pilih File Gambar
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleSignatureChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-400">atau drag & drop file di sini</p>
                  </div>
                )}

                {uploading && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600">Mengunggah...</span>
                  </div>
                )}

                {uploadError && <p className="text-sm text-red-500 mt-3">{uploadError}</p>}
              </div>

              {errors.signature && <p className="text-xs text-red-500">{errors.signature}</p>}
            </div>
          )}

          {/* Step 7: Review */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Review & Konfirmasi</h2>
              <p className="text-sm text-gray-500">Periksa kembali semua data sebelum mengirim.</p>

              {/* Representative */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Perwakilan</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-500">Nama:</p>
                  <p className="text-gray-900 font-medium uppercase">{namaPerwakilan}</p>
                  <p className="text-gray-500">Telepon:</p>
                  <p className="text-gray-900">{nomorTelepon}</p>
                  <p className="text-gray-500">Email:</p>
                  <p className="text-gray-900">{emailPerwakilan}</p>
                </div>
              </div>

              {/* Terms */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Syarat & Ketentuan</h3>
                <div className="space-y-1 text-sm">
                  <p className={termsSyarat ? "text-green-600" : "text-red-500"}>
                    {termsSyarat ? "☑" : "☐"} Syarat & ketentuan
                  </p>
                  <p className={termsPembayaran ? "text-green-600" : "text-red-500"}>
                    {termsPembayaran ? "☑" : "☐"} Kebijakan pembayaran
                  </p>
                  <p className={termsPembatalan ? "text-green-600" : "text-red-500"}>
                    {termsPembatalan ? "☑" : "☐"} Kebijakan pembatalan
                  </p>
                  <p className={termsData ? "text-green-600" : "text-red-500"}>
                    {termsData ? "☑" : "☐"} Pengolahan data & komunikasi
                  </p>
                </div>
              </div>

              {/* Members */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Anggota ({paxCount} PAX)</h3>
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {i + 1}
                      </span>
                      <span className="text-gray-900 uppercase font-medium">{m.namaLengkap}</span>
                      <span className="text-gray-400">{m.jenisKelamin}</span>
                      {m.hubungan && <span className="text-gray-400">({m.hubungan})</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Package */}
              {selectedPaket && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Paket</h3>
                  <p className="text-sm text-gray-900 font-medium">{selectedPaket.paketUmroh?.namaPaket || "-"}</p>
                  <p className="text-sm text-gray-500">
                    Rp {(selectedPaket.paketUmroh?.hargaBase || 0).toLocaleString("id-ID")} × {paxCount} ={" "}
                    <span className="font-semibold text-blue-600">
                      Rp {((selectedPaket.paketUmroh?.hargaBase || 0) * paxCount).toLocaleString("id-ID")}
                    </span>
                  </p>
                  {roomUpgrade && <p className="text-xs text-gray-400">Kamar: {roomUpgrade.toUpperCase()}{roomUpgrade === "mix" ? " (diatur travel)" : ""}</p>}
                  {hotelUpgrade && <p className="text-xs text-gray-400">Hotel: {hotelUpgrade}</p>}
                </div>
              )}

              {/* Signature */}
              {signaturePreview && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tanda Tangan</h3>
                  <img src={signaturePreview} alt="Signature" className="max-h-24 rounded border" />
                </div>
              )}

              {/* Error */}
              {submitResult && !submitResult.success && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {submitResult.message}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
            ) : (
              <div />
            )}

            {step < 7 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Kirim Pendaftaran
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Sudah punya akun?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Login di sini</a>
        </p>
      </div>
    </div>
  );
}
