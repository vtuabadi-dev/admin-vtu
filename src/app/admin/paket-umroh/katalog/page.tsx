"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plane,
  Calendar,
  Sparkles,
  Send,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  Check,
  Eye,
  User,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { useSession } from "@/shared/hooks/use-session";
import { formatNumberWithDots, getWhatsAppUrl } from "@/shared/lib/utils";
import type { Keberangkatan } from "@/shared/types";

interface BukuTamuSimple {
  id: string;
  namaTamu: string;
  nomorWa: string;
  kotaAsal?: string | null;
  statusKunjungan: string;
  hasilKunjungan?: string | null;
  minatBulan?: string | null;
  minatJenisPaket?: string | null;
}

// Helper untuk mengekstrak Starting Point dari data Keberangkatan
const getStartingPointName = (pkg: Keberangkatan): string => {
  if (pkg.startingPoint?.name) return pkg.startingPoint.name;
  if (pkg.parentKeberangkatan?.startingPoint?.name) return pkg.parentKeberangkatan.startingPoint.name;
  if (pkg.startingPoint?.code) {
    const code = pkg.startingPoint.code.toUpperCase();
    if (code === "JKT" || code === "CGK") return "Jakarta (CGK)";
    if (code === "SUB") return "Surabaya (SUB)";
    if (code === "SOC") return "Solo (SOC)";
    if (code === "KJT") return "Kertajati (KJT)";
    if (code === "UPG") return "Makassar (UPG)";
    return code;
  }
  if (pkg.kode) {
    const parts = pkg.kode.split("-");
    if (parts.length >= 2 && parts[1]) {
      const code = parts[1].toUpperCase();
      if (code === "JKT" || code === "CGK") return "Jakarta (CGK)";
      if (code === "SUB") return "Surabaya (SUB)";
      if (code === "SOC") return "Solo (SOC)";
      if (code === "KJT") return "Kertajati (KJT)";
      if (code === "UPG") return "Makassar (UPG)";
      return code;
    }
  }
  return "Jakarta (CGK)";
};

