"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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

const INDONESIAN_CITIES = [
  "Banda Aceh", "Lhokseumawe", "Langsa", "Sabang", "Subulussalam",
  "Medan", "Pematangsiantar", "Sibolga", "Tanjungbalai", "Binjai", "Tebing Tinggi", "Padangsidimpuan", "Gunungsitoli",
  "Padang", "Bukittinggi", "Payakumbuh", "Solok", "Sawahlunto", "Padang Panjang", "Pariaman",
  "Pekanbaru", "Dumai",
  "Jambi", "Sungaipenuh",
  "Palembang", "Prabumulih", "Pagar Alam", "Lubuklinggau",
  "Bengkulu",
  "Bandar Lampung", "Metro",
  "Pangkalpinang",
  "Batam", "Tanjungpinang",
  "Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur",
  "Bandung", "Bogor", "Depok", "Bekasi", "Cimahi", "Cirebon", "Sukabumi", "Tasikmalaya", "Banjar",
  "Semarang", "Surakarta", "Magelang", "Pekalongan", "Salatiga", "Tegal", "Kudus", "Jepara", "Pati", "Banyumas", "Cilacap", "Purwokerto", "Wonosobo", "Kebumen", "Boyolali", "Karanganyar", "Sukoharjo", "Sragen", "Klaten", "Grobogan",
  "Yogyakarta", "Sleman", "Bantul", "Gunungkidul", "Kulon Progo",
  "Surabaya", "Malang", "Madiun", "Kediri", "Blitar", "Probolinggo", "Pasuruan", "Mojokerto", "Batu", "Sidoarjo", "Gresik", "Jember", "Banyuwangi", "Tuban", "Lamongan", "Bojonegoro", "Ngawi", "Nganjuk", "Tulungagung", "Trenggalek", "Ponorogo", "Pacitan", "Sumenep", "Pamekasan", "Sampang", "Bangkalan",
  "Serang", "Tangerang", "Cilegon", "Tangerang Selatan", "Pandeglang", "Lebak",
  "Denpasar", "Singaraja", "Tabanan", "Gianyar", "Badung",
  "Mataram", "Bima", "Sumbawa",
  "Kupang", "Ende", "Maumere",
  "Pontianak", "Singkawang",
  "Palangkaraya",
  "Banjarmasin", "Banjarbaru",
  "Samarinda", "Balikpapan", "Bontang",
  "Tanjung Selor", "Tarakan",
  "Manado", "Bitung", "Tomohon", "Kotamobagu",
  "Palu",
  "Makassar", "Parepare", "Palopo",
  "Kendari", "Baubau",
  "Gorontalo",
  "Mamuju",
  "Ambon", "Tual",
  "Ternate", "Tidore",
  "Jayapura", "Sorong", "Merauke", "Manokwari"
];

