"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  CheckCircle2,
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
  tanggalLahir: string;
  hubungan: string;
}

function calculateAge(birthDateStr?: string): { age: number; category: string; isLansia: boolean } | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 0) return null;

  const isLansia = age >= 60;
  let category = "Dewasa";
  if (isLansia) category = "Lansia";
  else if (age < 2) category = "Bayi";
  else if (age < 12) category = "Anak";

  return { age, category, isLansia };
}

export default function RegisterPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Representative data
  const [namaPerwakilan, setNamaPerwakilan] = useState("");
  const [nomorTelepon, setNomorTelepon] = useState("");
  const [emailPerwakilan, setEmailPerwakilan] = useState("");
  const [useRepAsJamaah1, setUseRepAsJamaah1] = useState(true);

  // Step 2: Terms & Conditions (Single Checkbox with Scroll Enforcement)
  const termsContainerRef = useRef<HTMLDivElement>(null);
  const [termsDoc, setTermsDoc] = useState<{ title: string; content: string; version: string } | null>(null);
  const [termsVersion, setTermsVersion] = useState("");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  // Step 3: PAX count
  const [paxCount, setPaxCount] = useState(1);

  // Step 4: Members
  const [members, setMembers] = useState<MemberForm[]>([
    { namaLengkap: "", jenisKelamin: "L", tanggalLahir: "", hubungan: "" },
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

  // Track scroll position to enable checkbox when scrolled to bottom
  const handleTermsScroll = () => {
    const container = termsContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // If terms document fits without scrolling, enable checkbox automatically
  useEffect(() => {
    if (termsDoc && termsContainerRef.current) {
      const container = termsContainerRef.current;
      if (container.scrollHeight <= container.clientHeight + 25) {
        setHasScrolledToBottom(true);
      }
    }
  }, [termsDoc]);

  // Sync members when paxCount changes
  useEffect(() => {
    setMembers((prev) => {
      if (prev.length === paxCount) return prev;
      if (prev.length < paxCount) {
        const added = Array.from({ length: paxCount - prev.length }, () => ({
          namaLengkap: "",
          jenisKelamin: "L" as JenisKelamin,
          tanggalLahir: "",
          hubungan: "",
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, paxCount);
    });
  }, [paxCount]);

  // Auto-sync representative name to Jamaah #1 if toggle is active
  useEffect(() => {
    if (useRepAsJamaah1 && namaPerwakilan) {
      setMembers((prev) => {
        if (!prev || prev.length === 0) return prev;
        if (prev[0]?.namaLengkap === namaPerwakilan) return prev;
        return prev.map((m, i) => (i === 0 ? { ...m, namaLengkap: namaPerwakilan } : m));
      });
    }
  }, [useRepAsJamaah1, namaPerwakilan]);

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
      if (!hasScrolledToBottom) {
        errs.terms = "Mohon membaca Syarat & Ketentuan sampai bagian akhir terlebih dahulu";
      } else if (!termsAccepted) {
        errs.terms = "Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan";
      }
    }

    if (s === 3) {
      if (!paxCount || paxCount < MIN_GROUP_SIZE) errs.paxCount = `Jumlah minimal ${MIN_GROUP_SIZE} jamaah`;
      else if (paxCount > MAX_GROUP_SIZE) errs.paxCount = `Jumlah maksimal ${MAX_GROUP_SIZE} jamaah per pendaftaran`;
    }

    if (s === 4) {
      members.forEach((m, i) => {
        if (!m.namaLengkap.trim()) errs[`member_${i}_nama`] = "Nama wajib diisi";
        if (!m.tanggalLahir) errs[`member_${i}_tglLahir`] = "Tanggal lahir wajib diisi";
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
  }, [namaPerwakilan, nomorTelepon, emailPerwakilan, hasScrolledToBottom, termsAccepted, members, selectedPaketId, signaturePath, signatureFile]);

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
          termsAccepted,
          termsAcceptedAt,
          termsVersion,
          paxCount,
          members: members.map((m) => ({
            namaLengkap: m.namaLengkap,
            jenisKelamin: m.jenisKelamin,
            tanggalLahir: m.tanggalLahir || undefined,
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

              {/* Toggle switch to use representative as Jamaah #1 */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="toggle-rep-jamaah1-step1" className="text-sm font-medium text-gray-800 cursor-pointer">
                    Daftarkan perwakilan sebagai Jamaah #1
                  </label>
                  <p className="text-xs text-gray-500">
                    Otomatis memasukkan nama perwakilan ke dalam data anggota rombongan (Ketua Grup).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="toggle-rep-jamaah1-step1"
                    type="checkbox"
                    checked={useRepAsJamaah1}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseRepAsJamaah1(checked);
                      if (checked && namaPerwakilan) {
                        updateMember(0, "namaLengkap", namaPerwakilan);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Syarat & Ketentuan Umroh</h2>
              {termsDoc ? (
                <>
                  <div
                    ref={termsContainerRef}
                    onScroll={handleTermsScroll}
                    className="border border-gray-200 rounded-lg p-5 h-[480px] overflow-y-auto text-sm text-gray-700 rich-text-content bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div dangerouslySetInnerHTML={{ __html: termsDoc.content }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Versi {termsDoc.version || termsVersion} — {termsDoc.title}
                  </p>
                </>
              ) : (
                <div className="border border-gray-200 rounded-lg p-5 h-[480px] overflow-y-auto flex items-center justify-center text-sm text-gray-400 italic">
                  Memuat Syarat & Ketentuan...
                </div>
              )}

              {/* Scroll Status Indicator Banner */}
              {!hasScrolledToBottom ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-800 text-xs font-medium">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mohon membaca seluruh isi Syarat & Ketentuan di atas hingga bagian akhir untuk mengaktifkan persetujuan.</span>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>Terima kasih, Anda telah membaca seluruh Syarat & Ketentuan di atas.</span>
                </div>
              )}

              {/* Single Checkbox */}
              <div className="pt-2">
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none",
                    !hasScrolledToBottom
                      ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                      : termsAccepted
                      ? "bg-blue-50/90 border-blue-300 text-blue-950 shadow-sm"
                      : "bg-white border-gray-300 hover:border-gray-400"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    disabled={!hasScrolledToBottom}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">
                      Saya telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan Umroh di atas.
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Persetujuan ini mencakup klausul pendaftaran, kebijakan pembayaran, pembatalan, dan pengolahan data pribadi.
                    </p>
                  </div>
                </label>
              </div>

              {errors.terms && <p className="text-xs text-red-500 mt-1">{errors.terms}</p>}
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

              {/* Banner switch to auto-fill Jamaah #1 from Representative */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Gunakan Data Perwakilan sebagai Jamaah #1
                    </p>
                    <p className="text-xs text-gray-500">
                      {namaPerwakilan
                        ? `Nama perwakilan: "${namaPerwakilan}"`
                        : "Otomatis mengisi nama perwakilan ke Jamaah #1 (Ketua Grup)"}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={useRepAsJamaah1}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseRepAsJamaah1(checked);
                      if (checked && namaPerwakilan) {
                        updateMember(0, "namaLengkap", namaPerwakilan);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Group Lansia Alert Banner */}
              {(() => {
                const lansiaList = members.filter((m) => calculateAge(m.tanggalLahir)?.isLansia);
                if (lansiaList.length === 0) return null;
                return (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-950 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-amber-950">
                          Terdeteksi {lansiaList.length} Jamaah Lansia (Usia ≥ 60 Tahun)
                        </span>
                        <span className="text-[11px] bg-amber-200 text-amber-900 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Wajib Berkas Tambahan
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Sesuai ketentuan operasional, jamaah berusia 60 tahun ke atas wajib melengkapi <strong>Surat Pernyataan Keluarga Lansia</strong>. Berkas ini wajib dilampirkan pada saat penyerahan dokumen/pemberkasan.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {members.map((member, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Jamaah #{i + 1} {i === 0 && "(Ketua Grup)"}
                    </h3>
                    {i === 0 && useRepAsJamaah1 && (
                      <span className="text-[11px] font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sama dengan Perwakilan
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={member.namaLengkap}
                      disabled={i === 0 && useRepAsJamaah1}
                      onChange={(e) => updateMember(i, "namaLengkap", e.target.value.toUpperCase())}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg text-sm uppercase transition-colors",
                        i === 0 && useRepAsJamaah1
                          ? "bg-gray-100 text-gray-700 cursor-not-allowed border-gray-200 font-medium"
                          : "focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300",
                        errors[`member_${i}_nama`] ? "border-red-300" : ""
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={member.tanggalLahir || ""}
                        onChange={(e) => updateMember(i, "tanggalLahir", e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg text-sm transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300",
                          errors[`member_${i}_tglLahir`] ? "border-red-300" : ""
                        )}
                      />
                      {member.tanggalLahir && (() => {
                        const ageInfo = calculateAge(member.tanggalLahir);
                        if (!ageInfo) return null;
                        return (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
                                  ageInfo.isLansia
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800"
                                )}
                              >
                                🎂 Usia: {ageInfo.age} tahun ({ageInfo.category})
                              </span>
                            </div>
                            {ageInfo.isLansia && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-900">
                                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-amber-950">Berkas Mandatory Lansia:</span>
                                  <p className="mt-0.5 text-amber-800">
                                    Wajib melampirkan <strong>Surat Pernyataan Keluarga Lansia</strong> pada proses penyerahan dokumen.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {errors[`member_${i}_tglLahir`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`member_${i}_tglLahir`]}</p>
                      )}
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
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{paket.namaPaket || paket.paketUmroh?.namaPaket || "-"}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(paket.tanggalBerangkat).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                            {" — "}
                            {new Date(paket.tanggalPulang).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {paket.maskapai || paket.maskapaiId || "-"} • {paket.nomorPenerbangan || "-"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Hotel: {paket.hotelMekkah || paket.hotelMekkahId || "TBA"} / {paket.hotelMadinah || paket.hotelMadinahId || "TBA"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-blue-600">
                            Rp {(paket.hargaPaket || paket.paketUmroh?.hargaBase || 0).toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-gray-400">/orang</p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                            Kuota: {paket.terisi ?? 0}/{paket.kuota || paket.maxSeat || 45}
                          </p>
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
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>
                    Disetujui ({termsDoc?.title || "Syarat & Kondisi Umroh"} {termsDoc?.version ? `v${termsDoc.version}` : ""})
                  </span>
                </div>
              </div>

              {/* Members */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Anggota ({paxCount} PAX)</h3>
                <div className="space-y-2">
                  {members.map((m, i) => {
                    const ageInfo = calculateAge(m.tanggalLahir);
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm flex-wrap border-b border-gray-100 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-gray-900 uppercase font-medium">{m.namaLengkap}</span>
                        <span className="text-gray-400">({m.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"})</span>
                        {ageInfo ? (
                          <span
                            className={cn(
                              "text-xs font-semibold px-2.5 py-0.5 rounded border inline-flex items-center gap-1",
                              ageInfo.isLansia
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            🎂 Usia: {ageInfo.age} thn ({ageInfo.category})
                            {ageInfo.isLansia && " — ⚠️ Wajib Surat Pernyataan Keluarga"}
                          </span>
                        ) : m.tanggalLahir ? (
                          <span className="text-xs text-gray-500">Tgl Lahir: {m.tanggalLahir}</span>
                        ) : null}
                        {m.hubungan && <span className="text-gray-400 text-xs">({m.hubungan})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Package */}
              {selectedPaket && (() => {
                const itemPrice = selectedPaket.hargaPaket || selectedPaket.paketUmroh?.hargaBase || 0;
                const totalPrice = itemPrice * paxCount;
                const packageName = selectedPaket.namaPaket || selectedPaket.paketUmroh?.namaPaket || "-";
                return (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Paket Keberangkatan</h3>
                    <p className="text-sm text-gray-900 font-medium">{packageName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Rp {itemPrice.toLocaleString("id-ID")} × {paxCount} PAX ={" "}
                      <span className="font-semibold text-blue-600">
                        Rp {totalPrice.toLocaleString("id-ID")}
                      </span>
                    </p>
                    {roomUpgrade && <p className="text-xs text-gray-500 mt-1">Kamar: {roomUpgrade.toUpperCase()}{roomUpgrade === "mix" ? " (diatur travel)" : ""}</p>}
                    {hotelUpgrade && <p className="text-xs text-gray-500">Hotel: {hotelUpgrade}</p>}
                  </div>
                );
              })()}

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