// Helper untuk memecah daftar flyer brosur (bisa comma-separated, newline, atau single URL)
const getFlyerList = (pkg: Keberangkatan): string[] => {
  if (!pkg.flyerUrl) return [];
  if (pkg.flyerUrl.includes(",")) {
    return pkg.flyerUrl.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (pkg.flyerUrl.includes("\n")) {
    return pkg.flyerUrl.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return [pkg.flyerUrl];
};

export default function KatalogPaketPage() {
  const { user } = useSession();

  const [packages, setPackages] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartingPoint, setSelectedStartingPoint] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Slide index per paket ID: Record<packageId, currentSlideIndex>
  const [activeSlideMap, setActiveSlideMap] = useState<Record<string, number>>({});

  // Tamu milik admin yang sedang login
  const [myGuests, setMyGuests] = useState<BukuTamuSimple[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Modal Kirim WA ke Tamu
  const [targetPackage, setTargetPackage] = useState<Keberangkatan | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<BukuTamuSimple | null>(null);
  const [guestSearch, setGuestSearch] = useState("");

  // Modal Zoom Flyer
  const [previewFlyerUrl, setPreviewFlyerUrl] = useState<string | null>(null);

  // Copy Caption State
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);

  // Fetch Packages
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/keberangkatan");
      const json = await res.json();
      if (json.success && json.data) {
        setPackages(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat katalog paket:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tamu Milik Admin Sendiri
  const fetchMyGuests = async () => {
    try {
      setLoadingGuests(true);
      const res = await fetch("/api/buku-tamu?filter=mine");
      const json = await res.json();
      if (json.success && json.data) {
        setMyGuests(json.data);
      }
    } catch (err) {
      console.warn("Gagal memuat tamu admin:", err);
    } finally {
      setLoadingGuests(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchMyGuests();
  }, []);

  // Helper cek apakah paket diaktifkan untuk katalog dari menu Paket Aktif
  const isPackagePublishedInKatalog = (pkg: Keberangkatan): boolean => {
    if (pkg.isPublishedKatalog !== undefined) return pkg.isPublishedKatalog;
    const meta = typeof pkg.driveFolderIds === "object" ? pkg.driveFolderIds : null;
    return meta?.isPublishedKatalog === true;
  };

  // Hanya ambil paket yang saklar katalog-nya diaktifkan dari Paket Aktif
  const publishedPackages = useMemo(() => {
    return packages.filter(isPackagePublishedInKatalog);
  }, [packages]);

  // Distinct Starting Points list (hanya dari paket yang aktif di katalog)
  const startingPointsList = useMemo(() => {
    const set = new Set<string>();
    publishedPackages.forEach((pkg) => {
      const sp = getStartingPointName(pkg);
      if (sp) set.add(sp);
    });
    return Array.from(set).sort();
  }, [publishedPackages]);

  // Distinct Months list extracted from published packages
  const monthsList = useMemo(() => {
    const set = new Set<string>();
    publishedPackages.forEach((pkg) => {
      if (pkg.tanggalBerangkat) {
        const d = new Date(pkg.tanggalBerangkat);
        const mKey = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        set.add(mKey);
      }
    });
    return Array.from(set).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [publishedPackages]);

  // Filtered packages by starting point, month, and search query
  const filteredPackages = useMemo(() => {
    return publishedPackages.filter((pkg) => {
      // 1. Starting Point filter
      if (selectedStartingPoint !== "ALL") {
        const sp = getStartingPointName(pkg);
        if (sp !== selectedStartingPoint) return false;
      }

      // 2. Month filter
      if (selectedMonth !== "ALL") {
        if (!pkg.tanggalBerangkat) return false;
        const d = new Date(pkg.tanggalBerangkat);
        const mKey = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        if (mKey !== selectedMonth) return false;
      }

      // 3. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = (pkg.namaPaket || "").toLowerCase();
        const maskapai = (pkg.maskapai || "").toLowerCase();
        const kode = (pkg.kode || "").toLowerCase();
        const starting = getStartingPointName(pkg).toLowerCase();
        return (
          nama.includes(q) ||
          maskapai.includes(q) ||
          kode.includes(q) ||
          starting.includes(q)
        );
      }

      return true;
    });
  }, [publishedPackages, selectedStartingPoint, selectedMonth, searchQuery]);

  // Group packages by Month when "Semua Bulan" is active
  const packagesGroupedByMonth = useMemo(() => {
    const map = new Map<string, Keberangkatan[]>();
    filteredPackages.forEach((pkg) => {
      let mKey = "Lainnya";
      if (pkg.tanggalBerangkat) {
        const d = new Date(pkg.tanggalBerangkat);
        mKey = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }
      if (!map.has(mKey)) {
        map.set(mKey, []);
      }
      map.get(mKey)!.push(pkg);
    });

    // Urutkan grup bulan secara kronologis
    const sortedEntries = Array.from(map.entries()).sort(([mA], [mB]) => {
      const dateA = new Date(mA);
      const dateB = new Date(mB);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
      return dateA.getTime() - dateB.getTime();
    });

    return sortedEntries;
  }, [filteredPackages]);

  // Navigasi Slide Flyer
  const nextFlyerSlide = (pkgId: string, total: number) => {
    if (total <= 1) return;
    setActiveSlideMap((prev) => {
      const current = prev[pkgId] || 0;
      return { ...prev, [pkgId]: (current + 1) % total };
    });
  };

  const prevFlyerSlide = (pkgId: string, total: number) => {
    if (total <= 1) return;
    setActiveSlideMap((prev) => {
      const current = prev[pkgId] || 0;
      return { ...prev, [pkgId]: (current - 1 + total) % total };
    });
  };

  // Open modal send to guest
  const openSendModal = (pkg: Keberangkatan) => {
    setTargetPackage(pkg);
    setSelectedGuest(null);
    setGuestSearch("");
    fetchMyGuests();
  };

  // Filtered guests inside modal
  const filteredGuests = useMemo(() => {
    if (!guestSearch.trim()) return myGuests;
    const q = guestSearch.toLowerCase().trim();
    return myGuests.filter(
      (g) =>
        g.namaTamu.toLowerCase().includes(q) ||
        g.nomorWa.includes(q) ||
        (g.kotaAsal && g.kotaAsal.toLowerCase().includes(q))
    );
  }, [myGuests, guestSearch]);

  // Generate WA Message for specific guest and package
  const handleSendWhatsAppToGuest = () => {
    if (!targetPackage || !selectedGuest) return;

    const cleanPhone = selectedGuest.nomorWa.replace(/[^0-9]/g, "");
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith("0")) formattedPhone = "62" + formattedPhone.slice(1);
    else if (formattedPhone.startsWith("8")) formattedPhone = "62" + formattedPhone;

    const depFormatted = targetPackage.tanggalBerangkat
      ? new Date(targetPackage.tanggalBerangkat).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-";

    const hargaFormatted = `Rp ${formatNumberWithDots(targetPackage.hargaPaket || 0)}`;

    const flyerSection = targetPackage.flyerUrl
      ? `\n🖼️ *Flyer Brosur Resmi:*\n${targetPackage.flyerUrl}\n`
      : "";

    const captionSection = targetPackage.caption
      ? `\n📝 *Deskripsi & Fasilitas:* \n${targetPackage.caption}\n`
      : "";

    const pesan = `*Bismillah, Assalamu'alaikum Warahmatullahi Wabarakatuh.*

Yth. Bapak/Ibu *${selectedGuest.namaTamu}*,
Berikut kami kirimkan rekomendasi brosur dan katalog paket keberangkatan Umroh terbaik dari *VTU ABADI Travel*:

📦 *${targetPackage.namaPaket}*
📅 *Tanggal Berangkat:* ${depFormatted} (${targetPackage.durationDays || 9} Hari)
✈️ *Maskapai:* ${targetPackage.maskapai || "Saudia Airlines"}
🏨 *Hotel Mekkah:* ${targetPackage.hotelMekkah || "Bintang 5 / Setaraf"}
🏨 *Hotel Madinah:* ${targetPackage.hotelMadinah || "Bintang 5 / Setaraf"}
💰 *Harga Mulai:* ${hargaFormatted}
${flyerSection}${captionSection}
Untuk pendaftaran & pemilihan kamar bersama keluarga, Anda dapat langsung menghubungi kami kembali atau mengisi formulir pendaftaran online di:
👉 https://vtu.my.id/pendaftaran

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
Salam hangat dari kami,
*${user?.name || "Konsultan Umroh"} — VTU ABADI Travel*`;

    const waUrl = getWhatsAppUrl(formattedPhone, pesan);
    window.open(waUrl, "_blank");
    setTargetPackage(null);
  };

  const handleCopyCaption = (pkg: Keberangkatan) => {
    const textToCopy = pkg.caption || `${pkg.namaPaket}\nKeberangkatan: ${pkg.tanggalBerangkat ? new Date(pkg.tanggalBerangkat).toLocaleDateString("id-ID") : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaptionId(pkg.id);
    setTimeout(() => setCopiedCaptionId(null), 2500);
  };

  // Group related packages (Parents and their children / variants) to compute joint pooled quota
  const groupStatsMap = useMemo(() => {
    const map = new Map<string, {
      allPackages: Keberangkatan[];
      totalGroupQuota: number;
      totalGroupFilled: number;
    }>();

    const getDateStr = (d: any) => {
      if (!d) return "";
      try { return new Date(d).toISOString().split("T")[0] || ""; } catch { return ""; }
    };

    packages.forEach((k) => {
      const baseCode = (k.kode || "").replace(/_V\d+$/i, "").trim().toLowerCase();
      const depDateStr = getDateStr(k.tanggalBerangkat);
      const groupKey = k.parentKeberangkatanId
        ? `parent_${k.parentKeberangkatanId}`
        : (baseCode && depDateStr ? `rom_${baseCode}_${depDateStr}` : `pkg_${k.id}`);

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          allPackages: [],
          totalGroupQuota: 0,
          totalGroupFilled: 0,
        });
      }
      const entry = map.get(groupKey)!;
      entry.allPackages.push(k);
      entry.totalGroupQuota += (k.maxSeat || k.kuota || 45);
      entry.totalGroupFilled += (k.terisi || 0);
    });

    return map;
  }, [packages]);

  // Render individual 2-grid card
  const renderPackageCard = (pkg: Keberangkatan) => {
    const depDate = pkg.tanggalBerangkat ? new Date(pkg.tanggalBerangkat) : null;

    const getDateStr = (d: any) => {
      if (!d) return "";
      try { return new Date(d).toISOString().split("T")[0] || ""; } catch { return ""; }
    };
    const baseCode = (pkg.kode || "").replace(/_V\d+$/i, "").trim().toLowerCase();
    const depDateStr = getDateStr(pkg.tanggalBerangkat);
    const groupKey = pkg.parentKeberangkatanId
      ? `parent_${pkg.parentKeberangkatanId}`
      : (baseCode && depDateStr ? `rom_${baseCode}_${depDateStr}` : `pkg_${pkg.id}`);

    const groupStat = groupStatsMap.get(groupKey);
    const isPartOfGroup = groupStat && groupStat.allPackages.length > 1;
    // Sisa kuota dihitung bersama (joint pooled quota) untuk rombongan/varian yang sama
    const kuota = isPartOfGroup ? groupStat.totalGroupQuota : (pkg.kuota || pkg.maxSeat || 45);
    const terisi = isPartOfGroup ? groupStat.totalGroupFilled : (pkg.terisi || 0);
    const sisaSeat = Math.max(0, kuota - terisi);
    const isFull = sisaSeat <= 0 || pkg.status === "FULL_SEAT" || (pkg.status as string) === "full";

    // Cek apakah paket ini adalah second variant (V2)
    const isV2 = pkg.kode.includes("_V2") || 
                 pkg.kode.toLowerCase().includes("v2") ||
                 !!pkg.parentKeberangkatanId ||
                 (pkg as any).splitReason === "promo" ||
                 (pkg as any).splitReason === "spek" ||
                 (pkg as any).splitLabel?.toLowerCase().includes("v2") ||
                 (pkg as any).promoLabel?.toLowerCase().includes("v2");

    const variantLabel = (pkg as any).splitLabel || (pkg as any).promoLabel || "Varian 2";

    const flyers = getFlyerList(pkg);
    const currentSlideIndex = activeSlideMap[pkg.id] || 0;
    const currentFlyer = flyers[currentSlideIndex] || flyers[0] || null;

    return (
      <Card
        key={pkg.id}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#060a12]/95 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-[0_12px_32px_rgba(16,185,129,0.08)]"
      >
        <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
          {/* TOP SECTION: SPLIT PORTRAIT FLYER & SCROLLABLE CAPTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            {/* Sisi Kiri: Portrait Flyer Slider */}
            <div className="relative aspect-[3/4] sm:aspect-auto sm:h-[350px] rounded-xl overflow-hidden bg-slate-950 border border-white/10 group flex flex-col justify-between">
              {currentFlyer ? (
                <>
                  <img
                    src={currentFlyer}
                    alt={pkg.namaPaket}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Hover Overlay Zoom */}
                  <button
                    type="button"
                    onClick={() => setPreviewFlyerUrl(currentFlyer)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Perbesar Brosur
                  </button>

                  {/* Slider Navigation Controls (< dan >) */}
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevFlyerSlide(pkg.id, flyers.length);
                      }}
                      disabled={flyers.length <= 1}
                      className={`pointer-events-auto w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/20 shadow-lg ${
                        flyers.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95"
                      }`}
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextFlyerSlide(pkg.id, flyers.length);
                      }}
                      disabled={flyers.length <= 1}
                      className={`pointer-events-auto w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/20 shadow-lg ${
                        flyers.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95"
                      }`}
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Page Indicator Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 border border-amber-400/40 text-[10.5px] font-bold text-amber-300 backdrop-blur-md shadow-md flex items-center gap-1">
                    <span>
                      Hal {currentSlideIndex + 1}/{flyers.length}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-emerald-950/40 text-center text-slate-400 space-y-2">
                  <Plane className="w-8 h-8 text-emerald-400/50" />
                  <p className="text-xs font-semibold text-slate-300">Belum Ada Brosur Flyer</p>
                  <p className="text-[10px] text-slate-500">Materi flyer belum diunggah</p>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Scrollable Caption Promosi */}
            <div className="h-[350px] flex flex-col rounded-xl bg-slate-950/60 dark:bg-black/50 border border-white/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Caption Promosi
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCaption(pkg)}
                  className="px-2.5 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  {copiedCaptionId === pkg.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Caption</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scrollable Container dengan Custom Aesthetic Scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1 text-[11.5px] text-slate-300 font-sans leading-relaxed whitespace-pre-line scrollbar-thin scrollbar-thumb-emerald-500/30 scrollbar-track-transparent">
                {pkg.caption || (
                  <span className="text-slate-500 italic text-xs">
                    Belum ada teks caption promosi khusus untuk paket keberangkatan ini.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: DETAIL PAKET & STACKED BADGES */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Kolom Kiri: Judul Paket, Tanda V2, & Tanggal Berangkat (Tanpa Harga & Tanpa Hotel) */}
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* TANDA SECOND VARIANT (V2) */}
              {isV2 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)]">
                    <span>⚡ Varian V2</span>
                    {variantLabel && variantLabel !== "Varian 2" && <span>• {variantLabel}</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 font-mono">
                    Second Variant
                  </span>
                </div>
              )}
              <h3 className="font-bold text-base text-white tracking-tight line-clamp-2 leading-snug">
                {pkg.namaPaket}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {depDate
                    ? depDate.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold">
                  {pkg.durationDays || pkg.durasiHari || 9} Hari
                </span>
              </div>
            </div>

            {/* Kolom Kanan (Bertingkat): Box Kuota (Joint Pooled) & Box Logo Maskapai di Bawahnya */}
            <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto">
              {/* Box Atas: Sisa Kuota (Gabungan untuk rombongan varian) */}
              {isFull ? (
                <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center sm:justify-start gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>KUOTA PENUH (0 Seat)</span>
                </div>
              ) : (
                <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center sm:justify-start gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Sisa Kuota: {sisaSeat} Seat{isPartOfGroup ? " (Gabungan)" : ""}
                  </span>
                </div>
              )}

              {/* Box Bawah: Badge Maskapai dengan Logo & Nomor Penerbangan */}
              <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 text-xs flex items-center justify-between sm:justify-start gap-3 shadow-sm">
                <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Plane className="w-3.5 h-3.5 text-amber-400 rotate-45" />
                </div>
                <div className="text-right sm:text-left leading-tight">
                  <div className="font-bold text-xs text-white line-clamp-1">
                    {pkg.maskapai || "Saudi Airlines"}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    {pkg.nomorPenerbangan || "SV-819"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: ACTION BUTTON */}
          <div className="pt-2">
            {isFull ? (
              <Button
                disabled
                className="w-full h-11 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed font-semibold text-xs flex items-center justify-center gap-2 opacity-60"
              >
                <Send className="w-4 h-4" />
                Kuota Penuh (Tidak Dapat Kirim WA)
              </Button>
            ) : (
              <Button
                onClick={() => openSendModal(pkg)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 hover:shadow-emerald-800/50 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kirim ke WA (Pilih Tamu)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Plane className="w-6 h-6 text-primary" />
              Katalog Paket Umroh
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300">
              <Sparkles className="w-3 h-3 mr-1" />
              Google Drive Cloud Vault
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar brosur resmi, materi flyer Google Drive, dan caption promosi bulanan siap kirim ke WhatsApp tamu binaan Anda
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPackages}
          className="gap-2 shrink-0 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Katalog
        </Button>
      </div>

      {/* FILTER BERTINGKAT (STARTING POINT & BULAN) & PENCARIAN */}
      <Card className="border border-emerald-500/20 bg-slate-900/60 dark:bg-[#0c121e]/80 backdrop-blur-md shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* BARIS 1: FILTER STARTING POINT (ASAL KEBERANGKATAN) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Filter Starting Point (Asal Keberangkatan):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs font-semibold scrollbar-thin scrollbar-thumb-amber-500/30">
              <button
                type="button"
                onClick={() => setSelectedStartingPoint("ALL")}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                  selectedStartingPoint === "ALL"
                    ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold"
                    : "bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                Semua Starting ({packages.length})
              </button>
              {startingPointsList.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSelectedStartingPoint(sp)}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                    selectedStartingPoint === sp
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold"
                      : "bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* BARIS 2: FILTER BULAN & INPUT SEARCH */}
          <div className="pt-2 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Scrollable Month Pills */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filter Bulan Keberangkatan:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-semibold scrollbar-thin scrollbar-thumb-emerald-500/30">
                <button
                  type="button"
                  onClick={() => setSelectedMonth("ALL")}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
                    selectedMonth === "ALL"
                      ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold"
                      : "bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                  }`}
                >
                  Semua Bulan
                </button>
                {monthsList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
                      selectedMonth === m
                        ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold"
                        : "bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64 shrink-0 pt-2 md:pt-4">
              <Search className="absolute left-2.5 top-[23px] md:top-[25px] h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari paket, maskapai..."
                className="pl-8 h-9 text-xs bg-black/40 border-white/10 text-white placeholder:text-slate-500 rounded-lg focus:border-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAFTAR PAKET (2 GRID CARD DENGAN PEMBATAS BULAN MEWAH) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat katalog paket umroh...</span>
        </div>
      ) : publishedPackages.length === 0 ? (
        <Card className="py-16 text-center space-y-4 border border-white/10 bg-slate-900/40">
          <CardContent className="space-y-3">
            <Plane className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-base font-bold text-foreground">Belum Ada Paket yang Ditampilkan di Katalog</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Paket keberangkatan belum diaktifkan saklarnya untuk katalog. Silakan aktifkan saklar <strong>“Katalog”</strong> pada kartu paket keberangkatan yang diinginkan di menu <strong>Paket Aktif</strong>.
            </p>
            <div className="pt-2">
              <a
                href="/admin/keberangkatan"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Buka Menu Paket Aktif
              </a>
            </div>
          </CardContent>
        </Card>
      ) : filteredPackages.length === 0 ? (
        <Card className="py-16 text-center space-y-2 border border-white/10 bg-slate-900/40">
          <CardContent>
            <Plane className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <h3 className="text-base font-bold text-foreground">Tidak Ada Paket Ditemukan</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tidak ada paket umroh yang sesuai dengan filter starting point, filter bulan, atau pencarian ini.
            </p>
          </CardContent>
        </Card>
      ) : selectedMonth === "ALL" ? (
        // MODE SEMUA BULAN: TAMPILKAN PEMBATAS ESTETIK PER BULAN
        <div className="space-y-10">
          {packagesGroupedByMonth.map(([monthName, pkgs]) => (
            <div key={monthName} className="space-y-6">
              {/* PEMBATAS BULAN MEWAH DENGAN JUDUL BULAN DI TENGAH */}
              <div className="relative py-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 via-emerald-500/40 to-transparent" />
                </div>
                <div className="relative px-6 py-2 rounded-full bg-slate-950/95 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-md flex items-center gap-2 text-amber-300 font-bold text-sm tracking-wide">
                  <span className="text-amber-400">✦</span>
                  <span>{monthName}</span>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">
                    ({pkgs.length} Paket)
                  </span>
                  <span className="text-amber-400">✦</span>
                </div>
              </div>

              {/* GRID TEPAT 2 KARTU PER TAMPILAN */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pkgs.map((pkg) => renderPackageCard(pkg))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // MODE SATU BULAN TERTENTU
        <div className="space-y-6">
          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 via-emerald-500/40 to-transparent" />
            </div>
            <div className="relative px-6 py-2 rounded-full bg-slate-950/95 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-md flex items-center gap-2 text-amber-300 font-bold text-sm tracking-wide">
              <span className="text-amber-400">✦</span>
              <span>{selectedMonth}</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">
                ({filteredPackages.length} Paket)
              </span>
              <span className="text-amber-400">✦</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPackages.map((pkg) => renderPackageCard(pkg))}
          </div>
        </div>
      )}

      {/* MODAL PILIH TAMU UNTUK KIRIM WA */}
      {targetPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg bg-card rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Send className="w-5 h-5 text-emerald-600" />
                Pilih Tamu Penerima Brosur Paket
              </h3>
              <button
                type="button"
                onClick={() => setTargetPackage(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Paket Info Singkat */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                Paket yang akan dikirim:
              </span>
              <div className="font-bold text-foreground text-sm">{targetPackage.namaPaket}</div>
              <div className="text-muted-foreground">
                Berangkat:{" "}
                {targetPackage.tanggalBerangkat
                  ? new Date(targetPackage.tanggalBerangkat).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}{" "}
                • Rp {formatNumberWithDots(targetPackage.hargaPaket || 0)}
              </div>
            </div>

            {/* Search Input Tamu */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Daftar Tamu Anda ({myGuests.length} Tamu)</span>
                <span className="text-[10.5px] text-muted-foreground font-normal">
                  Hanya menampilkan tamu yang Anda terima
                </span>
              </label>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Ketik nama atau nomor WA tamu..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* List Tamu Pilihan */}
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-2 bg-muted/20">
              {loadingGuests ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Memuat daftar tamu Anda...</span>
                </div>
              ) : filteredGuests.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <User className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="font-semibold text-foreground">Belum ada tamu ditemukan</p>
                  <p className="text-[11px]">
                    Catat tamu terlebih dahulu di menu <strong>Jamaah &gt; Buku Tamu</strong>.
                  </p>
                </div>
              ) : (
                filteredGuests.map((guest) => {
                  const isSelected = selectedGuest?.id === guest.id;
                  return (
                    <div
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-foreground font-bold shadow-sm"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{guest.namaTamu}</span>
                          {guest.kotaAsal && (
                            <span className="text-[10.5px] text-muted-foreground font-normal">
                              ({guest.kotaAsal})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {guest.nomorWa}
                        </div>
                        {guest.minatBulan && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">
                            Minat: {guest.minatBulan}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 pl-2">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetPackage(null)}
              >
                Batal
              </Button>

              <Button
                size="sm"
                disabled={!selectedGuest}
                onClick={handleSendWhatsAppToGuest}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Send className="w-3.5 h-3.5" />
                {selectedGuest
                  ? `Kirim ke WhatsApp ${selectedGuest.namaTamu.split(" ")[0]}`
                  : "Pilih Tamu Terlebih Dahulu"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZOOM PREVIEW FLYER */}
      {previewFlyerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in-0"
          onClick={() => setPreviewFlyerUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-card rounded-xl overflow-hidden shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setPreviewFlyerUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-1.5 hover:bg-black transition-all"
            >
              ✕
            </button>
            <img
              src={previewFlyerUrl}
              alt="Brosur Flyer Paket"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
