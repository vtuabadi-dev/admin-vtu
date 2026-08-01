"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Eye,
  Pencil,
  Download,
  FileText,
  X,
  Building2,
  Users,
  CalendarDays,
  Plane,
  Search,
  Printer,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Table } from "@/shared/components/ui/Table";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import { formatDateShort, formatDate } from "@/shared/lib/utils";
import { getHotelCombinations, generateHotelLabel } from "@/shared/lib/hotel-utils";
import type { Manifest, ManifestRow, Keberangkatan, Jamaah, HotelCombinationSummary, RegistrationGroup } from "@/shared/types";

// ── Helper Utilities ─────────────────────────────────────────

function getSingleSourceOfTruthName(j: any): string {
  if (j.dokumen && Array.isArray(j.dokumen)) {
    const pasporDoc = j.dokumen.find((d: any) => d.jenis === "paspor");
    if (pasporDoc) {
      const pName = pasporDoc.manualData?.namaLengkap || pasporDoc.ocrData?.namaLengkap;
      if (pName && pName.trim()) return pName.trim();
    }
    const ktpDoc = j.dokumen.find((d: any) => d.jenis === "ktp");
    if (ktpDoc) {
      const kName = ktpDoc.manualData?.namaLengkap || ktpDoc.ocrData?.namaLengkap;
      if (kName && kName.trim()) return kName.trim();
    }
  }
  return j.namaLengkap || "-";
}

