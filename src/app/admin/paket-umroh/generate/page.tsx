"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { cn } from "@/shared/lib/utils";
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

  // Multiple Departure Dates State
  const [departureDates, setDepartureDates] = useState<string[]>([]);
  const [tempDate, setTempDate] = useState("");

  const handleAddDate = () => {
    if (!tempDate) return;
    if (!departureDates.includes(tempDate)) {
      setDepartureDates(prev => [...prev, tempDate].sort());
    }
    setTempDate("");
  };

  const handleRemoveDate = (val: string) => {
    setDepartureDates(prev => prev.filter(d => d !== val));
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
    const mCode = (airlineObj?.code || "SV").toUpperCase();

    const autoName = `${prefix} ${durasi} ${sCode} ( ${rCode} ) - ${tglFormatted} (${mCode})`;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            setDepartureDates(prev => Array.from(new Set([...prev, ...extractedDates])).sort());
          } else if (result.departureDates && typeof result.departureDates === "string") {
            const d = (result.departureDates as string).split("T")[0];
            if (d && !departureDates.includes(d)) {
              setDepartureDates(prev => [...prev, d].sort());
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

  const handleGenerate = async () => {
    if (departureDates.length === 0) {
      alert("Mohon tambahkan minimal satu tanggal keberangkatan pada Langkah 4.");
      return;
    }
    setLoading(true);

    // Build payloads per departure date
    const isMultiDate = departureDates.length > 1;
    const packages = departureDates.map((depDate) => {
      const returnDate = calculateReturnDate(depDate, formData.durasiHari);
      const indivCode = getIndividualCodeForDate(depDate);
      return {
        ...formData,
        kodePaket: indivCode,
        kodeGrup: isMultiDate ? formData.kodeGrup : "",
        departureDates: [depDate],
        returnDate,
        clusterConfigs: formData.isAdaKlaster === "ya" ? clusterConfigs : null,
      };
    });

    // TODO: replace with real API call
    console.info("[handleGenerate] packages to create:", packages);

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 800);
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

  // Sub-component to render Wizard steps
  const renderWizardSteps = (colMode = false) => {
    return (
      <div className="flex flex-col gap-4">
        {/* Step 1: Dasar Paket */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 1: Dasar Paket</h2>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jenis Paket (Master Data)</label>
                <SearchableSelect
                  options={options?.packageTypes.map(t => ({ value: t.id, label: t.name })) || []}
                  value={formData.jenisPaketId}
                  onChange={(val) => setFormData(prev => ({ ...prev, jenisPaketId: val }))}
                  placeholder="-- Pilih Jenis Paket --"
                  searchPlaceholder="Cari jenis paket..."
                  disabled={fetching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Paket</label>
                <div className="flex gap-2">
                  <Input name="namaPaket" value={formData.namaPaket} readOnly className="bg-muted/30" placeholder="Otomatis terisi setelah data lengkap..." />
                </div>
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
                options={(options?.routes && options.routes.length > 0 ? options.routes : MOCK_LANDING_PATTERN).map(r => ({ value: r.id, label: `${r.ruteIn} → ${r.ruteOut}` }))}
                value={formData.landingPatternId}
                onChange={(val) => setFormData(prev => ({ ...prev, landingPatternId: val }))}
                placeholder="-- Pilih Rute --"
                searchPlaceholder="Cari rute..."
                disabled={fetching}
              />
            </div>
            <div className={colMode ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium mb-1">Maskapai</label>
              <SearchableSelect
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
                    <Input type="number" name="upgradeDouble" value={formData.upgradeDouble} onChange={handleChange} placeholder="Misal: 5000000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Harga Upgrade Triple (Rp)</label>
                    <Input type="number" name="upgradeTriple" value={formData.upgradeTriple} onChange={handleChange} placeholder="Misal: 3000000" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground bg-amber-50/50 border border-amber-200 p-2.5 rounded-md">
                  💡 <strong>Info:</strong> Hotel, Harga Base, serta Harga Upgrade Kamar (Double & Triple) akan dikonfigurasi untuk masing-masing klaster di bawah ini.
                </div>
                <div className="space-y-3">
                  {(options?.clusters || MOCK_KLASTER).map((klaster) => (
                    <div key={klaster.id} className="p-4 bg-card border rounded-md flex flex-col gap-3 shadow-sm">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-bold text-primary">{klaster.nama} Seat Class</span>
                      </div>
                      
                      {/* Hotel Selection Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Mekkah</label>
                          <SearchableSelect
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
                            type="number" 
                            placeholder="Misal: 35000000" 
                            value={clusterConfigs[klaster.id]?.hargaBase || ""} 
                            onChange={(e) => handleClusterConfigChange(klaster.id, "hargaBase", e.target.value)} 
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Harga Upgrade Double (Rp)</label>
                          <Input 
                            type="number" 
                            placeholder="Misal: 5000000" 
                            value={clusterConfigs[klaster.id]?.upgradeDouble || ""} 
                            onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeDouble", e.target.value)} 
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Harga Upgrade Triple (Rp)</label>
                          <Input 
                            type="number" 
                            placeholder="Misal: 3000000" 
                            value={clusterConfigs[klaster.id]?.upgradeTriple || ""} 
                            onChange={(e) => handleClusterConfigChange(klaster.id, "upgradeTriple", e.target.value)} 
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
        </div>

        {/* Step 4: Lainnya */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Langkah 4: Operasional & Harga</h2>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Tambah Tanggal Keberangkatan</label>
                <div className="flex gap-2">
                  <Input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} />
                  <Button type="button" onClick={handleAddDate}>Tambah</Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border">
                <strong>Catatan Tanggal Pulang:</strong> Tanggal kepulangan dihitung otomatis berdasarkan tanggal keberangkatan ditambah durasi hari paket dikurangi 1 hari.
              </div>
            </div>

            {/* Departure Dates Chip/Badge List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">
                Tanggal Keberangkatan Terpilih ({departureDates.length} Tanggal &rarr; {departureDates.length} Paket akan dibuat)
              </label>
              {departureDates.length === 0 ? (
                <div className="text-sm text-red-500 border border-red-200 bg-red-50/50 p-2.5 rounded-md">
                  Belum ada tanggal keberangkatan yang dimasukkan. Gunakan form di atas untuk menambahkan tanggal.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto border p-2.5 rounded-md bg-muted/10">
                  {departureDates.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-card border px-2.5 py-1.5 rounded-md text-xs shadow-sm">
                      <span className="font-semibold">{d}</span>
                      <span className="text-muted-foreground">
                        (Pulang: {calculateReturnDate(d, formData.durasiHari)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-1 py-0.5 rounded font-bold"
                        title="Hapus tanggal"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kapasitas Seat (Maksimal Jamaah)</label>
                <Input type="number" name="kapasitas" value={formData.kapasitas} onChange={handleChange} placeholder="Misal: 45" />
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
                <label className="block text-sm font-medium mb-1">Durasi (Hari)</label>
                <Input type="number" name="durasiHari" value={formData.durasiHari} onChange={handleChange} placeholder="9" />
              </div>
              <div>
                {formData.isAdaKlaster === "tidak" ? (
                  <>
                    <label className="block text-sm font-medium mb-1">Harga Base (Rp)</label>
                    <Input type="number" name="hargaBase" value={formData.hargaBase} onChange={handleChange} placeholder="35000000" />
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
          <Button onClick={handleGenerate} disabled={loading || fetching}>
            {loading ? "Memproses..." : `Generate ${departureDates.length > 0 ? departureDates.length : ""} Paket`}
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-100 text-green-700 border border-green-200 rounded-md">
          Berhasil men-generate {departureDates.length} Paket Umroh untuk tanggal-tanggal: {departureDates.join(", ")}! (Ini adalah UI UAT menggunakan Database Live Master Data)
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
