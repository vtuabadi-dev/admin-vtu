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
  CreditCard,
  Building2,
  Copy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import type { JenisKelamin, Keberangkatan } from "@/shared/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const DRAFT_STORAGE_KEY = "vtu_registration_draft_v2";

function loadDraftFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraftToStorage(draft: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch { }
}

function clearDraftFromStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch { }
}

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
  tipeKamar?: string;
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
          className="w-full h-11 px-3.5 py-2 border border-stone-300 rounded-xl text-sm font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 pr-8 bg-white text-slate-950 shadow-xs placeholder:text-gray-400 placeholder:font-normal placeholder:normal-case"
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
  const [isCustomRoomAssignment, setIsCustomRoomAssignment] = useState(false);
  const [hotelUpgrade, setHotelUpgrade] = useState("");
  const [loadingPaket, setLoadingPaket] = useState(false);

  const packageOptions = useMemo(() => {
    return paketList
      .filter((p) => p.status !== "cancelled")
      .map((p) => {
        const name = p.namaPaket || p.paketUmroh?.namaPaket || p.kode;
        const tgl = p.tanggalBerangkat
          ? new Date(p.tanggalBerangkat).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";
        const maskapai = p.maskapai || "";
        const harga = p.hargaPaket || p.paketUmroh?.hargaBase;
        const sub = [
          tgl ? `Tgl: ${tgl}` : "",
          maskapai ? `Flight: ${maskapai}` : "",
          harga ? `Rp ${Number(harga).toLocaleString("id-ID")}` : "",
        ]
          .filter(Boolean)
          .join(" • ");
        return {
          value: p.id,
          label: name,
          sublabel: sub || undefined,
        };
      });
  }, [paketList]);

  // Step 6: Signature
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);

  const activeSignatureSrc = useMemo(() => {
    if (signaturePreview) return signaturePreview;
    if (signaturePath) {
      if (signaturePath.startsWith("data:") || signaturePath.startsWith("http")) {
        return signaturePath;
      }
      return `/api/storage/download?path=${encodeURIComponent(signaturePath)}`;
    }
    return "";
  }, [signaturePreview, signaturePath]);

  // Step 7: Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    kodeRegistrasi?: string;
    message?: string;
  } | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 8: Payment Proof State & Custom DP Switch
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [paymentProofSubmitted, setPaymentProofSubmitted] = useState(false);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isCustomDp, setIsCustomDp] = useState(false);
  const [customDpAmount, setCustomDpAmount] = useState("");
  const [paymentMethodOption, setPaymentMethodOption] = useState<"transfer" | "tunai">("transfer");

  // Draft auto-resume indicator
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);

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

  // ── Auto-Resume: Load draft from localStorage on mount ──
  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft) {
      try {
        if (draft.step && draft.step >= 1 && draft.step <= 8) setStep(draft.step as Step);
        if (draft.namaPerwakilan) setNamaPerwakilan(draft.namaPerwakilan);
        if (draft.nomorTelepon) setNomorTelepon(draft.nomorTelepon);
        if (draft.emailPerwakilan) setEmailPerwakilan(draft.emailPerwakilan);
        if (typeof draft.useRepAsJamaah1 === "boolean") setUseRepAsJamaah1(draft.useRepAsJamaah1);
        if (draft.paxCount) setPaxCount(draft.paxCount);
        if (Array.isArray(draft.members) && draft.members.length > 0) setMembers(draft.members);
        if (draft.selectedPaketId) setSelectedPaketId(draft.selectedPaketId);
        if (typeof draft.selectedClusterIndex === "number") setSelectedClusterIndex(draft.selectedClusterIndex);
        if (draft.roomUpgrade) setRoomUpgrade(draft.roomUpgrade);
        if (draft.hotelUpgrade) setHotelUpgrade(draft.hotelUpgrade);
        if (typeof draft.termsAccepted === "boolean") setTermsAccepted(draft.termsAccepted);
        if (draft.termsAcceptedAt) setTermsAcceptedAt(draft.termsAcceptedAt);
        if (draft.signaturePreview) setSignaturePreview(draft.signaturePreview);
        if (draft.signaturePath) setSignaturePath(draft.signaturePath);
        if (draft.signedAt) setSignedAt(draft.signedAt);
        if (draft.submitResult) setSubmitResult(draft.submitResult);
        setIsRestoredDraft(true);
      } catch (err) {
        console.warn("[register] Draft restore warning:", err);
      }
    }
    setHasInitializedDraft(true);
  }, []);

  // ── Auto-Save: Save state changes to localStorage ──
  useEffect(() => {
    if (!hasInitializedDraft) return;
    if (paymentProofSubmitted) {
      clearDraftFromStorage();
      return;
    }

    saveDraftToStorage({
      step,
      namaPerwakilan,
      nomorTelepon,
      emailPerwakilan,
      useRepAsJamaah1,
      paxCount,
      members,
      selectedPaketId,
      selectedClusterIndex,
      roomUpgrade,
      hotelUpgrade,
      termsAccepted,
      termsAcceptedAt,
      signaturePreview,
      signaturePath,
      signedAt,
      submitResult,
      updatedAt: new Date().toISOString(),
    });
  }, [
    hasInitializedDraft,
    step,
    namaPerwakilan,
    nomorTelepon,
    emailPerwakilan,
    useRepAsJamaah1,
    paxCount,
    members,
    selectedPaketId,
    selectedClusterIndex,
    roomUpgrade,
    hotelUpgrade,
    termsAccepted,
    termsAcceptedAt,
    signaturePreview,
    signaturePath,
    signedAt,
    submitResult,
    paymentProofSubmitted,
  ]);

  // Clear draft & start fresh handler
  const handleStartFresh = () => {
    if (confirm("Apakah Anda yakin ingin menghapus draft ini dan mulai dari awal?")) {
      clearDraftFromStorage();
      setStep(1);
      setNamaPerwakilan("");
      setNomorTelepon("");
      setEmailPerwakilan("");
      setPaxCount(1);
      setMembers([{ namaLengkap: "", jenisKelamin: "L", tempatLahir: "", tanggalLahir: "", hubungan: "" }]);
      setSelectedPaketId("");
      setTermsAccepted(false);
      setSignaturePreview("");
      setSignaturePath("");
      setSubmitResult(null);
      setIsRestoredDraft(false);
    }
  };

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

  // Auto-validate and filter available roomUpgrade selection based on paxCount
  useEffect(() => {
    if (paxCount === 1) {
      if (roomUpgrade !== "mix") setRoomUpgrade("mix");
    } else if (paxCount === 2) {
      if (roomUpgrade === "quad" || roomUpgrade === "triple" || roomUpgrade.startsWith("combo") || roomUpgrade === "quinf") {
        setRoomUpgrade("double");
      }
    } else if (paxCount === 3) {
      if (roomUpgrade === "quad" || roomUpgrade.startsWith("combo") || roomUpgrade === "quinf") {
        setRoomUpgrade("triple");
      }
    } else if (paxCount === 4) {
      if (roomUpgrade.startsWith("combo") || roomUpgrade === "quinf") {
        setRoomUpgrade("quad");
      }
    }
  }, [paxCount, roomUpgrade]);

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
      if (!signaturePath && !signatureFile && !signaturePreview) errs.signature = "Tanda tangan wajib diunggah";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [namaPerwakilan, nomorTelepon, emailPerwakilan, hasScrolledToBottom, termsAccepted, members, selectedPaketId, signaturePath, signatureFile, signaturePreview]);

  const nextStep = async () => {
    // If on Step 6 (Signature step) with canvas drawn but not yet saved, auto-save before proceeding!
    if (step === 6 && signatureMode === "draw" && hasDrawnOnCanvas && !signaturePath) {
      const saved = await saveCanvasSignature();
      if (!saved) return;
    }

    if (validateStep(step)) {
      // Record terms acceptance timestamp when leaving step 2
      if (step === 2 && !termsAcceptedAt) {
        setTermsAcceptedAt(new Date().toISOString());
      }
      setStep((s) => Math.min(8, s + 1) as Step);
    }
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1) as Step);

  // Handle payment proof upload & submission for Step 8
  const handlePaymentProofSubmit = async () => {
    if (paymentMethodOption === "transfer" && !paymentProofFile && !paymentProofPreview) {
      setPaymentProofError("Silakan pilih/unggah foto bukti transfer DP.");
      return;
    }
    const kodeReg = submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi;
    if (!kodeReg) {
      setPaymentProofError("Kode registrasi tidak ditemukan.");
      return;
    }

    setIsUploadingProof(true);
    setPaymentProofError("");

    try {
      const formData = new FormData();
      formData.append("kodeRegistrasi", kodeReg);
      formData.append("metodePembayaran", paymentMethodOption === "tunai" ? "cash" : "transfer");

      const defaultDpPerPax = 5000000;
      const minimalDpStandard = defaultDpPerPax * paxCount;
      const parsedCustomDp = parseInt(customDpAmount.replace(/\D/g, ""), 10) || 0;
      const effectiveDp = isCustomDp && parsedCustomDp > 0 ? parsedCustomDp : minimalDpStandard;
      formData.append("nominalDp", effectiveDp.toString());

      if (paymentProofFile) {
        formData.append("file", paymentProofFile);
      }

      const res = await fetch("/api/register/payment-proof", {
         method: "POST",
         body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPaymentProofSubmitted(true);
        clearDraftFromStorage();
      } else {
        setPaymentProofError(data.message || "Gagal memproses pembayaran DP.");
      }
    } catch {
      setPaymentProofError("Gagal memproses pembayaran DP. Periksa koneksi internet Anda.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Handle signature upload file
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
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSignaturePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);

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

  // Canvas Drawing Handlers
  const startDrawingCanvas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("nativeEvent" in e && "touches" in (e.nativeEvent as any) && (e.nativeEvent as any).touches?.[0]) {
      clientX = (e.nativeEvent as any).touches[0].clientX;
      clientY = (e.nativeEvent as any).touches[0].clientY;
    } else if ("touches" in e && (e as any).touches?.[0]) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnOnCanvas(true);
  };

  const drawCanvas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("nativeEvent" in e && "touches" in (e.nativeEvent as any) && (e.nativeEvent as any).touches?.[0]) {
      clientX = (e.nativeEvent as any).touches[0].clientX;
      clientY = (e.nativeEvent as any).touches[0].clientY;
    } else if ("touches" in e && (e as any).touches?.[0]) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingCanvas = () => {
    setIsDrawing(false);
  };

  const clearCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawnOnCanvas(false);
    clearSignature();
  };

  const saveCanvasSignature = async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnOnCanvas) return false;

    const previewUrl = canvas.toDataURL("image/png");
    setSignaturePreview(previewUrl);

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        const file = new File([blob], "ttd_digital.png", { type: "image/png" });
        setSignatureFile(file);

        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/register/upload", { method: "POST", body: formData });
          const data = await res.json();

          if (data.success) {
            setSignaturePath(data.data.storagePath);
            setSignedAt(new Date().toISOString());
            resolve(true);
          } else {
            setUploadError(data.message ?? "Upload tanda tangan gagal");
            resolve(false);
          }
        } catch {
          setUploadError("Upload gagal. Periksa koneksi internet Anda.");
          resolve(false);
        } finally {
          setUploading(false);
        }
      }, "image/png");
    });
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
            tempatLahir: m.tempatLahir ? m.tempatLahir.trim().toUpperCase() : undefined,
            tanggalLahir: m.tanggalLahir || undefined,
            hubungan: m.hubungan || undefined,
          })),
          paketId: selectedPaketId,
          roomUpgrade: roomUpgrade || undefined,
          hotelUpgrade: hotelUpgrade || undefined,
          signaturePath: signaturePath || signaturePreview || undefined,
          signatureBase64: signaturePreview || undefined,
          signedAt,
        }),
      });

      const data = await res.json();
      setSubmitResult(data);
      if (data.success) {
        setStep(8);
      }
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
    { key: 8, label: "Pembayaran DP", icon: CreditCard },
  ];

  // Error screen
  if (submitResult && !submitResult.success && step !== 8) {
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
    <div className="w-full max-w-4xl mx-auto relative">
      <div className="relative z-10">
        {/* Top Notice Banner if draft was restored */}
        {isRestoredDraft && step < 8 && !paymentProofSubmitted && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Draft Pendaftaran Dipulihkan!</strong> Data isian Anda tersimpan otomatis. Anda melanjutkan dari <strong>Langkah {step} dari 8</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartFresh}
            className="text-amber-800 underline font-bold hover:text-amber-950 ml-4 shrink-0"
          >
            Mulai Dari Awal
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 bg-gradient-to-b from-white/20 to-white/05 backdrop-blur-[4px] p-6 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.1),0_15px_35px_-10px_rgba(0,0,0,0.2)]">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/30 mb-2">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">Registrasi Grup Umroh</h1>
        <p className="text-sm font-bold text-stone-200 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">Daftarkan rombongan Anda dalam 8 langkah mudah & cepat</p>
      </div>

      {/* Step indicator */}
      <div className="bg-[#061e17]/40 dark:bg-[#061e17]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_15px_30px_-10px_rgba(0,0,0,0.3)] mb-6 overflow-x-auto">
        <div className="relative flex items-start justify-between min-w-[580px] sm:min-w-[620px] max-w-4xl mx-auto">
          {/* Base Background Connecting Track */}
          <div className="absolute top-[18px] left-[6.25%] right-[6.25%] h-0.5 bg-emerald-800/60 dark:bg-emerald-800/60 z-0" />
          
          {/* Active Progress Filled Track */}
          <div
            className="absolute top-[18px] left-[6.25%] h-0.5 bg-emerald-500 transition-all duration-300 z-0"
            style={{
              width: `${((step - 1) / (steps.length - 1)) * 87.5}%`,
            }}
          />

          {/* Step Nodes */}
          {steps.map((s) => {
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
                  {isCompleted ? <Check className="w-4.5 h-4.5 text-white stroke-[2.5]" /> : s.key}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] mt-2 font-bold hidden sm:block text-center whitespace-nowrap transition-colors",
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

      {/* Step content */}
      <div className="bg-gradient-to-b from-white/20 to-white/08 backdrop-blur-[5px] p-6 sm:p-8 rounded-3xl border-t border-l border-white/90 border-b border-r border-slate-900/25 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),inset_-1.5px_-1.5px_4px_rgba(0,0,0,0.12),0_20px_50px_-15px_rgba(0,0,0,0.25)]">
        {/* Step 1: Representative */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">Data Perwakilan Grup</h2>
            <p className="text-sm font-semibold text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">Masukkan data perwakilan yang akan menjadi kontak utama grup.</p>

            <div>
              <label className="block text-sm font-extrabold text-slate-950 mb-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">Nama Perwakilan</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-20 pointer-events-none text-slate-800 stroke-[2] transition-all duration-200 group-focus-within:text-emerald-950 group-focus-within:opacity-100 group-focus-within:stroke-[2.5] group-focus-within:scale-110 group-hover:text-slate-950" />
                <input
                  type="text"
                  value={namaPerwakilan}
                  onChange={(e) => setNamaPerwakilan(e.target.value.toUpperCase())}
                  className={cn(
                    "w-full pl-10 pr-3.5 py-2.5 bg-white/15 backdrop-blur-sm rounded-xl text-sm uppercase transition-all font-bold text-slate-950 placeholder:text-slate-700/40 placeholder:font-normal placeholder:normal-case",
                    "border-t border-l border-slate-900/20 border-b border-r border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]",
                    "focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:border-emerald-700",
                    errors.namaPerwakilan ? "border-red-500 bg-red-50/70" : ""
                  )}
                  placeholder="Contoh: Nama Pendaftar"
                />
              </div>
              {errors.namaPerwakilan && <p className="text-xs text-red-600 mt-1 font-extrabold">{errors.namaPerwakilan}</p>}
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-950 mb-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">Nomor Telepon (WhatsApp)</label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-20 pointer-events-none text-slate-800 stroke-[2] transition-all duration-200 group-focus-within:text-emerald-950 group-focus-within:opacity-100 group-focus-within:stroke-[2.5] group-focus-within:scale-110 group-hover:text-slate-950" />
                <input
                  type="tel"
                  value={nomorTelepon}
                  onChange={(e) => setNomorTelepon(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-3.5 py-2.5 bg-white/15 backdrop-blur-sm rounded-xl text-sm transition-all font-bold text-slate-950 placeholder:text-slate-700/40 placeholder:font-normal",
                    "border-t border-l border-slate-900/20 border-b border-r border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]",
                    "focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:border-emerald-700",
                    errors.nomorTelepon ? "border-red-500 bg-red-50/70" : ""
                  )}
                  placeholder="Contoh: 081234567890"
                />
              </div>
              {errors.nomorTelepon && <p className="text-xs text-red-600 mt-1 font-extrabold">{errors.nomorTelepon}</p>}
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-950 mb-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-20 pointer-events-none text-slate-800 stroke-[2] transition-all duration-200 group-focus-within:text-emerald-950 group-focus-within:opacity-100 group-focus-within:stroke-[2.5] group-focus-within:scale-110 group-hover:text-slate-950" />
                <input
                  type="email"
                  value={emailPerwakilan}
                  onChange={(e) => setEmailPerwakilan(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-3.5 py-2.5 bg-white/15 backdrop-blur-sm rounded-xl text-sm transition-all font-bold text-slate-950 placeholder:text-slate-700/40 placeholder:font-normal",
                    "border-t border-l border-slate-900/20 border-b border-r border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]",
                    "focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:border-emerald-700",
                    errors.emailPerwakilan ? "border-red-500 bg-red-50/70" : ""
                  )}
                  placeholder="Contoh: nama@gmail.com"
                />
              </div>
              {errors.emailPerwakilan && <p className="text-xs text-red-600 mt-1 font-extrabold">{errors.emailPerwakilan}</p>}
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
                className="w-14 h-14 rounded-xl border-2 border-stone-300 bg-white flex items-center justify-center text-slate-800 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
                aria-label="Kurangi jumlah"
              >
                <Minus className="w-6 h-6 stroke-[3]" />
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
                    "w-24 h-14 text-center text-3xl font-black rounded-xl border-2 bg-white text-slate-950 shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600",
                    errors.paxCount ? "border-red-500 text-red-600" : "border-stone-300"
                  )}
                  style={{ MozAppearance: "textfield" }}
                />
                <p className="text-xs text-slate-800 font-extrabold mt-1.5 uppercase tracking-wider">orang</p>
              </div>

              <button
                type="button"
                onClick={() => setPaxCount((prev) => Math.min(MAX_GROUP_SIZE, prev + 1))}
                disabled={paxCount >= MAX_GROUP_SIZE}
                className="w-14 h-14 rounded-xl border-2 border-stone-300 bg-white flex items-center justify-center text-slate-800 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
                aria-label="Tambah jumlah"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
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
                        const nextElem = document.getElementById(`member_${i}_gender_L`);
                        if (nextElem) nextElem.focus();
                      }
                    }}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm uppercase transition-colors placeholder:text-gray-400 placeholder:font-normal placeholder:normal-case",
                      i === 0 && useRepAsJamaah1
                        ? "bg-gray-100 text-gray-700 cursor-not-allowed border-gray-200 font-medium"
                        : "focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 font-bold text-gray-900",
                      errors[`member_${i}_nama`] ? "border-red-300" : ""
                    )}
                    placeholder="Contoh: Nama Pendaftar"
                  />
                  {errors[`member_${i}_nama`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`member_${i}_nama`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Jenis Kelamin</label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        id={`member_${i}_gender_L`}
                        type="radio"
                        name={`gender_${i}`}
                        value="L"
                        checked={member.jenisKelamin === "L"}
                        onChange={() => updateMember(i, "jenisKelamin", "L")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const nextElem = document.getElementById(`member_${i}_tempatLahir`);
                            if (nextElem) nextElem.focus();
                          }
                        }}
                        className="h-4 w-4 text-emerald-700 border-stone-400 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-900">Laki-laki</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        id={`member_${i}_gender_P`}
                        type="radio"
                        name={`gender_${i}`}
                        value="P"
                        checked={member.jenisKelamin === "P"}
                        onChange={() => updateMember(i, "jenisKelamin", "P")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const nextElem = document.getElementById(`member_${i}_tempatLahir`);
                            if (nextElem) nextElem.focus();
                          }
                        }}
                        className="h-4 w-4 text-emerald-700 border-stone-400 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-900">Perempuan</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Tanggal Lahir
                    </label>
                    <input
                      id={`member_${i}_tglLahir`}
                      type="date"
                      value={member.tanggalLahir || ""}
                      onChange={(e) => updateMember(i, "tanggalLahir", e.target.value)}
                      style={{ colorScheme: "light" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const nextElem = document.getElementById(`member_${i}_hubungan`);
                          if (nextElem) {
                            nextElem.focus();
                          } else if (i < members.length - 1) {
                            const nextMemberName = document.getElementById(`member_${i + 1}_nama`);
                            if (nextMemberName) nextMemberName.focus();
                          } else {
                            const btnNext = document.getElementById("btn_next_step");
                            if (btnNext) btnNext.focus();
                          }
                        }
                      }}
                      className={cn(
                        "w-full h-11 px-3.5 py-2 border rounded-xl text-sm font-semibold text-slate-950 bg-white border-stone-300 shadow-xs transition-colors",
                        "[color-scheme:light]",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600",
                        errors[`member_${i}_tglLahir`] ? "border-red-400 ring-1 ring-red-400" : ""
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

                {members.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {i === 0
                        ? `Hubungan dengan Jamaah #2`
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
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-slate-950 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer shadow-xs"
                    >
                      <option value="" className="text-slate-950 bg-white font-extrabold py-2">Pilih hubungan...</option>
                      <option value="Suami" className="text-slate-950 bg-white font-bold py-1.5">Suami</option>
                      <option value="Istri" className="text-slate-950 bg-white font-bold py-1.5">Istri</option>
                      <option value="Ayah / Ibu" className="text-slate-950 bg-white font-bold py-1.5">Ayah / Ibu</option>
                      <option value="Anak" className="text-slate-950 bg-white font-bold py-1.5">Anak</option>
                      <option value="Kakak / Adik" className="text-slate-950 bg-white font-bold py-1.5">Kakak / Adik</option>
                      <option value="Keluarga / Mahram" className="text-slate-950 bg-white font-bold py-1.5">Keluarga / Mahram</option>
                      <option value="Teman / Rekan" className="text-slate-950 bg-white font-bold py-1.5">Teman / Rekan</option>
                      <option value="Lainnya" className="text-slate-950 bg-white font-bold py-1.5">Lainnya</option>
                    </select>
                  </div>
                )}
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
                {/* Package Select Dropdown (Searchable) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nama Paket Keberangkatan
                  </label>
                  <SearchableSelect
                    options={packageOptions}
                    value={selectedPaketId}
                    onChange={(val) => {
                      setSelectedPaketId(val);
                      setSelectedClusterIndex(0);
                      if (errors.paket) {
                        setErrors((prev) => ({ ...prev, paket: "" }));
                      }
                    }}
                    placeholder="-- Pilih / Cari Nama Paket Umroh --"
                    searchPlaceholder="Ketik nama paket, tanggal, atau maskapai..."
                    className={cn(
                      "w-full rounded-xl shadow-xs",
                      errors.paket && "border-red-500 ring-1 ring-red-500"
                    )}
                  />
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
                              const isPromo = cl.isPromo || cl.clusterName?.toUpperCase().includes("PROMO") || (cl as any).promo;
                              const isTanpaPerlengkapan = cl.perlengkapan === "EXCLUDE" || cl.tanpaPerlengkapan || (cl as any).isTanpaPerlengkapan;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClusterIndex(idx);
                                    if (cl.clusterName) setHotelUpgrade(cl.clusterName);
                                  }}
                                  className={cn(
                                    "p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-2.5",
                                    isSelected
                                      ? isPromo
                                        ? "border-purple-600 bg-purple-50/80 shadow-sm ring-1 ring-purple-500"
                                        : "border-blue-600 bg-blue-50/80 shadow-sm ring-1 ring-blue-500"
                                      : isPromo
                                        ? "border-purple-200 bg-gradient-to-br from-purple-50/30 to-white hover:border-purple-300"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn(
                                          "font-bold text-sm",
                                          isPromo ? "text-purple-900" : "text-gray-900"
                                        )}>
                                          {cl.clusterName || `Klaster ${idx + 1}`}
                                        </span>
                                        {isPromo && (
                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-800 border border-purple-400/40">
                                            🏷️ PROMO DEAL
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Perlengkapan Indicator */}
                                      <div>
                                        {isTanpaPerlengkapan ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                            ⚠️ Tanpa Perlengkapan (LA Only)
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            🎁 Termasuk Perlengkapan Lengkap
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && <CheckCircle2 className={cn("w-5 h-5 shrink-0", isPromo ? "text-purple-600" : "text-blue-600")} />}
                                  </div>

                                  <div className="text-xs text-gray-600 space-y-0.5 bg-white/70 p-2 rounded-lg border border-gray-100">
                                    <p>🕋 Mekkah: <strong>{cl.hotelMekkah || "TBA"}</strong></p>
                                    <p>🕌 Madinah: <strong>{cl.hotelMadinah || "TBA"}</strong></p>
                                  </div>

                                  <div className={cn(
                                    "text-xs font-bold pt-1.5 border-t",
                                    isPromo ? "text-purple-700 border-purple-100" : "text-blue-700 border-gray-100"
                                  )}>
                                    Harga Base: <span className="text-sm font-extrabold">Rp {clPrice.toLocaleString("id-ID")}</span> / pax
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

                      {/* Room Upgrade Options - Dynamically Filtered by paxCount */}
                      {(() => {
                        const showQuad = paxCount >= 4;
                        const showTriple = paxCount >= 3;
                        const showDouble = paxCount >= 2;
                        const showMix = true; // Always available

                        const hasInfant = members.some((m) => {
                          const ageInfo = calculateAge(m.tanggalLahir);
                          return ageInfo?.category === "Bayi" || (ageInfo?.age !== undefined && ageInfo.age < 2);
                        });

                        const visibleCardCount = (showQuad ? 1 : 0) + (showTriple ? 1 : 0) + (showDouble ? 1 : 0) + 1;
                        const gridColsClass =
                          visibleCardCount === 1
                            ? "grid-cols-1 max-w-sm mx-auto"
                            : visibleCardCount === 2
                            ? "grid-cols-1 sm:grid-cols-2"
                            : visibleCardCount === 3
                            ? "grid-cols-1 sm:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";

                        return (
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                                  🛏️ Pilihan Upgrade Tipe Kamar ({paxCount} Jamaah)
                                </label>
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {paxCount === 1
                                    ? "Tipe Kamar Tunggal: MIX (Travel)"
                                    : paxCount === 2
                                    ? "Opsi 2 Jamaah: Double / Mix"
                                    : paxCount === 3
                                    ? "Opsi 3 Jamaah: Triple / Double / Mix"
                                    : "Opsi 4+ Jamaah: Semua Tipe Kamar"}
                                </span>
                              </div>

                              <div className={cn("grid gap-3", gridColsClass)}>
                                {/* QUAD */}
                                {showQuad && (
                                  <button
                                    type="button"
                                    onClick={() => setRoomUpgrade("quad")}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "quad"
                                        ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500 shadow-sm"
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
                                )}

                                {/* TRIPLE */}
                                {showTriple && (
                                  <button
                                    type="button"
                                    onClick={() => setRoomUpgrade("triple")}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "triple"
                                        ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500 shadow-sm"
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
                                )}

                                {/* DOUBLE */}
                                {showDouble && (
                                  <button
                                    type="button"
                                    onClick={() => setRoomUpgrade("double")}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "double"
                                        ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500 shadow-sm"
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
                                )}

                                {/* MIX */}
                                {showMix && (
                                  <button
                                    type="button"
                                    onClick={() => setRoomUpgrade("mix")}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "mix"
                                        ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-500 shadow-sm"
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
                                )}
                              </div>
                            </div>

                             {/* Multi-Room Options for 5+ Pax */}
                            {paxCount >= 5 && (
                              <div className="p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 border border-blue-200 rounded-xl space-y-3 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🧩 Opsi Kombinasi Kamar Multi-Pax ({paxCount} Jamaah)</span>
                                  </label>
                                  {hasInfant && (
                                    <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                      🍼 Terdeteksi Anggota Bayi / Infant
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Combo Double + Triple */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRoomUpgrade("combo_double_triple");
                                      setIsCustomRoomAssignment(true);
                                      // Preset: First 2 members Double, next 3 members Triple
                                      setMembers((prev) =>
                                        prev.map((m, idx) => ({
                                          ...m,
                                          tipeKamar: idx < 2 ? "double" : idx < 5 ? "triple" : "mix",
                                        }))
                                      );
                                    }}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "combo_double_triple"
                                        ? "border-blue-600 bg-blue-50/90 ring-1 ring-blue-500 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-gray-900">Upgrade Double + Triple</span>
                                      {roomUpgrade === "combo_double_triple" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </div>
                                    <p className="text-[11px] text-gray-500">2 Pax Double + 3 Pax Triple</p>
                                    <p className="text-xs font-bold text-blue-700 mt-1">Kombinasi Upgrade</p>
                                  </button>

                                  {/* Combo Quad + Mix */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRoomUpgrade("combo_quad_mix");
                                      setIsCustomRoomAssignment(true);
                                      // Preset: First 4 members Quad, rest Mix
                                      setMembers((prev) =>
                                        prev.map((m, idx) => ({
                                          ...m,
                                          tipeKamar: idx < 4 ? "quad" : "mix",
                                        }))
                                      );
                                    }}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5",
                                      roomUpgrade === "combo_quad_mix"
                                        ? "border-blue-600 bg-blue-50/90 ring-1 ring-blue-500 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-gray-900">Quad Family & Mix</span>
                                      {roomUpgrade === "combo_quad_mix" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </div>
                                    <p className="text-[11px] text-gray-500">4 Pax Quad + Sisa Mix Travel</p>
                                    <p className="text-xs font-bold text-emerald-700 mt-1">Base (+ Rp 0)</p>
                                  </button>

                                  {/* QUINF (Quad + Infant) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRoomUpgrade("quinf");
                                      setIsCustomRoomAssignment(false);
                                    }}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden",
                                      roomUpgrade === "quinf"
                                        ? "border-amber-600 bg-amber-50/90 ring-1 ring-amber-500 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                  >
                                    {hasInfant && (
                                      <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl">
                                        Infant Recommended
                                      </span>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-amber-950">QUINF (Quad + Infant)</span>
                                      {roomUpgrade === "quinf" && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                    </div>
                                    <p className="text-[11px] text-gray-500">1 Kamar Quad (4 Dewasa + 1 Bayi)</p>
                                    <p className="text-xs font-bold text-amber-800 mt-1">Khusus Rombongan Ada Infant</p>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Individual Member Room Placement Selector (For Multi-Member Groups) */}
                            {paxCount >= 2 && (
                              <div className="bg-white border border-blue-200/90 rounded-xl p-4 space-y-3 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>👤 Penentuan Tipe Kamar Per Jamaah ({members.length} Anggota)</span>
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                      Tentukan tipe kamar spesifik untuk masing-masing jamaah dalam rombongan.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsCustomRoomAssignment(!isCustomRoomAssignment)}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline self-start sm:self-center shrink-0"
                                  >
                                    {isCustomRoomAssignment ? "Ganti ke Mode Seragam" : "Atur Spesifik Per Jamaah"}
                                  </button>
                                </div>

                                {isCustomRoomAssignment && (
                                  <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                      <span className="font-semibold text-slate-700">Preset Cepat Kombinasi:</span>
                                      <div className="flex gap-2 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMembers((prev) =>
                                              prev.map((m, idx) => ({
                                                ...m,
                                                tipeKamar: idx < 2 ? "double" : "mix",
                                              }))
                                            );
                                          }}
                                          className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded font-semibold text-[10px] hover:bg-blue-100"
                                        >
                                          1 Double + Sisa Mix
                                        </button>
                                        {paxCount >= 5 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMembers((prev) =>
                                                prev.map((m, idx) => ({
                                                  ...m,
                                                  tipeKamar: idx < 2 ? "double" : idx < 5 ? "triple" : "mix",
                                                }))
                                              );
                                            }}
                                            className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded font-semibold text-[10px] hover:bg-indigo-100"
                                          >
                                            1 Double + 1 Triple + Sisa Mix
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-slate-50/50">
                                      {members.map((m, idx) => {
                                        const currentRoom = m.tipeKamar || roomUpgrade || "mix";
                                        const mAge = calculateAge(m.tanggalLahir);
                                        return (
                                          <div
                                            key={idx}
                                            className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                {idx + 1}
                                              </span>
                                              <div>
                                                <span className="text-xs font-bold text-slate-900">
                                                  {m.namaLengkap ? m.namaLengkap.toUpperCase() : `Jamaah #${idx + 1}`}
                                                </span>
                                                {mAge && (
                                                  <span className="ml-1.5 text-[10px] font-semibold text-slate-500">
                                                    ({mAge.category})
                                                  </span>
                                                )}
                                                {idx === 0 && (
                                                  <span className="ml-1.5 text-[9px] font-extrabold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                    PIC
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <select
                                                value={currentRoom}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setMembers((prev) =>
                                                    prev.map((item, i) => (i === idx ? { ...item, tipeKamar: val } : item))
                                                  );
                                                }}
                                                className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-bold text-slate-950 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                                              >
                                                <option value="mix" className="text-slate-950 bg-white font-bold py-1.5">MIX (Kamar Travel - Base +Rp0)</option>
                                                <option value="quad" className="text-slate-950 bg-white font-bold py-1.5">QUAD (4 Pax - Base +Rp0)</option>
                                                <option value="triple" className="text-slate-950 bg-white font-bold py-1.5">
                                                  TRIPLE (3 Pax - +Rp {upgradeTriple.toLocaleString("id-ID")})
                                                </option>
                                                <option value="double" className="text-slate-950 bg-white font-bold py-1.5">
                                                  DOUBLE (2 Pax - +Rp {upgradeDouble.toLocaleString("id-ID")})
                                                </option>
                                              </select>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Pricing Summary Breakdown */}
                            {(() => {
                              let totalSurcharge = 0;
                              if (isCustomRoomAssignment) {
                                members.forEach((m) => {
                                  const room = m.tipeKamar || roomUpgrade || "mix";
                                  if (room === "double") totalSurcharge += upgradeDouble;
                                  else if (room === "triple") totalSurcharge += upgradeTriple;
                                });
                              } else {
                                const perPaxSurcharge =
                                  roomUpgrade === "triple"
                                    ? upgradeTriple
                                    : roomUpgrade === "double"
                                    ? upgradeDouble
                                    : roomUpgrade === "combo_double_triple"
                                    ? Math.round((2 * upgradeDouble + 3 * upgradeTriple) / (paxCount || 5))
                                    : 0;
                                totalSurcharge = perPaxSurcharge * paxCount;
                              }

                              const totalGroup = basePrice * paxCount + totalSurcharge;
                              const averagePerPax = Math.round(totalGroup / (paxCount || 1));

                              return (
                                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs shadow-inner">
                                  <div className="flex justify-between items-center text-slate-300">
                                    <span>Harga Base Paket ({isMultiCluster ? activeCluster?.clusterName : "Reguler"}):</span>
                                    <span>Rp {basePrice.toLocaleString("id-ID")} / pax</span>
                                  </div>
                                  {totalSurcharge > 0 && (
                                    <div className="flex justify-between items-center text-amber-300 font-medium">
                                      <span>Total Upgrade Kamar Rombongan:</span>
                                      <span>+ Rp {totalSurcharge.toLocaleString("id-ID")}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center text-slate-200 font-semibold pt-1 border-t border-slate-700">
                                    <span>Rata-Rata Total per Pax:</span>
                                    <span>Rp {averagePerPax.toLocaleString("id-ID")} / pax</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm font-extrabold text-blue-400 pt-1.5 border-t border-slate-700">
                                    <span>Total Registrasi Rombongan ({paxCount} PAX):</span>
                                    <span className="text-base text-emerald-400">
                                      Rp {totalGroup.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
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
            <div>
              <h2 className="text-lg font-black text-slate-950">Tanda Tangan Digital</h2>
              <p className="text-sm font-semibold text-slate-800">
                Goreskan tanda tangan langsung di layar ponsel/laptop Anda, atau unggah foto tanda tangan PIC pada kertas putih.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex gap-2 p-1 bg-white/30 backdrop-blur-md rounded-xl border border-white/60 max-w-sm">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={cn(
                  "flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  signatureMode === "draw"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-slate-700 hover:bg-white/40"
                )}
              >
                <PenTool className="w-3.5 h-3.5" />
                Gambar Tulis Langsung
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={cn(
                  "flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  signatureMode === "upload"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-slate-700 hover:bg-white/40"
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                Unggah File Foto
              </button>
            </div>

            {/* Signature Display Container */}
            <div className="bg-white/30 backdrop-blur-md border-t border-l border-white/90 border-b border-r border-slate-900/20 rounded-2xl p-6 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),0_10px_25px_-5px_rgba(0,0,0,0.15)] text-center">
              {activeSignatureSrc ? (
                <div className="space-y-3 max-w-xs mx-auto bg-white p-4 rounded-xl border border-slate-200 shadow-md">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pratinjau Tanda Tangan Digital</p>
                  <img
                    src={activeSignatureSrc}
                    alt="Tanda Tangan Digital"
                    className="max-h-36 max-w-full mx-auto object-contain"
                    onError={(e) => {
                      if (signaturePath && !signaturePath.startsWith("data:")) {
                        (e.target as HTMLImageElement).src = `/api/storage/download?path=${encodeURIComponent(signaturePath)}`;
                      }
                    }}
                  />
                  <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tanda Tangan Terverifikasi & Tersimpan
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearCanvasSignature();
                      clearSignature();
                    }}
                    className="text-xs text-red-600 hover:underline font-bold pt-1 block mx-auto"
                  >
                    Hapus & Tanda Tangan Ulang
                  </button>
                </div>
              ) : signatureMode === "draw" ? (
                /* Canvas Drawing Pad */
                <div className="space-y-3 max-w-md mx-auto">
                  <p className="text-xs font-bold text-slate-700">
                    Gunakan Jari / Mouse / Stylus untuk membuat Tanda Tangan di bawah ini:
                  </p>
                  <div className="bg-white rounded-xl border-2 border-dashed border-slate-400 p-1 shadow-inner relative touch-none">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={180}
                      onMouseDown={startDrawingCanvas}
                      onMouseMove={drawCanvas}
                      onMouseUp={stopDrawingCanvas}
                      onMouseLeave={stopDrawingCanvas}
                      onTouchStart={startDrawingCanvas}
                      onTouchMove={drawCanvas}
                      onTouchEnd={stopDrawingCanvas}
                      className="w-full h-44 bg-white rounded-lg cursor-crosshair block"
                    />
                    {!hasDrawnOnCanvas && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                        (Coret/Tanda tangan di area ini)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={clearCanvasSignature}
                      className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                    >
                      Bersihkan Canvas
                    </button>
                    <button
                      type="button"
                      onClick={saveCanvasSignature}
                      disabled={!hasDrawnOnCanvas || uploading}
                      className={cn(
                        "px-5 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 shadow-md transition-all flex items-center gap-1.5",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Simpan Tanda Tangan Ini
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Image File Upload Mode */
                <div className="space-y-3 max-w-sm mx-auto">
                  <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-md transition-all">
                      <Upload className="w-4 h-4" />
                      Pilih Foto Tanda Tangan (PNG/JPG)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleSignatureChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Maksimal file 100 KB dengan foto pada kertas putih polos</p>
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-xs font-bold text-emerald-800">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  Mengunggah & Menyimpan Tanda Tangan...
                </div>
              )}

              {uploadError && <p className="text-xs font-bold text-red-600 mt-3">{uploadError}</p>}
            </div>

            {errors.signature && <p className="text-xs text-red-600 font-extrabold">{errors.signature}</p>}
          </div>
        )}

        {/* Step 7: Document Preview & Confirmation */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Review & Pratinjau Dokumen Pendaftaran</h2>
              <p className="text-sm font-semibold text-slate-800">
                Berikut adalah pratinjau lembar Formulir & Surat Pernyataan Pendaftaran resmi yang memuat data rombongan dan tanda tangan elektronik perwakilan.
              </p>
            </div>

            {/* Official Document Paper Preview Container */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-3 sm:p-5 md:p-6 shadow-lg relative text-slate-800 font-sans max-w-3xl mx-auto overflow-hidden">

              {/* Green V Logo Watermark Background behind document content */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.20] z-0 overflow-hidden pt-16">
                <img
                  src="/templates/template-surat/watermark_logo.png"
                  alt="Watermark Logo VTU ABADI"
                  className="w-[65%] max-w-[360px] object-contain"
                />
              </div>

              {/* Document Content Box (Above Watermark) */}
              <div className="relative z-10 space-y-4">

                {/* Official Letterhead Header (100% Proportionate, Compact) */}
                <div className="border-b-2 border-slate-800 pb-1 mb-1.5 overflow-hidden rounded-t-lg relative">
                  <img
                    src="/templates/template-surat/kop_surat.jpeg"
                    alt="Kop Surat Official VTU ABADI"
                    className="w-full h-auto object-contain block"
                  />
                </div>

                <div className="text-center space-y-0.5 py-0">
                  <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
                    FORMULIR PENDAFTARAN UMROH
                  </h2>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700">VTU ABADI</h3>
                </div>

                {/* Section A: DATA PENDAFTAR */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-800">
                    A. DATA PENDAFTAR
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2 pt-1">
                    <div className="flex">
                      <span className="w-44 text-slate-500 font-medium shrink-0">ID / No. Registrasi Rombongan:</span>
                      <span className="font-bold text-blue-700">GRP-2026-PREVIEW</span>
                    </div>
                    <div className="flex">
                      <span className="w-44 text-slate-500 font-medium shrink-0">Nama Lengkap PIC:</span>
                      <span className="font-bold text-slate-900 uppercase">{namaPerwakilan || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-44 text-slate-500 font-medium shrink-0">Nomor Telepon / WhatsApp:</span>
                      <span className="font-semibold text-slate-900">{nomorTelepon || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-44 text-slate-500 font-medium shrink-0">Email:</span>
                      <span className="font-semibold text-slate-900">{emailPerwakilan || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-44 text-slate-500 font-medium shrink-0">Tempat & Tanggal Lahir:</span>
                      <span className="font-bold text-slate-900">
                        {members[0]?.tempatLahir ? members[0].tempatLahir.toUpperCase() : "-"} / {members[0]?.tanggalLahir || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: DATA ANGGOTA PENDAFTAR */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-800">
                    B. DATA ANGGOTA PENDAFTAR
                  </h3>
                  <p className="text-[11px] italic text-slate-500 px-2">
                    Diisi apabila pendaftaran dilakukan untuk lebih dari satu jamaah.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2 border-r border-slate-200 w-8 text-center">No.</th>
                          <th className="p-2 border-r border-slate-200">Nama Anggota</th>
                          <th className="p-2 border-r border-slate-200">Tempat Lahir</th>
                          <th className="p-2 border-r border-slate-200 text-center">Tanggal Lahir</th>
                          <th className="p-2 text-center">Hubungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {members.map((m, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">{i + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900 uppercase">{m.namaLengkap}</td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">{m.tempatLahir ? m.tempatLahir.toUpperCase() : "-"}</td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-700">{m.tanggalLahir || "-"}</td>
                            <td className="p-2 text-center text-slate-700 font-medium">{m.hubungan || (i === 0 ? "Ketua Grup" : "-")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section C: PAKET & KLASTER PAKET UMROH */}
                {selectedPaket && (() => {
                  const ROOM_NAMES: Record<string, string> = {
                    mix: "MIX — Penempatan kamar diatur travel",
                    quad: "QUAD — 4 Orang / Kamar",
                    triple: "TRIPLE — 3 Orang / Kamar",
                    double: "DOUBLE — 2 Orang / Kamar",
                  };

                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-800">
                        C. PAKET & KLASTER PAKET UMROH
                      </h3>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 font-medium">Nama Paket:</span>{" "}
                            <span className="font-bold text-slate-900">
                              {selectedPaket.namaPaket || (selectedPaket as any).paketUmroh?.namaPaket || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Tipe / Klaster:</span>{" "}
                            <span className="font-bold text-blue-700">
                              {(selectedPaket as any).clusters?.[selectedClusterIndex]?.clusterName || "Standar Paket"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Preferensi Kamar:</span>{" "}
                            <span className="font-semibold text-slate-900">{ROOM_NAMES[roomUpgrade] || roomUpgrade}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Jumlah Rombongan:</span>{" "}
                            <span className="font-bold text-emerald-700">{paxCount} PAX</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Section D: SYARAT & KETENTUAN */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-800">
                    D. PERSETUJUAN SYARAT & KETENTUAN
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5 text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Dengan mengisi dan menandatangani formulir ini, pendaftar menyatakan bahwa:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                      <li>Saya telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan Pendaftaran Umroh VTU ABADI.</li>
                      <li>Saya menjamin keabsahan dan kebenaran seluruh data jamaah yang disampaikan dalam pendaftaran ini.</li>
                      <li>Saya bersedia menyelesaikan kewajiban pembayaran Down Payment (DP) & Pelunasan tepat waktu.</li>
                    </ul>
                  </div>
                </div>

                {/* Section F: PERNYATAAN PERSETUJUAN (SIGNATURE BOX) */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-800">
                    F. PERNYATAAN PERSETUJUAN
                  </h3>
                  <div className="max-w-xs mx-auto border border-slate-300 rounded-xl overflow-hidden text-xs shadow-sm">
                    <div className="bg-slate-100 font-bold p-2 text-center border-b border-slate-300 text-slate-800">
                      PENDAFTAR / KETUA ROMBONGAN
                    </div>
                    <div className="p-3 text-center space-y-2 bg-white">
                      <div className="h-24 flex items-center justify-center border border-dashed border-slate-300 rounded-lg bg-slate-50">
                        {activeSignatureSrc ? (
                          <img
                            src={activeSignatureSrc}
                            alt="Tanda Tangan Digital"
                            className="max-h-20 max-w-full object-contain mx-auto"
                            onError={(e) => {
                              if (signaturePath && !signaturePath.startsWith("data:")) {
                                (e.target as HTMLImageElement).src = `/api/storage/download?path=${encodeURIComponent(signaturePath)}`;
                              }
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">[Tanda Tangan Digital]</span>
                        )}
                      </div>
                      <p className="font-bold uppercase text-slate-900 pt-1">({namaPerwakilan || "NAMA PENDAFTAR"})</p>
                    </div>
                  </div>
                  <p className="text-[11px] italic text-center text-slate-500 pt-1">
                    Catatan: Data paspor dan dokumen lainnya dapat dilengkapi pada tahap administrasi berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: PEMBAYARAN & UPLOAD BUKTI TRANSFER DP */}
        {step === 8 && (
          <div className="space-y-6">
            {paymentProofSubmitted ? (
              /* Step 8 Completed Success Screen */
              <div className="text-center py-6 px-4 space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">
                  {paymentMethodOption === "tunai" 
                    ? "Registrasi Tunai Berhasil Dicatat! 🎉" 
                    : "Bukti Pembayaran DP Berhasil Diunggah! 🎉"}
                </h2>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  {paymentMethodOption === "tunai" ? (
                    <>
                      Terima kasih <strong>{namaPerwakilan}</strong>. Registrasi rombongan Anda untuk kode registrasi{" "}
                      <span className="font-mono font-bold text-blue-800">
                        {submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "-"}
                      </span>{" "}
                      dengan metode <strong>Pembayaran Tunai (Bayar di Kantor)</strong> telah berhasil dicatat. Silakan kunjungi kantor VTU Travel untuk menyelesaikan pembayaran DP tunai Anda.
                    </>
                  ) : (
                    <>
                      Terima kasih <strong>{namaPerwakilan}</strong>. Bukti transfer DP untuk kode registrasi{" "}
                      <span className="font-mono font-bold text-blue-800">
                        {submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "-"}
                      </span>{" "}
                      telah berhasil dikirim dan akan diverifikasi oleh Tim Keuangan VTU ABADI dalam 1x24 jam.
                    </>
                  )}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5 text-blue-900">
                  <p className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" /> Informasi Selanjutnya:</p>
                  <p>• Salinan Formulir Pendaftaran & Tanda Terima telah dikirimkan ke email <strong>{emailPerwakilan}</strong>.</p>
                  <p>• Tim Operasional kami akan menghubungi WhatsApp <strong>{nomorTelepon}</strong> untuk konfirmasi berkas fisik.</p>
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md transition-all"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            ) : (
              /* Step 8 Payment Proof Upload Form */
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    Langkah 8 dari 8 — Pembayaran Down Payment (DP)
                  </div>
                  <h2 className="text-xl font-bold">Instruksi Pembayaran & Upload Bukti Transfer</h2>
                  <p className="text-xs text-blue-100 mt-1">
                    Silakan selesaikan pembayaran DP minimal 30% untuk mengamankan kuota pendaftaran rombongan Anda.
                  </p>
                </div>

                {/* Payment Method Selector (Transfer vs Tunai) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Pilih Metode Pembayaran DP:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethodOption("transfer");
                        setPaymentProofError("");
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border-2 text-left transition-all flex items-start justify-between gap-2",
                        paymentMethodOption === "transfer"
                          ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>1. Transfer Bank (BSI / Online)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Transfer ke rekening resmi VTU & upload foto bukti transfer.
                        </p>
                      </div>
                      {paymentMethodOption === "transfer" && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethodOption("tunai");
                        setPaymentProofError("");
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border-2 text-left transition-all flex items-start justify-between gap-2",
                        paymentMethodOption === "tunai"
                          ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                          <span>2. Pembayaran Tunai (Cash di Kantor)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Bayar langsung di kantor VTU Travel atau melalui perwakilan resmi.
                        </p>
                      </div>
                      {paymentMethodOption === "tunai" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Summary & Bank Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Order Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
                      Ringkasan Pendaftaran
                    </h3>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kode Registrasi:</span>
                        <span className="font-mono font-bold text-blue-900">
                          {submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nama PIC:</span>
                        <span className="font-bold text-gray-800 uppercase">{namaPerwakilan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jumlah Jamaah:</span>
                        <span className="font-bold text-gray-800">{paxCount} PAX</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Paket Umroh:</span>
                        <span className="font-semibold text-gray-800">
                          {selectedPaket?.namaPaket || selectedPaket?.paketUmroh?.namaPaket || "-"}
                        </span>
                      </div>
                    </div>

                    {/* Calculated DP (Standar Per Pax Config + Custom DP Switch) */}
                    {selectedPaket && (() => {
                      const price = (selectedPaket as any).hargaStartingFrom ?? (selectedPaket as any).hargaPaket ?? (selectedPaket as any).paketUmroh?.hargaQuad ?? 30000000;
                      const totalEstimasi = price * paxCount;
                      let defaultDpPerPax = 5000000;
                      if (typeof window !== "undefined") {
                        const saved = localStorage.getItem("vtu_bank_config");
                        if (saved) {
                          try {
                            const parsed = JSON.parse(saved);
                            if (parsed.minDpPerPax) defaultDpPerPax = parseInt(parsed.minDpPerPax, 10) || 5000000;
                          } catch (e) { }
                        }
                      }
                      const minimalDpStandard = defaultDpPerPax * paxCount;
                      const parsedCustomDp = parseInt(customDpAmount.replace(/\D/g, ""), 10) || 0;
                      const effectiveDp = isCustomDp && parsedCustomDp > 0 ? parsedCustomDp : minimalDpStandard;

                      return (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-amber-800">Estimasi Biaya ({paxCount} PAX):</span>
                            <span className="font-semibold text-amber-900">Rp {totalEstimasi.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                            <span className="font-bold text-amber-900">Nominal Minimal DP (Rp {(defaultDpPerPax / 1000000).toLocaleString("id-ID")} Juta / Pax):</span>
                            <span className="font-extrabold text-blue-900 text-sm">
                              Rp {minimalDpStandard.toLocaleString("id-ID")}
                            </span>
                          </div>

                          {/* Saklar / Toggle Switch for Custom DP */}
                          <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isCustomDp}
                                onChange={(e) => {
                                  setIsCustomDp(e.target.checked);
                                  if (!e.target.checked) setCustomDpAmount("");
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>Bayar Nominal DP Lainnya (Custom)</span>
                            </label>
                            {isCustomDp && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                Aktif
                              </span>
                            )}
                          </div>

                          {/* Column Input for Custom DP */}
                          {isCustomDp && (
                            <div className="pt-1.5 space-y-1">
                              <label className="block text-[11px] font-bold text-blue-900">
                                Masukkan Nominal DP Yang Dibayar (Rp):
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={customDpAmount ? `Rp ${parseInt(customDpAmount.replace(/\D/g, ""), 10).toLocaleString("id-ID")}` : ""}
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace(/\D/g, "");
                                  setCustomDpAmount(rawVal);
                                }}
                                placeholder={`Misal: Rp ${(minimalDpStandard + 2000000).toLocaleString("id-ID")}`}
                                className="w-full h-9 px-3 text-xs font-bold font-mono bg-white border-2 border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-950"
                              />
                            </div>
                          )}

                          {/* Total DP Effective Display */}
                          <div className="flex justify-between text-xs pt-1.5 border-t border-amber-200">
                            <span className="font-extrabold text-amber-950">
                              {isCustomDp ? "Nominal DP Yang Dicatat:" : "Nominal DP Pembayaran:"}
                            </span>
                            <span className="font-extrabold text-blue-900 text-sm">
                              Rp {effectiveDp.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {paymentMethodOption === "transfer" ? (
                    <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 uppercase">Rekening Tujuan Pembayaran</h3>
                          <p className="text-[10px] text-gray-500">Transfer Resmi PT VTU ABADI TRAVEL</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        {(() => {
                          let bankName = "Bank Syariah Indonesia (BSI)";
                          let bankAccount = "7123 4567 89";
                          let bankHolder = "PT VTU ABADI TRAVEL";
                          if (typeof window !== "undefined") {
                            const saved = localStorage.getItem("vtu_bank_config");
                            if (saved) {
                              try {
                                const parsed = JSON.parse(saved);
                                if (parsed.bankName) bankName = parsed.bankName;
                                if (parsed.bankAccount) bankAccount = parsed.bankAccount;
                                if (parsed.bankHolder) bankHolder = parsed.bankHolder;
                              } catch (e) { }
                            }
                          }
                          const rawAccountNum = bankAccount.replace(/\s+/g, "");

                          return (
                            <>
                              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                <p className="text-[10px] text-blue-600 font-semibold uppercase">Nama Bank</p>
                                <p className="font-bold text-gray-900 text-sm">{bankName}</p>
                              </div>

                              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-blue-600 font-semibold uppercase">Nomor Rekening</p>
                                  <p className="font-mono font-bold text-blue-900 text-base">{bankAccount}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(rawAccountNum);
                                    setCopiedAccount(true);
                                    setTimeout(() => setCopiedAccount(false), 2000);
                                  }}
                                  className="px-2.5 py-1 bg-white border border-blue-300 rounded text-[11px] font-semibold text-blue-700 hover:bg-blue-100 flex items-center gap-1"
                                >
                                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedAccount ? "Tersalin" : "Salin"}
                                </button>
                              </div>

                              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                <p className="text-[10px] text-blue-600 font-semibold uppercase">Atas Nama Rekening</p>
                                <p className="font-bold text-gray-900">{bankHolder}</p>
                              </div>
                            </>
                          );
                        })()}

                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-amber-700 font-semibold uppercase">Berita Transfer / Ref</p>
                            <p className="font-mono font-bold text-amber-900">
                              {submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "-"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const refCode = submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "";
                              navigator.clipboard.writeText(refCode);
                              setCopiedRef(true);
                              setTimeout(() => setCopiedRef(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-white border border-amber-300 rounded text-[11px] font-semibold text-amber-800 hover:bg-amber-100 flex items-center gap-1"
                          >
                            {copiedRef ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedRef ? "Tersalin" : "Salin Ref"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 uppercase">Pembayaran Tunai (Cash)</h3>
                          <p className="text-[10px] text-gray-500">Bayar Langsung ke Kantor PT VTU ABADI TRAVEL</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Lokasi Kantor Pusat</p>
                          <p className="font-bold text-gray-900 text-sm">PT Vauza Tamma Abadi</p>
                          <p className="text-gray-700 mt-1">Ruko Griya Shanta, Jl. Soekarno Hatta No.1, Kota Malang, Jawa Timur</p>
                        </div>

                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-amber-700 font-semibold uppercase">Kode Registrasi Referensi</p>
                            <p className="font-mono font-bold text-amber-900 text-base">
                              {submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "-"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const refCode = submitResult?.kodeRegistrasi || (submitResult as any)?.data?.kodeRegistrasi || "";
                              navigator.clipboard.writeText(refCode);
                              setCopiedRef(true);
                              setTimeout(() => setCopiedRef(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-white border border-amber-300 rounded text-[11px] font-semibold text-amber-800 hover:bg-amber-100 flex items-center gap-1"
                          >
                            {copiedRef ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedRef ? "Tersalin" : "Salin Ref"}
                          </button>
                        </div>

                        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Instruksi Pembayaran</p>
                          <p className="text-gray-700 mt-1 font-medium leading-relaxed">
                            Silakan kunjungi kantor kami pada jam operasional (Senin - Sabtu, 08:00 - 17:00 WIB) dengan menunjukkan <strong>Kode Registrasi Referensi</strong> di atas untuk menyelesaikan administrasi DP tunai dan menerima kwitansi resmi.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload File Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    {paymentMethodOption === "tunai" 
                      ? "Upload Foto Kuitansi / Tanda Terima Tunai (Opsional)" 
                      : "Upload Foto / File Bukti Transfer DP"}
                  </h3>

                  <div className="border-2 border-dashed border-blue-300 bg-white rounded-xl p-6 text-center space-y-3 hover:bg-blue-50/50 transition-colors">
                    {paymentProofPreview ? (
                      <div className="space-y-3">
                        <img
                          src={paymentProofPreview}
                          alt="Kuitansi / Bukti Pembayaran DP"
                          className="max-h-48 max-w-full mx-auto rounded-lg shadow-sm border object-contain"
                        />
                        <p className="text-xs text-gray-500 font-medium">{paymentProofFile?.name}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProofFile(null);
                            setPaymentProofPreview("");
                          }}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Ganti File
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-2">
                        <Upload className="w-10 h-10 text-blue-500 mx-auto" />
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {paymentMethodOption === "tunai" 
                              ? "Pilih Foto Kuitansi Pembayaran (Jika Ada)" 
                              : "Pilih Foto atau File Bukti Transfer"}
                          </p>
                          <p className="text-xs text-gray-400">Format: JPG, JPEG, PNG, PDF (Maksimal 5 MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPaymentProofFile(file);
                              if (file.type.startsWith("image/")) {
                                setPaymentProofPreview(URL.createObjectURL(file));
                              } else {
                                setPaymentProofPreview("");
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {paymentProofError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      {paymentProofError}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handlePaymentProofSubmit}
                      disabled={isUploadingProof}
                      className={cn(
                        "w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {isUploadingProof ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memproses Pembayaran...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {paymentMethodOption === "tunai" 
                            ? "Konfirmasi Pendaftaran & Bayar di Kantor" 
                            : "Kirim Bukti Pembayaran DP"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 8 && (
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
                    Mengirim Pendaftaran...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Kirim Pendaftaran & Lanjut ke Pembayaran DP
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs font-medium text-slate-700 mt-6 bg-white/60 backdrop-blur-sm py-2 px-4 rounded-full inline-block mx-auto">
        Sudah punya akun?{" "}
        <a href="/login" className="text-emerald-700 font-bold hover:underline">Login di sini</a>
      </p>
    </div>
  </div>
  );
}
