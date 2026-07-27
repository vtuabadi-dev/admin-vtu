"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { cn, formatNumberWithDots } from "@/shared/lib/utils";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER
} from "@/shared/lib/mock-data";
import { Upload, Loader2, FileText, AlertTriangle, Sparkles, Plus, X } from "lucide-react";

  interface MasterDataOptions {
    airlines: any[];
    hotels: any[];
    cities: any[];
    packageTypes: any[];
    routes?: any[];
    clusters?: any[];
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

  // OCR state — multi-file drag-and-drop
  const [flyerFiles, setFlyerFiles] = useState<File[]>([]);
  const [flyerPreviews, setFlyerPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ocrWarning, setOcrWarning] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
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

  // Multiple Departure Dates State: Auto-expanding inputs array
  const [departureDateInputs, setDepartureDateInputs] = useState<string[]>([""]);

  // Derived departure dates list (non-empty dates only)
  const departureDates = useMemo(() => {
    return departureDateInputs.filter(d => d.trim() !== "");
  }, [departureDateInputs]);

  const handleDateInputChange = (index: number, val: string) => {
    setDepartureDateInputs(prev => {
      const next = [...prev];
      next[index] = val;
      const filled = next.filter(d => d.trim() !== "");
      return [...filled, ""];
    });
  };

  const handleRemoveDateInput = (index: number) => {
    setDepartureDateInputs(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      const filled = next.filter(d => d.trim() !== "");
      return [...filled, ""];
    });
  };

  const calculateReturnDate = (depDateStr: string, durDaysStr: string) => {
    if (!depDateStr) return "";
    const date = new Date(depDateStr);
    const days = parseInt(durDaysStr, 10) || 9;
    date.setDate(date.getDate() + days - 1);
    return date.toISOString().split("T")[0];
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
    const jCode = options.packageTypes.find(t => t.id === formData.jenisPaketId)?.code || "PKG";
    const airCode = options.airlines.find(a => a.id === formData.maskapaiId)?.code || "AIR";
    const firstDate = departureDates[0] || "";
    const dateStr = firstDate ? firstDate.replace(/-/g, "") : "";
    
    // Individual code uses first departure date
    const individualCode = `${jCode}-${airCode}${dateStr ? `-${dateStr}` : ""}`.toUpperCase();
    
    // Group code is generated only for multi-date batches (no specific date suffix)
    const now = new Date();
    const batchStamp = now.getFullYear().toString().slice(-2) + 
      String(now.getMonth() + 1).padStart(2, "0") + 
      String(now.getDate()).padStart(2, "0");
    const groupCode = departureDates.length > 1 
      ? `GRP-${jCode}-${airCode}-${batchStamp}`.toUpperCase()
      : "";

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
  const matchAirline = (name: string, list: any[]) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = list.find(item => {
      const nClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cClean = (item.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return nClean.includes(clean) || clean.includes(nClean) || cClean === clean;
    });
    return match ? match.id : "";
  };

  const matchCity = (name: string, list: any[]) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = list.find(item => {
      const nClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cClean = (item.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return nClean.includes(clean) || clean.includes(nClean) || cClean === clean;
    });
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

  const matchHotel = (name: string, list: any[]) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = list.find(item => {
      const nClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return nClean.includes(clean) || clean.includes(nClean);
    });
    return match ? match.id : "";
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

      for (const file of flyerFiles) {
        const bodyData = new FormData();
        bodyData.append("flyer", file);
        bodyData.append("caption", caption || `Proses dokumen flyer ${file.name}`);
        bodyData.append("isAdaKlaster", formData.isAdaKlaster);

        const res = await fetch("/api/admin/packages/ai-import", {
          method: "POST",
          body: bodyData,
        });

        const resJson = await res.json();
        if (res.ok && resJson.success) {
          const result = resJson.data?.extractionResult ?? {};
          
          // Form mapping
          const mappedAirline = matchAirline(result.airline, options?.airlines || []);
          const mappedCity = matchCity(result.departureCity, options?.cities || []);
          const mappedPackageType = matchPackageType(result.packageType, options?.packageTypes || []);
          
          const matchLandingRoute = (routeDesc: string, list: any[]) => {
            if (!routeDesc) return "";
            const clean = routeDesc.toLowerCase().replace(/[^a-z0-9]/g, "");
            const match = list.find(item => {
              const rClean = `${item.ruteIn}->${item.ruteOut}`.toLowerCase().replace(/[^a-z0-9]/g, "");
              const cClean = (item.kode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return rClean === clean || rClean.includes(clean) || clean.includes(rClean) || cClean === clean;
            });
            return match ? match.id : "";
          };
          const mappedLandingRoute = matchLandingRoute(result.landingRoute, options?.routes || []);
          
          const mekkahCity = options?.cities.find(c => c.code === "MEK" || c.name.toLowerCase() === "mekkah");
          const madinahCity = options?.cities.find(c => c.code === "MED" || c.name.toLowerCase() === "madinah");
          const mekkahHotels = options?.hotels.filter(h => h.cityId === mekkahCity?.id) || [];
          const madinahHotels = options?.hotels.filter(h => h.cityId === madinahCity?.id) || [];

          const mappedHotelMekkah = matchHotel(result.hotelMekkah, mekkahHotels);
          const mappedHotelMadinah = matchHotel(result.hotelMadinah, madinahHotels);

          // Merge fields (only overwrite if the new result has a value)
          if (result.title) finalFormData.namaPaket = result.title;
          if (mappedPackageType) finalFormData.jenisPaketId = mappedPackageType;
          if (mappedCity) finalFormData.startingPointId = mappedCity;
          if (mappedAirline) finalFormData.maskapaiId = mappedAirline;
          if (mappedLandingRoute) finalFormData.landingPatternId = mappedLandingRoute;
          if (mappedHotelMekkah) finalFormData.hotelMekkahId = mappedHotelMekkah;
          if (mappedHotelMadinah) finalFormData.hotelMadinahId = mappedHotelMadinah;
          if (result.durationDays) finalFormData.durasiHari = String(result.durationDays);
          
          if (result.departureDates && Array.isArray(result.departureDates)) {
            const extractedDates = result.departureDates.map((d: string) => d.split("T")[0]).filter(Boolean);
            setDepartureDateInputs(prev => {
              const existing = prev.filter(d => d.trim() !== "");
              const combined = Array.from(new Set([...existing, ...extractedDates])).sort();
              return [...combined, ""];
            });
          } else if (result.departureDates && typeof result.departureDates === "string") {
            const d = (result.departureDates as string).split("T")[0];
            if (d) {
              setDepartureDateInputs(prev => {
                const existing = prev.filter(d => d.trim() !== "");
                const combined = Array.from(new Set([...existing, d])).sort();
                return [...combined, ""];
              });
            }
          }

          if (resJson.data?.warning) {
            warningMessages.push(`${file.name}: ${resJson.data.warning}`);
          }
        } else {
          warningMessages.push(`${file.name}: ${resJson.message || "Gagal ekstraksi"}`);
        }
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
        setDepartureDateInputs([""]);
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

              <div>
                <label className="block text-sm font-medium mb-1">Nama Paket</label>
                {departureDates.length <= 1 ? (
                  <Input name="namaPaket" value={formData.namaPaket} readOnly className="bg-muted/30 font-medium" placeholder="Otomatis terisi setelah data lengkap..." />
                ) : (
                  <div className="space-y-3 border p-3 rounded-md bg-muted/5">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Nama Paket Base (Grup)</label>
                      <Input name="namaPaket" value={formData.namaPaket} readOnly className="bg-muted/30 font-medium text-xs" placeholder="Otomatis terisi setelah data lengkap..." />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">
                        Nama Paket Individual (ter-generate per tanggal keberangkatan - {departureDates.length} Paket)
                      </label>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {departureDates.map((d, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card border p-2.5 rounded-md text-xs shadow-sm">
                            <span className="font-semibold text-primary">{getIndividualNameForDate(d) || formData.namaPaket}</span>
                            <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded text-[11px] shrink-0 font-mono">
                              {formatDateIndo(d)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Package Code Section - dynamic based on date count */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kode Paket</label>
              </div>

              {departureDates.length <= 1 ? (
                /* Single date → only individual code */
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Kode Paket Individual</label>
                  <Input name="kodePaket" value={formData.kodePaket} readOnly className="bg-muted/30" placeholder="Otomatis terisi setelah data lengkap..." />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kode ini unik untuk satu paket dengan satu tanggal keberangkatan.
                  </p>
                </div>
              ) : (
                /* Multiple dates → group code + individual code per date */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Kode Paket Grup (Batch)</label>
                    <Input name="kodeGrup" value={formData.kodeGrup} readOnly className="bg-muted/30" placeholder="Otomatis terisi setelah data lengkap..." />
                    <p className="text-xs text-muted-foreground mt-1">
                      Kode grup menjadi pengikat seluruh paket yang dibuat dalam satu batch ini ({departureDates.length} paket).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Kode Paket Individual (per tanggal keberangkatan)
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/10 border rounded-md">
                      {departureDates.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-card border px-2.5 py-1.5 rounded-md text-xs shadow-sm">
                          <span className="font-mono font-semibold text-primary">{getIndividualCodeForDate(d)}</span>
                          <span className="text-muted-foreground">({d})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Setiap paket mendapat kode individual unik berdasarkan tanggal keberangkatannya.
                    </p>
                  </div>
                </div>
              )}
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
                      placeholder="Misal: 5.000.000" 
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
                      placeholder="Misal: 3.000.000" 
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
                                placeholder="Misal: 35.000.000" 
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
                                placeholder="Misal: 5.000.000" 
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
                                placeholder="Misal: 3.000.000" 
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {departureDateInputs.map((dateVal, index) => {
                  const isRequired = index === 0;
                  const returnDateStr = dateVal ? calculateReturnDate(dateVal, formData.durasiHari) : "";
                  const formattedReturn = returnDateStr ? formatDateIndo(returnDateStr) : "";

                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "p-3 bg-card border rounded-lg flex flex-col gap-2 relative transition-all shadow-xs",
                        isRequired && !dateVal ? "border-red-300 bg-red-50/10" : "hover:border-emerald-400 focus-within:border-emerald-500"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          Tanggal #{index + 1}
                          {isRequired ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              Wajib
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted border px-1.5 py-0.5 rounded">
                              Opsional
                            </span>
                          )}
                        </span>
                        {departureDateInputs.length > 1 && (index > 0 || dateVal !== "") && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDateInput(index)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
                            title="Hapus kolom tanggal ini"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <Input 
                        id={`field-departureDate-${index}`} 
                        type="date" 
                        value={dateVal} 
                        onChange={(e) => handleDateInputChange(index, e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const nextEl = document.getElementById(`field-departureDate-${index + 1}`);
                            if (nextEl) {
                              nextEl.focus();
                            } else {
                              focusNextId("field-kapasitas");
                            }
                          }
                        }}
                        className={cn(
                          "h-9 text-xs font-medium",
                          isRequired && !dateVal && "border-red-300"
                        )}
                      />

                      {dateVal ? (
                        <div className="text-[11px] text-emerald-800 font-medium bg-emerald-50/80 border border-emerald-200/80 px-2 py-1 rounded flex items-center justify-between">
                          <span>Pulang:</span>
                          <strong className="text-emerald-950">{formattedReturn}</strong>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic px-1">
                          {isRequired ? "Pilih tanggal utama..." : "Isi untuk tambah lagi..."}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      placeholder="35.000.000" 
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Paket Umroh</h1>
          <p className="text-muted-foreground mt-1">
            Wizard perakitan paket (Transaction Data) yang mengambil referensi dari Master Data.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => router.push("/admin/paket-umroh")}>Batal</Button>
          <Button 
            id="field-submitBtnHeader" 
            onClick={handleGenerate} 
            disabled={loading || fetching}
          >
            {loading ? "Memproses..." : `Generate ${departureDates.length > 0 ? departureDates.length : ""} Paket`}
          </Button>
        </div>
      </div>

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
                    Unggah flyer dalam format JPG/JPEG. Tambah slot untuk mengekstraksi dari beberapa gambar sekaligus.
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
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border shadow-sm">
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
                          {/* Index badge */}
                          <div className="absolute bottom-1 left-1 h-4 min-w-4 rounded bg-black/60 text-white text-[10px] font-bold flex items-center justify-center px-1">
                            {idx + 1}
                          </div>
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
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{flyerFiles.length}</span> foto dipilih
                        {flyerFiles.length < MAX_FILES && (
                          <span> · Bisa tambah {MAX_FILES - flyerFiles.length} lagi</span>
                        )}
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
            </div>
          </div>

          {/* Right Column: Verification Form */}
          <div className="lg:col-span-7 space-y-4 border-l pl-2 lg:pl-6 border-border">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="font-semibold text-base flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                Formulir Verifikasi Hasil Ekstraksi
              </h2>
              {ocrSuccess && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Ready</span>
              )}
            </div>
            {renderWizardSteps(true)}
          </div>
        </div>
      )}
    </div>
  );
}
