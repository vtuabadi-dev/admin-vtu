"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { cn, formatNumberWithDots, formatDateDdMmmmTttt, normalizeToIsoDate } from "@/shared/lib/utils";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER
} from "@/shared/lib/mock-data";
import { Upload, Loader2, FileText, AlertTriangle, Sparkles, Plus, X, Split, Layers } from "lucide-react";
import { generateVtuGroupCode } from "@/shared/lib/group-code.helper";
import { PairingCanvas } from "./components/PairingCanvas";

  interface MasterDataOptions {
    airlines: any[];
    hotels: any[];
    cities: any[];
    packageTypes: any[];
    routes?: any[];
    clusters?: any[];
  }
  
interface DepartureDateRowState {
  departureDate: string;
  arrivalDate: string;
  source: 'OCR' | 'Manual' | '-';
  status: 'Generated' | 'Edited' | '-';
  isManualOverride: boolean;
}

export default function GeneratePaketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    count: number;
    items: { name: string; code: string; date: string }[];
  } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [options, setOptions] = useState<MasterDataOptions | null>(null);

  // Tab path selection
  const [pathMode, setPathMode] = useState<"manual" | "ocr">("manual");

  // Mode Generator (Buat Paket Baru vs Pecah Starting Point)
  const [generateMode, setGenerateMode] = useState<"new" | "split">("new");
  const [existingGroups, setExistingGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedParentGroupId, setSelectedParentGroupId] = useState<string>("");
  const [showPairingCanvas, setShowPairingCanvas] = useState(false);

  // OCR state — multi-file drag-and-drop
  const [flyerFiles, setFlyerFiles] = useState<File[]>([]);
  const [flyerPreviews, setFlyerPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ocrWarning, setOcrWarning] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrDateInfo, setOcrDateInfo] = useState<{ count: number; dates: string[] } | null>(null);
  const [rawOcrResult, setRawOcrResult] = useState<{
    extracted: any;
    mapped: {
      airline: string | null;
      city: string | null;
      packageType: string | null;
      route: string | null;
      hotelMekkah: string | null;
      hotelMadinah: string | null;
    };
  } | null>(null);
  const [activeCanvasTab, setActiveCanvasTab] = useState<"summary" | "json" | "dates" | "ocr_text">("summary");
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 10;

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(f =>
      f.type.startsWith("image/")
    );
    setFlyerFiles(prev => {
      const combined = [...prev, ...arr].slice(0, MAX_FILES);
      // Build previews for new files
      const newPreviews = arr.slice(0, MAX_FILES - prev.length).map(f => URL.createObjectURL(f));
      setFlyerPreviews(p => [...p, ...newPreviews].slice(0, MAX_FILES));
      return combined;
    });
  }, []);

  const removeFile = (index: number) => {
    setFlyerFiles(prev => prev.filter((_, i) => i !== index));
    setFlyerPreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Main Form Data
  const [formData, setFormData] = useState({
    jenisPaketId: "",
    namaPaket: "",
    kodePaket: "",
    kodeGrup: "",
    startingPointId: "",
    landingPatternId: "",
    maskapaiId: "",
    hotelMekkahId: "",
    hotelMadinahId: "",
    isAdaKlaster: "tidak",
    kapasitas: "",
    isAdaPerlengkapan: "",
    hargaBase: "",
    durasiHari: "9",
    upgradeDouble: "",
    upgradeTriple: "",
  });

  const [departureDateRows, setDepartureDateRows] = useState<DepartureDateRowState[]>([
    { departureDate: "", arrivalDate: "", source: "-", status: "-", isManualOverride: false }
  ]);

  // Derived departure dates list (non-empty dates only)
  const departureDates = useMemo(() => {
    return departureDateRows
      .map(r => r.departureDate)
      .filter(d => d && d.trim() !== "");
  }, [departureDateRows]);

  const calculateReturnDate = (depDateStr: string, durDaysStr: string): string => {
    if (!depDateStr) return "";
    const date = new Date(depDateStr);
    const days = parseInt(durDaysStr, 10) || 9;
    date.setDate(date.getDate() + Math.max(0, days - 1));
    return date.toISOString().split("T")[0] || "";
  };

  const handleDepartureDateChange = (index: number, val: string) => {
    setDepartureDateRows(prev => {
      const next = [...prev];
      const curr = next[index] || { departureDate: "", arrivalDate: "", source: "Manual", status: "Generated", isManualOverride: false };
      
      let arrDate = curr.arrivalDate;
      if (!curr.isManualOverride) {
        arrDate = val ? calculateReturnDate(val, formData.durasiHari) : "";
      } else if (curr.isManualOverride && val && window.confirm("Tanggal Kepulangan telah diubah secara manual. Apakah Anda ingin menghitung ulang secara otomatis?")) {
        arrDate = calculateReturnDate(val, formData.durasiHari);
        curr.isManualOverride = false;
      }

      next[index] = {
        ...curr,
        departureDate: val,
        arrivalDate: arrDate,
        source: curr.source === "-" ? "Manual" : curr.source,
        status: curr.isManualOverride ? "Edited" : (val ? "Generated" : "-"),
      };

      // Auto Row (BR-DATE-04): ensure last row is always empty
      const filled = next.filter(r => r.departureDate.trim() !== "" || r.arrivalDate.trim() !== "");
      return [
        ...filled,
        { departureDate: "", arrivalDate: "", source: "-", status: "-", isManualOverride: false }
      ];
    });
  };

  const handleArrivalDateChange = (index: number, val: string) => {
    setDepartureDateRows(prev => {
      const next = [...prev];
      const curr = next[index] || { departureDate: "", arrivalDate: "", source: "Manual", status: "Generated", isManualOverride: false };
      
      next[index] = {
        ...curr,
        arrivalDate: val,
        status: val ? "Edited" : curr.status,
        isManualOverride: true,
      };
      return next;
    });
  };

  const handleRecalculateArrival = (index: number) => {
    setDepartureDateRows(prev => {
      const next = [...prev];
      const curr = next[index];
      if (!curr || !curr.departureDate) return prev;
      next[index] = {
        ...curr,
        arrivalDate: calculateReturnDate(curr.departureDate, formData.durasiHari),
        status: "Generated",
        isManualOverride: false,
      };
      return next;
    });
  };



  const handleAutoGenerateName = () => {
    if (!options) return;
    if (!formData.jenisPaketId || !formData.startingPointId || !formData.landingPatternId || !formData.maskapaiId || departureDates.length === 0) {
      setFormData((prev) => ({ ...prev, namaPaket: "" }));
      return;
    }
    const pkgTypeObj = options.packageTypes.find((t) => t.id === formData.jenisPaketId);
    const pCode = (pkgTypeObj?.code || "REG").toUpperCase();
    const pNameRaw = (pkgTypeObj?.name || "").trim().toUpperCase();

    let prefix = "";
    if (pCode === "REG") {
      prefix = "PAKET UMROH";
    } else if (pNameRaw.startsWith("UMROH PLUS")) {
      prefix = pNameRaw;
    } else if (pNameRaw) {
      prefix = `UMROH PLUS ${pNameRaw.replace(/^PLUS\s+/i, "")}`;
    } else {
      prefix = `UMROH PLUS ${pCode}`;
    }

    const durasi = `${formData.durasiHari || 9} H`;

    const startingObj = options.cities.find((c) => c.id === formData.startingPointId);
    const sCode = (startingObj?.code || "JKT").toUpperCase();

    const routeObj = (options as any)?.routes?.find((r: any) => r.id === formData.landingPatternId) || MOCK_LANDING_PATTERN.find((r: any) => r.id === formData.landingPatternId);
    const rCode = (routeObj?.kode || "JED.C").toUpperCase();

    const firstDateStr = departureDates[0];
    let tglFormatted = "24 Jun 2026";
    if (firstDateStr) {
      const d = new Date(firstDateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const monthList = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const month = monthList[d.getMonth()];
        const year = d.getFullYear();
        tglFormatted = `${day} ${month} ${year}`;
      }
    }

    const airlineObj = options.airlines.find((a) => a.id === formData.maskapaiId);
    const mLabel = (airlineObj?.name || airlineObj?.code || "SV").toUpperCase();

    const autoName = `${prefix} ${durasi} ${sCode} ( ${rCode} ) - ${tglFormatted} (${mLabel})`;
    setFormData((prev) => ({ ...prev, namaPaket: autoName }));
  };

  const handleAutoGenerateCode = () => {
    if (!options) return;
    if (!formData.jenisPaketId || !formData.maskapaiId || departureDates.length === 0) {
      setFormData(prev => ({ ...prev, kodePaket: "", kodeGrup: "" }));
      return;
    }
    const pkgTypeObj = options.packageTypes.find(t => t.id === formData.jenisPaketId);
    const startingObj = options.cities.find(c => c.id === formData.startingPointId);
    const airlineObj = options.airlines.find(a => a.id === formData.maskapaiId);
    const routeObj = (options as any)?.routes?.find((r: any) => r.id === formData.landingPatternId);

    const jCode = pkgTypeObj?.code || "PKG";
    const airCode = airlineObj?.code || "AIR";
    const firstDate = departureDates[0] || "";
    const dateStr = firstDate ? firstDate.replace(/-/g, "") : "";
    
    // Individual code
    const individualCode = `${jCode}-${airCode}${dateStr ? `-${dateStr}` : ""}`.toUpperCase();
    
    // VTU Group Code
    const groupCode = generateVtuGroupCode({
      packageTypeName: pkgTypeObj?.name || "UMR",
      durationDays: formData.durasiHari || 9,
      startingCityCode: startingObj?.code || "JKT",
      dates: departureDates,
      airlineCode: airlineObj?.code || "SV",
      routeCode: routeObj?.kode || "TD",
      hasClusters: formData.isAdaKlaster === "ya",
    });

    setFormData(prev => ({ ...prev, kodePaket: individualCode, kodeGrup: groupCode }));
  };

  // Helper to format date string to "03 Agt 2026"
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const monthList = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const month = monthList[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Auto-compute individual package name per departure date
  const getIndividualNameForDate = (dateStr: string) => {
    if (!options || !dateStr || !formData.jenisPaketId || !formData.startingPointId || !formData.landingPatternId || !formData.maskapaiId) {
      return "";
    }
    const pkgTypeObj = options.packageTypes.find((t) => t.id === formData.jenisPaketId);
    const pCode = (pkgTypeObj?.code || "REG").toUpperCase();
    const pNameRaw = (pkgTypeObj?.name || "").trim().toUpperCase();

    let prefix = "";
    if (pCode === "REG") {
      prefix = "PAKET UMROH";
    } else if (pNameRaw.startsWith("UMROH PLUS")) {
      prefix = pNameRaw;
    } else if (pNameRaw) {
      prefix = `UMROH PLUS ${pNameRaw.replace(/^PLUS\s+/i, "")}`;
    } else {
      prefix = `UMROH PLUS ${pCode}`;
    }

    const durasi = `${formData.durasiHari || 9} H`;

    const startingObj = options.cities.find((c) => c.id === formData.startingPointId);
    const sCode = (startingObj?.code || "JKT").toUpperCase();

    const routeObj = (options as any)?.routes?.find((r: any) => r.id === formData.landingPatternId) || MOCK_LANDING_PATTERN.find((r: any) => r.id === formData.landingPatternId);
    const rCode = (routeObj?.kode || "JED.C").toUpperCase();

    const airlineObj = options.airlines.find((a) => a.id === formData.maskapaiId);
    const mLabel = (airlineObj?.name || airlineObj?.code || "SV").toUpperCase();

    const tglFormatted = formatDateIndo(dateStr);

    return `${prefix} ${durasi} ${sCode} ( ${rCode} ) - ${tglFormatted} (${mLabel})`;
  };

  // Auto-compute individual code per departure date
  const getIndividualCodeForDate = (dateStr: string) => {
    if (!options || !dateStr || !formData.jenisPaketId || !formData.maskapaiId) return "";
    const jCode = options.packageTypes.find(t => t.id === formData.jenisPaketId)?.code || "PKG";
    const airCode = options.airlines.find(a => a.id === formData.maskapaiId)?.code || "AIR";
    const dStr = dateStr.replace(/-/g, "");
    return `${jCode}-${airCode}-${dStr}`.toUpperCase();
  };

  useEffect(() => {
    handleAutoGenerateName();
    handleAutoGenerateCode();
  }, [formData.jenisPaketId, formData.maskapaiId, formData.durasiHari, formData.startingPointId, formData.landingPatternId, departureDates, options]);

  // Cluster-specific configuration: Hotels + Pricing + Upgrades
  const [clusterConfigs, setClusterConfigs] = useState<Record<string, { 
    hotelMekkahId: string; 
    hotelMadinahId: string;
    hargaBase: string;
    upgradeDouble: string;
    upgradeTriple: string;
  }>>({
    "K1": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" }, // Bronze
    "K2": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" }, // Silver
    "K3": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" }, // Gold
    "K4": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" }, // Platinum
  });

  useEffect(() => {
    fetch("/api/master/options")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setOptions(res.data);
        }
        setFetching(false);
      })
      .catch(err => {
        console.error("Failed to fetch master data options", err);
        setFetching(false);
      });
  }, []);

  useEffect(() => {
    if (generateMode === "split") {
      setLoadingGroups(true);
      fetch("/api/admin/existing-groups")
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setExistingGroups(res.data || []);
          }
          setLoadingGroups(false);
        })
        .catch(err => {
          console.error("Failed to load existing groups:", err);
          setLoadingGroups(false);
        });
    }
  }, [generateMode]);

  // Reset selected Rute In-Out if not valid for the selected package type
  useEffect(() => {
    if (formData.landingPatternId && filteredRoutes && filteredRoutes.length > 0) {
      const isValid = filteredRoutes.some(r => r.id === formData.landingPatternId);
      if (!isValid) {
        setFormData(prev => ({ ...prev, landingPatternId: "" }));
      }
    }
  }, [formData.jenisPaketId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCurrencyChange = (name: string, val: string) => {
    const rawNumber = val.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, [name]: rawNumber }));
  };

  const focusNextId = (nextId: string) => {
    setTimeout(() => {
      const el = document.getElementById(nextId);
      if (el) {
        el.focus();
        if (el.tagName === "BUTTON") {
          el.click();
        } else if (el instanceof HTMLInputElement) {
          el.select();
        }
      }
    }, 100);
  };

  const handleKeyDownNext = (e: React.KeyboardEvent<HTMLInputElement>, nextId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextId(nextId);
    }
  };

  const handleClusterConfigChange = (
    clusterId: string, 
    field: "hotelMekkahId" | "hotelMadinahId" | "hargaBase" | "upgradeDouble" | "upgradeTriple", 
    val: string
  ) => {
    setClusterConfigs(prev => {
      const existing = prev[clusterId] || { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" };
      return {
        ...prev,
        [clusterId]: {
          ...existing,
          [field]: val
        }
      };
    });
  };

  // Helper matching functions for OCR results

  const matchCity = (name: string, list: any[]) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    let match = list.find(item => {
      const nClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cClean = (item.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return nClean === clean || nClean.includes(clean) || clean.includes(nClean) || cClean === clean;
    });

    if (!match) {
      if (clean.includes("surabaya") || clean.includes("sub") || clean.includes("juanda") || clean.includes("startsurabaya")) {
        match = list.find(item => (item.code || "").toUpperCase() === "SUB" || item.name.toLowerCase().includes("surabaya"));
      } else if (clean.includes("jakarta") || clean.includes("jkt") || clean.includes("cgk") || clean.includes("soekarno") || clean.includes("startjakarta")) {
        match = list.find(item => (item.code || "").toUpperCase() === "JKT" || item.name.toLowerCase().includes("jakarta"));
      } else if (clean.includes("solo") || clean.includes("soc") || clean.includes("surakarta") || clean.includes("startsolo")) {
        match = list.find(item => (item.code || "").toUpperCase() === "SOC" || item.name.toLowerCase().includes("solo"));
      }
    }

    return match ? match.id : "";
  };

  const matchPackageType = (name: string, list: any[]) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = list.find(item => {
      const nClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cClean = (item.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return nClean.includes(clean) || clean.includes(nClean) || cClean === clean || (clean === "umrohreguler" && item.code === "REG");
    });
    return match ? match.id : "";
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    const stopWords = new Set(["hotel", "makkah", "mekkah", "madinah", "medina", "star", "bintang", "room", "resort", "suite", "suites", "tower", "towers"]);
    const words1 = s1.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    const words2 = s2.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));

    if (words1.length === 0 || words2.length === 0) {
      const rawW1 = s1.split(/\s+/).filter(w => w.length >= 3);
      const rawW2 = s2.split(/\s+/).filter(w => w.length >= 3);
      if (rawW1.length === 0 || rawW2.length === 0) return 0;
      let matches = 0;
      for (const w1 of rawW1) {
        if (rawW2.some(w2 => w2.includes(w1) || w1.includes(w2))) matches++;
      }
      return (2.0 * matches) / (rawW1.length + rawW2.length);
    }

    let matches = 0;
    for (const w1 of words1) {
      if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
        matches++;
      }
    }

    return (2.0 * matches) / (words1.length + words2.length);
  };

  const matchHotel = (name: string, list: any[]) => {
    if (!name || !list || list.length === 0) return "";
    let bestMatchId = "";
    let highestScore = 0;

    for (const item of list) {
      const score = calculateSimilarity(name, item.name || "");
      if (score > highestScore) {
        highestScore = score;
        bestMatchId = item.id;
      }
    }

    // Minimum threshold score of 0.20 to select best match with highest similarity
    return highestScore >= 0.20 ? bestMatchId : "";
  };

  // OCR Processing Handler
  const handleOcrProcess = async () => {
    if (flyerFiles.length === 0) return;
    setUploading(true);
    setOcrWarning("");
    setOcrSuccess(false);

    try {
      let finalFormData = { ...formData };
      let warningMessages: string[] = [];

      // ── KRITIS: Hanya kirim Foto #1 (Flyer Utama) ke Gemini AI ──
      // Foto #2, #3, #4 adalah itinerary/jadwal dan TIDAK boleh di-OCR karena akan menghasilkan data salah.
      const flyerUtama = flyerFiles[0];
      if (!flyerUtama) {
        setOcrWarning("Tidak ada file flyer utama.");
        setUploading(false);
        return;
      }

      const bodyData = new FormData();
      bodyData.append("flyer", flyerUtama);
      bodyData.append("caption", caption || `Proses dokumen flyer ${flyerUtama.name}`);
      bodyData.append("isAdaKlaster", formData.isAdaKlaster);

      const res = await fetch("/api/admin/packages/ai-import", {
        method: "POST",
        body: bodyData,
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        const result = resJson.data?.extractionResult ?? {};

        // ── Debug Log: Lihat apa yang dikembalikan AI ──
        console.log("[AI OCR] Extraction Result:", JSON.stringify(result, null, 2));

        // ── 1. AIRLINE MATCHING (Prioritaskan International Carriers) ──
        let mappedAirline = "";
        const airlineList = options?.airlines || [];
        // Coba match langsung dari Gemini result
        if (result.airline) {
          const aiClean = result.airline.toLowerCase().replace(/[^a-z0-9]/g, "");
          const exactMatch = airlineList.find(a => {
            const nClean = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            const cClean = (a.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return nClean === aiClean || aiClean.includes(nClean) || nClean.includes(aiClean) || cClean === aiClean;
          });
          if (exactMatch) mappedAirline = exactMatch.id;
        }
        // Fallback: scan caption untuk International Carriers
        if (!mappedAirline && caption) {
          const captionUpper = caption.toUpperCase();
          const INTL_CARRIERS = ["SAUDIA", "GARUDA", "EMIRATES", "QATAR", "TURKISH", "OMAN AIR", "ETIHAD", "ROYAL BRUNEI", "FLYNAS", "LION"];
          for (const carrier of INTL_CARRIERS) {
            if (captionUpper.includes(carrier)) {
              const found = airlineList.find(a => a.name.toUpperCase().includes(carrier) || (a.code || "").toUpperCase().includes(carrier));
              if (found) { mappedAirline = found.id; break; }
            }
          }
        }

        // ── 2. CITY MATCHING (Prioritaskan Gemini result, bukan fullText) ──
        let mappedCity = matchCity(result.departureCity, options?.cities || []);
        // Fallback: cari keyword "Starting [City]" di caption
        if (!mappedCity && caption) {
          const startMatch = caption.match(/start(?:ing)?\s+(surabaya|jakarta|solo|medan|makassar|bandung|yogyakarta|jogja|bali|denpasar|palembang|balikpapan|lombok|aceh|pekanbaru|pontianak|banjarmasin|manado)/i);
          if (startMatch?.[1]) {
            mappedCity = matchCity(startMatch[1], options?.cities || []);
          }
        }

        // ── 3. PACKAGE TYPE MATCHING ──
        let mappedPackageType = matchPackageType(result.packageType, options?.packageTypes || []);
        if (!mappedPackageType) {
          const fullText = `${caption} ${result.rawOcrText || ""}`.toLowerCase();
          if (fullText.includes("plus")) {
            const plusObj = options?.packageTypes.find(t => t.name.toLowerCase().includes("plus") || t.code.toLowerCase().includes("plus"));
            if (plusObj) mappedPackageType = plusObj.id;
          } else {
            const regObj = options?.packageTypes.find(t => t.code === "REG" || t.name.toLowerCase().includes("reguler"));
            if (regObj) mappedPackageType = regObj.id;
          }
        }

        // ── 4. LANDING ROUTE MATCHING (Preserve dots and dashes in kode) ──
        let mappedLandingRoute = "";
        const routesList = options?.routes && options.routes.length > 0 ? options.routes : MOCK_LANDING_PATTERN;
        if (result.landingRoute) {
          const aiRoute = result.landingRoute.toUpperCase().trim();
          // Exact kode match first (preserve dots/dashes)
          let found = routesList.find(r => (r.kode || "").toUpperCase().trim() === aiRoute);
          // Partial kode match
          if (!found) {
            found = routesList.find(r => {
              const rKode = (r.kode || "").toUpperCase().trim();
              return rKode && (aiRoute.includes(rKode) || rKode.includes(aiRoute));
            });
          }
          // Fallback: match ruteIn/ruteOut
          if (!found) {
            const aiClean = aiRoute.toLowerCase().replace(/[^a-z0-9]/g, "");
            found = routesList.find(r => {
              const rClean = `${r.ruteIn || ""}${r.ruteOut || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
              return rClean.includes(aiClean) || aiClean.includes(rClean);
            });
          }
          if (found) mappedLandingRoute = found.id;
        }
        // Fallback: scan caption for "landing jeddah out madinah"
        if (!mappedLandingRoute && caption) {
          const captionLower = caption.toLowerCase();
          const landingMatch = captionLower.match(/landing\s+(jeddah|madinah|medina)/i);
          const outMatch = captionLower.match(/out\s+(jeddah|madinah|medina)/i);
          if (landingMatch && outMatch) {
            const landing = landingMatch[1]!.toLowerCase().includes("jed") ? "JED" : "MED";
            const out = outMatch[1]!.toLowerCase().includes("jed") ? "J" : "M";
            // Try to match JED.?-M or JED.?-J pattern
            const found = routesList.find(r => {
              const kode = (r.kode || "").toUpperCase();
              return kode.startsWith(landing) && kode.endsWith(`-${out}`);
            });
            if (found) mappedLandingRoute = found.id;
          }
        }

        // ── 5. HOTEL MATCHING ──
        const allHotelsList = options?.hotels || [];
        const mekkahHotelsList = mekkahHotels.length > 0 ? mekkahHotels : allHotelsList;
        const madinahHotelsList = madinahHotels.length > 0 ? madinahHotels : allHotelsList;

        let mappedHotelMekkah = matchHotel(result.hotelMekkah, mekkahHotelsList);
        let mappedHotelMadinah = matchHotel(result.hotelMadinah, madinahHotelsList);

        // ── 6. MERGE FIELDS INTO FORM ──
        if (result.title) finalFormData.namaPaket = result.title;
        if (mappedPackageType) finalFormData.jenisPaketId = mappedPackageType;
        if (mappedCity) finalFormData.startingPointId = mappedCity;
        if (mappedAirline) finalFormData.maskapaiId = mappedAirline;
        if (mappedLandingRoute) finalFormData.landingPatternId = mappedLandingRoute;
        if (mappedHotelMekkah) finalFormData.hotelMekkahId = mappedHotelMekkah;
        if (mappedHotelMadinah) finalFormData.hotelMadinahId = mappedHotelMadinah;
        if (result.durationDays) finalFormData.durasiHari = String(result.durationDays);
        if (result.hargaBase) finalFormData.hargaBase = String(result.hargaBase).replace(/\D/g, "");
        if (result.isAdaPerlengkapan) finalFormData.isAdaPerlengkapan = result.isAdaPerlengkapan;
        if (result.upgradeDouble) finalFormData.upgradeDouble = String(result.upgradeDouble).replace(/\D/g, "");
        if (result.upgradeTriple) finalFormData.upgradeTriple = String(result.upgradeTriple).replace(/\D/g, "");

        // ── 7. CLUSTER SEAT BOX EXTRACTION ──
        if (result.clusters && Array.isArray(result.clusters) && result.clusters.length > 0) {
          finalFormData.isAdaKlaster = "ya";
          const updatedClusterConfigs: Record<string, any> = { ...clusterConfigs };
          const clustersList = options?.clusters && options.clusters.length > 0 ? options.clusters : MOCK_KLASTER;

          console.log("[AI OCR] Clusters from AI:", result.clusters);
          console.log("[AI OCR] Master Clusters:", clustersList);

          result.clusters.forEach((cItem: any) => {
            const cNameClean = (cItem.clusterName || "").toLowerCase();
            const matchedClusterObj = clustersList.find((c: any) => {
              // Handle both "nama" (Prisma indo) and "name" (Prisma en) field names
              const nameLower = (c.nama || c.name || "").toLowerCase();
              const codeLower = (c.kode || c.code || "").toLowerCase();
              return cNameClean.includes(nameLower) || nameLower.includes(cNameClean) 
                || (codeLower.length >= 2 && cNameClean.includes(codeLower))
                // Match "Silver Package" -> "Silver", "Gold Package" -> "Gold"
                || cNameClean.replace(/\s*package\s*/gi, "") === nameLower
                || nameLower.replace(/\s*package\s*/gi, "") === cNameClean.replace(/\s*package\s*/gi, "");
            });

            if (matchedClusterObj) {
              const cId = matchedClusterObj.id;
              const cMekkahId = matchHotel(cItem.hotelMekkah, mekkahHotelsList);
              const cMadinahId = matchHotel(cItem.hotelMadinah, madinahHotelsList);
              const cHargaBase = String(cItem.hargaBase || "").replace(/\D/g, "");
              const cUpgradeDouble = String(cItem.upgradeDouble || "").replace(/\D/g, "");
              const cUpgradeTriple = String(cItem.upgradeTriple || "").replace(/\D/g, "");

              updatedClusterConfigs[cId] = {
                ...updatedClusterConfigs[cId],
                ...(cMekkahId ? { hotelMekkahId: cMekkahId } : {}),
                ...(cMadinahId ? { hotelMadinahId: cMadinahId } : {}),
                ...(cHargaBase ? { hargaBase: cHargaBase } : {}),
                ...(cUpgradeDouble ? { upgradeDouble: cUpgradeDouble } : {}),
                ...(cUpgradeTriple ? { upgradeTriple: cUpgradeTriple } : {}),
              };

              console.log(`[AI OCR] Cluster "${cItem.clusterName}" -> Matched ID: ${cId}`, updatedClusterConfigs[cId]);
            } else {
              console.warn(`[AI OCR] Cluster "${cItem.clusterName}" -> NO MATCH in master data`);
            }
          });

          setClusterConfigs(updatedClusterConfigs);
        }

        // ── 8. DEPARTURE DATES ──
        if (result.departureDates && Array.isArray(result.departureDates)) {
          const extractedDates: string[] = result.departureDates
            .map((d: any) => normalizeToIsoDate(String(d).split("T")[0] ?? ""))
            .filter((d: string): d is string => Boolean(d));
          if (extractedDates.length > 0) {
            const sortedDates: string[] = Array.from(new Set(extractedDates)).sort();
            const ocrRows: DepartureDateRowState[] = sortedDates.map(dateStr => ({
              departureDate: dateStr,
              arrivalDate: calculateReturnDate(dateStr, finalFormData.durasiHari),
              source: "OCR",
              status: "Generated",
              isManualOverride: false,
            }));
            ocrRows.push({ departureDate: "", arrivalDate: "", source: "-", status: "-", isManualOverride: false });
            setDepartureDateRows(ocrRows);
            setOcrDateInfo({
              count: sortedDates.length,
              dates: sortedDates,
            });
          }
        } else if (result.departureDates && typeof result.departureDates === "string") {
          const d = normalizeToIsoDate((result.departureDates as string).split("T")[0] ?? "");
          if (d) {
            setDepartureDateRows([
              { departureDate: d, arrivalDate: calculateReturnDate(d, finalFormData.durasiHari), source: "OCR", status: "Generated", isManualOverride: false },
              { departureDate: "", arrivalDate: "", source: "-", status: "-", isManualOverride: false }
            ]);
            setOcrDateInfo({
              count: 1,
              dates: [d],
            });
          }
        }

        setRawOcrResult({
          extracted: result,
          mapped: {
            airline: mappedAirline ? (airlineList.find(a => a.id === mappedAirline)?.name || mappedAirline) : null,
            city: mappedCity ? (options?.cities?.find(c => c.id === mappedCity)?.name || mappedCity) : null,
            packageType: mappedPackageType ? (options?.packageTypes?.find(p => p.id === mappedPackageType)?.name || mappedPackageType) : null,
            route: mappedLandingRoute ? (routesList.find((r: any) => r.id === mappedLandingRoute)?.kode || mappedLandingRoute) : null,
            hotelMekkah: mappedHotelMekkah ? (options?.hotels?.find(h => h.id === mappedHotelMekkah)?.name || mappedHotelMekkah) : null,
            hotelMadinah: mappedHotelMadinah ? (options?.hotels?.find(h => h.id === mappedHotelMadinah)?.name || mappedHotelMadinah) : null,
          }
        });

        if (resJson.data?.warning) {
          warningMessages.push(`${flyerUtama.name}: ${resJson.data.warning}`);
        }
      } else {
        warningMessages.push(`${flyerUtama.name}: ${resJson.message || "Gagal ekstraksi"}`);
      }

      setFormData(finalFormData);
      setOcrSuccess(true);
      if (warningMessages.length > 0) {
        setOcrWarning(warningMessages.join(" | "));
      }
    } catch (err) {
      console.error(err);
      setOcrWarning("Gagal menghubungi server ekstraksi AI.");
    } finally {
      setUploading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerate = async () => {
    scrollToTop();
    if (departureDates.length === 0) {
      alert("Mohon tambahkan minimal satu tanggal keberangkatan pada Langkah 4.");
      return;
    }
    setLoading(true);

    let basePrice = Number(formData.hargaBase || 0);
    if (formData.isAdaKlaster === "ya" && clusterConfigs) {
      const firstClusterPrice = Object.values(clusterConfigs).find(c => Number(c.hargaBase) > 0)?.hargaBase;
      if (firstClusterPrice) {
        basePrice = Number(firstClusterPrice);
      }
    }
    if (!basePrice || basePrice <= 0) {
      basePrice = 35000000;
    }

    let activeClusterConfigs: Record<string, any> | null = null;
    if (formData.isAdaKlaster === "ya" && clusterConfigs) {
      activeClusterConfigs = {};
      for (const [cId, cfg] of Object.entries(clusterConfigs as Record<string, any>)) {
        if (!cfg) continue;
        const hasMek = !!(cfg.hotelMekkahId);
        const hasMed = !!(cfg.hotelMadinahId);
        const hasPrice = Number(cfg.hargaBase || 0) > 0;
        if (hasMek || hasMed || hasPrice) {
          activeClusterConfigs[cId] = cfg;
        }
      }
    }

    const payload = {
      packageTypeId: formData.jenisPaketId,
      startingPointId: formData.startingPointId,
      maskapaiId: formData.maskapaiId,
      landingPatternId: formData.landingPatternId,
      durasiHari: Number(formData.durasiHari || 9),
      durationDays: Number(formData.durasiHari || 9),
      departureDates: departureDates,
      namaPaket: formData.namaPaket,
      hargaBase: basePrice,
      hargaPaket: basePrice,
      hotelMekkahId: formData.hotelMekkahId,
      hotelMadinahId: formData.hotelMadinahId,
      kapasitas: Number(formData.kapasitas || 45),
      kuota: Number(formData.kapasitas || 45),
      maxSeat: Number(formData.kapasitas || 45),
      isAdaKlaster: formData.isAdaKlaster,
      clusterConfigs: formData.isAdaKlaster === "ya" ? activeClusterConfigs : null,
    };

    try {
      const res = await fetch("/api/keberangkatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();
      if (resJson.success) {
        // Capture summary for success banner before resetting form
        const summaryItems = departureDates.map(d => ({
          name: getIndividualNameForDate(d) || formData.namaPaket,
          code: getIndividualCodeForDate(d) || formData.kodePaket,
          date: d,
        }));
        setGeneratedResult({
          count: departureDates.length,
          items: summaryItems,
        });
        setSuccess(true);

        // Reset form state to clean initial values
        setFormData({
          jenisPaketId: "",
          namaPaket: "",
          kodePaket: "",
          kodeGrup: "",
          startingPointId: "",
          landingPatternId: "",
          maskapaiId: "",
          hotelMekkahId: "",
          hotelMadinahId: "",
          isAdaKlaster: "tidak",
          kapasitas: "",
          isAdaPerlengkapan: "",
          hargaBase: "",
          durasiHari: "9",
          upgradeDouble: "",
          upgradeTriple: "",
        });
        setDepartureDateRows([{ departureDate: "", arrivalDate: "", source: "-", status: "-", isManualOverride: false }]);
        setClusterConfigs({
          "K1": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" },
          "K2": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" },
          "K3": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" },
          "K4": { hotelMekkahId: "", hotelMadinahId: "", hargaBase: "", upgradeDouble: "", upgradeTriple: "" },
        });
        setFlyerFiles([]);
        setFlyerPreviews([]);
        setCaption("");
        setOcrWarning("");
        setOcrSuccess(false);

        scrollToTop();
      } else {
        alert(`Gagal menyimpan keberangkatan: ${resJson.message || resJson.error || "Terjadi kesalahan server"}`);
      }
    } catch (err: any) {
      console.error("Error generating packages:", err);
      alert("Gagal menghubungkan ke server.");
    } finally {
      setLoading(false);
    }
  };

  // City-filtered master hotels (Makkah vs Madinah)
  const mekkahCityIds = (options?.cities || [])
    .filter(c => {
      const name = (c.name || "").toLowerCase();
      const code = (c.code || "").toLowerCase();
      return code === "mek" || code === "mak" || code === "mkh" || name.includes("mekkah") || name.includes("makkah") || name.includes("mecca");
    })
    .map(c => c.id);

  const madinahCityIds = (options?.cities || [])
    .filter(c => {
      const name = (c.name || "").toLowerCase();
      const code = (c.code || "").toLowerCase();
      return code === "med" || code === "mdn" || name.includes("madinah") || name.includes("medina");
    })
    .map(c => c.id);

  const mekkahHotels = (options?.hotels || []).filter(h => {
    const hName = (h.name || "").toLowerCase();
    const cName = (h.city?.name || "").toLowerCase();
    if (madinahCityIds.includes(h.cityId) || cName.includes("madinah") || cName.includes("medina") || hName.includes("madinah") || hName.includes("medina") || hName.includes("ohud") || hName.includes("aqeeq") || hName.includes("nabawi")) {
      return false;
    }
    return true;
  });

  const madinahHotels = (options?.hotels || []).filter(h => {
    const hName = (h.name || "").toLowerCase();
    const cName = (h.city?.name || "").toLowerCase();
    if (madinahCityIds.includes(h.cityId) || cName.includes("madinah") || cName.includes("medina") || hName.includes("madinah") || hName.includes("medina") || hName.includes("ohud") || hName.includes("aqeeq") || hName.includes("nabawi")) {
      return true;
    }
    if (mekkahCityIds.includes(h.cityId) || cName.includes("mekkah") || cName.includes("makkah") || cName.includes("mecca") || hName.includes("mekkah") || hName.includes("makkah") || hName.includes("mecca")) {
      return false;
    }
    return false;
  });

  // Dynamic Route filtering based on selected Package Type (Reguler vs Plus)
  const selectedPackageType = (options?.packageTypes || []).find(t => t.id === formData.jenisPaketId);
  const isPlusPackage = selectedPackageType
    ? (selectedPackageType.isPlus === true ||
       (selectedPackageType.name || "").toLowerCase().includes("plus") ||
       (selectedPackageType.code || "").toLowerCase().includes("plus"))
    : false;

  const allRoutes = (options?.routes && options.routes.length > 0 ? options.routes : MOCK_LANDING_PATTERN);
  
  const filteredRoutes = allRoutes.filter((r) => {
    const ruteIn = (r.ruteIn || "").toLowerCase();
    const ruteOut = (r.ruteOut || "").toLowerCase();
    const kode = (r.kode || "").toLowerCase();

    const isPlusRoute =
      ruteIn.includes("umroh dulu") ||
      ruteIn.includes("tour dulu") ||
      ruteOut.includes("umroh dulu") ||
      ruteOut.includes("tour dulu") ||
      kode.startsWith("ud") ||
      kode.startsWith("td") ||
      kode.includes(".ud.") ||
      kode.includes(".td.");

    if (isPlusPackage) {
      // Paket Plus -> HANYA tampilkan rute dengan "Umroh Dulu" / "Tour Dulu"
      return isPlusRoute;
    } else {
      // Paket Reguler -> HANYA tampilkan 4 rute Reguler (selain Umroh Dulu & Tour Dulu)
      return !isPlusRoute;
    }
  });

  // Sub-component to render Wizard steps
  const renderWizardSteps = (colMode = false) => {
    return (
      <div className="flex flex-col gap-4">
        {/* Step 1: Dasar Paket */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 1: Dasar Paket</h2>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Jenis Paket (Master Data)</label>
                  <SearchableSelect
                    id="field-jenisPaketId"
                    nextFocusId="field-durasiHari"
                    options={options?.packageTypes.map(t => ({ value: t.id, label: t.name })) || []}
                    value={formData.jenisPaketId}
                    onChange={(val) => setFormData(prev => ({ ...prev, jenisPaketId: val }))}
                    placeholder="-- Pilih Jenis Paket --"
                    searchPlaceholder="Cari jenis paket..."
                    disabled={fetching}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Durasi (Hari)</label>
                  <Input 
                    id="field-durasiHari" 
                    type="number" 
                    name="durasiHari" 
                    value={formData.durasiHari} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDownNext(e, "field-startingPointId")}
                    placeholder="9" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Penerbangan */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 2: Rute & Penerbangan</h2>
          <div className={`p-4 bg-card border rounded-md grid grid-cols-1 ${colMode ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            <div>
              <label className="block text-sm font-medium mb-1">Starting Point</label>
              <SearchableSelect
                id="field-startingPointId"
                nextFocusId="field-landingPatternId"
                options={options?.cities.map(c => ({ value: c.id, label: c.name })) || []}
                value={formData.startingPointId}
                onChange={(val) => setFormData(prev => ({ ...prev, startingPointId: val }))}
                placeholder="-- Pilih Kota --"
                searchPlaceholder="Cari kota starting point..."
                disabled={fetching}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rute In-Out</label>
              <SearchableSelect
                id="field-landingPatternId"
                nextFocusId="field-maskapaiId"
                options={filteredRoutes.map(r => ({ 
                  value: r.id, 
                  label: `${r.ruteIn} → ${r.ruteOut}`,
                  sublabel: r.kode ? `[${r.kode}]` : undefined
                }))}
                value={formData.landingPatternId}
                onChange={(val) => setFormData(prev => ({ ...prev, landingPatternId: val }))}
                placeholder={isPlusPackage ? "-- Pilih Rute Plus --" : "-- Pilih Rute Reguler --"}
                searchPlaceholder="Cari rute..."
                disabled={fetching}
              />
            </div>
            <div className={colMode ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium mb-1">Maskapai</label>
              <SearchableSelect
                id="field-maskapaiId"
                nextFocusId={
                  formData.isAdaKlaster === "ya"
                    ? `field-${options?.clusters?.[0]?.id || "K1"}-hotelMekkahId`
                    : "field-hotelMekkahId"
                }
                options={options?.airlines.map(a => ({ value: a.id, label: a.name })) || []}
                value={formData.maskapaiId}
                onChange={(val) => setFormData(prev => ({ ...prev, maskapaiId: val }))}
                placeholder="-- Pilih Maskapai --"
                searchPlaceholder="Cari maskapai..."
                disabled={fetching}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Akomodasi */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 3: Akomodasi & Hotel</h2>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            {pathMode === "manual" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/20 border rounded-lg gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground block">Apakah paket ini menggunakan Klaster Seat?</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formData.isAdaKlaster === "ya" 
                      ? "Menggunakan Klaster Seat (Bronze, Silver, Gold, Platinum)" 
                      : "Tidak Menggunakan Klaster (Satu Macam Hotel)"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isAdaKlaster === "ya"}
                    onClick={() => setFormData(prev => ({ ...prev, isAdaKlaster: prev.isAdaKlaster === "ya" ? "tidak" : "ya" }))}
                    className={cn(
                      "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      formData.isAdaKlaster === "ya" ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        formData.isAdaKlaster === "ya" ? "translate-x-7" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-md border min-w-[55px] text-center transition-colors select-none",
                    formData.isAdaKlaster === "ya" 
                      ? "bg-primary/10 text-primary border-primary/30" 
                      : "bg-background text-muted-foreground border-border"
                  )}>
                    {formData.isAdaKlaster === "ya" ? "Ya" : "Tidak"}
                  </span>
                </div>
              </div>
            )}

            {formData.isAdaKlaster === "tidak" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Hotel Mekkah</label>
                    <SearchableSelect
                      id="field-hotelMekkahId"
                      nextFocusId="field-hotelMadinahId"
                      options={mekkahHotels.map(h => ({ value: h.id, label: h.name }))}
                      value={formData.hotelMekkahId}
                      onChange={(val) => setFormData(prev => ({ ...prev, hotelMekkahId: val }))}
                      placeholder="-- Pilih Hotel Mekkah --"
                      searchPlaceholder="Cari hotel Mekkah..."
                      disabled={fetching}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hotel Madinah</label>
                    <SearchableSelect
                      id="field-hotelMadinahId"
                      nextFocusId="field-upgradeDouble"
                      options={madinahHotels.map(h => ({ value: h.id, label: h.name }))}
                      value={formData.hotelMadinahId}
                      onChange={(val) => setFormData(prev => ({ ...prev, hotelMadinahId: val }))}
                      placeholder="-- Pilih Hotel Madinah --"
                      searchPlaceholder="Cari hotel Madinah..."
                      disabled={fetching}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Harga Upgrade Double (Rp)</label>
                    <Input 
                      id="field-upgradeDouble" 
                      type="text" 
                      inputMode="numeric"
                      name="upgradeDouble" 
                      value={formatNumberWithDots(formData.upgradeDouble)} 
                      onChange={(e) => handleCurrencyChange("upgradeDouble", e.target.value)} 
                      onKeyDown={(e) => handleKeyDownNext(e, "field-upgradeTriple")} 
                      placeholder="Rp -" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Harga Upgrade Triple (Rp)</label>
                    <Input 
                      id="field-upgradeTriple" 
                      type="text" 
                      inputMode="numeric"
                      name="upgradeTriple" 
                      value={formatNumberWithDots(formData.upgradeTriple)} 
                      onChange={(e) => handleCurrencyChange("upgradeTriple", e.target.value)} 
                      onKeyDown={(e) => handleKeyDownNext(e, "field-tempDate")} 
                      placeholder="Rp -" 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground bg-amber-50/50 border border-amber-200 p-2.5 rounded-md">
                  💡 <strong>Info:</strong> Hotel, Harga Base, serta Harga Upgrade Kamar (Double & Triple) akan dikonfigurasi untuk masing-masing klaster di bawah ini.
                </div>
                <div className="space-y-3">
                  {(() => {
                    const clustersList = options?.clusters && options.clusters.length > 0 ? options.clusters : MOCK_KLASTER;
                    const firstCluster = clustersList[0];

                    return clustersList.map((klaster, idx) => {
                      const nextKlaster = clustersList[idx + 1];
                      
                      // Phase 1 Target: After filling Harga Base of cluster idx:
                      // - If next cluster exists, jump to next cluster's Hotel Mekkah
                      // - If last cluster, jump to FIRST cluster's Harga Upgrade Double
                      const nextHargaBaseTarget = nextKlaster
                        ? `field-${nextKlaster.id}-hotelMekkahId`
                        : `field-${firstCluster.id}-upgradeDouble`;

                      // Phase 2 Target: After filling Harga Upgrade Triple of cluster idx:
                      // - If next cluster exists, jump to next cluster's Harga Upgrade Double
                      // - If last cluster, jump to Step 4 Date Input (field-tempDate)
                      const nextUpgradeTripleTarget = nextKlaster
                        ? `field-${nextKlaster.id}-upgradeDouble`
                        : "field-tempDate";

                      return (
                        <div key={klaster.id} className="p-4 bg-card border rounded-md flex flex-col gap-3 shadow-sm">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-bold text-primary">{klaster.nama} Seat Class</span>
                          </div>
                          
                          {/* Hotel Selection Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Mekkah</label>
                              <SearchableSelect
                                id={`field-${klaster.id}-hotelMekkahId`}
                                nextFocusId={`field-${klaster.id}-hotelMadinahId`}
                                options={mekkahHotels.map(h => ({ value: h.id, label: h.name }))}
                                value={clusterConfigs[klaster.id]?.hotelMekkahId || ""}
                                onChange={(val) => handleClusterConfigChange(klaster.id, "hotelMekkahId", val)}
                                placeholder="-- Hotel Mekkah --"
                                searchPlaceholder="Cari hotel..."
                                size="sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Madinah</label>
                              <SearchableSelect
                                id={`field-${klaster.id}-hotelMadinahId`}
                                nextFocusId={`field-${klaster.id}-hargaBase`}
                                options={madinahHotels.map(h => ({ value: h.id, label: h.name }))}
                                value={clusterConfigs[klaster.id]?.hotelMadinahId || ""}
                                onChange={(val) => handleClusterConfigChange(klaster.id, "hotelMadinahId", val)}
                                placeholder="-- Hotel Madinah --"
                                searchPlaceholder="Cari hotel..."
                                size="sm"
                              />
                            </div>
                          </div>

                          {/* Pricing Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Harga Base (Rp)</label>
                              <Input 
                                id={`field-${klaster.id}-hargaBase`}
                                type="text" 
                                inputMode="numeric"
                                placeholder="Rp -" 
                                value={formatNumberWithDots(clusterConfigs[klaster.id]?.hargaBase || "")} 
                                onChange={(e) => handleClusterConfigChange(klaster.id, "hargaBase", e.target.value.replace(/\D/g, ""))} 
                                onKeyDown={(e) => handleKeyDownNext(e, nextHargaBaseTarget)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Harga Upgrade Double (Rp)</label>
                              <Input 
                                id={`field-${klaster.id}-upgradeDouble`}
                                type="text" 
                                inputMode="numeric"
                                placeholder="Rp -" 
                                value={formatNumberWithDots(clusterConfigs[klaster.id]?.upgradeDouble || "")} 
                                onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeDouble", e.target.value.replace(/\D/g, ""))} 
                                onKeyDown={(e) => handleKeyDownNext(e, `field-${klaster.id}-upgradeTriple`)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Harga Upgrade Triple (Rp)</label>
                              <Input 
                                id={`field-${klaster.id}-upgradeTriple`}
                                type="text" 
                                inputMode="numeric"
                                placeholder="Rp -" 
                                value={formatNumberWithDots(clusterConfigs[klaster.id]?.upgradeTriple || "")} 
                                onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeTriple", e.target.value.replace(/\D/g, ""))} 
                                onKeyDown={(e) => handleKeyDownNext(e, nextUpgradeTripleTarget)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Lainnya */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 4: Operasional & Harga</h2>

          {ocrDateInfo && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100 font-extrabold text-sm">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-bounce" />
                  <span>Hasil Ekstraksi OCR: Terdeteksi {ocrDateInfo.count} Tanggal Keberangkatan pada Flyer Utama!</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-700 text-white font-black text-xs shadow-xs">
                  {ocrDateInfo.count} Kolom Tanggal Berhasil Dibuatkan
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                Sistem Google AI Studio (Gemini) telah mendeteksi <strong>{ocrDateInfo.count} tanggal keberangkatan</strong> dari flyer utama dan otomatis membuatkan {ocrDateInfo.count} kolom input tanggal:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {ocrDateInfo.dates.map((dStr, idx) => (
                  <span key={dStr} className="px-3 py-1 bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs font-bold rounded-lg shadow-xs">
                    📅 Tanggal #{idx + 1}: {formatDateIndo(dStr)} ({dStr})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            {/* Dynamic Auto-Expanding Tanggal Keberangkatan Inputs */}
            <div className="flex flex-col gap-3 p-3 bg-muted/10 border rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground">
                    Tanggal Keberangkatan <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Tanggal pertama wajib diisi. Kolom kosong berikutnya bersifat opsional dan akan bertambah otomatis saat terisi.
                  </p>
                </div>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                  {departureDates.length} Tanggal Terisi &rarr; {departureDates.length} Paket akan dibuat
                </div>
              </div>

              {/* Departure Dates Table Layout (CR-03 & CR-06 BR-DATE-01..04) */}
              <div className="overflow-x-auto border rounded-xl shadow-xs bg-card pt-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-extrabold border-b border-emerald-200/60 dark:border-emerald-800/60">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">No</th>
                      <th className="px-3 py-2.5">Tanggal Keberangkatan</th>
                      <th className="px-3 py-2.5">Tanggal Kepulangan (Editable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {departureDateRows.map((row, index) => {
                      const isLastEmpty = index === departureDateRows.length - 1 && !row.departureDate && !row.arrivalDate;

                      return (
                        <tr key={index} className={cn("hover:bg-muted/30 transition-colors", isLastEmpty && "bg-muted/10")}>
                          <td className="px-3 py-2 text-center font-bold text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={row.departureDate}
                              onChange={(e) => handleDepartureDateChange(index, e.target.value)}
                              className="h-8 text-xs font-mono max-w-[200px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="date"
                                value={row.arrivalDate}
                                onChange={(e) => handleArrivalDateChange(index, e.target.value)}
                                className={cn(
                                  "h-8 text-xs font-mono max-w-[200px]",
                                  row.isManualOverride && "border-amber-400 bg-amber-50/40 text-amber-950 font-semibold dark:bg-amber-950/30 dark:text-amber-200"
                                )}
                              />
                              {row.isManualOverride && row.departureDate && (
                                <button
                                  type="button"
                                  onClick={() => handleRecalculateArrival(index)}
                                  className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 px-1.5 py-1 rounded transition-colors flex items-center gap-1 whitespace-nowrap"
                                  title="Hitung ulang tanggal kepulangan secara otomatis"
                                >
                                  ↻ Hitung Ulang
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kapasitas Seat (Maksimal Jamaah)</label>
                <Input 
                  id="field-kapasitas" 
                  type="number" 
                  name="kapasitas" 
                  value={formData.kapasitas} 
                  onChange={handleChange} 
                  onKeyDown={(e) => handleKeyDownNext(e, formData.isAdaKlaster === "tidak" ? "field-hargaBase" : "field-submitBtn")}
                  placeholder="Misal: 45" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Termasuk Perlengkapan?</label>
                <div className="flex items-center gap-2 h-10">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isAdaPerlengkapan === "ya"}
                    onClick={() => setFormData(prev => ({ ...prev, isAdaPerlengkapan: prev.isAdaPerlengkapan === "ya" ? "tidak" : "ya" }))}
                    className={cn(
                      "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      formData.isAdaPerlengkapan === "ya" ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        formData.isAdaPerlengkapan === "ya" ? "translate-x-7" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-md border min-w-[55px] text-center transition-colors select-none",
                    formData.isAdaPerlengkapan === "ya" 
                      ? "bg-primary/10 text-primary border-primary/30" 
                      : "bg-background text-muted-foreground border-border"
                  )}>
                    {formData.isAdaPerlengkapan === "ya" ? "Ya" : "Tidak"}
                  </span>
                </div>
              </div>
              <div>
                {formData.isAdaKlaster === "tidak" ? (
                  <>
                    <label className="block text-sm font-medium mb-1">Harga Base (Rp)</label>
                    <Input 
                      id="field-hargaBase" 
                      type="text" 
                      inputMode="numeric"
                      name="hargaBase" 
                      value={formatNumberWithDots(formData.hargaBase)} 
                      onChange={(e) => handleCurrencyChange("hargaBase", e.target.value)} 
                      onKeyDown={(e) => handleKeyDownNext(e, "field-submitBtn")}
                      placeholder="Rp -" 
                    />
                  </>
                ) : (
                  <div className="bg-muted/40 p-3 rounded-md border text-xs text-muted-foreground h-full flex items-center">
                    ℹ️ Harga Base diatur per masing-masing Klaster Seat di Langkah 3.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between p-4 bg-card border rounded-md shadow-sm mt-2">
          <p className="text-xs text-muted-foreground">
            💡 Tekan <strong>Enter</strong> pada kolom terakhir untuk langsung memproses pembuatan paket.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/paket-umroh")}>Batal</Button>
            <Button 
              id="field-submitBtn" 
              onClick={handleGenerate} 
              disabled={loading || fetching}
              className="px-6 font-semibold"
            >
              {loading ? "Memproses..." : `Generate ${departureDates.length > 0 ? departureDates.length : ""} Paket`}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderOcrSingleCardForm = () => {
    return (
      <div className="p-5 bg-card border rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />
              Formulir Verifikasi Hasil Ekstraksi OCR
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Semua data hasil scan flyer tersusun dalam satu formulir verifikasi tanpa pembagian langkah.
            </p>
          </div>
          {ocrSuccess && (
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
              Form Pre-filled
            </span>
          )}
        </div>

        {ocrDateInfo && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100 font-extrabold text-sm">
                <Sparkles className="h-5 w-5 text-amber-500 animate-bounce" />
                <span>Hasil Ekstraksi OCR: Terdeteksi {ocrDateInfo.count} Tanggal Keberangkatan pada Flyer Utama!</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-700 text-white font-black text-xs shadow-xs">
                {ocrDateInfo.count} Kolom Tanggal Berhasil Dibuatkan
              </span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              Sistem Google AI Studio (Gemini) telah mendeteksi <strong>{ocrDateInfo.count} tanggal keberangkatan</strong> dari flyer utama dan otomatis membuatkan {ocrDateInfo.count} kolom input tanggal:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ocrDateInfo.dates.map((dStr, idx) => (
                <span key={dStr} className="px-3 py-1 bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs font-bold rounded-lg shadow-xs">
                  📅 Tanggal #{idx + 1}: {formatDateIndo(dStr)} ({dStr})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 1. DASAR PAKET & PENERBANGAN ── */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block border-b pb-1">
            1. Dasar Paket & Penerbangan
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Jenis Paket (Master Data)</label>
              <SearchableSelect
                id="field-ocr-jenisPaketId"
                options={options?.packageTypes.map(t => ({ value: t.id, label: t.name })) || []}
                value={formData.jenisPaketId}
                onChange={(val) => setFormData(prev => ({ ...prev, jenisPaketId: val }))}
                placeholder="-- Pilih Jenis Paket --"
                searchPlaceholder="Cari jenis paket..."
                disabled={fetching}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Durasi (Hari)</label>
              <Input 
                id="field-ocr-durasiHari" 
                type="number" 
                name="durasiHari" 
                value={formData.durasiHari} 
                onChange={handleChange} 
                placeholder="9" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold mb-1">Starting Point</label>
              <SearchableSelect
                id="field-ocr-startingPointId"
                options={options?.cities.map(c => ({ value: c.id, label: c.name })) || []}
                value={formData.startingPointId}
                onChange={(val) => setFormData(prev => ({ ...prev, startingPointId: val }))}
                placeholder="-- Pilih Kota --"
                searchPlaceholder="Cari kota starting point..."
                disabled={fetching}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Rute In-Out</label>
              <SearchableSelect
                id="field-ocr-landingPatternId"
                options={filteredRoutes.map(r => ({ 
                  value: r.id, 
                  label: `${r.ruteIn} → ${r.ruteOut}`,
                  sublabel: r.kode ? `[${r.kode}]` : undefined
                }))}
                value={formData.landingPatternId}
                onChange={(val) => setFormData(prev => ({ ...prev, landingPatternId: val }))}
                placeholder={isPlusPackage ? "-- Pilih Rute Plus --" : "-- Pilih Rute Reguler --"}
                searchPlaceholder="Cari rute..."
                disabled={fetching}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Maskapai</label>
              <SearchableSelect
                id="field-ocr-maskapaiId"
                options={options?.airlines.map(a => ({ value: a.id, label: a.name })) || []}
                value={formData.maskapaiId}
                onChange={(val) => setFormData(prev => ({ ...prev, maskapaiId: val }))}
                placeholder="-- Pilih Maskapai --"
                searchPlaceholder="Cari maskapai..."
                disabled={fetching}
              />
            </div>
          </div>
        </div>

        {/* ── 2. AKOMODASI & HOTEL ── */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block border-b pb-1">
            2. Akomodasi & Hotel {formData.isAdaKlaster === "ya" ? "(Klaster Seat)" : ""}
          </span>

          {formData.isAdaKlaster === "tidak" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Hotel Mekkah</label>
                  <SearchableSelect
                    id="field-ocr-hotelMekkahId"
                    options={mekkahHotels.map(h => ({ value: h.id, label: h.name }))}
                    value={formData.hotelMekkahId}
                    onChange={(val) => setFormData(prev => ({ ...prev, hotelMekkahId: val }))}
                    placeholder="-- Pilih Hotel Mekkah --"
                    searchPlaceholder="Cari hotel Mekkah..."
                    disabled={fetching}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hotel Madinah</label>
                  <SearchableSelect
                    id="field-ocr-hotelMadinahId"
                    options={madinahHotels.map(h => ({ value: h.id, label: h.name }))}
                    value={formData.hotelMadinahId}
                    onChange={(val) => setFormData(prev => ({ ...prev, hotelMadinahId: val }))}
                    placeholder="-- Pilih Hotel Madinah --"
                    searchPlaceholder="Cari hotel Madinah..."
                    disabled={fetching}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Harga Upgrade Double (Rp)</label>
                  <Input 
                    id="field-ocr-upgradeDouble" 
                    type="text" 
                    inputMode="numeric"
                    name="upgradeDouble" 
                    value={formatNumberWithDots(formData.upgradeDouble)} 
                    onChange={(e) => handleCurrencyChange("upgradeDouble", e.target.value)} 
                    placeholder="Rp -" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Harga Upgrade Triple (Rp)</label>
                  <Input 
                    id="field-ocr-upgradeTriple" 
                    type="text" 
                    inputMode="numeric"
                    name="upgradeTriple" 
                    value={formatNumberWithDots(formData.upgradeTriple)} 
                    onChange={(e) => handleCurrencyChange("upgradeTriple", e.target.value)} 
                    placeholder="Rp -" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-amber-50/50 border border-amber-200 p-2.5 rounded-md">
                💡 <strong>Info:</strong> Hotel, Harga Base, serta Harga Upgrade Kamar (Double & Triple) dikonfigurasi per klaster di bawah ini.
              </div>
              <div className="space-y-3">
                {(options?.clusters && options.clusters.length > 0 ? options.clusters : MOCK_KLASTER).map((klaster) => (
                  <div key={klaster.id} className="p-3.5 bg-card border rounded-lg flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-xs font-bold text-primary">{klaster.nama} Seat Class</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Hotel Mekkah</label>
                        <SearchableSelect
                          id={`field-ocr-${klaster.id}-hotelMekkahId`}
                          options={mekkahHotels.map(h => ({ value: h.id, label: h.name }))}
                          value={clusterConfigs[klaster.id]?.hotelMekkahId || ""}
                          onChange={(val) => handleClusterConfigChange(klaster.id, "hotelMekkahId", val)}
                          placeholder="-- Hotel Mekkah --"
                          searchPlaceholder="Cari hotel..."
                          size="sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Hotel Madinah</label>
                        <SearchableSelect
                          id={`field-ocr-${klaster.id}-hotelMadinahId`}
                          options={madinahHotels.map(h => ({ value: h.id, label: h.name }))}
                          value={clusterConfigs[klaster.id]?.hotelMadinahId || ""}
                          onChange={(val) => handleClusterConfigChange(klaster.id, "hotelMadinahId", val)}
                          placeholder="-- Hotel Madinah --"
                          searchPlaceholder="Cari hotel..."
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Harga Base (Rp)</label>
                        <Input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="Rp -" 
                          value={formatNumberWithDots(clusterConfigs[klaster.id]?.hargaBase || "")} 
                          onChange={(e) => handleClusterConfigChange(klaster.id, "hargaBase", e.target.value.replace(/\D/g, ""))} 
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Upgrade Double (Rp)</label>
                        <Input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="Rp -" 
                          value={formatNumberWithDots(clusterConfigs[klaster.id]?.upgradeDouble || "")} 
                          onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeDouble", e.target.value.replace(/\D/g, ""))} 
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Upgrade Triple (Rp)</label>
                        <Input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="Rp -" 
                          value={formatNumberWithDots(clusterConfigs[klaster.id]?.upgradeTriple || "")} 
                          onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeTriple", e.target.value.replace(/\D/g, ""))} 
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 3. TANGGAL KEBERANGKATAN & HARGA ── */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block border-b pb-1">
            3. Tanggal Keberangkatan & Harga Base
          </span>

          {/* Dynamic Tanggal Keberangkatan Inputs */}
          <div className="flex flex-col gap-3 p-3 bg-muted/10 border rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Tanggal Keberangkatan <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Otomatis terisi dari hasil scan flyer. Anda dapat mengubah atau menambah tanggal jika diperlukan.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                {departureDates.length} Tanggal Terisi &rarr; {departureDates.length} Paket akan dibuat
              </div>
            </div>

            {/* Departure Dates Table Layout (CR-03 & CR-06 BR-DATE-01..04) */}
            <div className="overflow-x-auto border rounded-xl shadow-xs bg-card pt-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-extrabold border-b border-emerald-200/60 dark:border-emerald-800/60">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">No</th>
                    <th className="px-3 py-2.5">Tanggal Keberangkatan</th>
                    <th className="px-3 py-2.5">Tanggal Kepulangan (Editable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {departureDateRows.map((row, index) => {
                    const isLastEmpty = index === departureDateRows.length - 1 && !row.departureDate && !row.arrivalDate;

                    return (
                      <tr key={index} className={cn("hover:bg-muted/30 transition-colors", isLastEmpty && "bg-muted/10")}>
                        <td className="px-3 py-2 text-center font-bold text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <Input
                              type="date"
                              value={row.departureDate}
                              onChange={(e) => handleDepartureDateChange(index, e.target.value)}
                              className="h-8 text-xs font-mono max-w-[200px]"
                            />
                            {row.departureDate && (
                              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 w-fit">
                                🛫 {formatDateDdMmmmTttt(row.departureDate)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="date"
                                value={row.arrivalDate}
                                onChange={(e) => handleArrivalDateChange(index, e.target.value)}
                                className={cn(
                                  "h-8 text-xs font-mono max-w-[200px]",
                                  row.isManualOverride && "border-amber-400 bg-amber-50/40 text-amber-950 font-semibold dark:bg-amber-950/30 dark:text-amber-200"
                                )}
                              />
                              {row.isManualOverride && row.departureDate && (
                                <button
                                  type="button"
                                  onClick={() => handleRecalculateArrival(index)}
                                  className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 px-1.5 py-1 rounded transition-colors flex items-center gap-1 whitespace-nowrap"
                                  title="Hitung ulang tanggal kepulangan secara otomatis"
                                >
                                  ↻ Hitung Ulang
                                </button>
                              )}
                            </div>
                            {row.arrivalDate && (
                              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 w-fit">
                                🛬 {formatDateDdMmmmTttt(row.arrivalDate)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold mb-1">Kapasitas Seat (Maksimal Jamaah)</label>
              <Input 
                type="number" 
                name="kapasitas" 
                value={formData.kapasitas} 
                onChange={handleChange} 
                placeholder="45" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Termasuk Perlengkapan?</label>
              <div className="flex items-center gap-2 h-10">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isAdaPerlengkapan === "ya"}
                  onClick={() => setFormData(prev => ({ ...prev, isAdaPerlengkapan: prev.isAdaPerlengkapan === "ya" ? "tidak" : "ya" }))}
                  className={cn(
                    "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    formData.isAdaPerlengkapan === "ya" ? "bg-primary" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      formData.isAdaPerlengkapan === "ya" ? "translate-x-7" : "translate-x-0"
                    )}
                  />
                </button>
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-md border min-w-[55px] text-center transition-colors select-none",
                  formData.isAdaPerlengkapan === "ya" 
                    ? "bg-primary/10 text-primary border-primary/30" 
                    : "bg-background text-muted-foreground border-border"
                )}>
                  {formData.isAdaPerlengkapan === "ya" ? "Ya" : "Tidak"}
                </span>
              </div>
            </div>
            {formData.isAdaKlaster === "tidak" && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">Harga Base (Rp)</label>
                <Input 
                  type="text" 
                  inputMode="numeric"
                  name="hargaBase" 
                  value={formatNumberWithDots(formData.hargaBase)} 
                  onChange={(e) => handleCurrencyChange("hargaBase", e.target.value)} 
                  placeholder="35.000.000" 
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button 
            id="field-ocr-submitBtn" 
            onClick={handleGenerate} 
            disabled={loading || fetching}
            className="px-6 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {loading ? "Memproses..." : `Generate ${departureDates.length > 0 ? departureDates.length : ""} Paket`}
          </Button>
        </div>
      </div>
    );
  };

  const selectedParentGroup = useMemo(() => {
    return existingGroups.find(g => g.id === selectedParentGroupId) || null;
  }, [existingGroups, selectedParentGroupId]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Generate Paket Umroh
            {generateMode === "split" && (
              <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                ✂️ Mode Pecah Starting Point
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Wizard perakitan paket (Transaction Data) yang mengambil referensi dari Master Data.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => router.push("/admin/paket-umroh")}>Batal</Button>
          <Button 
            id="field-submitBtnHeader" 
            onClick={() => {
              if (generateMode === "split" && selectedParentGroup) {
                setShowPairingCanvas(true);
              } else {
                handleGenerate();
              }
            }} 
            disabled={loading || fetching || (generateMode === "split" && (!selectedParentGroupId || (selectedParentGroup && departureDates.length !== selectedParentGroup.dateCount)))}
            className={cn(generateMode === "split" ? "bg-amber-600 hover:bg-amber-500 text-white font-bold" : "")}
          >
            {loading ? "Memproses..." : generateMode === "split" ? `Lanjut Canvas Pairing (${departureDates.length} Tanggal)` : `Generate ${departureDates.length > 0 ? departureDates.length : ""} Paket`}
          </Button>
        </div>
      </div>

      {/* ── LANGKAH 0: MODE GENERATOR PAKET (Buat Baru vs Pecah Starting Point) ── */}
      <div className="p-5 bg-card border rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-500" /> Modus Inventarisasi Paket
          </label>
          <span className="text-[11px] text-muted-foreground">Pilih alur pembuatan paket yang sesuai</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setGenerateMode("new");
              setShowPairingCanvas(false);
            }}
            className={cn(
              "p-4 rounded-xl border text-left transition-all flex items-start gap-3.5",
              generateMode === "new"
                ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", generateMode === "new" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                📦 Buat Paket Baru (Fresh Single Starting Point)
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Membuat paket keberangkatan baru dari nol untuk 1 Starting Point pertama (Jalur Manual / OCR).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setGenerateMode("split")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all flex items-start gap-3.5",
              generateMode === "split"
                ? "bg-amber-500/10 border-amber-500 text-foreground shadow-sm ring-1 ring-amber-500"
                : "bg-background border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", generateMode === "split" ? "bg-amber-500 text-white" : "bg-muted")}>
              <Split className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                ✂️ Pecah Starting Point Paket (Dual Starting Point)
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Menghubungkan paket cabang (Starting Ke-2) dengan Paket Induk eksisting melalui Canvas Drag &amp; Drop.
              </p>
            </div>
          </button>
        </div>

        {/* Selected Parent Group Selector when in "split" mode */}
        {generateMode === "split" && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Split className="h-4 w-4" /> Langkah 1: Pilih Paket Induk Eksisting
              </span>
              {loadingGroups && <span className="text-xs text-amber-600 dark:text-amber-400">Memuat paket grup...</span>}
            </div>

            <SearchableSelect
              options={existingGroups.map(g => ({
                value: g.id,
                label: `${g.namaPaket} (${g.startingCity}) - ${g.dateCount} Tanggal [${g.kodeGrup}]`,
              }))}
              value={selectedParentGroupId}
              onChange={(val) => setSelectedParentGroupId(val)}
              placeholder="-- Pilih Paket Induk Eksisting --"
              searchPlaceholder="Cari kode grup / nama paket..."
            />

            {/* Selected Parent Group Info Summary Card */}
            {selectedParentGroup && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2 text-slate-300 font-mono shadow-inner">
                <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-slate-800 pb-1.5">
                  <span>Paket Induk: {selectedParentGroup.namaPaket}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                    {selectedParentGroup.dateCount} Tanggal
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kode Grup:</span>
                    <strong className="text-white text-[10px] break-all">{selectedParentGroup.kodeGrup}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Starting Point #1:</span>
                    <strong className="text-amber-300">{selectedParentGroup.startingCity}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jumlah Tanggal Induk:</span>
                    <strong className="text-emerald-400">{selectedParentGroup.dateCount} Tanggal</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Kuota Rombongan:</span>
                    <strong className="text-sky-300">{selectedParentGroup.totalCapacity} Seat</strong>
                  </div>
                </div>

                {/* Date Count Validation Indicator */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Status Validasi Kecocokan Jumlah Tanggal:</span>
                  {departureDates.length === selectedParentGroup.dateCount ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ COCOK ({departureDates.length} dari {selectedParentGroup.dateCount} Tanggal)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      ⚠️ BELUM COCOK ({departureDates.length} dari {selectedParentGroup.dateCount} Tanggal)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PAIRING CANVAS DRAG & DROP MODAL / STEP ── */}
      {showPairingCanvas && selectedParentGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl my-auto">
            <PairingCanvas
              parentStartingCity={selectedParentGroup.startingCity}
              childStartingCity={options?.cities.find(c => c.id === formData.startingPointId)?.name || "Surabaya"}
              parentItems={selectedParentGroup.items}
              initialChildItems={departureDates.map((d, i) => ({
                tempId: `child-${i}`,
                name: getIndividualNameForDate(d) || `Paket ${options?.cities.find(c => c.id === formData.startingPointId)?.name || "Surabaya"} #${i + 1}`,
                date: d,
              }))}
              totalGroupCapacity={selectedParentGroup.totalCapacity || 45}
              onCancel={() => setShowPairingCanvas(false)}
              onConfirm={async (pairs) => {
                setLoading(true);
                try {
                  const childCityName = options?.cities.find(c => c.id === formData.startingPointId)?.name || "Surabaya";

                  const payload = {
                    packageTypeId: formData.jenisPaketId,
                    startingPointId: formData.startingPointId,
                    maskapaiId: formData.maskapaiId,
                    landingPatternId: formData.landingPatternId,
                    durasiHari: Number(formData.durasiHari || 9),
                    durationDays: Number(formData.durasiHari || 9),
                    departureDates: pairs.map(p => p.childDate),
                    namaPaket: formData.namaPaket || `Umroh ${childCityName}`,
                    hargaBase: Number(formData.hargaBase || 35000000),
                    hargaPaket: Number(formData.hargaBase || 35000000),
                    hotelMekkahId: formData.hotelMekkahId,
                    hotelMadinahId: formData.hotelMadinahId,
                    kapasitas: pairs[0]?.childSeat || 20,
                    kuota: pairs[0]?.childSeat || 20,
                    maxSeat: pairs[0]?.childSeat || 20,
                    isAdaKlaster: formData.isAdaKlaster,
                    clusterConfigs: formData.isAdaKlaster === "ya" ? clusterConfigs : null,
                    paketGrupId: selectedParentGroupId,
                    kodeGrup: selectedParentGroup.kodeGrup,
                    pairedItems: pairs,
                  };

                  const res = await fetch("/api/keberangkatan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  const resJson = await res.json();
                  if (resJson.success) {
                    setSuccess(true);
                    setShowPairingCanvas(false);
                    setGeneratedResult({
                      count: pairs.length,
                      items: pairs.map(p => ({
                        name: p.childName,
                        code: `${childCityName}-${p.childDate}`,
                        date: p.childDate,
                      })),
                    });
                  } else {
                    alert(resJson.message || "Gagal menyimpan pasangan paket.");
                  }
                } catch (e: any) {
                  alert("Terjadi kesalahan: " + e?.message);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {success && generatedResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm space-y-3 animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <span className="text-base">🎉</span>
              <span>Berhasil Men-Generate {generatedResult.count} Paket Umroh!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                Status: Sukses
              </span>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-emerald-700 hover:text-emerald-950 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                title="Tutup Notifikasi"
              >
                ✕
              </button>
            </div>
          </div>

          <p className="text-xs text-emerald-700">
            Berikut adalah daftar {generatedResult.count} Nama Paket yang telah berhasil ter-generate:
          </p>

          {/* List of Generated Package Names line by line */}
          <div className="space-y-1.5 p-3 bg-white/90 border border-emerald-200 rounded-md max-h-[280px] overflow-y-auto">
            {generatedResult.items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-emerald-50/60 border border-emerald-100 text-xs gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-200/70 px-1.5 py-0.5 rounded shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-emerald-950 truncate">{item.name}</span>
                </div>
                {item.code && (
                  <span className="font-mono text-[11px] font-semibold text-emerald-800 shrink-0">
                    [{item.code}]
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSuccess(false)}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              + Buat Paket Baru
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/admin/keberangkatan")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
            >
              Lihat Daftar Paket Aktif (Keberangkatan) &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Path Mode Selector Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setPathMode("manual")}
          className={`px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            pathMode === "manual"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Jalur Manual (Formulir)
        </button>
        <button
          onClick={() => setPathMode("ocr")}
          className={`px-5 py-2.5 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            pathMode === "ocr"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20 animate-pulse" />
          Jalur OCR (Brosur / Flyer)
        </button>
      </div>

      {pathMode === "manual" ? (
        <div className="max-w-4xl">
          {renderWizardSteps()}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upload & Actions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 border rounded-lg bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base">Ekstraksi Dokumen Flyer</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unggah flyer (format JPG/PNG). <strong>Foto #1 (pertama)</strong> otomatis dijadikan sebagai <strong>Flyer Utama</strong> untuk ekstraksi tanggal & harga.
                  </p>
                </div>
                <span className="shrink-0 text-xs bg-muted px-2 py-1 rounded-md font-medium text-muted-foreground">
                  {flyerFiles.length}/{MAX_FILES} terisi
                </span>
              </div>

              {/* ── Switch Klaster Seat Sebelum Ekstraksi ── */}
              <div className="p-3 bg-muted/20 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block">
                    Apakah paket ini menggunakan Klaster Seat?
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formData.isAdaKlaster === "ya" 
                      ? "Menggunakan Klaster (Bronze, Silver, Gold, Platinum)" 
                      : "Tidak Menggunakan Klaster (Satu Macam Hotel)"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isAdaKlaster === "ya"}
                    onClick={() => setFormData(prev => ({ ...prev, isAdaKlaster: prev.isAdaKlaster === "ya" ? "tidak" : "ya" }))}
                    className={cn(
                      "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      formData.isAdaKlaster === "ya" ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        formData.isAdaKlaster === "ya" ? "translate-x-7" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-md border min-w-[55px] text-center transition-colors select-none",
                    formData.isAdaKlaster === "ya" 
                      ? "bg-primary/10 text-primary border-primary/30" 
                      : "bg-background text-muted-foreground border-border"
                  )}>
                    {formData.isAdaKlaster === "ya" ? "Ya" : "Tidak"}
                  </span>
                </div>
              </div>

              {/* ── Drag & Drop Zone ── */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer select-none ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : flyerFiles.length > 0
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />

                {flyerFiles.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-10 gap-3 pointer-events-none">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors ${
                      isDragging ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <Upload className={`h-7 w-7 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {isDragging ? "Lepaskan untuk Unggah" : "Seret & Lepas Foto Flyer di Sini"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        atau <span className="text-primary font-semibold underline">klik untuk memilih</span> — mendukung hingga {MAX_FILES} foto sekaligus
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">Format: JPG, JPEG, PNG, WEBP</p>
                    </div>
                  </div>
                ) : (
                  /* Thumbnail grid */
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {flyerFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative group aspect-square rounded-lg overflow-hidden border shadow-sm transition-all",
                            idx === 0 ? "ring-2 ring-emerald-500 border-emerald-500" : "border-border"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={flyerPreviews[idx]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                            <span className="text-white text-[10px] font-medium text-center line-clamp-2 leading-tight">{file.name}</span>
                            <span className="text-white/70 text-[10px]">{(file.size / 1024).toFixed(0)} KB</span>
                          </div>
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {/* Index & Flyer Utama Badge */}
                          {idx === 0 ? (
                            <div className="absolute bottom-1 left-1 right-1 z-10 bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center justify-between shadow-xs">
                              <span className="truncate flex items-center gap-1">
                                <Sparkles className="h-2.5 w-2.5 text-amber-300 fill-amber-300 shrink-0" />
                                Flyer Utama
                              </span>
                              <span className="text-[10px] opacity-90">#1</span>
                            </div>
                          ) : (
                            <div className="absolute bottom-1 left-1 h-4 min-w-4 rounded bg-black/60 text-white text-[10px] font-bold flex items-center justify-center px-1">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add more tile */}
                      {flyerFiles.length < MAX_FILES && (
                        <div
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <Plus className="h-5 w-5" />
                          <span className="text-[10px] font-medium">Tambah</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{flyerFiles.length}</span> foto dipilih
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">(Foto #1 = Flyer Utama)</span>
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); flyerPreviews.forEach(URL.revokeObjectURL); setFlyerFiles([]); setFlyerPreviews([]); }}
                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Hapus Semua
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Caption / Deskripsi Flyer (Opsional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Masukkan caption pemasaran sosial media jika ada..."
                  className="w-full h-20 p-2.5 text-xs rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]"
                />
              </div>

              {/* Process button */}
              <Button
                onClick={handleOcrProcess}
                className="w-full"
                disabled={flyerFiles.length === 0 || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengekstrak {flyerFiles.length} Brosur...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Proses {flyerFiles.length > 0 ? `${flyerFiles.length} ` : ""}Flyer & Prefill Form
                  </>
                )}
              </Button>

              {ocrWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <div className="break-all">{ocrWarning}</div>
                </div>
              )}

              {ocrSuccess && !ocrWarning && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-xs p-3 rounded-md">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <div>Data berhasil diekstraksi dari {flyerFiles.length} brosur! Silakan verifikasi formulir di sebelah kanan.</div>
                </div>
              )}

              {/* ── CANVAS INSPEKSI HASIL EKSTRAKSI AI / OCR ── */}
              {rawOcrResult && (
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-xl space-y-4 my-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                          Canvas Inspeksi Hasil Ekstraksi AI
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                            Raw & Mapped Data
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Data mentah hasil scan flyer sebelum dimasukkan ke dalam formulir master.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setActiveCanvasTab("summary")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-colors",
                          activeCanvasTab === "summary"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        📊 Ringkasan Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCanvasTab("json")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-colors",
                          activeCanvasTab === "json"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        {`{ }`} Raw JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCanvasTab("dates")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-colors",
                          activeCanvasTab === "dates"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        📅 Inspeksi Tanggal
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCanvasTab("ocr_text")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-colors",
                          activeCanvasTab === "ocr_text"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        📄 Raw Teks AI Studio
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Ringkasan Status Mapping */}
                  {activeCanvasTab === "summary" && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 gap-3">
                        {/* Main Package Fields */}
                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
                          <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider border-b border-slate-700 pb-1 flex items-center justify-between">
                            <span>Dasar Paket & Penerbangan</span>
                            <span className="text-[10px] text-slate-400">Scan Result</span>
                          </h4>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Jenis Paket:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.packageType || "-"} ➔ <strong className={rawOcrResult.mapped.packageType ? "text-emerald-400" : "text-amber-400"}>{rawOcrResult.mapped.packageType || "REG"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Starting Point:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.departureCity || "-"} ➔ <strong className={rawOcrResult.mapped.city ? "text-emerald-400" : "text-red-400"}>{rawOcrResult.mapped.city || "Unmatched ❌"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Maskapai:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.airline || "-"} ➔ <strong className={rawOcrResult.mapped.airline ? "text-emerald-400" : "text-red-400"}>{rawOcrResult.mapped.airline || "Unmatched ❌"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Rute In-Out:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.landingRoute || "-"} ➔ <strong className={rawOcrResult.mapped.route ? "text-emerald-400" : "text-amber-400"}>{rawOcrResult.mapped.route || "Unmatched ❌"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Durasi:</span>
                              <span className="text-emerald-400 font-bold">{rawOcrResult.extracted.durationDays || "-"} Hari</span>
                            </div>
                          </div>
                        </div>

                        {/* Dates & Base Hotel */}
                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
                          <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider border-b border-slate-700 pb-1 flex items-center justify-between">
                            <span>Hotel & Tanggal Keberangkatan</span>
                            <span className="text-[10px] text-slate-400">Flyer #1</span>
                          </h4>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Hotel Mekkah:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.hotelMekkah || "-"} ➔ <strong className={rawOcrResult.mapped.hotelMekkah ? "text-emerald-400" : "text-amber-400"}>{rawOcrResult.mapped.hotelMekkah || "Belum Terhubung ⚠️"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Hotel Madinah:</span>
                              <span className="text-slate-200">{rawOcrResult.extracted.hotelMadinah || "-"} ➔ <strong className={rawOcrResult.mapped.hotelMadinah ? "text-emerald-400" : "text-amber-400"}>{rawOcrResult.mapped.hotelMadinah || "Belum Terhubung ⚠️"}</strong></span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Harga Base:</span>
                              <span className="text-emerald-400 font-bold">Rp {formatNumberWithDots(String(rawOcrResult.extracted.hargaBase || 0))}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                              <span className="text-slate-400 font-sans">Tanggal Terdeteksi:</span>
                              <span className="text-emerald-400 font-bold">{Array.isArray(rawOcrResult.extracted.departureDates) ? rawOcrResult.extracted.departureDates.join(", ") : (rawOcrResult.extracted.departureDates || "-")}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Klaster Seat Details if available */}
                      {rawOcrResult.extracted.clusters && rawOcrResult.extracted.clusters.length > 0 && (
                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
                          <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider border-b border-slate-700 pb-1">
                            Data Klaster Extracted ({rawOcrResult.extracted.clusters.length} Klaster Ditemukan)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[10px] font-mono">
                              <thead>
                                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                                  <th className="p-1">Klaster</th>
                                  <th className="p-1">Hotel Mekkah</th>
                                  <th className="p-1">Hotel Madinah</th>
                                  <th className="p-1">Harga Base</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50">
                                {rawOcrResult.extracted.clusters.map((c: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-700/30">
                                    <td className="p-1 font-bold text-amber-300">{c.clusterName || `Klaster #${idx+1}`}</td>
                                    <td className="p-1 text-slate-300">{c.hotelMekkah || "-"}</td>
                                    <td className="p-1 text-slate-300">{c.hotelMadinah || "-"}</td>
                                    <td className="p-1 text-emerald-400 font-bold">Rp {formatNumberWithDots(String(c.hargaBase || 0))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Raw JSON View */}
                  {activeCanvasTab === "json" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-mono">Payload JSON Gemini AI:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(rawOcrResult.extracted, null, 2));
                            alert("Raw JSON berhasil disalin ke clipboard!");
                          }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded transition-colors"
                        >
                          📋 Salin JSON
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-[300px] overflow-y-auto">
                        {JSON.stringify(rawOcrResult.extracted, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Tab 3: Detailed Date Extraction & Pattern Inspector */}
                  {activeCanvasTab === "dates" && (
                    <div className="space-y-3 text-xs">
                      {/* Engine Diagnostic Badge */}
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-700 pb-2">
                          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                            🔍 Diagnostik Mesin Ekstraksi Tanggal
                          </span>
                          <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
                            Confidence Score: <strong className={rawOcrResult.extracted.confidence >= 0.8 ? "text-emerald-400" : "text-amber-400"}>{rawOcrResult.extracted.confidence ?? 0.7}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Provider AI/OCR:</span>
                            <span className="text-emerald-400 font-bold">
                              {rawOcrResult.extracted.confidence >= 0.8 ? "Gemini Vision AI (Image)" : "Regex Engine Fallback"}
                            </span>
                          </div>
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Jumlah Tanggal Terbaca:</span>
                            <span className="text-emerald-400 font-bold">
                              {(rawOcrResult.extracted.departureDates?.length || 0)} Tanggal
                            </span>
                          </div>
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Aturan Pola Aktif:</span>
                            <span className="text-amber-300 font-bold">
                              2 Angka + Nama Bulan + 4 Angka Tahun
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Table of Extracted Dates */}
                      {rawOcrResult.extracted.departureDates && rawOcrResult.extracted.departureDates.length > 0 ? (
                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                          <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider border-b border-slate-700 pb-1 flex justify-between items-center">
                            <span>Rincian Hasil Ekstraksi Tanggal ({rawOcrResult.extracted.departureDates.length} Tanggal)</span>
                            <span className="text-[10px] text-slate-400 font-mono">Format dd / mmmm / tttt</span>
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px] font-mono">
                              <thead>
                                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                                  <th className="p-2 w-10 text-center">No</th>
                                  <th className="p-2">dd (Tanggal)</th>
                                  <th className="p-2">mmmm (Bulan)</th>
                                  <th className="p-2">tttt (Tahun)</th>
                                  <th className="p-2">Format Teks dd/mmmm/tttt</th>
                                  <th className="p-2">ISO Standard YYYY-MM-DD</th>
                                  <th className="p-2 text-center">Status Match</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/60">
                                {rawOcrResult.extracted.departureDates.map((dateStr: string, idx: number) => {
                                  const parts = String(dateStr).split("-");
                                  const year = parts[0] ?? "";
                                  const rawMonth = parts[1] ?? "";
                                  const day = (parts[2] ?? "").padStart(2, "0");
                                  const MONTHS_ID = [
                                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                                  ];
                                  const mIdx = parseInt(rawMonth, 10) - 1;
                                  const monthName = MONTHS_ID[mIdx] ?? rawMonth;

                                  return (
                                    <tr key={idx} className="hover:bg-slate-700/40 transition-colors">
                                      <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                      <td className="p-2 font-bold text-amber-300">{day}</td>
                                      <td className="p-2 font-bold text-emerald-300">{monthName}</td>
                                      <td className="p-2 font-bold text-sky-300">{year}</td>
                                      <td className="p-2 font-bold text-emerald-400 bg-slate-900/50 rounded px-2">
                                        {day}/{monthName}/{year}
                                      </td>
                                      <td className="p-2 font-mono text-slate-300">{dateStr}</td>
                                      <td className="p-2 text-center">
                                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full">
                                          ✓ Valid Match
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        /* Diagnostic Box when no dates are extracted */
                        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-lg space-y-2 text-amber-200 text-xs">
                          <div className="flex items-center gap-2 font-bold text-amber-400">
                            <span>⚠️ Tanggal Belum Terekstraksi (departureDates: [])</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            <strong>Mengapa tanggal belum muncul?</strong><br />
                            1. Teks caption yang dimasukkan tidak memiliki baris daftar tanggal.<br />
                            2. Posisi tanggal berada di dalam gambar flyer fisik (<code className="bg-slate-900 text-emerald-400 px-1 py-0.5 rounded font-mono">CONFIRMED DATE</code>).<br />
                            3. Provider Vision API / Gemini API Key belum aktif pada environment lokal ini, sehingga gambar fisik flyer belum dipindai oleh Gemini AI Vision.
                          </p>
                          <div className="p-2 bg-slate-900 rounded text-[11px] font-mono text-emerald-300 border border-slate-800">
                            💡 <strong>Solusi Quick Test:</strong> Tambahkan teks tanggal di kolom caption, misal:<br />
                            <code className="text-amber-300 font-bold block mt-1">12 JULI 2026 | 4 AGUSTUS 2026 | 6 SEPTEMBER 2026 | 15 SEPTEMBER 2026</code>
                          </div>
                        </div>
                      )}

                      {/* Rule Trace & Text Source */}
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                        <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider border-b border-slate-700 pb-1">
                          📄 Teks Mentah Yang Dipindai Sistem
                        </h4>
                        <div className="space-y-1 text-[11px] font-mono">
                          <span className="text-slate-400 block text-[10px]">Raw Caption:</span>
                          <pre className="p-2 bg-slate-950 rounded text-slate-300 overflow-x-auto max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                            {rawOcrResult.extracted.rawCaption || caption || "Kosong"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Pure Raw Text Extracted by AI Studio (No Regex / No Parser) */}
                  {activeCanvasTab === "ocr_text" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2 flex-wrap gap-2">
                          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                            📄 Teks Mentah Hasil Ekstraksi Gambar Flyer (Pure Google AI Studio)
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                            Tanpa Regex & Tanpa Parser
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Seluruh teks murni yang terbaca oleh model <strong>Google AI Studio (Gemini Flash Multimodal)</strong> langsung dari gambar flyer fisik tanpa melalui penyaringan regex atau manipulasi string.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400 font-mono">Teks Flyer Fisik Yang Terbaca AI Studio:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const rawText = rawOcrResult.extracted.rawOcrText || rawOcrResult.extracted.rawCaption || "Teks flyer kosong";
                              navigator.clipboard.writeText(rawText);
                              alert("Teks mentah AI Studio berhasil disalin ke clipboard!");
                            }}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-2.5 py-1 rounded transition-colors font-medium"
                          >
                            📋 Salin Teks Mentah
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[350px] overflow-y-auto whitespace-pre-wrap">
                          {rawOcrResult.extracted.rawOcrText || rawOcrResult.extracted.rawCaption || "Belum ada teks flyer yang dipindai dari gambar."}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Verification Form in Single Unified Box */}
          <div className="lg:col-span-7 space-y-4">
            {renderOcrSingleCardForm()}
          </div>
        </div>
      )}
    </div>
  );
}
