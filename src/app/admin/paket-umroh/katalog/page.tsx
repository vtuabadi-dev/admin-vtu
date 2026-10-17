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
  UploadCloud,
  Trash2,
  Edit3,
  ImagePlus,
  Download,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { useSession } from "@/shared/hooks/use-session";
import { formatNumberWithDots, getWhatsAppUrl, cn } from "@/shared/lib/utils";
import type { Keberangkatan } from "@/shared/types";
import { useOperationalStore } from "@/stores/operational-store";

// Cache Keys & Singletons untuk mencegah render ulang dan loading flicker
const KATALOG_PACKAGES_CACHE_KEY = "vtu_katalog_packages_cache_v1";
const KATALOG_GUESTS_CACHE_KEY = "vtu_katalog_guests_cache_v1";
let memoryCachedPackages: Keberangkatan[] | null = null;
let memoryCachedGuests: BukuTamuSimple[] | null = null;

const getInitialCachedPackages = (): Keberangkatan[] => {
  if (memoryCachedPackages && memoryCachedPackages.length > 0) {
    return memoryCachedPackages;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(KATALOG_PACKAGES_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCachedPackages = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  const storeList = useOperationalStore.getState().keberangkatanList;
  if (storeList && storeList.length > 0) {
    memoryCachedPackages = storeList;
    return storeList;
  }
  return [];
};

const getInitialCachedGuests = (): BukuTamuSimple[] => {
  if (memoryCachedGuests && memoryCachedGuests.length > 0) {
    return memoryCachedGuests;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(KATALOG_GUESTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCachedGuests = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
};

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

// Helper untuk memecah daftar flyer brosur (bisa comma-separated, newline, single URL, atau drive ID)
const getFlyerList = (pkg: Keberangkatan): string[] => {
  const source = pkg.flyerUrl || pkg.flyerDriveId;
  if (!source) return [];
  const rawList = source.includes(",")
    ? source.split(",").map((s) => s.trim()).filter(Boolean)
    : source.includes("\n")
    ? source.split("\n").map((s) => s.trim()).filter(Boolean)
    : [source];

  return rawList
    .map((item) => {
      if (!item) return "";
      const trimmed = item.trim();
      if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
      if (trimmed.startsWith("/api/storage/download")) return trimmed;
      if (trimmed.includes("drive.google.com")) {
        const match = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `/api/storage/download?id=${match[1]}`;
        }
      }
      // Bare Google Drive ID (panjang 20+ karakter alfanumerik)
      if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) && !trimmed.startsWith("http") && !trimmed.startsWith("/")) {
        return `/api/storage/download?id=${trimmed}`;
      }
      return trimmed;
    })
    .filter(Boolean);
};

// Helper teks caption promosi: gunakan caption yang tersimpan atau buatkan template otomatis lengkap jika belum diisi
const getPackageCaption = (pkg: Keberangkatan): string => {
  if (pkg.caption && pkg.caption.trim() !== "") return pkg.caption;
  const depStr = pkg.tanggalBerangkat
    ? new Date(pkg.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";
  return (
    `✨ *${pkg.namaPaket}* ✨\n\n` +
    `🗓️ *Keberangkatan:* ${depStr}\n` +
    `⏳ *Durasi:* ${pkg.durationDays || 9} Hari\n` +
    `✈️ *Maskapai:* ${pkg.maskapai || "Penerbangan Terbaik"}\n` +
    `🏨 *Hotel Makkah:* ${pkg.hotelMekkah || "-"}\n` +
    `🏨 *Hotel Madinah:* ${pkg.hotelMadinah || "-"}\n` +
    `💰 *Harga:* Rp ${formatNumberWithDots(pkg.hargaPaket || 35000000)}\n\n` +
    `✅ *Fasilitas Termasuk:*\n` +
    (pkg.include && pkg.include.length > 0
      ? pkg.include.map((i) => `• ${i}`).join("\n")
      : `• Tiket Pesawat PP & Visa Umroh\n• Hotel & Makan Sesuai Program\n• Transportasi Bus AC & Muthowif Berpengalaman`) +
    `\n\n📲 *Informasi & Pendaftaran:* Segera hubungi customer care kami sebelum kuota habis!`
  );
};

export default function KatalogPaketPage() {
  const { user } = useSession();

  // Instant render dari cache memory / localStorage jika sudah pernah dimuat sebelumnya
  const [packages, setPackages] = useState<Keberangkatan[]>(getInitialCachedPackages);
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getInitialCachedPackages();
    return cached.length === 0;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStartingPoint, setSelectedStartingPoint] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Slide index per paket ID: Record<packageId, currentSlideIndex>
  const [activeSlideMap, setActiveSlideMap] = useState<Record<string, number>>({});

  // Tamu milik admin yang sedang login (dengan caching instan)
  const [myGuests, setMyGuests] = useState<BukuTamuSimple[]>(getInitialCachedGuests);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Modal Kirim WA ke Tamu
  const [targetPackage, setTargetPackage] = useState<Keberangkatan | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<BukuTamuSimple | null>(null);
  const [guestSearch, setGuestSearch] = useState("");

  // Modal Zoom Flyer (dengan dukungan navigasi / slide antar halaman brosur)
  const [previewFlyerData, setPreviewFlyerData] = useState<{
    pkg: Keberangkatan;
    flyers: string[];
    currentIndex: number;
  } | null>(null);

  // Copy Caption State
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);

  // Modal Kelola Flyer & Caption
  const [manageMediaPkg, setManageMediaPkg] = useState<Keberangkatan | null>(null);
  const [mediaFlyerUrls, setMediaFlyerUrls] = useState<string[]>([]);
  const [newFlyerFiles, setNewFlyerFiles] = useState<File[]>([]);
  const [newFlyerPreviews, setNewFlyerPreviews] = useState<string[]>([]);
  const [mediaCaption, setMediaCaption] = useState<string>("");
  const [savingMedia, setSavingMedia] = useState<boolean>(false);

  const openManageMediaModal = (pkg: Keberangkatan) => {
    setManageMediaPkg(pkg);
    setMediaFlyerUrls(getFlyerList(pkg));
    setNewFlyerFiles([]);
    setNewFlyerPreviews([]);
    setMediaCaption(pkg.caption || "");
  };

  const handleAddNewFlyers = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const newPreviews = arr.map((f) => URL.createObjectURL(f));
    setNewFlyerFiles((prev) => [...prev, ...arr]);
    setNewFlyerPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveExistingFlyer = (index: number) => {
    setMediaFlyerUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFlyer = (index: number) => {
    const url = newFlyerPreviews[index];
    if (url) URL.revokeObjectURL(url);
    setNewFlyerFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFlyerPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAutoCaption = () => {
    if (!manageMediaPkg) return;
    const depStr = manageMediaPkg.tanggalBerangkat
      ? new Date(manageMediaPkg.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    const autoCap = `✨ *${manageMediaPkg.namaPaket}* ✨\n\n` +
      `🗓️ *Keberangkatan:* ${depStr}\n` +
      `⏳ *Durasi:* ${manageMediaPkg.durationDays || 9} Hari\n` +
      `✈️ *Maskapai:* ${manageMediaPkg.maskapai || "Penerbangan Terbaik"}\n` +
      `🏨 *Hotel Makkah:* ${manageMediaPkg.hotelMekkah || "-"}\n` +
      `🏨 *Hotel Madinah:* ${manageMediaPkg.hotelMadinah || "-"}\n` +
      `💰 *Harga:* Rp ${formatNumberWithDots(manageMediaPkg.hargaPaket || 35000000)}\n\n` +
      `✅ *Fasilitas Termasuk:*\n` +
      (manageMediaPkg.include && manageMediaPkg.include.length > 0
        ? manageMediaPkg.include.map((i) => `• ${i}`).join("\n")
        : `• Tiket Pesawat PP & Visa Umroh\n• Hotel & Makan Sesuai Program\n• Transportasi Bus AC & Muthowif Berpengalaman`) +
      `\n\n📲 *Informasi & Pendaftaran:* Segera hubungi customer care kami sebelum kuota habis!`;
    setMediaCaption(autoCap);
  };

  const handleSaveMedia = async () => {
    if (!manageMediaPkg) return;
    setSavingMedia(true);
    try {
      const base64List = await Promise.all(
        newFlyerFiles.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          });
        })
      );
      const validBase64 = base64List.filter(Boolean);

      const payload: any = {
        caption: mediaCaption || null,
      };

      if (validBase64.length > 0) {
        payload.flyerBase64List = validBase64;
        if (mediaFlyerUrls.length > 0) {
          payload.flyerUrl = mediaFlyerUrls.join(",");
        }
      } else {
        payload.flyerUrl = mediaFlyerUrls.join(",") || null;
      }

      // Cek apakah kartu ini merupakan kartu sub-varian hotelOptions
      const parentId = (manageMediaPkg as any)._parentPackageId || (
        manageMediaPkg.id.includes("_var_") ? manageMediaPkg.id.split("_var_")[0] : manageMediaPkg.id
      );
      if (typeof (manageMediaPkg as any)._subVariantIndex === "number") {
        payload.subVariantIndex = (manageMediaPkg as any)._subVariantIndex;
        payload.variantName = (manageMediaPkg as any)._variantName || "Varian 2";
      } else if (manageMediaPkg.id.includes("_var_")) {
        const rawIdx = manageMediaPkg.id.split("_var_")[1];
        if (rawIdx) {
          const idx = parseInt(rawIdx, 10);
          if (!isNaN(idx)) {
            payload.subVariantIndex = idx;
            payload.variantName = (manageMediaPkg as any).splitLabel || `Varian ${idx + 1}`;
          }
        }
      }

      const res = await fetch(`/api/keberangkatan/${parentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updatedPkg = json.data;
        setPackages((prev) =>
          prev.map((p) => (p.id === parentId ? { ...p, ...updatedPkg } : p))
        );
        if (typeof window !== "undefined") {
          const nextList = packages.map((p) =>
            p.id === parentId ? { ...p, ...updatedPkg } : p
          );
          memoryCachedPackages = nextList;
          try {
            localStorage.setItem(KATALOG_PACKAGES_CACHE_KEY, JSON.stringify(nextList));
          } catch {}
        }
        setManageMediaPkg(null);
      } else {
        alert(json.message || "Gagal menyimpan perubahan flyer & caption");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || err));
    } finally {
      setSavingMedia(false);
    }
  };

  // Fetch Packages dengan Stale-While-Revalidate
  const fetchPackages = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else if (packages.length === 0) {
        setLoading(true);
      }
      const res = await fetch("/api/keberangkatan");
      const json = await res.json();
      if (json.success && json.data) {
        setPackages(json.data);
        memoryCachedPackages = json.data;
        useOperationalStore.getState().setKeberangkatanList(json.data);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(KATALOG_PACKAGES_CACHE_KEY, JSON.stringify(json.data));
          } catch {}
        }
      }
    } catch (err) {
      console.error("Gagal memuat katalog paket:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch Tamu Milik Admin Sendiri dengan Caching
  const fetchMyGuests = async () => {
    try {
      if (myGuests.length === 0) {
        setLoadingGuests(true);
      }
      const res = await fetch("/api/buku-tamu?filter=mine");
      const json = await res.json();
      if (json.success && json.data) {
        setMyGuests(json.data);
        memoryCachedGuests = json.data;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(KATALOG_GUESTS_CACHE_KEY, JSON.stringify(json.data));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Gagal memuat tamu admin:", err);
    } finally {
      setLoadingGuests(false);
    }
  };

  useEffect(() => {
    // Background silent revalidation: perbarui data tanpa menghambat render UI
    fetchPackages(false);
    fetchMyGuests();
  }, []);

  // Helper cek apakah paket diaktifkan untuk katalog dari menu Paket Aktif
  const isPackagePublishedInKatalog = (pkg: Keberangkatan): boolean => {
    if (pkg.isPublishedKatalog !== undefined) return pkg.isPublishedKatalog;
    const meta = typeof pkg.driveFolderIds === "object" ? pkg.driveFolderIds : null;
    return meta?.isPublishedKatalog === true;
  };

  // Ambil seluruh varian paket yang diaktifkan di Paket Aktif
  // Mendukung:
  // 1. Paket Tunggal / Split Row (Keberangkatan terpisah)
  // 2. Paket dengan In-Package Split Varian (hotelOptions)
  const publishedPackages = useMemo(() => {
    const list: Keberangkatan[] = [];

    for (const pkg of packages) {
      const isPkgPub = isPackagePublishedInKatalog(pkg);
      let opts = pkg.hotelOptions;
      if (typeof opts === "string") {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      const validOpts = Array.isArray(opts)
        ? opts.filter((o: any) => o && (o.hotelMekkah || o.hotelMadinah || o.hargaBase))
        : [];

      if (validOpts.length > 1) {
        // Cek publikasi per varian
        validOpts.forEach((opt: any, vIdx: number) => {
          const isOptPub = vIdx === 0
            ? (opt.isPublishedKatalog !== undefined ? opt.isPublishedKatalog === true : isPkgPub)
            : (opt.isPublishedKatalog === true);

          if (isOptPub) {
            const isV2 = vIdx > 0;
            const vName = opt.clusterName || opt.variantName || (isV2 ? `Varian ${vIdx + 1}` : "Varian Utama");

            list.push({
              ...pkg,
              id: `${pkg.id}_var_${vIdx}`,
              isPublishedKatalog: true,
              hotelMekkah: opt.hotelMekkah || pkg.hotelMekkah,
              hotelMadinah: opt.hotelMadinah || pkg.hotelMadinah,
              hargaPaket: opt.hargaBase || pkg.hargaPaket,
              flyerUrl: opt.flyerUrl || (vIdx === 0 ? pkg.flyerUrl : ""),
              flyerDriveId: opt.flyerDriveId || (vIdx === 0 ? pkg.flyerDriveId : undefined),
              caption: opt.caption || (vIdx === 0 ? pkg.caption : ""),
              splitReason: isV2 ? "promo" : (pkg.splitReason || undefined),
              splitLabel: isV2 ? vName : (pkg.splitLabel || undefined),
              promoLabel: isV2 ? vName : (pkg.promoLabel || undefined),
              _parentPackageId: pkg.id,
              _subVariantIndex: vIdx,
              _variantName: vName,
            } as any);
          }
        });
      } else if (isPkgPub) {
        list.push(pkg);
      }
    }

    return list;
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

  // Count paket per starting point
  const packageCountByStarting = useMemo(() => {
    const counts: Record<string, number> = {};
    publishedPackages.forEach((pkg) => {
      const sp = getStartingPointName(pkg);
      if (sp) {
        counts[sp] = (counts[sp] || 0) + 1;
      }
    });
    return counts;
  }, [publishedPackages]);

  // Count paket per bulan
  const packageCountByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    publishedPackages.forEach((pkg) => {
      if (pkg.tanggalBerangkat) {
        const d = new Date(pkg.tanggalBerangkat);
        const mKey = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        counts[mKey] = (counts[mKey] || 0) + 1;
      }
    });
    return counts;
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

  // Navigasi Slide Flyer pada Kartu
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

  // Navigasi Flyer pada Modal Zoom
  const openFlyerZoom = (pkg: Keberangkatan, index: number = 0) => {
    const flyers = getFlyerList(pkg);
    if (flyers.length === 0) return;
    setPreviewFlyerData({
      pkg,
      flyers,
      currentIndex: index,
    });
  };

  const nextZoomFlyer = () => {
    if (!previewFlyerData || previewFlyerData.flyers.length <= 1) return;
    const nextIdx = (previewFlyerData.currentIndex + 1) % previewFlyerData.flyers.length;
    setPreviewFlyerData({
      ...previewFlyerData,
      currentIndex: nextIdx,
    });
    setActiveSlideMap((prev) => ({ ...prev, [previewFlyerData.pkg.id]: nextIdx }));
  };

  const prevZoomFlyer = () => {
    if (!previewFlyerData || previewFlyerData.flyers.length <= 1) return;
    const prevIdx = (previewFlyerData.currentIndex - 1 + previewFlyerData.flyers.length) % previewFlyerData.flyers.length;
    setPreviewFlyerData({
      ...previewFlyerData,
      currentIndex: prevIdx,
    });
    setActiveSlideMap((prev) => ({ ...prev, [previewFlyerData.pkg.id]: prevIdx }));
  };

  // Shortcut Keyboard Panah Kiri / Kanan & Esc pada Modal Zoom
  useEffect(() => {
    if (!previewFlyerData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewFlyerData(null);
      } else if (e.key === "ArrowRight") {
        nextZoomFlyer();
      } else if (e.key === "ArrowLeft") {
        prevZoomFlyer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFlyerData]);

  // Open modal send to guest
  const openSendModal = (pkg: Keberangkatan) => {
    setTargetPackage(pkg);
    setSelectedGuest(null);
    setGuestSearch("");
    setSelectedFlyerIndex(0);
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

    const flyers = getFlyerList(targetPackage);
    let flyerSection = "";
    if (flyers.length > 0) {
      const domain = "https://www.vtu.my.id";
      const formattedFlyers = flyers
        .map((f, idx) => {
          const fullUrl = f.startsWith("http") ? f : `${domain}${f.startsWith("/") ? "" : "/"}${f}`;
          return flyers.length > 1
            ? `👉 *Brosur Hal ${idx + 1}:* ${fullUrl}`
            : `👉 *Brosur Resmi:* ${fullUrl}`;
        })
        .join("\n");
      flyerSection = `\n🖼️ *Link Brosur Kualitas HD:*\n${formattedFlyers}\n`;
    }

    const captionSection = `\n📝 *Deskripsi & Fasilitas:* \n${getPackageCaption(targetPackage)}\n`;

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

  // State & handler untuk salin gambar flyer ke clipboard
  const [copyingFlyer, setCopyingFlyer] = useState(false);
  const [copiedFlyerSuccess, setCopiedFlyerSuccess] = useState(false);
  const [selectedFlyerIndex, setSelectedFlyerIndex] = useState(0);

  const handleCopyFlyerImageToClipboard = async (flyerUrl: string) => {
    try {
      setCopyingFlyer(true);

      if (!flyerUrl) throw new Error("URL flyer tidak ditemukan");

      // Periksa dukungan Clipboard API
      if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.write !== "function") {
        throw new Error("Peramban Anda tidak mengizinkan akses salin gambar otomatis ke papan klip");
      }

      // Gunakan relative path atau origin lokal agar tidak terkena blokir CORS lintas domain
      const targetUrl = flyerUrl.startsWith("http")
        ? flyerUrl
        : (flyerUrl.startsWith("/") ? flyerUrl : `/${flyerUrl}`);

      const res = await fetch(targetUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Gagal memuat gambar (HTTP ${res.status})`);
      const rawBlob = await res.blob();

      let pngBlob: Blob | null = null;
      if (rawBlob.type === "image/png") {
        pngBlob = rawBlob;
      } else {
        const objectUrl = URL.createObjectURL(rawBlob);
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = objectUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Gagal membaca gambar flyer"));
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context tidak tersedia");
          ctx.drawImage(img, 0, 0);

          pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (!pngBlob) throw new Error("Gagal mengonversi gambar flyer ke format PNG");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);

      setCopiedFlyerSuccess(true);
      setTimeout(() => setCopiedFlyerSuccess(false), 3000);
    } catch (err: any) {
      console.error("Gagal menyalin gambar flyer:", err);
      const detail = err?.message ? ` (${err.message})` : "";
      alert(`Gagal menyalin gambar secara otomatis${detail}. Anda dapat klik tombol 'Unduh Foto' lalu seret/lampirkan gambar langsung ke WhatsApp.`);
    } finally {
      setCopyingFlyer(false);
    }
  };

  const handleDownloadFlyer = async (flyerUrl: string, index: number) => {
    try {
      const targetUrl = flyerUrl.startsWith("http")
        ? flyerUrl
        : (flyerUrl.startsWith("/") ? flyerUrl : `/${flyerUrl}`);
      const res = await fetch(targetUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpg" : "png";
      const cleanPkgName = (targetPackage?.namaPaket || "Brosur").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Flyer-${cleanPkgName}-Hal${index + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(flyerUrl, "_blank");
    }
  };

  const handleCopyCaption = (pkg: Keberangkatan) => {
    const textToCopy = getPackageCaption(pkg);
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

  // Render individual 2-grid card (Tatanan Asli Tetap, Warna Cerah Estetik)
  const renderPackageCard = (pkg: Keberangkatan) => {
    const depDate = pkg.tanggalBerangkat ? new Date(pkg.tanggalBerangkat) : null;

    const getDateStr = (d: any) => {
      if (!d) return "";
      try { return new Date(d).toISOString().split("T")[0] || ""; } catch { return ""; }
    };
    const baseCode = (pkg.kode || "").replace(/_V\d+$/i, "").trim().toLowerCase();
    const depDateStr = getDateStr(pkg.tanggalBerangkat);
    const parentId = (pkg as any)._parentPackageId || pkg.parentKeberangkatanId;
    const groupKey = parentId
      ? `parent_${parentId}`
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
        className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/35 bg-gradient-to-br from-white via-[#f4fbf7] to-[#e6f7f0] shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_10px_28px_-6px_rgba(4,120,87,0.18)] hover:border-emerald-400 hover:shadow-[0_16px_36px_-6px_rgba(4,120,87,0.28)] transition-all flex flex-col justify-between"
      >
        <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
          {/* TOP SECTION: SPLIT PORTRAIT FLYER & SCROLLABLE CAPTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            {/* Sisi Kiri: Portrait Flyer Slider */}
            <div
              onClick={() => {
                if (currentFlyer) {
                  openFlyerZoom(pkg, currentSlideIndex);
                }
              }}
              className="relative aspect-[3/4] sm:aspect-auto sm:h-[350px] rounded-2xl overflow-hidden bg-gradient-to-br from-teal-50/80 via-emerald-50/60 to-slate-100 border-2 border-emerald-500/35 group flex flex-col justify-between cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
            >
              {currentFlyer ? (
                <>
                  <img
                    src={currentFlyer}
                    alt={pkg.namaPaket}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Hover Overlay Zoom */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-2 backdrop-blur-[2px]"
                  >
                    <Eye className="w-4 h-4 text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                    <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">Klik untuk Memperbesar</span>
                  </div>

                  {/* Slider Navigation Controls (< dan >) */}
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevFlyerSlide(pkg.id, flyers.length);
                      }}
                      disabled={flyers.length <= 1}
                      className={`pointer-events-auto w-9 h-9 rounded-full bg-gradient-to-b from-white via-white/95 to-emerald-50 text-emerald-950 backdrop-blur-md flex items-center justify-center transition-all border border-emerald-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
                        flyers.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95 hover:text-emerald-700 hover:shadow-emerald-500/30"
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
                      className={`pointer-events-auto w-9 h-9 rounded-full bg-gradient-to-b from-white via-white/95 to-emerald-50 text-emerald-950 backdrop-blur-md flex items-center justify-center transition-all border border-emerald-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
                        flyers.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95 hover:text-emerald-700 hover:shadow-emerald-500/30"
                      }`}
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Floating Edit Flyer Button in top-left */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openManageMediaModal(pkg);
                    }}
                    className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-white border border-emerald-400/50 shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    title="Ganti / Kelola Flyer"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-amber-300" />
                  </button>

                  {/* Page Indicator Badge */}
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-950/90 border border-amber-400/60 text-[11px] font-black text-amber-300 backdrop-blur-md shadow-md flex items-center gap-1">
                    <span>
                      Hal {currentSlideIndex + 1}/{flyers.length}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-emerald-100/60 to-amber-50/50 text-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white flex items-center justify-center shadow-md border-2 border-amber-300">
                    <Plane className="w-6 h-6 text-amber-300 rotate-45 drop-shadow-sm" />
                  </div>
                  <p className="text-xs font-black text-emerald-950">Belum Ada Brosur Flyer</p>
                  <p className="text-[10.5px] text-emerald-900/70 font-semibold">Materi flyer belum diunggah</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openManageMediaModal(pkg);
                    }}
                    className="mt-1 px-3 py-1.5 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-amber-300" />
                    <span>Unggah Flyer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Scrollable Caption Promosi (Warna Cerah Gradasi Estetik Mint/Teal/Gold) */}
            <div className="h-[350px] flex flex-col rounded-2xl bg-gradient-to-br from-white via-[#f0fdfa]/90 to-[#e6fbf1]/80 border-2 border-teal-500/35 p-4 space-y-2.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_2px_8px_rgba(13,148,136,0.06)]">
              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/80 text-xs">
                <span className="font-black bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 bg-clip-text text-transparent flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  Caption Promosi
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openManageMediaModal(pkg)}
                    title="Edit Caption / Kelola Flyer"
                    className="p-1.5 px-2 rounded-xl border border-teal-400/50 bg-white hover:bg-teal-50 text-teal-800 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                    <span className="hidden sm:inline">Kelola</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCaption(pkg)}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-[0_3px_10px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedCaptionId === pkg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        <span>Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-950" />
                        <span>Salin Caption</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Container dengan Custom Aesthetic Scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1 text-[11.5px] text-emerald-950 font-sans leading-relaxed whitespace-pre-line scrollbar-thin scrollbar-thumb-teal-500/30 scrollbar-track-transparent">
                {getPackageCaption(pkg)}
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: DETAIL PAKET & STACKED BADGES */}
          <div className="pt-3 border-t border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Kolom Kiri: Judul Paket, Tanda V2, & Tanggal Berangkat (Tanpa Harga & Tanpa Hotel) */}
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* TANDA SECOND VARIANT (V2) */}
              {isV2 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10.5px] font-black bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-xs border border-purple-300">
                    <span>⚡ Varian V2</span>
                    {variantLabel && variantLabel !== "Varian 2" && <span>• {variantLabel}</span>}
                  </span>
                  <span className="text-[10px] text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200 font-mono font-bold shadow-2xs">
                    Second Variant
                  </span>
                </div>
              )}
              <h3 className="font-black text-base bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 bg-clip-text text-transparent tracking-tight line-clamp-2 leading-snug">
                {pkg.namaPaket}
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900/80">
                <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  {depDate
                    ? depDate.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </span>
                <span className="text-emerald-300">•</span>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-[10.5px] shadow-xs">
                  {pkg.durationDays || pkg.durasiHari || 9} Hari
                </span>
              </div>
            </div>

            {/* Kolom Kanan (Bertingkat): Box Kuota (Joint Pooled) & Box Logo Maskapai di Bawahnya */}
            <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto">
              {/* Box Atas: Sisa Kuota (Gabungan untuk rombongan varian) */}
              {isFull ? (
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-50 via-rose-100 to-rose-50 border-2 border-rose-400 text-rose-900 font-black text-xs flex items-center justify-center sm:justify-start gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.8)]" />
                  <span>KUOTA PENUH (0 Seat)</span>
                </div>
              ) : (
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-100 border-2 border-emerald-500/50 text-emerald-950 font-black text-xs flex items-center justify-center sm:justify-start gap-2 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_3px_8px_rgba(13,148,136,0.2)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span>
                    Sisa Kuota: {sisaSeat} Seat{isPartOfGroup ? " (Gabungan)" : ""}
                  </span>
                </div>
              )}

              {/* Box Bawah: Badge Maskapai dengan Logo & Nomor Penerbangan */}
              <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-white via-white/95 to-emerald-50/50 border-2 border-emerald-500/35 text-emerald-950 text-xs flex items-center justify-between sm:justify-start gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
                  <Plane className="w-4 h-4 text-slate-950 rotate-45" />
                </div>
                <div className="text-right sm:text-left leading-tight">
                  <div className="font-black text-xs text-emerald-950 line-clamp-1">
                    {pkg.maskapai || "Saudi Airlines"}
                  </div>
                  <div className="text-[10.5px] text-emerald-800 font-mono font-black">
                    {pkg.nomorPenerbangan || "SV-819"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: ACTION BUTTON DENGAN GRADASI MEWAH */}
          <div className="pt-2">
            {isFull ? (
              <Button
                disabled
                className="w-full h-12 rounded-2xl bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed font-black text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kuota Penuh (Tidak Dapat Kirim WA)
              </Button>
            ) : (
              <Button
                onClick={() => openSendModal(pkg)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white font-black text-sm shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),0_6px_20px_rgba(4,120,87,0.35)] border border-emerald-400/60 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
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
      {/* HEADER SECTION - THEMED EXACTLY LIKE DAFTAR PAKET KEBERANGKATAN & MANIFEST DENGAN GRADASI AESTETIK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-3xl border-2 border-emerald-600/70 dark:border-emerald-500/50 bg-gradient-to-r from-[#bbf7d0]/90 via-[#ccfbf1] to-[#fef08a]/60 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.95),inset_0_-2.5px_4px_rgba(4,120,87,0.3),0_10px_30px_-5px_rgba(4,120,87,0.25)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white flex items-center justify-center font-bold text-lg shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),0_6px_16px_rgba(4,120,87,0.4)] border-2 border-amber-300 shrink-0">
            <Plane className="w-7 h-7 text-amber-300 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-emerald-950 dark:text-white flex items-center gap-2.5 tracking-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] dark:drop-shadow-none">
              Daftar Katalog Brosur & Paket Umroh
              <span className="text-[10px] bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black px-3 py-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_2px_6px_rgba(180,83,9,0.35)] border border-amber-300">
                AKTIF
              </span>
            </h1>
            <p className="text-xs text-emerald-900 dark:text-emerald-300 font-extrabold mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              Total {publishedPackages.length} Paket Keberangkatan Terdaftar • Siap Kirim ke WhatsApp Tamu Binaan
            </p>
          </div>
        </div>

        {/* Action Buttons on Right (Manifest Operasional Style dengan Gradasi) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-gradient-to-b from-white to-emerald-50 dark:bg-slate-950 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] shrink-0">
          <button
            type="button"
            onClick={() => fetchPackages(true)}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),0_4px_10px_rgba(4,120,87,0.45)] border border-emerald-400/50 hover:from-emerald-600 hover:to-teal-800 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing ? "animate-spin text-amber-300" : "text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]")} />
            <span>{isRefreshing ? "Memperbarui..." : "Refresh Katalog"}</span>
          </button>

          <a
            href="/admin/keberangkatan"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 text-emerald-950 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Kelola Paket Aktif</span>
          </a>
        </div>
      </div>

      {/* FILTER STARTING POINT & BULAN TABS DENGAN GRADASI MEWAH */}
      <div className="space-y-3">
        {/* BARIS 1: FILTER STARTING POINT (ASAL KEBERANGKATAN) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 px-1">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Filter Starting Point (Asal Keberangkatan):</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-[#ccfbf1]/90 via-white to-[#d1fae5]/80 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl border-2 border-teal-500/50 dark:border-teal-600/50 shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.95),inset_0_-2.5px_4px_rgba(13,148,136,0.3),0_6px_20px_-3px_rgba(13,148,136,0.25)]">
              <button
                type="button"
                onClick={() => setSelectedStartingPoint("ALL")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
                  selectedStartingPoint === "ALL"
                    ? "bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(13,148,136,0.4)] border border-teal-300/60"
                    : "text-teal-950 dark:text-teal-200 hover:text-teal-900 bg-gradient-to-b from-white via-white/95 to-teal-50/50 hover:bg-white dark:from-slate-800 dark:to-slate-850 dark:hover:bg-slate-800 border border-teal-200/90 dark:border-teal-800/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.04)] hover:border-teal-400"
                )}
              >
                <MapPin className={cn("w-3.5 h-3.5", selectedStartingPoint === "ALL" ? "text-amber-300" : "text-teal-600")} />
                <span>Semua Starting</span>
                <span
                  className={cn(
                    "text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black",
                    selectedStartingPoint === "ALL"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-teal-950 shadow-xs"
                      : "bg-teal-50 text-teal-800 border border-teal-200"
                  )}
                >
                  {publishedPackages.length} Paket
                </span>
              </button>

              {startingPointsList.map((sp) => {
                const isActive = selectedStartingPoint === sp;
                const count = packageCountByStarting[sp] || 0;
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSelectedStartingPoint(sp)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
                      isActive
                        ? "bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(13,148,136,0.4)] border border-teal-300/60"
                        : "text-teal-950 dark:text-teal-200 hover:text-teal-900 bg-gradient-to-b from-white via-white/95 to-teal-50/50 hover:bg-white dark:from-slate-800 dark:to-slate-850 dark:hover:bg-slate-800 border border-teal-200/90 dark:border-teal-800/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.04)] hover:border-teal-400"
                    )}
                  >
                    <MapPin className={cn("w-3.5 h-3.5", isActive ? "text-amber-300" : "text-teal-600")} />
                    <span>{sp}</span>
                    <span
                      className={cn(
                        "text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold",
                        isActive
                          ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-teal-950 font-black shadow-xs"
                          : "bg-teal-50 text-teal-800 border border-teal-200"
                      )}
                    >
                      {count} Paket
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BARIS 2: FILTER BULAN TABS DENGAN SEARCH INPUT */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filter Bulan Keberangkatan:</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Scrollable Month Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth flex-1 min-w-0">
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-[#ccfbf1]/90 via-white to-[#d1fae5]/80 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl border-2 border-teal-500/50 dark:border-teal-600/50 shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.95),inset_0_-2.5px_4px_rgba(13,148,136,0.3),0_6px_20px_-3px_rgba(13,148,136,0.25)]">
                <button
                  type="button"
                  onClick={() => setSelectedMonth("ALL")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
                    selectedMonth === "ALL"
                      ? "bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(13,148,136,0.4)] border border-teal-300/60"
                      : "text-teal-950 dark:text-teal-200 hover:text-teal-900 bg-gradient-to-b from-white via-white/95 to-teal-50/50 hover:bg-white dark:from-slate-800 dark:to-slate-850 dark:hover:bg-slate-800 border border-teal-200/90 dark:border-teal-800/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.04)] hover:border-teal-400"
                  )}
                >
                  <Calendar className={cn("w-3.5 h-3.5", selectedMonth === "ALL" ? "text-amber-300" : "text-teal-600")} />
                  <span>Semua Bulan</span>
                  <span
                    className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black",
                      selectedMonth === "ALL"
                        ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-teal-950 shadow-xs"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    )}
                  >
                    {publishedPackages.length} Paket
                  </span>
                </button>

                {monthsList.map((m) => {
                  const isActive = selectedMonth === m;
                  const count = packageCountByMonth[m] || 0;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonth(m)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
                        isActive
                          ? "bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(13,148,136,0.4)] border border-teal-300/60"
                          : "text-teal-950 dark:text-teal-200 hover:text-teal-900 bg-gradient-to-b from-white via-white/95 to-teal-50/50 hover:bg-white dark:from-slate-800 dark:to-slate-850 dark:hover:bg-slate-800 border border-teal-200/90 dark:border-teal-800/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.04)] hover:border-teal-400"
                      )}
                    >
                      <Calendar className={cn("w-3.5 h-3.5", isActive ? "text-amber-300" : "text-teal-600")} />
                      <span className="uppercase">{m}</span>
                      <span
                        className={cn(
                          "text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold",
                          isActive
                            ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-teal-950 font-black shadow-xs"
                            : "bg-teal-50 text-teal-800 border border-teal-200"
                        )}
                      >
                        {count} Paket
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Input Box */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-emerald-800/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama paket, maskapai..."
                className="pl-10 h-11 text-xs bg-white/95 border-2 border-teal-500/40 text-emerald-950 placeholder:text-emerald-900/40 rounded-2xl focus:border-teal-600 focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DAFTAR PAKET (2 GRID CARD DENGAN PEMBATAS BULAN MEWAH) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <span className="text-sm font-black text-emerald-950">Memuat katalog paket umroh...</span>
        </div>
      ) : publishedPackages.length === 0 ? (
        <Card className="py-16 text-center space-y-4 border-2 border-emerald-600/30 bg-gradient-to-br from-white via-white to-emerald-50/30 shadow-lg rounded-3xl">
          <CardContent className="space-y-3">
            <Plane className="w-12 h-12 text-emerald-600/30 mx-auto" />
            <h3 className="text-base font-black text-emerald-950">Belum Ada Paket yang Ditampilkan di Katalog</h3>
            <p className="text-xs text-emerald-900/70 max-w-md mx-auto font-medium">
              Paket keberangkatan belum diaktifkan saklarnya untuk katalog. Silakan aktifkan saklar <strong>“Katalog”</strong> pada kartu paket keberangkatan yang diinginkan di menu <strong>Paket Aktif</strong>.
            </p>
            <div className="pt-2">
              <a
                href="/admin/keberangkatan"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#0f766e] via-[#047857] to-[#064e3b] text-white text-xs font-black shadow-md border border-emerald-400/50 hover:from-emerald-600 hover:to-teal-800 transition-all"
              >
                Buka Menu Paket Aktif
              </a>
            </div>
          </CardContent>
        </Card>
      ) : filteredPackages.length === 0 ? (
        <Card className="py-16 text-center space-y-2 border-2 border-emerald-600/30 bg-gradient-to-br from-white via-white to-emerald-50/30 shadow-lg rounded-3xl">
          <CardContent>
            <Plane className="w-12 h-12 text-emerald-600/30 mx-auto mb-2" />
            <h3 className="text-base font-black text-emerald-950">Tidak Ada Paket Ditemukan</h3>
            <p className="text-xs text-emerald-900/70 max-w-md mx-auto font-medium">
              Tidak ada paket umroh yang sesuai dengan filter starting point, filter bulan, atau pencarian ini.
            </p>
          </CardContent>
        </Card>
      ) : selectedMonth === "ALL" ? (
        // MODE SEMUA BULAN: TAMPILKAN PEMBATAS ESTETIK PER BULAN DENGAN GRADASI MEWAH
        <div className="space-y-10">
          {packagesGroupedByMonth.map(([monthName, pkgs]) => (
            <div key={monthName} className="space-y-6">
              {/* PEMBATAS BULAN MEWAH (THEMED MINT / TEAL / AMBER GRADIENT) */}
              <div className="relative py-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-400 via-amber-400 to-transparent rounded-full opacity-80" />
                </div>
                <div className="relative px-7 py-2.5 rounded-2xl bg-gradient-to-r from-[#ccfbf1]/95 via-white to-[#d1fae5]/95 border-2 border-teal-500/60 shadow-[inset_0_2px_3px_rgba(255,255,255,0.95),0_6px_20px_rgba(13,148,136,0.3)] flex items-center gap-3 text-emerald-950 font-black text-sm tracking-wide">
                  <span className="text-amber-500 text-base drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]">✦</span>
                  <span className="uppercase tracking-wider">{monthName}</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm border border-amber-300">
                    {pkgs.length} Paket
                  </span>
                  <span className="text-amber-500 text-base drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]">✦</span>
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
          <div className="relative py-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-400 via-amber-400 to-transparent rounded-full opacity-80" />
            </div>
            <div className="relative px-7 py-2.5 rounded-2xl bg-gradient-to-r from-[#ccfbf1]/95 via-white to-[#d1fae5]/95 border-2 border-teal-500/60 shadow-[inset_0_2px_3px_rgba(255,255,255,0.95),0_6px_20px_rgba(13,148,136,0.3)] flex items-center gap-3 text-emerald-950 font-black text-sm tracking-wide">
              <span className="text-amber-500 text-base drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]">✦</span>
              <span className="uppercase tracking-wider">{selectedMonth}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm border border-amber-300">
                {filteredPackages.length} Paket
              </span>
              <span className="text-amber-500 text-base drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]">✦</span>
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

            {/* Flyer Brosur Action Box */}
            {(() => {
              const packageFlyers = getFlyerList(targetPackage);
              if (packageFlyers.length === 0) return null;
              return (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      Flyer Brosur Paket ({packageFlyers.length} Halaman)
                    </span>
                    {copiedFlyerSuccess && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3.5 h-3.5" /> Gambar Flyer Tersalin!
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {packageFlyers.map((url, fIdx) => {
                      const isSelected = fIdx === selectedFlyerIndex;
                      return (
                        <button
                          key={fIdx}
                          type="button"
                          onClick={() => setSelectedFlyerIndex(fIdx)}
                          className={`relative group shrink-0 w-16 h-20 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 ring-2 ring-emerald-500 shadow-md scale-102"
                              : "border-slate-200 dark:border-stone-700 opacity-75 hover:opacity-100"
                          } bg-black/5`}
                          title={`Klik untuk memilih Halaman ${fIdx + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Flyer ${fIdx + 1}`} className="w-full h-full object-cover" />
                          <div className={`absolute inset-x-0 bottom-0 text-[9px] font-bold text-center py-0.5 ${
                            isSelected ? "bg-emerald-700 text-white" : "bg-black/60 text-white"
                          }`}>
                            Hal {fIdx + 1}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Copy Image & Download Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={copyingFlyer}
                      onClick={() => handleCopyFlyerImageToClipboard(packageFlyers[selectedFlyerIndex] || packageFlyers[0]!)}
                      className="h-8 text-xs font-bold gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      {copyingFlyer ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : copiedFlyerSuccess ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedFlyerSuccess
                          ? "Flyer Siap Di-Paste!"
                          : packageFlyers.length > 1
                          ? `Salin Foto Flyer (Hal ${selectedFlyerIndex + 1})`
                          : "Salin Foto Flyer"}
                      </span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadFlyer(packageFlyers[selectedFlyerIndex] || packageFlyers[0]!, selectedFlyerIndex)}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{packageFlyers.length > 1 ? `Unduh Foto (Hal ${selectedFlyerIndex + 1})` : "Unduh Foto"}</span>
                    </Button>
                  </div>

                  {/* WhatsApp Guidance Note */}
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
                    💡 <strong>Cara kirim foto langsung di WhatsApp Web:</strong> Klik tombol <strong>&quot;Salin Foto Flyer&quot;</strong> di atas, lalu di kolom chat WhatsApp tinggal tekan <strong>Ctrl + V</strong> untuk langsung melampirkan foto flyer!
                  </div>
                </div>
              );
            })()}

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

      {/* MODAL ZOOM PREVIEW FLYER (DENGAN SLIDER NAVIGASI HALAMAN & KEYBOARD SHORTCUT) */}
      {previewFlyerData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in-0"
          onClick={() => setPreviewFlyerData(null)}
        >
          <div
            className="relative max-w-2xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 border border-slate-200 animate-in zoom-in-95 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Zoom */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {previewFlyerData.pkg.namaPaket}
                </span>
                {previewFlyerData.flyers.length > 1 && (
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    Hal {previewFlyerData.currentIndex + 1} dari {previewFlyerData.flyers.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewFlyerData(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all text-xs"
                title="Tutup (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Flyer Image Container with Navigation Arrows */}
            <div className="relative flex items-center justify-center max-h-[78vh] overflow-hidden rounded-xl bg-slate-50 border border-slate-100 w-full">
              <img
                src={previewFlyerData.flyers[previewFlyerData.currentIndex]}
                alt={`Brosur ${previewFlyerData.pkg.namaPaket}`}
                className="w-full h-auto max-h-[75vh] object-contain rounded-lg select-none"
              />

              {/* Tombol Geser Flyer Kiri & Kanan di Dalam Modal */}
              {previewFlyerData.flyers.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevZoomFlyer();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl flex items-center justify-center border border-slate-200 transition-all hover:scale-110 active:scale-95"
                    title="Halaman Sebelumnya (Panah Kiri)"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextZoomFlyer();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl flex items-center justify-center border border-slate-200 transition-all hover:scale-110 active:scale-95"
                    title="Halaman Berikutnya (Panah Kanan)"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>
                </>
              )}
            </div>

            {/* Hint di bawah jika ada lebih dari 1 halaman */}
            {previewFlyerData.flyers.length > 1 && (
              <div className="pt-3 text-xs text-slate-500 font-medium flex items-center gap-2">
                <span>Gunakan tombol panah atau tombol di samping untuk menggeser halaman brosur</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL KELOLA FLYER & CAPTION PROMOSI ── */}
      {manageMediaPkg && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-emerald-500/40 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="space-y-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                    🎨 Media Manager
                  </span>
                  <h3 className="text-base font-black text-slate-900 truncate">
                    Kelola Flyer & Caption
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {manageMediaPkg.namaPaket}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManageMediaPkg(null)}
                disabled={savingMedia}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-all text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Flyer Brosur */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImagePlus className="w-4 h-4 text-emerald-700" />
                  Brosur Flyer Paket
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {mediaFlyerUrls.length + newFlyerFiles.length} flyer aktif
                </span>
              </div>

              {/* Flyer List Grid (Existing + New) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {/* Existing Flyers */}
                {mediaFlyerUrls.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative group rounded-xl overflow-hidden border-2 border-emerald-300 aspect-[3/4] bg-slate-100 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Flyer ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingFlyer(idx)}
                      disabled={savingMedia}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md opacity-90 hover:opacity-100 transition-all cursor-pointer"
                      title="Hapus flyer ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-950/80 text-amber-300 text-[10px] font-bold text-center py-0.5">
                      Hal {idx + 1}
                    </div>
                  </div>
                ))}

                {/* Newly Added Flyers */}
                {newFlyerPreviews.map((url, idx) => (
                  <div key={`new-${idx}`} className="relative group rounded-xl overflow-hidden border-2 border-amber-400 aspect-[3/4] bg-slate-100 shadow-xs ring-2 ring-amber-400/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Flyer Baru ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFlyer(idx)}
                      disabled={savingMedia}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md opacity-90 hover:opacity-100 transition-all cursor-pointer"
                      title="Hapus flyer baru ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-amber-950/85 text-amber-300 text-[10px] font-bold text-center py-0.5">
                      Baru {idx + 1}
                    </div>
                  </div>
                ))}

                {/* Add Flyer Button */}
                <div
                  onClick={() => {
                    const input = document.getElementById("katalog-flyer-file-input");
                    if (input) (input as HTMLInputElement).click();
                  }}
                  className="rounded-xl border-2 border-dashed border-emerald-400/80 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 flex flex-col items-center justify-center p-3 aspect-[3/4] cursor-pointer transition-all text-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <input
                    id="katalog-flyer-file-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleAddNewFlyers(e.target.files);
                    }}
                  />
                  <div className="w-8 h-8 rounded-full bg-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black text-emerald-950 leading-tight">
                    + Tambah Foto Flyer
                  </span>
                  <span className="text-[9.5px] text-emerald-800/70 font-semibold">
                    JPG/PNG/WEBP
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Caption Promosi */}
            <div className="space-y-2 pt-2 border-t border-emerald-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  Caption Promosi Pemasaran
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAutoCaption}
                  disabled={savingMedia}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Generate Otomatis dari Data Paket</span>
                </button>
              </div>
              <textarea
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                rows={6}
                placeholder="Tuliskan atau tempel caption promosi di sini. Teks ini akan tampil di katalog dan dapat disalin langsung oleh admin saat mengirim paket ke jamaah..."
                className="w-full p-3 text-xs font-medium rounded-2xl border-2 border-teal-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans leading-relaxed shadow-xs placeholder:text-stone-400"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-emerald-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManageMediaPkg(null)}
                disabled={savingMedia}
                className="rounded-xl font-bold text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveMedia}
                disabled={savingMedia}
                className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md flex items-center gap-1.5 px-5"
              >
                {savingMedia ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