interface MemberForm {
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  tempatLahir: string;
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

function CityCombobox({
  value,
  onChange,
  placeholder = "Kota Tempat Lahir (contoh: SURABAYA)",
  id,
  onSelectNext,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  onSelectNext?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter cities live as user types
  const filteredCities = useMemo(() => {
    if (!value || value.trim() === "") return INDONESIAN_CITIES;
    const query = value.toLowerCase().trim();
    return INDONESIAN_CITIES.filter((c) => c.toLowerCase().includes(query));
  }, [value]);

  // Reset highlighted index to 0 whenever value/filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  // Keep highlighted item in view when scrolling via keyboard
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll("button");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle keyboard events (Enter key selects top/highlighted item)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (onSelectNext) {
          onSelectNext();
        }
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submit
      if (filteredCities.length > 0) {
        const targetCity = filteredCities[highlightedIndex] || filteredCities[0];
        if (targetCity) {
          onChange(targetCity.toUpperCase());
        }
      }
      setIsOpen(false);
      if (onSelectNext) {
        setTimeout(() => onSelectNext(), 50);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCities.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCities.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 bg-white"
          placeholder={placeholder}
        />
        <ChevronDown
          className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-[252px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100"
        >
          {filteredCities.length > 0 ? (
            filteredCities.map((city, idx) => {
              const isSelected = value.toUpperCase() === city.toUpperCase();
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={city}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(city.toUpperCase());
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between",
                    isHighlighted
                      ? "bg-blue-100 font-semibold text-blue-900"
                      : isSelected
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span>{city}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-gray-400 italic">
              Kota &quot;{value}&quot; (Bisa digunakan / tekan Lanjut)
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    { namaLengkap: "", jenisKelamin: "L", tempatLahir: "", tanggalLahir: "", hubungan: "" },
  ]);

  // Step 5: Package
  const [paketList, setPaketList] = useState<Keberangkatan[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(0);
  const [roomUpgrade, setRoomUpgrade] = useState("quad");
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

  // Wheel handler: when terms container reaches scroll boundary, propagate wheel scroll to main page window
  const handleTermsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = termsContainerRef.current;
    if (!container) return;

    const isScrollingDown = e.deltaY > 0;
    const isScrollingUp = e.deltaY < 0;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5;
    const isAtTop = container.scrollTop <= 0;

    if ((isScrollingDown && isAtBottom) || (isScrollingUp && isAtTop)) {
      window.scrollBy({ top: e.deltaY, behavior: "auto" });
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
          tempatLahir: "",
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
                    onWheel={handleTermsWheel}
                    className="border border-gray-200 rounded-lg p-5 h-[480px] overflow-y-auto text-sm text-gray-700 rich-text-content bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 [overscroll-behavior-y:auto]"
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
                      id={`member_${i}_nama`}
                      type="text"
                      value={member.namaLengkap}
                      disabled={i === 0 && useRepAsJamaah1}
                      onChange={(e) => updateMember(i, "namaLengkap", e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const nextElem = document.getElementById(`member_${i}_tempatLahir`);
                          if (nextElem) nextElem.focus();
                        }
                      }}
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
                        Tempat Lahir
                      </label>
                      <CityCombobox
                        id={`member_${i}_tempatLahir`}
                        value={member.tempatLahir || ""}
                        onChange={(val) => updateMember(i, "tempatLahir", val)}
                        onSelectNext={() => {
                          const el = document.getElementById(`member_${i}_tglLahir`);
                          if (el) el.focus();
                        }}
                        placeholder="Kota Tempat Lahir (contoh: SURABAYA)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tanggal Lahir
                      </label>
                      <input
                        id={`member_${i}_tglLahir`}
                        type="date"
                        value={member.tanggalLahir || ""}
                        onChange={(e) => updateMember(i, "tanggalLahir", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const nextElem = document.getElementById(`member_${i}_hubungan`);
                            if (nextElem) nextElem.focus();
                          }
                        }}
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
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {i === 0
                        ? members.length > 1
                          ? "Hubungan dengan Jamaah #2"
                          : "Hubungan (opsional)"
                        : `Hubungan dengan Jamaah #1 (${members[0]?.namaLengkap ? members[0].namaLengkap.toUpperCase() : "Ketua Grup"})`}
                    </label>
                    <select
                      id={`member_${i}_hubungan`}
                      value={member.hubungan}
                      onChange={(e) => updateMember(i, "hubungan", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (i < members.length - 1) {
                            const nextMemberName = document.getElementById(`member_${i + 1}_nama`);
                            if (nextMemberName) nextMemberName.focus();
                          } else {
                            const btnNext = document.getElementById("btn_next_step");
                            if (btnNext) btnNext.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Pilih hubungan...</option>
                      <option value="Suami">Suami</option>
                      <option value="Istri">Istri</option>
                      <option value="Ayah / Ibu">Ayah / Ibu</option>
                      <option value="Anak">Anak</option>
                      <option value="Kakak / Adik">Kakak / Adik</option>
                      <option value="Keluarga / Mahram">Keluarga / Mahram</option>
                      <option value="Teman / Rekan">Teman / Rekan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Package Selection */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pilih Paket Keberangkatan</h2>
                <p className="text-sm text-gray-500">Pilih nama paket umroh dari daftar pilihan di bawah ini.</p>
              </div>

              {loadingPaket ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : paketList.length === 0 ? (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <p className="text-sm text-gray-500">Belum ada paket keberangkatan tersedia.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Package Select Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nama Paket Keberangkatan
                    </label>
                    <select
                      value={selectedPaketId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPaketId(val);
                        setSelectedClusterIndex(0);
                        if (errors.paket) {
                          setErrors((prev) => ({ ...prev, paket: "" }));
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm font-medium transition-colors bg-white shadow-sm",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500",
                        errors.paket ? "border-red-400 bg-red-50/30" : "border-gray-300"
                      )}
                    >
                      <option value="">-- Pilih Nama Paket Umroh --</option>
                      {paketList
                        .filter((p) => p.status !== "cancelled")
                        .map((p) => {
                          const name = p.namaPaket || p.paketUmroh?.namaPaket || p.kode;
                          return (
                            <option key={p.id} value={p.id}>
                              {name}
                            </option>
                          );
                        })}
                    </select>
                    {errors.paket && <p className="text-xs text-red-500 mt-1">{errors.paket}</p>}
                  </div>

                  {/* Selected Package Details Card */}
                  {selectedPaket && (() => {
                    const clusters = Array.isArray(selectedPaket.hotelOptions) && selectedPaket.hotelOptions.length > 0
                      ? selectedPaket.hotelOptions
                      : null;
                    const isMultiCluster = !!(clusters && clusters.length > 1);

                    const activeCluster = isMultiCluster && clusters
                      ? clusters[selectedClusterIndex] || clusters[0]
                      : null;

                    const basePrice = activeCluster
                      ? Number(activeCluster.hargaBase || 0)
                      : Number(selectedPaket.hargaPaket || selectedPaket.paketUmroh?.hargaBase || 0);

                    const hotelMekkah = activeCluster?.hotelMekkah || selectedPaket.hotelMekkah || "TBA";
                    const hotelMadinah = activeCluster?.hotelMadinah || selectedPaket.hotelMadinah || "TBA";

                    const upgradeTriple = Number(activeCluster?.upgradeTriple || 1500000);
                    const upgradeDouble = Number(activeCluster?.upgradeDouble || 2500000);

                    const roomSurcharge = roomUpgrade === "triple" ? upgradeTriple : roomUpgrade === "double" ? upgradeDouble : 0;
                    const pricePerPax = basePrice + roomSurcharge;
                    const totalPriceGroup = pricePerPax * paxCount;

                    return (
                      <div className="border border-blue-100 rounded-2xl p-5 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 shadow-sm space-y-6">
                        {/* Header Info */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200/80 pb-4">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
                              Detail Paket Keberangkatan
                            </span>
                            <h3 className="text-base font-bold text-gray-900 mt-1">
                              {selectedPaket.namaPaket || selectedPaket.paketUmroh?.namaPaket}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                              <span>✈️ {selectedPaket.maskapai || selectedPaket.maskapaiId || "Saudia Airlines"} • Flight {selectedPaket.nomorPenerbangan || "-"}</span>
                              <span>•</span>
                              <span>📅 {new Date(selectedPaket.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — {new Date(selectedPaket.tanggalPulang).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </p>
                          </div>
                          <div className="sm:text-right shrink-0">
                            <span className="text-xs text-gray-500 block">Harga Base Paket</span>
                            <span className="text-lg font-extrabold text-blue-600">
                              Rp {basePrice.toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs text-gray-400"> / orang</span>
                          </div>
                        </div>

                        {/* Multi-Cluster Selector (If Multi Cluster) */}
                        {isMultiCluster && clusters && (
                          <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                              🏢 Pilih Klaster Hotel & Fasilitas
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {clusters.map((cl: any, idx: number) => {
                                const isSelected = selectedClusterIndex === idx;
                                const clPrice = Number(cl.hargaBase || 0);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClusterIndex(idx);
                                      if (cl.clusterName) setHotelUpgrade(cl.clusterName);
                                    }}
                                    className={cn(
                                      "p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-2",
                                      isSelected
                                        ? "border-blue-600 bg-blue-50/80 shadow-sm ring-1 ring-blue-500"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-sm text-gray-900">
                                        {cl.clusterName || `Klaster ${idx + 1}`}
                                      </span>
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-0.5">
                                      <p>🕋 Mekkah: <strong>{cl.hotelMekkah || "TBA"}</strong></p>
                                      <p>🕌 Madinah: <strong>{cl.hotelMadinah || "TBA"}</strong></p>
                                    </div>
                                    <div className="text-xs font-semibold text-blue-700 pt-1 border-t border-gray-100">
                                      Harga Base Klaster: Rp {clPrice.toLocaleString("id-ID")} / pax
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Single Cluster Hotel Info (If Single Cluster) */}
                        {!isMultiCluster && (
                          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">🕋 Hotel Mekkah:</span>
                              <span className="text-gray-900 font-bold">{hotelMekkah}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">🕌 Hotel Madinah:</span>
                              <span className="text-gray-900 font-bold">{hotelMadinah}</span>
                            </div>
                          </div>
                        )}

                        {/* Room Upgrade Options */}
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                            🛏️ Pilihan Upgrade Tipe Kamar
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {/* QUAD */}
                            <button
                              type="button"
                              onClick={() => setRoomUpgrade("quad")}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                roomUpgrade === "quad"
                                  ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900">QUAD (4 Pax)</span>
                                {roomUpgrade === "quad" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-[11px] text-gray-500">4 orang per kamar</p>
                              <p className="text-xs font-bold text-emerald-700 mt-1">Base (+ Rp 0)</p>
                            </button>

                            {/* TRIPLE */}
                            <button
                              type="button"
                              onClick={() => setRoomUpgrade("triple")}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                roomUpgrade === "triple"
                                  ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900">TRIPLE (3 Pax)</span>
                                {roomUpgrade === "triple" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-[11px] text-gray-500">3 orang per kamar</p>
                              <p className="text-xs font-bold text-blue-700 mt-1">
                                + Rp {upgradeTriple.toLocaleString("id-ID")} / pax
                              </p>
                            </button>

                            {/* DOUBLE */}
                            <button
                              type="button"
                              onClick={() => setRoomUpgrade("double")}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                roomUpgrade === "double"
                                  ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900">DOUBLE (2 Pax)</span>
                                {roomUpgrade === "double" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-[11px] text-gray-500">2 orang per kamar</p>
                              <p className="text-xs font-bold text-blue-700 mt-1">
                                + Rp {upgradeDouble.toLocaleString("id-ID")} / pax
                              </p>
                            </button>

                            {/* MIX */}
                            <button
                              type="button"
                              onClick={() => setRoomUpgrade("mix")}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                roomUpgrade === "mix"
                                  ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900">MIX (Kamar Travel)</span>
                                {roomUpgrade === "mix" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-[11px] text-gray-500">Diatur oleh travel</p>
                              <p className="text-xs font-bold text-emerald-700 mt-1">Base (+ Rp 0)</p>
                            </button>
                          </div>
                        </div>

                        {/* Pricing Summary Breakdown */}
                        <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs shadow-inner">
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Harga Base Paket ({isMultiCluster ? activeCluster?.clusterName : "Reguler"}):</span>
                            <span>Rp {basePrice.toLocaleString("id-ID")} / pax</span>
                          </div>
                          {roomSurcharge > 0 && (
                            <div className="flex justify-between items-center text-amber-300 font-medium">
                              <span>Upgrade Kamar ({roomUpgrade.toUpperCase()}):</span>
                              <span>+ Rp {roomSurcharge.toLocaleString("id-ID")} / pax</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-slate-200 font-semibold pt-1 border-t border-slate-700">
                            <span>Total per Pax:</span>
                            <span>Rp {pricePerPax.toLocaleString("id-ID")} / pax</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-extrabold text-blue-400 pt-1.5 border-t border-slate-700">
                            <span>Total Registrasi Rombongan ({paxCount} PAX):</span>
                            <span className="text-base text-emerald-400">
                              Rp {totalPriceGroup.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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

          {/* Step 7: Document Preview & Confirmation */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review & Pratinjau Dokumen Pendaftaran</h2>
                <p className="text-sm text-gray-500">
                  Berikut adalah pratinjau lembar Formulir & Surat Pernyataan Pendaftaran resmi yang memuat data rombongan dan tanda tangan elektronik perwakilan.
                </p>
              </div>

              {/* Official Document Paper Preview Container */}
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 md:p-8 shadow-lg relative space-y-6 text-slate-800 font-sans max-w-3xl mx-auto">
                {/* Official Letterhead (Kop Surat Travel) */}
                <div className="border-b-2 border-slate-800 pb-4 space-y-3">
                  <img
                    src="/templates/kop-surat/kop-surat.png"
                    alt="Kop Surat Travel"
                    className="w-full max-h-32 object-contain hidden"
                    onLoad={(e) => { (e.target as HTMLElement).classList.remove("hidden"); }}
                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
                        VTU
                      </div>
                      <div>
                        <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                          VTU TRAVEL & OPERATIONAL SYSTEM
                        </h1>
                        <p className="text-xs text-slate-500">
                          Izin PPIU No. 123/2026 • Layanan Perjalanan Ibadah Umroh Resmi • Surabaya, Indonesia
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        FORMULIR PENDAFTARAN RESMI
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block mt-0.5 shadow-2xs">
                        REG-2026-{Math.floor(1000 + Math.random() * 9000)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1 py-1">
                  <h2 className="text-base font-bold uppercase tracking-wide text-slate-900 underline decoration-slate-400 underline-offset-4">
                    SURAT PERNYATAAN & FORMULIR PENDAFTARAN JAMAAH UMROH
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tanggal Pendaftaran: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {/* Section I: Data Perwakilan / PIC */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                    I. DATA PERWAKILAN (PIC ROMBONGAN)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2 pt-1">
                    <div className="flex">
                      <span className="w-36 text-slate-500 font-medium shrink-0">Nama Lengkap PIC:</span>
                      <span className="font-bold text-slate-900 uppercase">{namaPerwakilan || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-slate-500 font-medium shrink-0">Nomor Telepon / HP:</span>
                      <span className="font-semibold text-slate-900">{nomorTelepon || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-slate-500 font-medium shrink-0">Email Registrasi:</span>
                      <span className="font-semibold text-slate-900">{emailPerwakilan || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-slate-500 font-medium shrink-0">Jumlah Rombongan:</span>
                      <span className="font-bold text-blue-700">{paxCount} PAX</span>
                    </div>
                  </div>
                </div>

                {/* Section II: Data Anggota Jamaah Rombongan */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                    II. DAFTAR ANGGOTA JAMAAH ROMBONGAN ({paxCount} PAX)
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2 border-r border-slate-200 w-8 text-center">No</th>
                          <th className="p-2 border-r border-slate-200">Nama Lengkap Jamaah</th>
                          <th className="p-2 border-r border-slate-200 w-12 text-center">L/P</th>
                          <th className="p-2 border-r border-slate-200">Tempat & Tanggal Lahir</th>
                          <th className="p-2 border-r border-slate-200">Usia & Kategori</th>
                          <th className="p-2">Hubungan Rombongan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {members.map((m, i) => {
                          const ageInfo = calculateAge(m.tanggalLahir);
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">{i + 1}</td>
                              <td className="p-2 border-r border-slate-200 font-bold text-slate-900 uppercase">{m.namaLengkap}</td>
                              <td className="p-2 border-r border-slate-200 text-center font-semibold">{m.jenisKelamin}</td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">
                                {m.tempatLahir ? m.tempatLahir.toUpperCase() : "-"}, {m.tanggalLahir || "-"}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                {ageInfo ? (
                                  <span className={cn(
                                    "font-semibold px-1.5 py-0.5 rounded text-[11px] inline-block",
                                    ageInfo.isLansia ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-slate-800"
                                  )}>
                                    {ageInfo.age} Thn ({ageInfo.category})
                                    {ageInfo.isLansia && " *Lansia"}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="p-2 text-slate-700 font-medium">
                                {i === 0
                                  ? members.length > 1 ? `Hubungan dg Jamaah #2: ${m.hubungan || "-"}` : `Ketua Rombongan`
                                  : `Hubungan dg Jamaah #1 (${members[0]?.namaLengkap ? members[0].namaLengkap.toUpperCase() : "Ketua"}): ${m.hubungan || "-"}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section III: Detail Paket Keberangkatan */}
                {selectedPaket && (() => {
                  const clusters = Array.isArray(selectedPaket.hotelOptions) && selectedPaket.hotelOptions.length > 0
                    ? selectedPaket.hotelOptions
                    : null;
                  const isMultiCluster = !!(clusters && clusters.length > 1);
                  const activeCluster = isMultiCluster && clusters
                    ? clusters[selectedClusterIndex] || clusters[0]
                    : null;

                  const basePrice = activeCluster
                    ? Number(activeCluster.hargaBase || 0)
                    : Number(selectedPaket.hargaPaket || selectedPaket.paketUmroh?.hargaBase || 0);

                  const upgradeTriple = Number(activeCluster?.upgradeTriple || 1500000);
                  const upgradeDouble = Number(activeCluster?.upgradeDouble || 2500000);
                  const roomSurcharge = roomUpgrade === "triple" ? upgradeTriple : roomUpgrade === "double" ? upgradeDouble : 0;
                  const pricePerPax = basePrice + roomSurcharge;
                  const totalPriceGroup = pricePerPax * paxCount;

                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                        III. DETAIL PAKET KEBERANGKATAN & AKOMODASI
                      </h3>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500">Nama Paket: </span>
                            <span className="font-bold text-slate-900">{selectedPaket.namaPaket || selectedPaket.paketUmroh?.namaPaket}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Penerbangan: </span>
                            <span className="font-semibold text-slate-900">{selectedPaket.maskapai || selectedPaket.maskapaiId || "Saudia Airlines"} ({selectedPaket.nomorPenerbangan || "-"})</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Jadwal Flight: </span>
                            <span className="font-semibold text-slate-900">
                              {new Date(selectedPaket.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — {new Date(selectedPaket.tanggalPulang).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Tipe Kamar: </span>
                            <span className="font-bold text-blue-700 uppercase">{roomUpgrade}</span>
                          </div>
                        </div>
                        {activeCluster ? (
                          <div className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                            <strong>Klaster Hotel: {activeCluster.clusterName}</strong> (Mekkah: {activeCluster.hotelMekkah} | Madinah: {activeCluster.hotelMadinah})
                          </div>
                        ) : (
                          <div className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                            <strong>Akomodasi Hotel:</strong> Mekkah: {selectedPaket.hotelMekkah || "TBA"} | Madinah: {selectedPaket.hotelMadinah || "TBA"}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
                          <span>Total Biaya Paket Rombongan ({paxCount} PAX):</span>
                          <span className="text-sm text-emerald-700 font-extrabold">Rp {totalPriceGroup.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Section IV: Pernyataan Hukum & Persetujuan Syarat & Ketentuan */}
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    IV. PERNYATAAN PERSETUJUAN SYARAT & KETENTUAN TRAVEL
                  </h3>
                  <div className="text-[11px] text-slate-600 leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <p>
                      &quot;Dengan ini saya selaku Perwakilan/PIC Rombongan bertindak untuk dan atas nama seluruh anggota jamaah yang tercantum dalam formulir ini, menyatakan bahwa seluruh data yang diisikan adalah benar, dan secara sadar <strong>MENYETUJUI SELURUH SYARAT & KETENTUAN REGISTRASI UMROH</strong> yang ditetapkan oleh pihak Travel ({termsDoc?.title || "Syarat & Kondisi Umroh"} v{termsDoc?.version || "1.0"}).&quot;
                    </p>
                    <p className="not-italic text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Syarat & Ketentuan Telah Dibaca dan Disetujui secara Elektronik.</span>
                    </p>
                  </div>
                </div>

                {/* Section V: Pengesahan & Tanda Tangan Digital */}
                <div className="border-t border-slate-300 pt-6 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
                  <div className="text-[11px] text-slate-500 space-y-1 text-center sm:text-left">
                    <p className="font-bold text-slate-700">Catatan Sistem Security & Vault:</p>
                    <p>• Dokumen ini sah dan ditandatangani secara digital oleh PIC.</p>
                    <p>• Dokumen tersimpan aman pada Vault Operational VTU Travel.</p>
                  </div>
                  <div className="text-center w-60 space-y-1">
                    <p className="text-xs text-slate-600">
                      Surabaya, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs font-bold text-slate-800">Yang Menyatakan (PIC Rombongan),</p>
                    <div className="h-24 flex items-center justify-center relative border border-dashed border-slate-300 rounded-xl bg-slate-50/80 my-1 p-1">
                      {signaturePreview ? (
                        <img
                          src={signaturePreview}
                          alt="Tanda Tangan PIC"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">[Tanda Tangan Digital]</span>
                      )}
                    </div>
                    <p className="text-xs font-extrabold uppercase text-slate-900 underline decoration-slate-400">
                      ({namaPerwakilan || "NAMA PIC"})
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Error */}
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
                id="btn_next_step"
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
