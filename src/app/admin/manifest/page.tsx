"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  X,
  CalendarDays,
  Plane,
  Search,
  Printer,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  Split,
  Tag,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import { formatDateShort, formatDate } from "@/shared/lib/utils";
import type { Manifest, Keberangkatan, Jamaah, RegistrationGroup } from "@/shared/types";
import { useOperationalStore } from "@/stores/operational-store";

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

function deriveProvinsi(provinsi?: string, kota?: string): string {
  if (provinsi && provinsi.trim() && provinsi !== "-") return provinsi.trim();
  const text = `${kota || ""}`.toLowerCase();
  if (/jakarta|tebet/i.test(text)) return "DKI JAKARTA";
  if (/depok|bogor|bekasi|bandung/i.test(text)) return "JAWA BARAT";
  if (/tangerang|banten/i.test(text)) return "BANTEN";
  if (/semarang|solo|surakarta/i.test(text)) return "JAWA TENGAH";
  if (/surabaya|malang|kediri/i.test(text)) return "JAWA TIMUR";
  if (/yogyakarta|jogja/i.test(text)) return "DI YOGYAKARTA";
  if (/medan|padang|palembang/i.test(text)) return "SUMATERA UTARA";
  return "DKI JAKARTA";
}

function getPasporDetails(j: any) {
  let pasporDoc: any = null;
  if (j.dokumen && Array.isArray(j.dokumen)) {
    pasporDoc = j.dokumen.find((d: any) => d.jenis === "paspor");
  }

  const noPaspor = j.nomorPaspor && j.nomorPaspor !== "-"
    ? j.nomorPaspor
    : pasporDoc?.manualData?.nomorPaspor || pasporDoc?.ocrData?.nomorPaspor || "-";

  const tglDikeluarkan = j.tglDikeluarkanPaspor
    || pasporDoc?.manualData?.tanggalDikeluarkan
    || pasporDoc?.ocrData?.tanggalDikeluarkan
    || "-";

  const tglHabis = j.masaBerlakuPaspor
    || pasporDoc?.manualData?.tanggalHabis
    || pasporDoc?.ocrData?.tanggalHabis
    || "-";

  const kotaPaspor = j.kotaPaspor
    || pasporDoc?.manualData?.kotaPaspor
    || pasporDoc?.ocrData?.kotaPaspor
    || "-";

  return { noPaspor, tglDikeluarkan, tglHabis, kotaPaspor };
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
  return age >= 0 ? `${age} Thn` : "-";
}