function calculateAge(birthDateInput?: string | Date): string {
  if (!birthDateInput) return "-";
  const birthDate = new Date(birthDateInput);
  if (isNaN(birthDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} Thn` : "-";
}

function formatDisplayDate(dateInput?: string | Date): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatIdRegister(baseCode: string, memberIndex: number, totalInGroup: number): string {
  const cleanCode = baseCode.replace(/^GRP-\d+-0*/, "") || baseCode;
  if (totalInGroup > 1) {
    return `${cleanCode}-${memberIndex + 1}`;
  }
  return cleanCode;
}

function formatGroupMergeLabel(groupObj: any, groupMembers: any[]): string {
  const paxCount = groupMembers.length;
  const roomType = groupObj?.roomUpgrade || groupObj?.tipeKamar || "UPGRADE DOUBLE";
  const cluster = groupObj?.hotelUpgrade || groupObj?.namaCluster || "PLATINUM (38.900)";
  const dateStr = formatDisplayDate(groupObj?.createdAt || new Date());
  
  return `${paxCount} PAX ${String(roomType).toUpperCase()} + ${String(cluster).toUpperCase()} ${dateStr}`;
}

// ── Main Page Component Content ──────────────────────────────

function ManifestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPaketId = searchParams.get("paketId") || "";

  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);
  const [selectedKeberangkatan, setSelectedKeberangkatan] = useState<string>(urlPaketId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state for generate modal
  const [formKeberangkatan, setFormKeberangkatan] = useState("");
  const [formTemplate, setFormTemplate] = useState("default");
  const [formNama, setFormNama] = useState("");

  // Sync state if URL search param changes
  useEffect(() => {
    if (urlPaketId) {
      setSelectedKeberangkatan(urlPaketId);
    }
  }, [urlPaketId]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resMan, resKbr, resJam, resGrp] = await Promise.all([
        fetch("/api/manifests"),
        fetch("/api/keberangkatan"),
        fetch("/api/jamaah"),
        fetch("/api/groups"),
      ]);

      if (!resMan.ok || !resKbr.ok || !resJam.ok) {
        throw new Error("Gagal mengambil data dari server");
      }

      const jsonMan = await resMan.json();
      const jsonKbr = await resKbr.json();
      const jsonJam = await resJam.json();
      const jsonGrp = resGrp.ok ? await resGrp.json() : { data: [] };

      setManifests(jsonMan.data ?? []);
      setKeberangkatanList(jsonKbr.data ?? []);
      setAllJamaah(jsonJam.data ?? []);
      setGroups(jsonGrp.data ?? []);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error("Database Connection Error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Selected package details
  const activePackage = useMemo(() => {
    if (!selectedKeberangkatan) return null;
    return keberangkatanList.find((k) => k.id === selectedKeberangkatan) ?? null;
  }, [keberangkatanList, selectedKeberangkatan]);

  // Jamaah belonging to the active package
  const activePackageJamaah = useMemo(() => {
    if (!activePackage) return [];
    const jamaahIds = new Set(activePackage.jamaahIds || []);
    // Also include jamaah whose groupId belongs to a registration group under this package
    const packageGroupIds = new Set(
      groups.filter((g) => g.paketKeberangkatanId === activePackage.id).map((g) => g.id)
    );

    return allJamaah.filter(
      (j) => jamaahIds.has(j.id) || packageGroupIds.has(j.groupId)
    );
  }, [activePackage, allJamaah, groups]);

  // Filtered Jamaah by search query
  const filteredActiveJamaah = useMemo(() => {
    if (!searchQuery.trim()) return activePackageJamaah;
    const q = searchQuery.toLowerCase().trim();
    return activePackageJamaah.filter((j) => {
      const sotName = getSingleSourceOfTruthName(j).toLowerCase();
      const regId = (j.registrationId || j.groupId || "").toLowerCase();
      const noId = (j.nomorPaspor || j.nik || "").toLowerCase();
      return sotName.includes(q) || regId.includes(q) || noId.includes(q);
    });
  }, [activePackageJamaah, searchQuery]);

  // Group Jamaah for Row Merging (rowSpan)
  const groupedJamaahList = useMemo(() => {
    const map = new Map<string, Jamaah[]>();
    filteredActiveJamaah.forEach((j) => {
      const key = j.groupId || j.registrationId || "ungrouped";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });

    return Array.from(map.entries()).map(([groupId, members]) => {
      const groupObj = groups.find((g) => g.id === groupId) || null;
      return {
        groupId,
        members,
        groupObj,
      };
    });
  }, [filteredActiveJamaah, groups]);

  function handleGenerate() {
    setFormKeberangkatan(selectedKeberangkatan || "");
    setFormTemplate("default");
    setFormNama("");
    setModalOpen(true);
  }

  const selectedKbrForModal = useMemo(
    () => keberangkatanList.find((k) => k.id === formKeberangkatan) ?? null,
    [keberangkatanList, formKeberangkatan]
  );

  const modalKbrJamaah = useMemo(() => {
    if (!selectedKbrForModal) return [];
    return allJamaah.filter((j) => selectedKbrForModal.jamaahIds?.includes(j.id));
  }, [selectedKbrForModal, allJamaah]);

  const siskopatuhCombinations = useMemo<HotelCombinationSummary[]>(() => {
    if (!selectedKbrForModal || formTemplate !== "siskopatuh") return [];
    return getHotelCombinations(modalKbrJamaah);
  }, [selectedKbrForModal, formTemplate, modalKbrJamaah]);

  function generatePreviewRows(): ManifestRow[] {
    if (!selectedKbrForModal) return [];
    if (formTemplate === "siskopatuh") return [];
    return modalKbrJamaah.map((j, idx) => ({
      id: `preview-${idx}`,
      nomorUrut: idx + 1,
      jamaahId: j.id,
      nomorPaspor: j.nomorPaspor,
      namaLengkap: j.namaLengkap,
      tempatLahir: j.tempatLahir,
      tanggalLahir: j.tanggalLahir,
      nomorKursi: undefined,
      nomorKamar: undefined,
      catatan: undefined,
    }));
  }

  const previewColumns = [
    { key: "nomorUrut", header: "No.", accessor: (row: Record<string, unknown>) => row.nomorUrut as number, className: "w-12" },
    { key: "namaLengkap", header: "Nama Lengkap", accessor: (row: Record<string, unknown>) => row.namaLengkap as string },
    { key: "nomorPaspor", header: "No. Paspor", accessor: (row: Record<string, unknown>) => row.nomorPaspor as string },
    { key: "nomorKursi", header: "No. Kursi", accessor: (row: Record<string, unknown>) => (row.nomorKursi as string) ?? "-" },
    { key: "nomorKamar", header: "No. Kamar", accessor: (row: Record<string, unknown>) => (row.nomorKamar as string) ?? "-" },
  ];

  async function doGenerate() {
    if (!selectedKbrForModal || !formNama.trim()) return;

    const buildManifestData = (rows: ManifestRow[], kode: string, nama: string, hotelMekkah?: string, hotelMadinah?: string) => ({
      keberangkatanId: selectedKbrForModal!.id,
      kode,
      namaManifest: nama,
      templateId: formTemplate,
      hotelMekkah: hotelMekkah ?? selectedKbrForModal!.hotelMekkahId,
      hotelMadinah: hotelMadinah ?? selectedKbrForModal!.hotelMadinahId,
      status: "draft" as const,
      data: rows,
    });

    try {
      if (formTemplate === "siskopatuh") {
        const combinations = getHotelCombinations(modalKbrJamaah);
        for (let idx = 0; idx < combinations.length; idx++) {
          const combo = combinations[idx]!;
          const filteredJamaah = modalKbrJamaah.filter(
            (j) => j.hotelMekkah === combo.hotelMekkah && j.hotelMadinah === combo.hotelMadinah
          );
          const label = generateHotelLabel(combo.hotelMekkah, combo.hotelMadinah);
          const seq = String(idx + 1).padStart(3, "0");
          const rows: ManifestRow[] = filteredJamaah.map((j, i) => ({
            id: `mrow-${Date.now()}-${idx}-${i}`,
            nomorUrut: i + 1,
            jamaahId: j.id,
            nomorPaspor: j.nomorPaspor,
            namaLengkap: j.namaLengkap,
            tempatLahir: j.tempatLahir,
            tanggalLahir: j.tanggalLahir,
          }));
          await fetch("/api/manifests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildManifestData(rows, `MAN/${selectedKbrForModal!.kode}/SKP/${seq}`, `${formNama.trim()} — ${label}`, combo.hotelMekkah, combo.hotelMadinah)),
          });
        }
      } else {
        const rows: ManifestRow[] = modalKbrJamaah.map((j, i) => ({
          id: `mrow-${Date.now()}-${i}`,
          nomorUrut: i + 1,
          jamaahId: j.id,
          nomorPaspor: j.nomorPaspor,
          namaLengkap: j.namaLengkap,
          tempatLahir: j.tempatLahir,
          tanggalLahir: j.tanggalLahir,
        }));
        const seq = String(Date.now()).slice(-5);
        await fetch("/api/manifests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildManifestData(rows, `MAN/${selectedKbrForModal!.kode}/${seq}`, formNama.trim())),
        });
      }

      setModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Failed to generate manifest:", err);
    }
  }

  // Counter variable for global sequential NO JAMAAH
  let globalNoJamaahCounter = 1;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedKeberangkatan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedKeberangkatan("");
                router.push("/admin/manifest");
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Semua Manifest
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Master Manifest Utama</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Single Source of Truth pendataan jamaah & manifest keberangkatan umroh
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Manifest Baru
          </Button>
        </div>
      </div>

      {/* Package Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-xl">
              <Select
                options={keberangkatanList.map((k) => ({
                  value: k.id,
                  label: `${k.kode} — ${k.namaPaket || k.paketUmroh?.namaPaket || "-"} (${formatDateShort(k.tanggalBerangkat)})`,
                }))}
                placeholder="-- Pilih Paket Keberangkatan Aktif --"
                value={selectedKeberangkatan}
                onChange={(e) => {
                  setSelectedKeberangkatan(e.target.value);
                  router.push(e.target.value ? `/admin/manifest?paketId=${e.target.value}` : "/admin/manifest");
                }}
                className="w-full"
              />
              {selectedKeberangkatan && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedKeberangkatan("");
                    router.push("/admin/manifest");
                  }}
                  title="Tampilkan Semua Manifest"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            {activePackage && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari jamaah, NIK, paspor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  title="Cetak Manifest"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Cetak
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ACTIVE PACKAGE HEADER & NOTION MASTER TABLE VIEW */}
      {activePackage ? (
        <div className="space-y-4">
          {/* Active Package Banner Card */}
          <Card variant="operational" className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white border-stone-800 shadow-md">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                      {activePackage.kode}
                    </span>
                    <StatusBadge status={activePackage.status} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-amber-400">
                    {activePackage.namaPaket || activePackage.paketUmroh?.namaPaket || "PAKET UMROH"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 pt-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                      Berangkat: <strong className="text-white">{formatDate(activePackage.tanggalBerangkat)}</strong>
                    </span>
                    <span className="text-stone-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                      Pulang: <strong className="text-white">{formatDate(activePackage.tanggalPulang)}</strong>
                    </span>
                    <span className="text-stone-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5 text-amber-400" />
                      Maskapai: <strong className="text-white">{activePackage.maskapai || "Saudia Airlines"}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-stone-800/80 border border-stone-700/60 rounded-xl p-3 shrink-0">
                  <div className="text-center px-3 border-r border-stone-700">
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">Total Pax</p>
                    <p className="text-xl font-bold text-white">{activePackageJamaah.length}</p>
                  </div>
                  <div className="text-center px-3 border-r border-stone-700">
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">Rombongan</p>
                    <p className="text-xl font-bold text-amber-400">{groupedJamaahList.length}</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">Kuota Seat</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {activePackage.terisi}/{activePackage.maxSeat || activePackage.kuota || 45}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NOTION-STYLE MASTER TABLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Data Jamaah Manifest Paket ({filteredActiveJamaah.length} Pax)
              </p>
              <span className="text-[11px] text-muted-foreground italic">
                * Single Source of Truth: Nama Paspor &gt; KTP &gt; Registrasi Awal
              </span>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-medium">
                  <thead className="bg-stone-100/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[200px]">
                        KELUARGA / ROMBONGAN
                      </th>
                      <th className="px-2 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 w-16 text-center">
                        NO JAMAAH
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[100px]">
                        ID REGISTER
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[130px]">
                        NO ID (*)
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 w-24">
                        JENIS IDENTITAS (*)
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[170px]">
                        NAMA
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[130px]">
                        HOTEL MAKKAH
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[130px]">
                        HOTEL MADINAH
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[120px]">
                        KAMAR
                      </th>
                      <th className="px-2 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 w-12 text-center">
                        JK (*)
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70">
                        TEMPAT LAHIR (*)
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 w-24">
                        TGL LAHIR (*)
                      </th>
                      <th className="px-2 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 w-14 text-center">
                        UMUR
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70">
                        STATUS MENIKAH
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 border-r border-stone-200/70 dark:border-stone-800/70 min-w-[110px]">
                        NO TELP/HP
                      </th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300 min-w-[200px]">
                        ALAMAT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                    {filteredActiveJamaah.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="px-4 py-12 text-center text-stone-500">
                          Belum ada data jamaah terdaftar pada paket ini.
                        </td>
                      </tr>
                    ) : (
                      groupedJamaahList.map((group) => {
                        const groupMergeText = formatGroupMergeLabel(group.groupObj, group.members);
                        const totalInGroup = group.members.length;

                        return group.members.map((j: any, memberIdx) => {
                          const currentNoJamaah = globalNoJamaahCounter++;
                          const isFirstInGroup = memberIdx === 0;

                          // Single Source of Truth Name Resolution
                          const namaSot = getSingleSourceOfTruthName(j);

                          // Flexible ID Resolution
                          const hasPaspor = Boolean(j.nomorPaspor && j.nomorPaspor.trim());
                          const noId = hasPaspor ? j.nomorPaspor : j.nik || "-";
                          const jenisIdentitas = hasPaspor ? "PASPOR" : j.nik ? "KTP" : "-";

                          // ID Register Format
                          const baseCode = group.groupObj?.kodeRegistrasi || j.registrationId || j.groupId || "2980";
                          const idRegister = formatIdRegister(baseCode, memberIdx, totalInGroup);

                          const tipeKamarDisplay = j.tipeKamar || (group.groupObj as any)?.roomUpgrade || "Upgrade Double";
                          const statusMenikahDisplay = j.statusMenikah || "Belum Menikah";

                          return (
                            <tr
                              key={j.id}
                              className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
                            >
                              {/* MERGED CELL: KELUARGA/ROMBONGAN */}
                              {isFirstInGroup && (
                                <td
                                  rowSpan={totalInGroup}
                                  className="p-3 text-center align-middle font-bold text-[11px] bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border-r-2 border-r-amber-400 dark:border-r-amber-700 border-b border-stone-200 dark:border-stone-800 shadow-xs"
                                >
                                  {groupMergeText}
                                </td>
                              )}

                              {/* NO JAMAAH */}
                              <td className="px-2 py-2.5 text-center font-bold font-mono text-stone-700 dark:text-stone-300 border-r border-stone-200/50 dark:border-stone-800/50">
                                {currentNoJamaah}
                              </td>

                              {/* ID REGISTER */}
                              <td className="px-3 py-2.5 font-mono font-semibold text-stone-800 dark:text-stone-200 border-r border-stone-200/50 dark:border-stone-800/50">
                                {idRegister}
                              </td>

                              {/* NO ID */}
                              <td className="px-3 py-2.5 font-mono text-stone-700 dark:text-stone-300 border-r border-stone-200/50 dark:border-stone-800/50">
                                {noId}
                              </td>

                              {/* JENIS IDENTITAS */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50">
                                <span
                                  className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                                    jenisIdentitas === "PASPOR"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                  }`}
                                >
                                  {jenisIdentitas}
                                </span>
                              </td>

                              {/* NAMA */}
                              <td className="px-3 py-2.5 font-bold text-stone-900 dark:text-white border-r border-stone-200/50 dark:border-stone-800/50">
                                {namaSot}
                              </td>

                              {/* HOTEL MAKKAH */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50">
                                {activePackage.hotelMekkah || j.hotelMekkah || "Safwah Tower"}
                              </td>

                              {/* HOTEL MADINAH */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50">
                                {activePackage.hotelMadinah || j.hotelMadinah || "Durrat Al Eiman"}
                              </td>

                              {/* KAMAR */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 uppercase font-semibold text-stone-700 dark:text-stone-300">
                                {tipeKamarDisplay}
                              </td>

                              {/* JENIS KELAMIN */}
                              <td className="px-2 py-2.5 text-center font-bold border-r border-stone-200/50 dark:border-stone-800/50">
                                {j.jenisKelamin || "L"}
                              </td>

                              {/* TEMPAT LAHIR */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50">
                                {j.tempatLahir || "-"}
                              </td>

                              {/* TGL LAHIR */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 font-mono">
                                {formatDisplayDate(j.tanggalLahir)}
                              </td>

                              {/* UMUR */}
                              <td className="px-2 py-2.5 text-center font-semibold border-r border-stone-200/50 dark:border-stone-800/50">
                                {calculateAge(j.tanggalLahir)}
                              </td>

                              {/* STATUS MENIKAH */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50">
                                {statusMenikahDisplay}
                              </td>

                              {/* NO TELP/HP */}
                              <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 font-mono">
                                {j.nomorTelepon || "-"}
                              </td>

                              {/* ALAMAT */}
                              <td
                                className="px-3 py-2.5 text-stone-600 dark:text-stone-400 max-w-[240px] truncate"
                                title={j.alamat}
                              >
                                {j.alamat || "-"}
                              </td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MANIFEST CARDS VIEW (All Manifests Summary List) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Daftar Dokumen Manifest Terbuat</h2>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Memuat data manifest...
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center">
              <ErrorState onRetry={loadAllData} message={error.message} />
            </div>
          ) : manifests.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border rounded-xl bg-card">
              Belum ada dokumen manifest terbuat. Pilih paket di atas untuk melihat Laman Manifest Utama.
            </div>
          ) : (
            <div className="grid gap-4">
              {manifests.map((manifest) => {
                const keberangkatan = keberangkatanList.find(
                  (k) => k.id === manifest.keberangkatanId
                );
                return (
                  <Card key={manifest.id} variant="operational">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {manifest.namaManifest}
                            {manifest.hotelMekkah && manifest.hotelMadinah && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                                <Building2 className="h-3 w-3" />
                                {generateHotelLabel(manifest.hotelMekkah, manifest.hotelMadinah)}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {manifest.kode}
                          </CardDescription>
                        </div>
                        <StatusBadge status={manifest.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Keberangkatan:</span>
                          <p className="font-medium">{keberangkatan?.kode ?? "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Jumlah Jamaah:</span>
                          <p className="font-medium">{manifest.data?.length ?? 0} orang</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dibuat:</span>
                          <p className="font-medium">{formatDateShort(manifest.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Diupdate:</span>
                          <p className="font-medium">{formatDateShort(manifest.updatedAt)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/manifest?paketId=${manifest.keberangkatanId}`)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Lihat Manifest Utama Paket
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/manifest/${manifest.id}`)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit Manifest Row
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(`/admin/manifest/${manifest.id}/export`)
                          }
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Export CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Manifest Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Manifest Baru"
        description="Pilih keberangkatan dan template untuk membuat manifest"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pilih Keberangkatan"
              options={keberangkatanList.map((k) => ({
                value: k.id,
                label: `${k.kode} — ${k.namaPaket || k.paketUmroh?.namaPaket || "-"}`,
              }))}
              placeholder="-- Pilih Keberangkatan --"
              value={formKeberangkatan}
              onChange={(e) => setFormKeberangkatan(e.target.value)}
            />
            <Select
              label="Template Manifest"
              options={[
                { value: "default", label: "Template Standar" },
                { value: "detailed", label: "Template Detail" },
                { value: "airline", label: "Template Maskapai" },
                { value: "siskopatuh", label: "Template SISKOPATUH" },
              ]}
              value={formTemplate}
              onChange={(e) => setFormTemplate(e.target.value)}
            />
          </div>
          <Input
            label="Nama Manifest"
            placeholder="Contoh: Manifest Penerbangan SV-818"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
          />

          {formKeberangkatan && formTemplate !== "siskopatuh" && (
            <div>
              <p className="text-sm font-medium mb-2">
                Pratinjau Data Jamaah ({generatePreviewRows().length} orang)
              </p>
              <Table
                columns={previewColumns}
                data={generatePreviewRows() as unknown as Record<string, unknown>[]}
                keyField="id"
                dense
              />
            </div>
          )}

          {formTemplate === "siskopatuh" && selectedKbrForModal && (
            <div>
              <p className="text-sm font-medium mb-2">
                Hotel Combinations — {siskopatuhCombinations.length} manifest akan dibuat
              </p>
              {siskopatuhCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Tidak ada data jamaah untuk paket ini
                </p>
              ) : (
                <table className="w-full text-sm border rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">No.</th>
                      <th className="px-3 py-2">Kombinasi Hotel</th>
                      <th className="px-3 py-2 text-right">Jumlah Jamaah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {siskopatuhCombinations.map((combo, idx) => (
                      <tr key={combo.label}>
                        <td className="px-3 py-2 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{combo.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {combo.hotelMekkah} — {combo.hotelMadinah}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {combo.jumlahJamaah} orang
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!formKeberangkatan || !formNama.trim()}
              onClick={doGenerate}
            >
              Generate Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Default Export with Suspense ──────────────────────────────

export default function ManifestPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat Laman Manifest Utama...</p>
      </div>
    }>
      <ManifestPageContent />
    </Suspense>
  );
}
