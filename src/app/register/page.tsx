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
} from "lucide-react";
import type { JenisKelamin, Keberangkatan } from "@/shared/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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

  // Step 2: Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

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
      if (!termsAccepted) errs.terms = "Anda harus menyetujui syarat & ketentuan";
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
  }, [namaPerwakilan, nomorTelepon, emailPerwakilan, termsAccepted, members, selectedPaketId, signaturePath, signatureFile]);

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(7, s + 1) as Step);
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1) as Step);

  // Handle signature upload
  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!["image/jpeg", "image/jpg"].includes(file.type)) {
      setUploadError("Hanya file JPG/JPEG yang diizinkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File terlalu besar (max 5MB)");
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
              <div className="border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto text-sm text-gray-600 space-y-2">
                <p className="font-semibold">Syarat & Ketentuan Pendaftaran Umroh</p>
                <p>1. Pendaftar adalah perwakilan resmi dari anggota rombongan yang didaftarkan.</p>
                <p>2. Seluruh data jamaah yang didaftarkan harus benar dan sesuai dengan dokumen identitas resmi (KTP/Paspor).</p>
                <p>3. Setiap rombongan minimal terdiri dari 1 (satu) orang dan maksimal 10 (sepuluh) orang per pendaftaran.</p>
                <p>4. Biaya paket umroh yang tercantum belum termasuk biaya tambahan seperti upgrade hotel, perlengkapan, handling, dan administrasi.</p>
                <p>5. Pembayaran DP minimal 30% dari total tagihan harus dilunasi dalam waktu 14 hari setelah pendaftaran disetujui.</p>
                <p>6. Pembatalan sepihak oleh jamaah setelah pendaftaran disetujui dapat dikenakan biaya administrasi sesuai kebijakan yang berlaku.</p>
                <p>7. Dokumen yang wajib dilengkapi: Paspor (min. berlaku 6 bulan), Pas Foto 4x6, Kartu Vaksin Meningitis, dan KTP.</p>
                <p>8. Pihak travel berhak menolak permohonan pendaftaran apabila data tidak lengkap atau tidak memenuhi syarat.</p>
                <p>9. Tanda tangan digital yang diunggah merupakan bentuk persetujuan sah atas seluruh syarat dan ketentuan ini.</p>
                <p>10. Dengan mendaftar, Anda menyetujui bahwa data Anda akan diproses sesuai dengan kebijakan privasi yang berlaku.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Saya telah membaca, memahami, dan menyetujui seluruh syarat & ketentuan di atas.
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}
            </div>
          )}

          {/* Step 3: PAX Count */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Jumlah Anggota Rombongan (PAX)</h2>
              <p className="text-sm text-gray-500">Tentukan berapa banyak jamaah yang akan didaftarkan dalam grup ini.</p>

              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPaxCount(n)}
                    className={cn(
                      "py-3 rounded-lg text-sm font-medium border-2 transition-colors",
                      paxCount === n
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    )}
                  >
                    {n} PAX
                  </button>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <Users className="w-4 h-4 inline mr-1" />
                  {paxCount} jamaah akan didaftarkan. Anda akan diminta mengisi data masing-masing di langkah berikutnya.
                </p>
              </div>
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
                          <p className="font-semibold text-gray-900">{paket.namaPaket}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(paket.tanggalBerangkat).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                            {" — "}
                            {new Date(paket.tanggalPulang).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{paket.maskapai} • {paket.nomorPenerbangan}</p>
                          <p className="text-xs text-gray-400">
                            Hotel: {paket.hotelMekkah} / {paket.hotelMadinah}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            Rp {paket.hargaPaket.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-gray-400">/orang</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Kuota: {paket.terisi}/{paket.kuota}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPaketId && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Opsi Upgrade (opsional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Room Upgrade</label>
                      <select
                        value={roomUpgrade}
                        onChange={(e) => setRoomUpgrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Standard</option>
                        <option value="standard">Standard</option>
                        <option value="double">Double</option>
                        <option value="quad">Quad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Hotel Upgrade</label>
                      <select
                        value={hotelUpgrade}
                        onChange={(e) => setHotelUpgrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Standard</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
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
                Unggah foto tanda tangan Anda pada kertas putih. Format JPG, maksimal 5MB.
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
                        Pilih File JPG
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg"
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
                <p className="text-sm text-green-600">
                  <Check className="w-4 h-4 inline mr-1" /> Disetujui
                </p>
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
                  <p className="text-sm text-gray-900 font-medium">{selectedPaket.namaPaket}</p>
                  <p className="text-sm text-gray-500">
                    Rp {selectedPaket.hargaPaket.toLocaleString("id-ID")} × {paxCount} ={" "}
                    <span className="font-semibold text-blue-600">
                      Rp {(selectedPaket.hargaPaket * paxCount).toLocaleString("id-ID")}
                    </span>
                  </p>
                  {roomUpgrade && <p className="text-xs text-gray-400">Room: {roomUpgrade}</p>}
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