function formatDisplayDate(dateInput?: string | Date): string {
  if (!dateInput || dateInput === "-") return "-";
  if (typeof dateInput === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    return dateInput;
  }
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
  const fromSource = searchParams.get("from") || "";

  const storeKeberangkatan = useOperationalStore((s) => s.keberangkatanList);
  const storeJamaah = useOperationalStore((s) => s.jamaahList);
  const storeGroups = useOperationalStore((s) => s.groupList);
  const setStoreKeberangkatan = useOperationalStore((s) => s.setKeberangkatanList);
  const setStoreJamaah = useOperationalStore((s) => s.setJamaahList);
  const setStoreGroups = useOperationalStore((s) => s.setGroupList);

  const [, setManifests] = useState<Manifest[]>([]);
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>(storeKeberangkatan);
  const [groups, setGroups] = useState<RegistrationGroup[]>(storeGroups);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>(storeJamaah);
  const [selectedKeberangkatan, setSelectedKeberangkatan] = useState<string>(urlPaketId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(storeKeberangkatan.length === 0);
  const [error, setError] = useState<Error | null>(null);

  // Excel Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreviewRows, setExcelPreviewRows] = useState<any[]>([]);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [submittingImport, setSubmittingImport] = useState(false);

  // Actions Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jamaahToDelete, setJamaahToDelete] = useState<Jamaah | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [groupToMove, setGroupToMove] = useState<any | null>(null);
  const [targetPaketId, setTargetPaketId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  // Multi-Select & Bulk Delete State
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedJamaahIds, setSelectedJamaahIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"soft" | "hard">("soft");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");

  // Sync state if URL search param changes
  useEffect(() => {
    if (urlPaketId) {
      setSelectedKeberangkatan(urlPaketId);
    }
  }, [urlPaketId]);

  // Hydrate local state from store if store populates after mount
  useEffect(() => {
    if (storeKeberangkatan.length > 0 && keberangkatanList.length === 0) {
      setKeberangkatanList(storeKeberangkatan);
      setAllJamaah(storeJamaah);
      setGroups(storeGroups);
      setLoading(false);
    }
  }, [storeKeberangkatan, storeJamaah, storeGroups, keberangkatanList.length]);

  const loadAllData = useCallback(async () => {
    if (storeKeberangkatan.length === 0 && keberangkatanList.length === 0) {
      setLoading(true);
    }
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

      const kbrData = jsonKbr.data ?? [];
      const jamData = jsonJam.data ?? [];
      const grpData = jsonGrp.data ?? [];

      setManifests(jsonMan.data ?? []);
      setKeberangkatanList(kbrData);
      setAllJamaah(jamData);
      setGroups(grpData);

      // Hydrate operational store for fast instant navigation
      if (kbrData.length > 0) setStoreKeberangkatan(kbrData);
      if (jamData.length > 0) setStoreJamaah(jamData);
      if (grpData.length > 0) setStoreGroups(grpData);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error("Database Connection Error"));
    } finally {
      setLoading(false);
    }
  }, [keberangkatanList.length, setStoreGroups, setStoreJamaah, setStoreKeberangkatan, storeKeberangkatan.length]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Selected package details
  const activePackage = useMemo(() => {
    if (!selectedKeberangkatan) return null;
    return keberangkatanList.find((k) => k.id === selectedKeberangkatan) ?? null;
  }, [keberangkatanList, selectedKeberangkatan]);

  // Group keberangkatan packages into hierarchy (Parent & Split Packages)
  const groupedPackageTree = useMemo(() => {
    if (!keberangkatanList || keberangkatanList.length === 0) return [];

    const parentMap = new Map<string, Keberangkatan>();
    const childrenMap = new Map<string, Keberangkatan[]>();

    // First pass: register root parents vs child split packages
    keberangkatanList.forEach((k) => {
      const parentId = k.parentKeberangkatanId;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(k);
      } else {
        parentMap.set(k.id, k);
      }
    });

    // Also handle packages sharing same paketGrupId if parentId wasn't explicitly saved
    keberangkatanList.forEach((k) => {
      if (!k.parentKeberangkatanId && k.paketGrupId) {
        const siblings = keberangkatanList.filter(
          (other) => other.paketGrupId === k.paketGrupId && other.id !== k.id
        );
        if (siblings.length > 0) {
          const groupParent =
            keberangkatanList.find(
              (other) =>
                other.paketGrupId === k.paketGrupId &&
                !other.parentKeberangkatanId &&
                !other.splitReason
            ) || siblings[0];

          if (groupParent && groupParent.id !== k.id) {
            if (!childrenMap.has(groupParent.id)) {
              childrenMap.set(groupParent.id, []);
            }
            if (!childrenMap.get(groupParent.id)!.some((c) => c.id === k.id)) {
              childrenMap.get(groupParent.id)!.push(k);
            }
            parentMap.delete(k.id);
          }
        }
      }
    });

    const result: { parent: Keberangkatan; children: Keberangkatan[] }[] = [];

    parentMap.forEach((parent) => {
      const children = childrenMap.get(parent.id) || [];
      result.push({ parent, children });
    });

    return result;
  }, [keberangkatanList]);

  // Jamaah belonging to the active package
  const activePackageJamaah = useMemo(() => {
    if (!activePackage) return [];
    const jamaahIds = new Set(activePackage.jamaahIds || []);
    // Also include jamaah whose groupId belongs to a registration group under this package
    const packageGroupIds = new Set(
      groups.filter((g) => g.paketKeberangkatanId === activePackage.id).map((g) => g.id)
    );

    return allJamaah.filter(
      (j) => (jamaahIds.has(j.id) || packageGroupIds.has(j.groupId)) && j.status !== "batal"
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
      const kotaStr = (j.kota || "").toLowerCase();
      return sotName.includes(q) || regId.includes(q) || noId.includes(q) || kotaStr.includes(q);
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

  // Reset selection when package or search query changes
  useEffect(() => {
    setSelectedJamaahIds([]);
  }, [selectedKeberangkatan, searchQuery]);

  const isAllSelected = useMemo(() => {
    if (filteredActiveJamaah.length === 0) return false;
    return filteredActiveJamaah.every((j: any) => selectedJamaahIds.includes(j.id));
  }, [filteredActiveJamaah, selectedJamaahIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedJamaahIds([]);
    } else {
      setSelectedJamaahIds(filteredActiveJamaah.map((j: any) => j.id));
    }
  };

  const toggleSelectRow = useCallback((id: string) => {
    // Find the rombongan group containing this jamaahId
    const targetGroup = groupedJamaahList.find((group) =>
      group.members.some((m: any) => m.id === id)
    );

    const groupMemberIds = targetGroup
      ? targetGroup.members.map((m: any) => m.id)
      : [id];

    setSelectedJamaahIds((prev) => {
      const isGroupSelected = groupMemberIds.every((memberId) => prev.includes(memberId));
      if (isGroupSelected) {
        // Deselect all members of this rombongan group
        return prev.filter((memberId) => !groupMemberIds.includes(memberId));
      } else {
        // Select all members of this rombongan group
        const newSet = new Set([...prev, ...groupMemberIds]);
        return Array.from(newSet);
      }
    });
  }, [groupedJamaahList]);

  async function handleBulkDeleteJamaah() {
    if (selectedJamaahIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/jamaah/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedJamaahIds, mode: bulkDeleteMode }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBulkDeleteModalOpen(false);
        setSelectedJamaahIds([]);
        useOperationalStore.getState().setIsLoaded(false);
        await loadAllData();
        router.refresh();
      } else {
        alert(json.message || "Gagal menghapus jamaah terpilih");
      }
    } catch (err) {
      console.error("[handleBulkDeleteJamaah] Error:", err);
      alert("Terjadi kesalahan sistem saat menghapus jamaah sekaligus");
    } finally {
      setIsBulkDeleting(false);
    }
  }



  // ── Excel Import Parsing & Execution ────────────────────────

  async function handleExcelFileChange(file: File) {
    setExcelFile(file);
    setParsingExcel(true);
    setExcelPreviewRows([]);

    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        setParsingExcel(false);
        return;
      }

      const colMap: Record<string, number> = {};

      // 1. Detect headers dynamically on row 1
      const headerRow = worksheet.getRow(1);
      if (headerRow && headerRow.values) {
        (headerRow.values as any[]).forEach((cellVal, colIdx) => {
          if (!cellVal) return;
          const str = String(typeof cellVal === "object" && cellVal.text ? cellVal.text : cellVal)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

          if (/nama/i.test(str) && !colMap.nama) colMap.nama = colIdx;
          else if (/nopaspor|paspor|passport/i.test(str) && !colMap.noPaspor) colMap.noPaspor = colIdx;
          else if (/dikeluarkan|tglkeluar|issue/i.test(str) && !colMap.tglDikeluarkan) colMap.tglDikeluarkan = colIdx;
          else if (/tglhabis|masaberlaku|expir/i.test(str) && !colMap.tglHabis) colMap.tglHabis = colIdx;
          else if (/kotapaspor|placeissue/i.test(str) && !colMap.kotaPaspor) colMap.kotaPaspor = colIdx;
          else if (/hotelmakkah|mekkah|makkah/i.test(str) && !colMap.hotelMekkah) colMap.hotelMekkah = colIdx;
          else if (/hotelmadinah|madinah|medina/i.test(str) && !colMap.hotelMadinah) colMap.hotelMadinah = colIdx;
          else if (/kamar|room/i.test(str) && !colMap.kamar) colMap.kamar = colIdx;
          else if (/jk|kelamin|sex|gender/i.test(str) && !colMap.jenisKelamin) colMap.jenisKelamin = colIdx;
          else if (/tempatlahir|pob/i.test(str) && !colMap.tempatLahir) colMap.tempatLahir = colIdx;
          else if (/tgllahir|tanggallahir|dob/i.test(str) && !colMap.tanggalLahir) colMap.tanggalLahir = colIdx;
          else if (/umur|age/i.test(str) && !colMap.umur) colMap.umur = colIdx;
          else if (/menikah|marital/i.test(str) && !colMap.statusMenikah) colMap.statusMenikah = colIdx;
          else if (/telp|hp|phone|wa/i.test(str) && !colMap.noTelp) colMap.noTelp = colIdx;
          else if (/kotakab|kota/i.test(str) && !colMap.kota) colMap.kota = colIdx;
          else if (/provinsi|pulau|prov/i.test(str) && !colMap.provinsi) colMap.provinsi = colIdx;
          else if (/alamat|address/i.test(str) && !colMap.alamat) colMap.alamat = colIdx;
          else if (/rombongan|keluarga|group/i.test(str) && !colMap.rombongan) colMap.rombongan = colIdx;
          else if (/nojamaah|urut/i.test(str) && !colMap.noJamaah) colMap.noJamaah = colIdx;
          else if (/idregister|register/i.test(str) && !colMap.idRegister) colMap.idRegister = colIdx;
          else if (/noid|nik/i.test(str) && !colMap.noId) colMap.noId = colIdx;
          else if (/jenisid|identitas/i.test(str) && !colMap.jenisIdentitas) colMap.jenisIdentitas = colIdx;
        });
      }

      const parsedRows: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const values = row.values as any[];
        if (!values || values.length < 2) return;

        const getValByKey = (key: string, defaultIdx: number) => {
          const idx = colMap[key] ?? defaultIdx;
          const cell = values[idx];
          if (cell === null || cell === undefined) return "";
          if (typeof cell === "object" && cell.text) return String(cell.text).trim();
          if (typeof cell === "object" && cell.result) return String(cell.result).trim();
          return String(cell).trim();
        };

        let rawNama = getValByKey("nama", 6);
        // Fallback search across common columns if header wasn't mapped
        if (!rawNama) {
          rawNama = getValByKey("", 6) || getValByKey("", 4) || getValByKey("", 5) || getValByKey("", 3);
        }

        const rombongan = getValByKey("rombongan", 1);
        const noId = getValByKey("noId", 4);
        const noPaspor = getValByKey("noPaspor", 7);

        // Skip completely empty lines
        if (!rawNama && !noId && !noPaspor && !rombongan) return;

        const finalNama = rawNama || `Jamaah ${parsedRows.length + 1}`;
        const tglDikeluarkan = getValByKey("tglDikeluarkan", 8);
        const tglHabis = getValByKey("tglHabis", 9);
        const kotaPaspor = getValByKey("kotaPaspor", 10);
        const hotelMekkah = getValByKey("hotelMekkah", 11);
        const hotelMadinah = getValByKey("hotelMadinah", 12);
        const kamar = getValByKey("kamar", 13);
        const jenisKelamin = getValByKey("jenisKelamin", 14);
        const tempatLahir = getValByKey("tempatLahir", 15);
        const tanggalLahir = getValByKey("tanggalLahir", 16);
        const umur = getValByKey("umur", 17) || calculateAge(tanggalLahir);
        const statusMenikah = getValByKey("statusMenikah", 18);
        const noTelp = getValByKey("noTelp", 19);
        const kota = getValByKey("kota", 20);
        const provinsiInput = getValByKey("provinsi", 21);
        const provinsi = provinsiInput || deriveProvinsi(provinsiInput, kota);
        const alamat = getValByKey("alamat", 22);

        parsedRows.push({
          rombongan,
          noJamaah: getValByKey("noJamaah", 2),
          idRegister: getValByKey("idRegister", 3),
          noId,
          jenisIdentitas: getValByKey("jenisIdentitas", 5),
          nama: finalNama,
          noPaspor,
          tglDikeluarkan,
          tglHabis,
          kotaPaspor,
          hotelMekkah,
          hotelMadinah,
          kamar,
          jenisKelamin,
          tempatLahir,
          tanggalLahir,
          umur,
          statusMenikah,
          noTelp,
          kota,
          provinsi,
          alamat,
        });
      });

      setExcelPreviewRows(parsedRows);
    } catch (err) {
      console.error("Failed to parse Excel file:", err);
    } finally {
      setParsingExcel(false);
    }
  }

  async function doExecuteExcelImport() {
    if (!activePackage || excelPreviewRows.length === 0) return;
    setSubmittingImport(true);

    try {
      const res = await fetch("/api/manifests/import-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keberangkatanId: activePackage.id,
          rows: excelPreviewRows,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setImportModalOpen(false);
        setExcelFile(null);
        setExcelPreviewRows([]);
        await loadAllData();
        router.refresh();
      } else {
        alert(json.message || "Gagal mengimpor data Excel");
      }
    } catch (err) {
      console.error("Failed to execute excel import:", err);
      alert("Terjadi kesalahan server saat mengimpor Excel");
    } finally {
      setSubmittingImport(false);
    }
  }

  async function handleDeleteJamaah() {
    if (!jamaahToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jamaah/${jamaahToDelete.id}?mode=${deleteMode}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setDeleteModalOpen(false);
        setJamaahToDelete(null);
        await loadAllData();
      } else {
        alert(json.message || "Gagal menghapus jamaah");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMoveGroup() {
    if (!groupToMove || !targetPaketId) return;
    setIsMoving(true);
    try {
      const res = await fetch(`/api/groups/${groupToMove.groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paketKeberangkatanId: targetPaketId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMoveModalOpen(false);
        setGroupToMove(null);
        setTargetPaketId("");
        await loadAllData();
      } else {
        alert(json.message || "Gagal memindahkan grup jamaah");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem");
    } finally {
      setIsMoving(false);
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
                if (fromSource === "paket-aktif") {
                  router.push("/admin/keberangkatan");
                } else {
                  router.push("/admin/manifest");
                }
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {fromSource === "paket-aktif" ? "Paket Aktif" : "Semua Manifest"}
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
          {activePackage && (
            <Button
              variant="secondary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              onClick={() => {
                setExcelFile(null);
                setExcelPreviewRows([]);
                setImportModalOpen(true);
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Excel Manifest
            </Button>
          )}
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
                    placeholder="Cari jamaah, NIK, paspor, kota..."
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
      {selectedKeberangkatan ? (
        activePackage ? (
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
                <div className="flex items-center gap-3">
                  {/* Select Mode / Multi Delete Button */}
                  {isSelectMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                      onClick={() => {
                        setIsSelectMode(false);
                        setSelectedJamaahIds([]);
                      }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Selesai Pilih
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                      onClick={() => setIsSelectMode(true)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      Pilih / Hapus Banyak
                    </Button>
                  )}

                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-emerald-600 dark:text-emerald-400 h-auto p-0 hover:underline"
                    onClick={() => {
                      setExcelFile(null);
                      setExcelPreviewRows([]);
                      setImportModalOpen(true);
                    }}
                  >
                    <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                    + Import Excel ke Paket Ini
                  </Button>
                  <span className="text-[11px] text-muted-foreground italic">
                    * Single Source of Truth: Nama Paspor &gt; KTP &gt; Registrasi Awal
                  </span>
                </div>
              </div>

              {/* Floating Bulk Action Bar */}
              {isSelectMode && selectedJamaahIds.length > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl shadow-sm animate-in fade-in-0 duration-200">
                  <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold">
                    <span className="bg-amber-600 text-white rounded-full min-w-[22px] h-5 px-1.5 flex items-center justify-center text-[11px] font-extrabold shadow-xs">
                      {selectedJamaahIds.length}
                    </span>
                    <span>Jamaah Terpilih (Termasuk Seluruh Anggota Rombongan)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                      onClick={() => setSelectedJamaahIds([])}
                    >
                      Batal Pilih
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm"
                      onClick={() => {
                        setBulkDeleteMode("soft");
                        setBulkDeleteConfirmText("");
                        setBulkDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus {selectedJamaahIds.length} Jamaah Terpilih
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs font-medium">
                    <thead className="bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 dark:from-stone-800 dark:via-stone-850 dark:to-stone-900 border-t border-t-white/90 dark:border-t-stone-700/60 border-b-2 border-b-stone-400/80 dark:border-b-stone-950 sticky top-0 z-10 shadow-md">
                      <tr>
                        {isSelectMode && (
                          <th className="px-2 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-10 text-center sticky left-0 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 dark:from-stone-800 dark:via-stone-850 dark:to-stone-900 z-20 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                              title={isAllSelected ? "Batal Pilih Semua" : "Pilih Semua Jamaah"}
                            />
                          </th>
                        )}
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[200px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          KELUARGA / ROMBONGAN
                        </th>
                        <th className="px-2 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          NO JAMAAH
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[100px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          ID REGISTER
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          NO ID (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-24 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          JENIS IDENTITAS (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[170px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          NAMA
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          NO PASPOR
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          TGL DIKELUARKAN
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          TGL HABIS
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          KOTA PASPOR
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          HOTEL MAKKAH
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[130px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          HOTEL MADINAH
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[120px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          KAMAR
                        </th>
                        <th className="px-2 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          JK (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          TEMPAT LAHIR (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-24 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          TGL LAHIR (*)
                        </th>
                        <th className="px-2 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          UMUR
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          STATUS MENIKAH
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[110px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          NO TELP/HP
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 min-w-[140px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          KOTA/KAB (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 border-r border-stone-300/80 dark:border-stone-700/80 w-28 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          PROVINSI (*)
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 min-w-[200px] border-r border-stone-300/80 dark:border-stone-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          ALAMAT
                        </th>
                        <th className="px-3 py-3 font-extrabold uppercase tracking-wider text-[10px] text-stone-800 dark:text-stone-100 w-24 text-center sticky right-0 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 dark:from-stone-800 dark:via-stone-850 dark:to-stone-900 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] z-20">
                          AKSI
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                      {filteredActiveJamaah.length === 0 ? (
                        <tr>
                          <td colSpan={isSelectMode ? 23 : 22} className="px-4 py-12 text-center text-stone-500">
                            <div className="space-y-3">
                              <p>Belum ada data jamaah terdaftar pada paket ini.</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setExcelFile(null);
                                  setExcelPreviewRows([]);
                                  setImportModalOpen(true);
                                }}
                              >
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                Import Data Jamaah dari File Excel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        groupedJamaahList.map((group) => {
                          const groupMergeText = formatGroupMergeLabel(group.groupObj, group.members);
                          const totalInGroup = group.members.length;

                          return group.members.map((j: any, memberIdx) => {
                            const currentNoJamaah = globalNoJamaahCounter++;
                            const isFirstInGroup = memberIdx === 0;

                            // Single Source of Truth Name & Paspor Resolution
                            const namaSot = getSingleSourceOfTruthName(j);
                            const pasporInfo = getPasporDetails(j);

                            // Flexible ID Resolution
                            const hasPaspor = Boolean(pasporInfo.noPaspor && pasporInfo.noPaspor !== "-");
                            const noId = hasPaspor ? pasporInfo.noPaspor : j.nik || "-";
                            const jenisIdentitas = hasPaspor ? "PASPOR" : j.nik ? "KTP" : "-";

                            // ID Register Format
                            const baseCode = group.groupObj?.kodeRegistrasi || j.registrationId || j.groupId || "2980";
                            const idRegister = formatIdRegister(baseCode, memberIdx, totalInGroup);

                            const tipeKamarDisplay = j.tipeKamar || (group.groupObj as any)?.roomUpgrade || "Upgrade Double";
                            const statusMenikahDisplay = j.statusMenikah || "Belum Menikah";
                            const kotaDisplay = j.kota || "JAKARTA SELATAN";
                            const provinsiDisplay = j.provinsi && j.provinsi !== "-" ? j.provinsi : deriveProvinsi(j.provinsi, j.kota);

                            return (
                              <tr
                                key={j.id}
                                className={`hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors ${
                                  selectedJamaahIds.includes(j.id) ? "bg-amber-50/60 dark:bg-amber-950/30 font-semibold" : ""
                                }`}
                              >
                                {/* CHECKBOX COL */}
                                {isSelectMode && (
                                  <td className="px-2 py-2.5 text-center border-r border-stone-200/50 dark:border-stone-800/50 sticky left-0 bg-white dark:bg-stone-900 z-10">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                      checked={selectedJamaahIds.includes(j.id)}
                                      onChange={() => toggleSelectRow(j.id)}
                                      title="Mencentang jamaah ini akan memilih seluruh anggota rombongan"
                                    />
                                  </td>
                                )}

                                {/* MERGED CELL: KELUARGA/ROMBONGAN */}
                                {isFirstInGroup && (
                                  <td
                                    rowSpan={totalInGroup}
                                    className="p-3 text-center align-middle font-bold text-[11px] bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border-r-2 border-r-amber-400 dark:border-r-amber-700 border-b border-stone-200 dark:border-stone-800 shadow-xs"
                                  >
                                    <span>{groupMergeText}</span>
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

                                {/* NO PASPOR */}
                                <td className="px-3 py-2.5 font-mono font-semibold text-stone-800 dark:text-stone-200 border-r border-stone-200/50 dark:border-stone-800/50">
                                  {pasporInfo.noPaspor}
                                </td>

                                {/* TGL DIKELUARKAN */}
                                <td className="px-3 py-2.5 font-mono text-stone-700 dark:text-stone-300 border-r border-stone-200/50 dark:border-stone-800/50">
                                  {formatDisplayDate(pasporInfo.tglDikeluarkan)}
                                </td>

                                {/* TGL HABIS */}
                                <td className="px-3 py-2.5 font-mono text-stone-700 dark:text-stone-300 border-r border-stone-200/50 dark:border-stone-800/50">
                                  {formatDisplayDate(pasporInfo.tglHabis)}
                                </td>

                                {/* KOTA PASPOR */}
                                <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 font-semibold text-stone-800 dark:text-stone-200">
                                  {pasporInfo.kotaPaspor}
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

                                {/* KOTA/KAB */}
                                <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 font-semibold text-stone-800 dark:text-stone-200">
                                  {kotaDisplay}
                                </td>

                                {/* PROVINSI */}
                                <td className="px-3 py-2.5 border-r border-stone-200/50 dark:border-stone-800/50 font-bold uppercase text-[10px] text-amber-800 dark:text-amber-300">
                                  {provinsiDisplay}
                                </td>

                                <td
                                  className="px-3 py-2.5 text-stone-600 dark:text-stone-400 max-w-[240px] truncate border-r border-stone-200/50 dark:border-stone-800/50"
                                  title={j.alamat}
                                >
                                  {j.alamat || "-"}
                                </td>

                                {/* AKSI */}
                                <td className="px-3 py-2.5 text-center sticky right-0 bg-white dark:bg-stone-900 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] border-l border-stone-200/50 dark:border-stone-800/50 z-10">
                                  <div className="flex items-center justify-center gap-2">
                                    {isFirstInGroup && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] border-stone-200/60 dark:border-stone-800/60 hover:bg-sky-50 hover:text-sky-600"
                                        title="Pindah Paket"
                                        onClick={() => {
                                          setGroupToMove(group);
                                          setTargetPaketId("");
                                          setMoveModalOpen(true);
                                        }}
                                      >
                                        <ArrowRightLeft className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] border-stone-200/60 dark:border-stone-800/60 hover:bg-red-50 hover:text-red-600"
                                      title="Hapus Jamaah"
                                      onClick={() => {
                                        setJamaahToDelete(j);
                                        setDeleteMode("soft");
                                        setDeleteConfirmText("");
                                        setDeleteModalOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
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
          /* SKELETON LOADER FOR ACTIVE PACKAGE MANIFEST VIEW */
          <div className="space-y-4 animate-pulse">
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-stone-800 rounded"></div>
                  <div className="h-6 w-72 bg-amber-500/20 rounded"></div>
                  <div className="h-4 w-96 bg-stone-800 rounded"></div>
                </div>
                <div className="flex items-center gap-3 bg-stone-800/80 rounded-xl p-3 h-16 w-64"></div>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-card p-4 space-y-3 shadow-xs">
              <div className="h-4 w-48 bg-stone-200 dark:bg-stone-800 rounded"></div>
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-10 w-full bg-stone-100 dark:bg-stone-900/60 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        /* MANIFEST CARDS VIEW (All Manifests Summary List) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              Daftar Paket Keberangkatan & Manifest
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Total {keberangkatanList.length} Paket
            </span>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Memuat data manifest...
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center">
              <ErrorState onRetry={loadAllData} message={error.message} />
            </div>
          ) : groupedPackageTree.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border rounded-xl bg-card">
              Belum ada data paket keberangkatan terdaftar.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedPackageTree.map(({ parent, children }) => {
                const parentGroupIds = new Set(
                  groups.filter((g) => g.paketKeberangkatanId === parent.id).map((g) => g.id)
                );
                const parentJamaah = allJamaah.filter(
                  (j) =>
                    (parent.jamaahIds?.includes(j.id) || parentGroupIds.has(j.groupId)) &&
                    j.status !== "batal"
                );
                const parentQuota = parent.maxSeat || parent.kuota || 45;
                const parentFilled = parentJamaah.length;
                const parentDeficit = parentQuota - parentFilled;

                return (
                  <div
                    key={parent.id}
                    className="p-4 bg-stone-950/90 border border-stone-800 rounded-2xl shadow-md space-y-3"
                  >
                    {/* PAKET UTAMA (Parent Card Header) */}
                    <div
                      onClick={() => {
                        setSelectedKeberangkatan(parent.id);
                        router.push(`/admin/manifest?paketId=${parent.id}`);
                      }}
                      className="p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 hover:border-amber-500/60 text-white rounded-xl shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                              {parent.kode}
                            </span>
                            {children.length > 0 && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <Split className="h-3 w-3" /> Paket Utama ({children.length} Pecahan)
                              </span>
                            )}
                            <StatusBadge status={parent.status} />
                          </div>
                          <h3 className="text-lg font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition-colors">
                            {parent.namaPaket || parent.paketUmroh?.namaPaket || "PAKET UMROH"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 pt-1">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                              Berangkat: <strong className="text-white">{formatDate(parent.tanggalBerangkat)}</strong>
                            </span>
                            <span className="text-stone-600">•</span>
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                              Pulang: <strong className="text-white">{formatDate(parent.tanggalPulang)}</strong>
                            </span>
                            <span className="text-stone-600">•</span>
                            <span className="flex items-center gap-1.5">
                              <Plane className="h-3.5 w-3.5 text-amber-400" />
                              Maskapai: <strong className="text-white">{parent.maskapai || "Saudia Airlines"}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Materialization Metrics Box */}
                        <div className="flex items-center gap-3 bg-stone-800/90 border border-stone-700/60 rounded-xl p-3 shrink-0 self-start md:self-auto">
                          <div className="text-center px-3 border-r border-stone-700">
                            <p className="text-[10px] text-stone-400 font-semibold uppercase">Total Pax</p>
                            <p className="text-xl font-bold text-white">{parentFilled}</p>
                          </div>
                          <div className="text-center px-3 border-r border-stone-700 min-w-[95px] flex flex-col items-center justify-center">
                            <p className="text-[10px] text-stone-400 font-semibold uppercase">Materialisasi</p>
                            {parentDeficit > 0 ? (
                              <p className="text-sm font-bold text-amber-400 mt-1">Kurang {parentDeficit} Pax</p>
                            ) : (
                              <div className="mt-1 flex items-center justify-center" title="Kuota Terpenuhi">
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                              </div>
                            )}
                          </div>
                          <div className="text-center px-3">
                            <p className="text-[10px] text-stone-400 font-semibold uppercase">Kuota Seat</p>
                            <p className="text-xl font-bold text-emerald-400">
                              {parentFilled}/{parentQuota}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PECAHAN PAKET (Children Split Packages) */}
                    {children.length > 0 && (
                      <div className="pl-4 space-y-2.5 pt-1 border-l-2 border-dashed border-amber-500/40 ml-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5 pl-1">
                          <Split className="h-3.5 w-3.5" />
                          Pecahan Paket ({children.length} Variant Split / Starting / Promo)
                        </p>
                        {children.map((child) => {
                          const childGroupIds = new Set(
                            groups.filter((g) => g.paketKeberangkatanId === child.id).map((g) => g.id)
                          );
                          const childJamaah = allJamaah.filter(
                            (j) =>
                              (child.jamaahIds?.includes(j.id) || childGroupIds.has(j.groupId)) &&
                              j.status !== "batal"
                          );
                          const childQuota = child.maxSeat || child.kuota || 45;
                          const childFilled = childJamaah.length;
                          const childDeficit = childQuota - childFilled;
                          const isPromo = child.splitReason === "promo" || !!child.promoLabel;

                          return (
                            <div
                              key={child.id}
                              onClick={() => {
                                setSelectedKeberangkatan(child.id);
                                router.push(`/admin/manifest?paketId=${child.id}`);
                              }}
                              className="p-4 bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 text-white rounded-xl shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  {isPromo ? (
                                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                      <Tag className="h-3 w-3" /> Promo: {child.promoLabel || child.splitLabel || "PROMO SPECIAL"}
                                    </span>
                                  ) : (
                                    <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                      📍 Starting Point: {child.splitLabel || child.namaPaket}
                                    </span>
                                  )}
                                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                                    {child.kode}
                                  </span>
                                  <StatusBadge status={child.status} />
                                </div>
                                <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                                  {child.namaPaket}
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                                  <span>Berangkat: <strong className="text-stone-200">{formatDate(child.tanggalBerangkat)}</strong></span>
                                  <span>•</span>
                                  <span>Maskapai: <strong className="text-stone-200">{child.maskapai || "Saudia"}</strong></span>
                                </div>
                              </div>

                              {/* Child Materialization Metrics Box */}
                              <div className="flex items-center gap-2.5 bg-stone-850/80 border border-stone-750/60 rounded-lg p-2.5 shrink-0 self-start md:self-auto">
                                <div className="text-center px-2.5 border-r border-stone-700">
                                  <p className="text-[9px] text-stone-400 font-semibold uppercase">Total Pax</p>
                                  <p className="text-base font-bold text-white">{childFilled}</p>
                                </div>
                                <div className="text-center px-2.5 border-r border-stone-700 min-w-[85px] flex flex-col items-center justify-center">
                                  <p className="text-[9px] text-stone-400 font-semibold uppercase">Materialisasi</p>
                                  {childDeficit > 0 ? (
                                    <p className="text-xs font-bold text-amber-400 mt-0.5">Kurang {childDeficit} Pax</p>
                                  ) : (
                                    <div className="mt-0.5 flex items-center justify-center" title="Kuota Terpenuhi">
                                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-center px-2.5">
                                  <p className="text-[9px] text-stone-400 font-semibold uppercase">Kuota Seat</p>
                                  <p className="text-base font-bold text-emerald-400">
                                    {childFilled}/{childQuota}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL IMPORT EXCEL MANIFEST */}
      <Modal
        open={importModalOpen}
        onClose={() => {
          if (!submittingImport) setImportModalOpen(false);
        }}
        title={`Import Excel Manifest — ${activePackage?.namaPaket || activePackage?.kode || "Paket Aktif"}`}
        description="Unggah file Excel terformat untuk memasukkan data jamaah, KOTA/KAB, PULAU & rombongan sekaligus"
        size="xl"
      >
        <div className="space-y-5">
          {/* Download Template Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                Template Excel Manifest Standard (Termasuk KOTA/KAB & PULAU)
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Gunakan template standar agar format kolom (Rombongan, Nama, Paspor/NIK, Kota, Pulau) sesuai.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white dark:bg-stone-900 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shrink-0"
              onClick={() => window.open("/api/manifests/template-excel", "_blank")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
              Download Template
            </Button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-6 text-center bg-stone-50/50 dark:bg-stone-900/50 hover:bg-stone-100/50 transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              id="excel-file-input"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleExcelFileChange(f);
              }}
            />
            <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  {excelFile ? excelFile.name : "Klik atau seret file Excel ke sini"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Format didukung: .XLSX, .XLS, .CSV
                </p>
              </div>
            </label>
          </div>

          {/* Live Preview Table */}
          {parsingExcel ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Membaca dan memproses file Excel...
            </div>
          ) : excelPreviewRows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Pratinjau Data Excel ({excelPreviewRows.length} Baris Jamaah)
                </span>
                <span className="text-stone-500 font-mono text-[11px]">
                  Siap Diimpor ke Paket
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg text-xs">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-stone-100 dark:bg-stone-900 sticky top-0 font-bold border-b text-[11px] text-stone-700 dark:text-stone-300">
                    <tr>
                      <th className="p-2 border-r">NO</th>
                      <th className="p-2 border-r min-w-[150px]">ROMBONGAN</th>
                      <th className="p-2 border-r">NAMA</th>
                      <th className="p-2 border-r">NO ID</th>
                      <th className="p-2 border-r">KOTA/KAB</th>
                      <th className="p-2 border-r">PROVINSI</th>
                      <th className="p-2">ALAMAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-stone-700 dark:text-stone-300">
                    {excelPreviewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-850">
                        <td className="p-2 text-center font-mono">{i + 1}</td>
                        <td className="p-2 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">{r.rombongan || "-"}</td>
                        <td className="p-2 font-bold text-stone-900 dark:text-white">{r.nama}</td>
                        <td className="p-2 font-mono">{r.noId || "-"}</td>
                        <td className="p-2 font-semibold text-stone-800 dark:text-stone-200">{r.kota || "JAKARTA SELATAN"}</td>
                        <td className="p-2 font-bold uppercase text-amber-800 dark:text-amber-300 text-[10px]">{r.provinsi || r.pulau || "DKI JAKARTA"}</td>
                        <td className="p-2 truncate max-w-[180px]">{r.alamat || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : excelFile && !parsingExcel && excelPreviewRows.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs text-center font-medium">
              ⚠️ Tidak ada data jamaah terdeteksi pada file ini. Pastikan file Excel berisi baris nama yang valid atau gunakan tombol <strong>Download Template</strong> di atas.
            </div>
          ) : null}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              variant="outline"
              disabled={submittingImport}
              onClick={() => setImportModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              disabled={excelPreviewRows.length === 0 || submittingImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={doExecuteExcelImport}
            >
              {submittingImport ? "Mengimpor Data..." : `Import ${excelPreviewRows.length} Jamaah Sekarang`}
            </Button>
          </div>
        </div>
      </Modal>



      {/* Delete Jamaah Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Hapus Jamaah"
        description="Pilih jenis penghapusan dan konfirmasikan tindakan Anda."
      >
        <div className="space-y-4">
          <div className="bg-stone-50 dark:bg-stone-900/30 text-foreground p-4 rounded-md text-sm border border-stone-200 dark:border-stone-800/30">
            <p><strong>Nama:</strong> {jamaahToDelete ? getSingleSourceOfTruthName(jamaahToDelete) : "-"}</p>
            <p><strong>ID Register:</strong> {jamaahToDelete?.registrationId || "-"}</p>
          </div>

          {/* Delete Mode Options */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-foreground">Pilihan Penghapusan</label>
            <div className="grid grid-cols-1 gap-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 cursor-pointer hover:bg-stone-50 transition">
                <input
                  type="radio"
                  name="deleteMode"
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  checked={deleteMode === "soft"}
                  onChange={() => setDeleteMode("soft")}
                />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">Soft Delete (Batal Berangkat)</span>
                  <span className="text-muted-foreground">Membatalkan keberangkatan jamaah (status: batal), data record tetap tersimpan di database.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 cursor-pointer hover:bg-stone-50 transition">
                <input
                  type="radio"
                  name="deleteMode"
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                  checked={deleteMode === "hard"}
                  onChange={() => setDeleteMode("hard")}
                />
                <div className="text-xs">
                  <span className="font-bold text-red-600 dark:text-red-400 block">Hard Delete (Hapus Permanen)</span>
                  <span className="text-muted-foreground">Menghapus data jamaah, file dokumen, kamar, dan invoice terkait secara permanen dari database.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Hard Delete Warnings & Input */}
          {deleteMode === "hard" && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-4 rounded-xl border border-red-200 dark:border-red-800/30 text-xs space-y-3 animate-in fade-in duration-200">
              <p className="font-bold">
                ⚠️ PERINGATAN: Tindakan ini permanen dan tidak dapat dibatalkan!
              </p>
              <div className="space-y-1.5">
                <label className="font-semibold block">Ketik &quot;HAPUS&quot; untuk mengonfirmasi:</label>
                <input
                  type="text"
                  placeholder="Ketik HAPUS"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="h-9 w-full bg-white dark:bg-stone-950 border border-red-200 dark:border-red-800/50 rounded-lg px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/50">
            <Button variant="outline" disabled={isDeleting} onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={deleteMode === "hard" ? "destructive" : "default"}
              disabled={isDeleting || (deleteMode === "hard" && deleteConfirmText !== "HAPUS")}
              className={deleteMode === "hard" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-700 hover:bg-emerald-800 text-white"}
              onClick={handleDeleteJamaah}
            >
              {isDeleting ? "Memproses..." : deleteMode === "hard" ? "Hapus Permanen" : "Batalkan Keberangkatan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Jamaah Modal */}
      <Modal
        open={bulkDeleteModalOpen}
        onClose={() => !isBulkDeleting && setBulkDeleteModalOpen(false)}
        title={`Hapus ${selectedJamaahIds.length} Jamaah Terpilih`}
        description="Pilih jenis penghapusan masal dan konfirmasikan tindakan Anda."
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-4 rounded-xl text-xs border border-amber-200 dark:border-amber-800/30 space-y-1">
            <p className="font-bold text-sm">
              ⚠️ Anda akan menghapus/membatalkan {selectedJamaahIds.length} data jamaah sekaligus.
            </p>
            <p className="text-muted-foreground text-[11px]">
              Setiap rombongan yang dicentang akan dihapus seluruh anggotanya secara bersamaan. Kuota terisi paket akan otomatis diperbarui.
            </p>
          </div>

          {/* Delete Mode Options */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-foreground">Pilihan Jenis Penghapusan</label>
            <div className="grid grid-cols-1 gap-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 cursor-pointer hover:bg-stone-50 transition">
                <input
                  type="radio"
                  name="bulkDeleteMode"
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  checked={bulkDeleteMode === "soft"}
                  onChange={() => setBulkDeleteMode("soft")}
                />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">Soft Delete (Batal Berangkat)</span>
                  <span className="text-muted-foreground">Membatalkan keberangkatan {selectedJamaahIds.length} jamaah (status: batal). Data tetap tersimpan di database.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 cursor-pointer hover:bg-stone-50 transition">
                <input
                  type="radio"
                  name="bulkDeleteMode"
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                  checked={bulkDeleteMode === "hard"}
                  onChange={() => setBulkDeleteMode("hard")}
                />
                <div className="text-xs">
                  <span className="font-bold text-red-600 dark:text-red-400 block">Hard Delete (Hapus Permanen)</span>
                  <span className="text-muted-foreground">Menghapus data {selectedJamaahIds.length} jamaah, file dokumen, kamar, dan tagihan invoice terkait secara permanen dari database.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Hard Delete Warnings & Input */}
          {bulkDeleteMode === "hard" && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-4 rounded-xl border border-red-200 dark:border-red-800/30 text-xs space-y-3 animate-in fade-in duration-200">
              <p className="font-bold">
                ⚠️ PERINGATAN: Penghapusan permanen {selectedJamaahIds.length} jamaah tidak dapat dibatalkan!
              </p>
              <div className="space-y-1.5">
                <label className="font-semibold block">Ketik &quot;HAPUS&quot; untuk mengonfirmasi:</label>
                <input
                  type="text"
                  placeholder="Ketik HAPUS"
                  value={bulkDeleteConfirmText}
                  onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                  className="h-9 w-full bg-white dark:bg-stone-950 border border-red-200 dark:border-red-800/50 rounded-lg px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/50">
            <Button variant="outline" disabled={isBulkDeleting} onClick={() => setBulkDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={bulkDeleteMode === "hard" ? "destructive" : "default"}
              disabled={isBulkDeleting || (bulkDeleteMode === "hard" && bulkDeleteConfirmText !== "HAPUS")}
              className={bulkDeleteMode === "hard" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-700 hover:bg-emerald-800 text-white"}
              onClick={handleBulkDeleteJamaah}
            >
              {isBulkDeleting ? "Memproses..." : bulkDeleteMode === "hard" ? `Hapus Permanen (${selectedJamaahIds.length})` : `Batalkan Keberangkatan (${selectedJamaahIds.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move Group Modal */}
      <Modal
        open={moveModalOpen}
        onClose={() => !isMoving && setMoveModalOpen(false)}
        title="Pindah Paket (Rombongan)"
        description="Pindahkan seluruh anggota rombongan/keluarga ke paket keberangkatan lain."
      >
        <div className="space-y-4">
          <div className="bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 p-4 rounded-md text-sm border border-sky-200 dark:border-sky-800/30">
            <p><strong>Rombongan:</strong> {groupToMove ? formatGroupMergeLabel(groupToMove.groupObj, groupToMove.members) : "-"}</p>
            <p><strong>Jumlah Anggota:</strong> {groupToMove?.members?.length || 0} Pax</p>
          </div>
          <Select
            label="Pilih Paket Tujuan"
            options={keberangkatanList
              .filter(k => k.id !== activePackage?.id && k.status === "scheduled")
              .map((k) => ({
                value: k.id,
                label: `${k.kode} — ${k.namaPaket || "-"} (${formatDateShort(k.tanggalBerangkat)})`,
              }))}
            placeholder="-- Pilih Paket Tujuan --"
            value={targetPaketId}
            onChange={(e) => setTargetPaketId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={isMoving} onClick={() => setMoveModalOpen(false)}>
              Batal
            </Button>
            <Button disabled={!targetPaketId || isMoving} onClick={handleMoveGroup}>
              {isMoving ? "Memindahkan..." : "Pindahkan Rombongan"}
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
