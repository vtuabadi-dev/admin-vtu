"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { AccordionSection } from "@/shared/components/ui";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER
} from "@/shared/lib/mock-data";
import { Upload, Loader2, FileText, AlertTriangle, Sparkles } from "lucide-react";

interface MasterDataOptions {
  airlines: any[];
  hotels: any[];
  cities: any[];
  packageTypes: any[];
}

export default function GeneratePaketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [options, setOptions] = useState<MasterDataOptions | null>(null);

  // Tab path selection
  const [pathMode, setPathMode] = useState<"manual" | "ocr">("manual");

  // OCR state
  const [flyerFiles, setFlyerFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ocrWarning, setOcrWarning] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Main Form Data
  const [formData, setFormData] = useState({
    jenisPaketId: "",
    namaPaket: "",
    kodePaket: "",
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
    const jPaket = options.packageTypes.find(t => t.id === formData.jenisPaketId)?.name || "";
    const airline = options.airlines.find(a => a.id === formData.maskapaiId)?.name || "";
    const firstDate = departureDates[0] || "";
    let monthName = "";
    let year = "";
    
    if (firstDate) {
      const d = new Date(firstDate);
      if (!isNaN(d.getTime())) {
        monthName = d.toLocaleString("id-ID", { month: "long" });
        year = String(d.getFullYear());
      }
    }

    let autoName = "";
    if (jPaket) autoName += jPaket;
    if (airline) autoName += (autoName ? ` ${airline}` : airline);
    if (monthName && year) autoName += (autoName ? ` — ${monthName} ${year}` : `${monthName} ${year}`);

    setFormData(prev => ({ ...prev, namaPaket: autoName }));
  };

  const handleAutoGenerateCode = () => {
    if (!options) return;
    const jCode = options.packageTypes.find(t => t.id === formData.jenisPaketId)?.code || "PKG";
    const airCode = options.airlines.find(a => a.id === formData.maskapaiId)?.code || "AIR";
    const firstDate = departureDates[0] || "";
    const dateStr = firstDate ? firstDate.replace(/-/g, "") : "";
    const autoCode = `${jCode}-${airCode}${dateStr ? `-${dateStr}` : ""}`.toUpperCase();

    setFormData(prev => ({ ...prev, kodePaket: autoCode }));
  };

  useEffect(() => {
    if (!formData.namaPaket) {
      handleAutoGenerateName();
    }
    if (!formData.kodePaket) {
      handleAutoGenerateCode();
    }
  }, [formData.jenisPaketId, formData.maskapaiId, departureDates, options]);

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
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 800);
  };

  // Filter hotels by cities
  const mekkahCity = options?.cities.find(c => c.code === "MEK" || c.name.toLowerCase() === "mekkah");
  const madinahCity = options?.cities.find(c => c.code === "MED" || c.name.toLowerCase() === "madinah");
  
  const mekkahHotels = options?.hotels.filter(h => h.cityId === mekkahCity?.id) || [];
  const madinahHotels = options?.hotels.filter(h => h.cityId === madinahCity?.id) || [];

  // Sub-component to render Wizard steps
  const renderWizardSteps = (colMode = false) => {
    return (
      <div className="flex flex-col gap-4">
        {/* Step 1: Dasar Paket */}
        <AccordionSection title="Langkah 1: Dasar Paket" defaultOpen>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jenis Paket (Master Data)</label>
                <select name="jenisPaketId" value={formData.jenisPaketId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                  <option value="">-- Pilih Jenis Paket --</option>
                  {fetching ? (
                    <option disabled>Loading jenis paket...</option>
                  ) : (
                    options?.packageTypes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kode Paket</label>
                <div className="flex gap-2">
                  <Input name="kodePaket" value={formData.kodePaket} onChange={handleChange} placeholder="REG-SV-20260910" />
                  <Button type="button" variant="outline" onClick={handleAutoGenerateCode} title="Generate Kode Otomatis">
                    <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Paket</label>
                <div className="flex gap-2">
                  <Input name="namaPaket" value={formData.namaPaket} onChange={handleChange} placeholder="Umroh Syawal 2026" />
                  <Button type="button" variant="outline" onClick={handleAutoGenerateName} title="Generate Nama Otomatis">
                    <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* Step 2: Penerbangan */}
        <AccordionSection title="Langkah 2: Rute & Penerbangan" defaultOpen>
          <div className={`p-4 bg-card border rounded-md grid grid-cols-1 ${colMode ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            <div>
              <label className="block text-sm font-medium mb-1">Starting Point</label>
              <select name="startingPointId" value={formData.startingPointId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Kota --</option>
                {fetching ? (
                  <option disabled>Loading starting points...</option>
                ) : (
                  options?.cities.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rute In-Out</label>
              <select name="landingPatternId" value={formData.landingPatternId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                <option value="">-- Pilih Rute --</option>
                {MOCK_LANDING_PATTERN.map((item) => (
                  <option key={item.id} value={item.id}>{item.ruteIn} &rarr; {item.ruteOut} ({item.kode})</option>
                ))}
              </select>
            </div>
            <div className={colMode ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium mb-1">Maskapai</label>
              <select name="maskapaiId" value={formData.maskapaiId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Maskapai --</option>
                {fetching ? (
                  <option disabled>Loading maskapai...</option>
                ) : (
                  options?.airlines.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </AccordionSection>

        {/* Step 3: Akomodasi */}
        <AccordionSection title="Langkah 3: Akomodasi & Hotel" defaultOpen>
          <div className="p-4 bg-card border rounded-md flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Apakah paket ini menggunakan Klaster Seat?</label>
              <select name="isAdaKlaster" value={formData.isAdaKlaster} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                <option value="tidak">Tidak Menggunakan Klaster (Satu Macam Hotel)</option>
                <option value="ya">Ya, Menggunakan Klaster Seat (Bronze, Silver, Gold, Platinum)</option>
              </select>
            </div>

            {formData.isAdaKlaster === "tidak" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Hotel Mekkah</label>
                    <select name="hotelMekkahId" value={formData.hotelMekkahId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                      <option value="">-- Pilih Hotel Mekkah --</option>
                      {fetching ? (
                        <option disabled>Loading hotel Mekkah...</option>
                      ) : (
                        mekkahHotels.map((item) => (
                          <option key={item.id} value={item.id}>{item.name} ({item.starRating || 5}⭐)</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hotel Madinah</label>
                    <select name="hotelMadinahId" value={formData.hotelMadinahId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                      <option value="">-- Pilih Hotel Madinah --</option>
                      {fetching ? (
                        <option disabled>Loading hotel Madinah...</option>
                      ) : (
                        madinahHotels.map((item) => (
                          <option key={item.id} value={item.id}>{item.name} ({item.starRating || 5}⭐)</option>
                        ))
                      )}
                    </select>
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
                  {MOCK_KLASTER.map((klaster) => (
                    <div key={klaster.id} className="p-4 bg-card border rounded-md flex flex-col gap-3 shadow-sm">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-bold text-primary">{klaster.nama} Seat Class</span>
                      </div>
                      
                      {/* Hotel Selection Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Mekkah</label>
                          <select 
                            value={clusterConfigs[klaster.id]?.hotelMekkahId || ""} 
                            onChange={(e) => handleClusterConfigChange(klaster.id, "hotelMekkahId", e.target.value)} 
                            className="w-full h-9 px-2 text-xs rounded-md border border-input bg-background"
                          >
                            <option value="">-- Hotel Mekkah --</option>
                            {mekkahHotels.map((h) => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Madinah</label>
                          <select 
                            value={clusterConfigs[klaster.id]?.hotelMadinahId || ""} 
                            onChange={(e) => handleClusterConfigChange(klaster.id, "hotelMadinahId", e.target.value)} 
                            className="w-full h-9 px-2 text-xs rounded-md border border-input bg-background"
                          >
                            <option value="">-- Hotel Madinah --</option>
                            {madinahHotels.map((h) => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
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
        </AccordionSection>

        {/* Step 4: Lainnya */}
        <AccordionSection title="Langkah 4: Operasional & Harga" defaultOpen>
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
                <select name="isAdaPerlengkapan" value={formData.isAdaPerlengkapan} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                  <option value="">-- Pilih --</option>
                  <option value="ya">Ya, Termasuk Perlengkapan</option>
                  <option value="tidak">Tidak Termasuk</option>
                </select>
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
        </AccordionSection>
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
              <h2 className="font-semibold text-base">Ekstraksi Dokumen Flyer</h2>
              <p className="text-xs text-muted-foreground">
                Unggah satu atau beberapa brosur flyer paket dalam format JPG/JPEG untuk diekstraksi datanya secara otomatis menggunakan AI.
              </p>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 bg-muted/10 cursor-pointer transition-colors relative">
                <input 
                  type="file" 
                  accept=".jpg,.jpeg" 
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    setFlyerFiles(prev => [...prev, ...selected]);
                  }}
                />
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-center">
                  Klik atau seret file JPG kemari
                </span>
                <span className="text-xs text-muted-foreground mt-1">Bisa pilih beberapa file sekaligus</span>
              </div>

              {flyerFiles.length > 0 && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                  <label className="text-xs font-semibold text-muted-foreground">Flyer Terpilih ({flyerFiles.length})</label>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {flyerFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-card border p-2 rounded-md">
                        <span className="truncate font-medium max-w-[80%]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFlyerFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-semibold px-1"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  Caption / Deskripsi Flyer (Opsional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Masukkan caption pemasaran sosial media jika ada..."
                  className="w-full h-24 p-2.5 text-xs rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                />
              </div>

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
                    Proses Flyer & Prefill Form
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
