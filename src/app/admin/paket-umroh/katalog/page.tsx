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
  Hotel,
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

export default function KatalogPaketPage() {
  const { user } = useSession();

  const [packages, setPackages] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Distinct Months list extracted from packages
  const monthsList = useMemo(() => {
    const set = new Set<string>();
    packages.forEach((pkg) => {
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
  }, [packages]);

  // Filtered packages by month and search
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Month filter
      if (selectedMonth !== "ALL") {
        if (!pkg.tanggalBerangkat) return false;
        const d = new Date(pkg.tanggalBerangkat);
        const mKey = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        if (mKey !== selectedMonth) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = (pkg.namaPaket || "").toLowerCase();
        const maskapai = (pkg.maskapai || "").toLowerCase();
        const mekkah = (pkg.hotelMekkah || "").toLowerCase();
        const madinah = (pkg.hotelMadinah || "").toLowerCase();
        const kode = (pkg.kode || "").toLowerCase();
        return (
          nama.includes(q) ||
          maskapai.includes(q) ||
          mekkah.includes(q) ||
          madinah.includes(q) ||
          kode.includes(q)
        );
      }

      return true;
    });
  }, [packages, selectedMonth, searchQuery]);

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
    const textToCopy = pkg.caption || `${pkg.namaPaket}\nKeberangkatan: ${pkg.tanggalBerangkat ? new Date(pkg.tanggalBerangkat).toLocaleDateString("id-ID") : ""}\nHarga: Rp ${formatNumberWithDots(pkg.hargaPaket || 0)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaptionId(pkg.id);
    setTimeout(() => setCopiedCaptionId(null), 2500);
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

      {/* FILTER PER BULAN (TABS) & SEARCH */}
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Scrollable Month Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-semibold scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedMonth("ALL")}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  selectedMonth === "ALL"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua Bulan ({packages.length})
              </button>
              {monthsList.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedMonth === m
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari paket, maskapai, hotel..."
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRID DAFTAR PAKET KATALOG */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat katalog paket umroh...</span>
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="py-16 text-center space-y-2 border">
          <CardContent>
            <Plane className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <h3 className="text-base font-bold text-foreground">Tidak Ada Paket Ditemukan</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tidak ada paket umroh yang sesuai dengan filter bulan atau pencarian ini. Pastikan Anda telah men-generate paket di menu Generate Paket.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const depDate = pkg.tanggalBerangkat ? new Date(pkg.tanggalBerangkat) : null;
            const sisaSeat = Math.max(0, (pkg.kuota || 45) - (pkg.terisi || 0));

            return (
              <Card
                key={pkg.id}
                className="overflow-hidden border border-slate-200 dark:border-stone-800 hover:shadow-lg transition-all flex flex-col bg-card"
              >
                {/* FLYER IMAGE HEADER */}
                <div className="relative h-48 w-full bg-slate-900 overflow-hidden group">
                  {pkg.flyerUrl ? (
                    <>
                      <img
                        src={pkg.flyerUrl}
                        alt={pkg.namaPaket}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewFlyerUrl(pkg.flyerUrl!)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]"
                      >
                        <Eye className="w-4 h-4" />
                        Perbesar Flyer Brosur
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-stone-900 to-emerald-950 text-white text-center space-y-2">
                      <Plane className="w-8 h-8 text-primary/80" />
                      <div className="font-bold text-sm line-clamp-2 px-2">{pkg.namaPaket}</div>
                      <Badge variant="outline" className="text-[10px] bg-white/10 text-emerald-300 border-emerald-400/30">
                        Brosur Resmi VTU Abadi
                      </Badge>
                    </div>
                  )}

                  {/* Seat badge overlay */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-black/70 text-white backdrop-blur-md border border-white/20">
                      Sisa {sisaSeat} Seat
                    </span>
                  </div>

                  {/* Durasi badge overlay */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground shadow-md">
                      {pkg.durationDays || 9} Hari
                    </span>
                  </div>
                </div>

                {/* CARD BODY */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Header Title & Price */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span>{pkg.kode}</span>
                        {pkg.splitLabel && (
                          <span className="text-amber-600 font-bold">• {pkg.splitLabel}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-foreground line-clamp-2 mt-0.5">
                        {pkg.namaPaket}
                      </h3>
                      <div className="text-lg font-extrabold text-primary mt-1">
                        Rp {formatNumberWithDots(pkg.hargaPaket || 0)}
                        <span className="text-[11px] font-normal text-muted-foreground ml-1">/ pax</span>
                      </div>
                    </div>

                    {/* Flight & Dates */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Berangkat:
                        </span>
                        <span className="font-bold text-foreground">
                          {depDate
                            ? depDate.toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Plane className="w-3.5 h-3.5 text-primary" />
                          Maskapai:
                        </span>
                        <span className="font-semibold text-foreground">{pkg.maskapai || "Saudia"}</span>
                      </div>
                    </div>

                    {/* Hotels */}
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Hotel className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="line-clamp-1">
                          <strong>Mekkah:</strong> {pkg.hotelMekkah || "Bintang 5"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hotel className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="line-clamp-1">
                          <strong>Madinah:</strong> {pkg.hotelMadinah || "Bintang 5"}
                        </span>
                      </div>
                    </div>

                    {/* Caption Preview Box */}
                    {pkg.caption && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3 text-primary" />
                            Caption Promosi:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCaption(pkg)}
                            className="text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copiedCaptionId === pkg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Disalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin Caption</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-stone-900 border text-[11px] text-muted-foreground font-mono line-clamp-3 leading-relaxed whitespace-pre-line">
                          {pkg.caption}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTON: KIRIM KE WA KE TAMU ADMIN */}
                  <div className="pt-2 border-t flex items-center gap-2">
                    <Button
                      onClick={() => openSendModal(pkg)}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      Kirim ke WA (Pilih Tamu)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
