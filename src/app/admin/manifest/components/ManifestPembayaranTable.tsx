"use client";

import React, { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Layers,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { cn, getWhatsAppUrl } from "@/shared/lib/utils";
import type { Jamaah, RegistrationGroup, Keberangkatan } from "@/shared/types";

export interface ManifestPembayaranTableProps {
  activePackage: Keberangkatan;
  jamaahList: Jamaah[];
  groups: RegistrationGroup[];
  searchQuery: string;
}

export interface JamaahFinancialRow {
  nomorUrut: number;
  jamaahId: string;
  namaLengkap: string;
  registrationId: string;
  nomorPaspor: string;
  phone: string;
  groupId: string;
  groupName: string;

  // Blok 1: Status & Ringkasan Pembayaran
  nomorInvoice: string;
  invoiceId?: string;
  totalTagihan: number;
  totalPembayaran: number;
  kurangBayar: number;
  statusPembayaran: "LUNAS" | "CICILAN" | "BELUM BAYAR";

  // Blok 2: Detail Rincian Item Tagihan
  biayaPaket: number;
  upgradeKamar: number;
  upgradeKamarLabel?: string;
  keretaCepat: number;
  cityTourThoif: number;
  paspor: number;
  kursiRoda: number;
  ongkir: number;
  tambahanLain: number;

  // Blok 3: Detail Potongan & Diskon
  diskonPromo: number;
  potonganOngkir: number;
  totalPotongan: number;
  netTagihan: number;

  // Blok 4: Keterangan
  keterangan: string;

  // Metadata grup tambahan jika dalam group mode
  paxCount?: number;
  memberNames?: string[];
}

export function ManifestPembayaranTable({
  activePackage,
  jamaahList,
  groups,
  searchQuery,
}: ManifestPembayaranTableProps) {
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "group">("all");

  // Group lookup map
  const groupMap = useMemo(() => {
    const map = new Map<string, RegistrationGroup>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  // Compute financial rows per jamaah with Sequential Waterfall Payment Allocation (FIFO per group)
  const financialRows: JamaahFinancialRow[] = useMemo(() => {
    // 1. Group jamaah preserving package order
    const groupOrderList: string[] = [];
    const jamaahByGroup = new Map<string, Jamaah[]>();

    jamaahList.forEach((j) => {
      const gKey = j.groupId || (j.registrationId ? j.registrationId.replace(/-\d+$/, "") : j.id);
      if (!jamaahByGroup.has(gKey)) {
        groupOrderList.push(gKey);
        jamaahByGroup.set(gKey, []);
      }
      jamaahByGroup.get(gKey)!.push(j);
    });

    // 2. Ensure each group is sorted sequentially by unique member index (-1, -2, -3 ...)
    jamaahByGroup.forEach((members) => {
      members.sort((a, b) => {
        const getSeq = (j: Jamaah) => {
          const match = (j.registrationId || "").match(/-(\d+)$/);
          if (match && match[1]) return parseInt(match[1], 10);
          return parseInt(j.nomorPeserta || "0", 10) || 0;
        };
        return getSeq(a) - getSeq(b);
      });
    });

    const rows: JamaahFinancialRow[] = [];
    let overallNomorUrut = 1;

    // 3. Process each group sequentially
    groupOrderList.forEach((gKey) => {
      const members = jamaahByGroup.get(gKey) || [];
      if (members.length === 0) return;

      const g = groupMap.get(gKey) || null;
      const groupMembersCount = members.length || g?.jumlahAnggota || g?.anggotaIds?.length || 1;

      // Extract invoices & payments
      const invoices = g?.invoices || [];
      const activeInvoices = invoices.filter((inv) => inv.status !== "cancelled");
      const latestInvoice = activeInvoices.length > 0 ? activeInvoices[activeInvoices.length - 1] : null;

      const nomorInvoice =
        latestInvoice?.nomorInvoice ||
        (g?.kodeRegistrasi ? `INV/${g.kodeRegistrasi}` : `INV-${gKey}`);

      // Pass 1: Compute item-level charges and netTagihan per member
      const memberDrafts = members.map((j) => {
        // Base Package Price
        const roomType = String(g?.roomUpgrade || (j as any).tipeKamar || "quad").toLowerCase();
        const baseQuad = Number((activePackage as any).hargaQuad || activePackage.hargaPaket || 33900000);
        let biayaPaket = baseQuad;
        let upgradeKamar = 0;
        let upgradeKamarLabel = "";

        if (roomType.includes("double")) {
          const doublePrice = Number((activePackage as any).hargaDouble || baseQuad + 4000000);
          upgradeKamar = doublePrice - baseQuad;
          upgradeKamarLabel = "Upgrade Double";
        } else if (roomType.includes("triple")) {
          const triplePrice = Number((activePackage as any).hargaTriple || baseQuad + 2000000);
          upgradeKamar = triplePrice - baseQuad;
          upgradeKamarLabel = "Upgrade Triple";
        } else if (roomType.includes("single")) {
          const singlePrice = Number((activePackage as any).hargaSingle || baseQuad + 8000000);
          upgradeKamar = singlePrice - baseQuad;
          upgradeKamarLabel = "Upgrade Single";
        }

        let keretaCepat = 0;
        let cityTourThoif = 0;
        let paspor = 0;
        let kursiRoda = 0;
        let ongkir = 0;
        let tambahanLain = 0;
        let diskonPromo = 0;
        let potonganOngkir = 0;

        activeInvoices.forEach((inv) => {
          (inv.items || []).forEach((item) => {
            if (item.status === "cancelled") return;
            const text = `${item.kategori || ""} ${item.deskripsi || ""}`.toLowerCase();
            const itemVal = Math.round(Number(item.jumlah || 0) / groupMembersCount);

            if (text.includes("kereta") || text.includes("fast train") || text.includes("haramain")) {
              keretaCepat += itemVal;
            } else if (text.includes("thoif") || text.includes("taif")) {
              cityTourThoif += itemVal;
            } else if (text.includes("paspor")) {
              paspor += itemVal;
            } else if (text.includes("kursi roda") || text.includes("wheelchair")) {
              kursiRoda += itemVal;
            } else if (text.includes("ongkir") || text.includes("ongkos kirim") || text.includes("ekspedisi")) {
              if (itemVal < 0) potonganOngkir += Math.abs(itemVal);
              else ongkir += itemVal;
            } else if (text.includes("diskon") || text.includes("promo") || text.includes("voucher") || itemVal < 0) {
              diskonPromo += Math.abs(itemVal);
            } else if (text.includes("upgrade kamar") || text.includes("double") || text.includes("triple")) {
              if (upgradeKamar === 0) upgradeKamar = itemVal;
            } else if (text.includes("paket umroh") || text.includes("biaya paket")) {
              biayaPaket = itemVal;
            } else {
              if (itemVal > 0) tambahanLain += itemVal;
            }
          });
        });

        if (keretaCepat === 0 && (g?.isKeretaCepat || (j as any)?.isKeretaCepat)) {
          keretaCepat = 1250000;
        }
        if (cityTourThoif === 0 && (g?.isCityTourThoif || (j as any)?.isCityTourThoif)) {
          cityTourThoif = 750000;
        }

        const totalPotongan = diskonPromo + potonganOngkir;
        let netTagihan =
          biayaPaket +
          upgradeKamar +
          keretaCepat +
          cityTourThoif +
          paspor +
          kursiRoda +
          ongkir +
          tambahanLain -
          totalPotongan;

        if (g?.totalTagihan && g.totalTagihan > 0) {
          netTagihan = Math.round(g.totalTagihan / groupMembersCount);
        }

        const totalTagihan = netTagihan + totalPotongan;

        const sotName =
          (j.dokumen && Array.isArray(j.dokumen)
            ? j.dokumen.find((d: any) => d.jenis === "paspor")?.manualData?.namaLengkap ||
              j.dokumen.find((d: any) => d.jenis === "paspor")?.ocrData?.namaLengkap ||
              j.dokumen.find((d: any) => d.jenis === "ktp")?.manualData?.namaLengkap ||
              j.dokumen.find((d: any) => d.jenis === "ktp")?.ocrData?.namaLengkap
            : null) ||
          j.namaLengkap ||
          "-";

        const phone =
          (j as any).phone ||
          (j as any).nomorTelepon ||
          (j as any).noHp ||
          (j as any).telepon ||
          (j as any).noTelepon ||
          "";

        const keterangan =
          upgradeKamarLabel ||
          (totalPotongan > 0 ? `Diskon Rp ${totalPotongan.toLocaleString("id-ID")}` : "") ||
          "-";

        return {
          jamaah: j,
          sotName,
          phone,
          biayaPaket,
          upgradeKamar,
          upgradeKamarLabel,
          keretaCepat,
          cityTourThoif,
          paspor,
          kursiRoda,
          ongkir,
          tambahanLain,
          diskonPromo,
          potonganOngkir,
          totalPotongan,
          netTagihan,
          totalTagihan,
          keterangan,
        };
      });

      // Pass 2: Sequential Waterfall Payment Allocation (Urutan Unik -1, -2, -3...)
      const payments = g?.pembayaran || [];
      const verifiedPayments = payments.filter((p) => p.status === "verified");

      let totalGroupVerifiedCash = 0;
      verifiedPayments.forEach((p) => {
        totalGroupVerifiedCash += Number(p.jumlah || 0);
      });

      if (totalGroupVerifiedCash === 0 && g?.totalPembayaran && g.totalPembayaran > 0) {
        totalGroupVerifiedCash = Number(g.totalPembayaran);
      }

      // Check explicit direct allocations if defined
      let unallocatedPool = totalGroupVerifiedCash;
      const directAllocMap = new Map<string, number>();

      verifiedPayments.forEach((p) => {
        (p.alokasi || []).forEach((a) => {
          if (a.jamaahId && a.jumlah) {
            const current = directAllocMap.get(a.jamaahId) || 0;
            const amt = Number(a.jumlah);
            directAllocMap.set(a.jamaahId, current + amt);
            unallocatedPool -= amt;
          }
        });
      });
      unallocatedPool = Math.max(0, unallocatedPool);

      // Allocate pool sequentially to members in order of sequence (-1, -2, -3)
      const groupRows: JamaahFinancialRow[] = [];
      memberDrafts.forEach((draft) => {
        const directAlloc = directAllocMap.get(draft.jamaah.id) || 0;
        const remainingNeeded = Math.max(0, draft.netTagihan - directAlloc);
        const allocatedFromPool = Math.min(unallocatedPool, remainingNeeded);
        unallocatedPool -= allocatedFromPool;

        const totalPembayaran = directAlloc + allocatedFromPool;
        const kurangBayar = Math.max(0, draft.netTagihan - totalPembayaran);

        let statusPembayaran: "LUNAS" | "CICILAN" | "BELUM BAYAR" = "BELUM BAYAR";
        if (draft.netTagihan > 0 && kurangBayar === 0 && totalPembayaran >= draft.netTagihan) {
          statusPembayaran = "LUNAS";
        } else if (totalPembayaran > 0 && kurangBayar > 0) {
          statusPembayaran = "CICILAN";
        }

        groupRows.push({
          nomorUrut: overallNomorUrut++,
          jamaahId: draft.jamaah.id,
          namaLengkap: draft.sotName,
          registrationId:
            draft.jamaah.registrationId ||
            (g?.kodeRegistrasi ? `${g.kodeRegistrasi}-${overallNomorUrut}` : "-"),
          nomorPaspor: draft.jamaah.nomorPaspor || "-",
          phone: draft.phone,
          groupId: gKey,
          groupName: g?.namaGroup || "Grup Jamaah",
          nomorInvoice,
          invoiceId: latestInvoice?.id,
          totalTagihan: draft.totalTagihan,
          totalPembayaran,
          kurangBayar,
          statusPembayaran,
          biayaPaket: draft.biayaPaket,
          upgradeKamar: draft.upgradeKamar,
          upgradeKamarLabel: draft.upgradeKamarLabel,
          keretaCepat: draft.keretaCepat,
          cityTourThoif: draft.cityTourThoif,
          paspor: draft.paspor,
          kursiRoda: draft.kursiRoda,
          ongkir: draft.ongkir,
          tambahanLain: draft.tambahanLain,
          diskonPromo: draft.diskonPromo,
          potonganOngkir: draft.potonganOngkir,
          totalPotongan: draft.totalPotongan,
          netTagihan: draft.netTagihan,
          keterangan: draft.keterangan,
        });
      });

      // If any surplus pool remains (e.g. overpayment), credit to the last member
      if (unallocatedPool > 0 && groupRows.length > 0) {
        const last = groupRows[groupRows.length - 1];
        if (last) {
          last.totalPembayaran += unallocatedPool;
          last.kurangBayar = Math.max(0, last.netTagihan - last.totalPembayaran);
          if (last.totalPembayaran >= last.netTagihan) {
            last.statusPembayaran = "LUNAS";
          }
        }
      }

      rows.push(...groupRows);
    });

    return rows;
  }, [activePackage, jamaahList, groupMap]);

  // Group Financial Rows (Aggregated per Registration Group / PIC)
  const groupFinancialRows = useMemo(() => {
    const grouped = new Map<string, JamaahFinancialRow[]>();

    financialRows.forEach((row) => {
      const key =
        row.groupId || (row.registrationId ? row.registrationId.replace(/-\d+$/, "") : row.jamaahId);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    });

    let groupIdx = 1;
    const result: JamaahFinancialRow[] = [];

    grouped.forEach((members, gKey) => {
      if (!members || members.length === 0) return;
      const g = groupMap.get(gKey) || null;
      const picMember = members[0];
      if (!picMember) return;

      const picName = (g as any)?.namaPic || (g as any)?.namaKontak || picMember.namaLengkap;
      const picPhone = (g as any)?.nomorTelepon || (g as any)?.noHp || (g as any)?.telepon || picMember.phone;
      const groupCode =
        g?.kodeRegistrasi || (picMember.registrationId ? picMember.registrationId.replace(/-\d+$/, "") : gKey);

      // Aggregate financials across all members in this group
      const totalTagihan = members.reduce((sum, m) => sum + m.totalTagihan, 0);
      const totalPembayaran = members.reduce((sum, m) => sum + m.totalPembayaran, 0);
      const kurangBayar = Math.max(0, totalTagihan - totalPembayaran);

      let statusPembayaran: "LUNAS" | "CICILAN" | "BELUM BAYAR" = "BELUM BAYAR";
      if (totalTagihan > 0 && kurangBayar === 0 && totalPembayaran >= totalTagihan) {
        statusPembayaran = "LUNAS";
      } else if (totalPembayaran > 0 && kurangBayar > 0) {
        statusPembayaran = "CICILAN";
      }

      const biayaPaket = members.reduce((sum, m) => sum + m.biayaPaket, 0);
      const upgradeKamar = members.reduce((sum, m) => sum + m.upgradeKamar, 0);
      const keretaCepat = members.reduce((sum, m) => sum + m.keretaCepat, 0);
      const cityTourThoif = members.reduce((sum, m) => sum + m.cityTourThoif, 0);
      const paspor = members.reduce((sum, m) => sum + m.paspor, 0);
      const kursiRoda = members.reduce((sum, m) => sum + m.kursiRoda, 0);
      const ongkir = members.reduce((sum, m) => sum + m.ongkir, 0);
      const tambahanLain = members.reduce((sum, m) => sum + m.tambahanLain, 0);
      const diskonPromo = members.reduce((sum, m) => sum + m.diskonPromo, 0);
      const potonganOngkir = members.reduce((sum, m) => sum + m.potonganOngkir, 0);
      const totalPotongan = members.reduce((sum, m) => sum + m.totalPotongan, 0);
      const netTagihan = members.reduce((sum, m) => sum + m.netTagihan, 0);

      const uniqueKeterangan =
        Array.from(new Set(members.map((m) => m.keterangan).filter((k) => k && k !== "-"))).join(
          ", "
        ) || "-";

      const memberNames = members.map((m) => m.namaLengkap);

      result.push({
        nomorUrut: groupIdx++,
        jamaahId: picMember.jamaahId,
        namaLengkap: picName,
        registrationId: groupCode,
        nomorPaspor: picMember.nomorPaspor,
        phone: picPhone,
        groupId: gKey,
        groupName: g?.namaGroup || `Grup ${picName}`,
        nomorInvoice: picMember.nomorInvoice,
        invoiceId: picMember.invoiceId,
        totalTagihan,
        totalPembayaran,
        kurangBayar,
        statusPembayaran,
        biayaPaket,
        upgradeKamar,
        upgradeKamarLabel: picMember.upgradeKamarLabel,
        keretaCepat,
        cityTourThoif,
        paspor,
        kursiRoda,
        ongkir,
        tambahanLain,
        diskonPromo,
        potonganOngkir,
        totalPotongan,
        netTagihan,
        keterangan: uniqueKeterangan,
        paxCount: members.length,
        memberNames,
      });
    });

    return result;
  }, [financialRows, groupMap]);

  // Active base rows based on toggle viewMode
  const rawDisplayRows = viewMode === "group" ? groupFinancialRows : financialRows;

  // Filter by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rawDisplayRows;
    const q = searchQuery.toLowerCase().trim();
    return rawDisplayRows.filter((r) => {
      const matchBasic =
        r.namaLengkap.toLowerCase().includes(q) ||
        r.registrationId.toLowerCase().includes(q) ||
        r.nomorInvoice.toLowerCase().includes(q) ||
        r.nomorPaspor.toLowerCase().includes(q) ||
        r.statusPembayaran.toLowerCase().includes(q);

      if (matchBasic) return true;

      if (r.memberNames && Array.isArray(r.memberNames)) {
        return r.memberNames.some((m) => m.toLowerCase().includes(q));
      }

      return false;
    });
  }, [rawDisplayRows, searchQuery]);

  // Totals & KPI Metrics
  const summaryKPI = useMemo(() => {
    let totalOmset = 0;
    let totalDanaMasuk = 0;
    let totalKurangBayar = 0;
    let countLunas = 0;
    let countCicilan = 0;
    let countBelum = 0;

    let sumBiayaPaket = 0;
    let sumUpgradeKamar = 0;
    let sumKeretaCepat = 0;
    let sumThoif = 0;
    let sumPaspor = 0;
    let sumKursiRoda = 0;
    let sumOngkir = 0;
    let sumTambahan = 0;
    let sumDiskonPromo = 0;
    let sumPotonganOngkir = 0;
    let sumTotalPotongan = 0;

    filteredRows.forEach((r) => {
      totalOmset += r.netTagihan;
      totalDanaMasuk += r.totalPembayaran;
      totalKurangBayar += r.kurangBayar;

      if (r.statusPembayaran === "LUNAS") countLunas++;
      else if (r.statusPembayaran === "CICILAN") countCicilan++;
      else countBelum++;

      sumBiayaPaket += r.biayaPaket;
      sumUpgradeKamar += r.upgradeKamar;
      sumKeretaCepat += r.keretaCepat;
      sumThoif += r.cityTourThoif;
      sumPaspor += r.paspor;
      sumKursiRoda += r.kursiRoda;
      sumOngkir += r.ongkir;
      sumTambahan += r.tambahanLain;
      sumDiskonPromo += r.diskonPromo;
      sumPotonganOngkir += r.potonganOngkir;
      sumTotalPotongan += r.totalPotongan;
    });

    return {
      totalOmset,
      totalDanaMasuk,
      totalKurangBayar,
      countLunas,
      countCicilan,
      countBelum,
      sumBiayaPaket,
      sumUpgradeKamar,
      sumKeretaCepat,
      sumThoif,
      sumPaspor,
      sumKursiRoda,
      sumOngkir,
      sumTambahan,
      sumDiskonPromo,
      sumPotonganOngkir,
      sumTotalPotongan,
    };
  }, [filteredRows]);

  // Handler: WhatsApp Message Dispatch
  const handleSendWhatsApp = (row: JamaahFinancialRow) => {
    let rawPhone = row.phone.replace(/\D/g, "");
    if (!rawPhone) {
      const inputPhone = prompt(`Masukkan nomor WhatsApp untuk ${row.namaLengkap}:`, "08");
      if (!inputPhone) return;
      rawPhone = inputPhone.replace(/\D/g, "");
    }

    if (rawPhone.startsWith("0")) {
      rawPhone = "62" + rawPhone.slice(1);
    } else if (!rawPhone.startsWith("62")) {
      rawPhone = "62" + rawPhone;
    }

    const paxInfo = row.paxCount && row.paxCount > 1 ? ` (${row.paxCount} Pax)` : "";
    const memberListText =
      row.memberNames && row.memberNames.length > 1
        ? `\n• Anggota: ${row.memberNames.join(", ")}`
        : "";

    const text = `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${row.namaLengkap}${viewMode === "group" ? ` (PIC Rombongan ${row.groupName})` : ""},

Berikut rincian status tagihan & pembayaran keberangkatan Umroh Anda${paxInfo} di VTU ABADI Travel:
• Paket: ${activePackage.namaPaket || activePackage.kode}
• Kode Registrasi: ${row.registrationId}
• No. Invoice: ${row.nomorInvoice}${memberListText}
• Total Tagihan: Rp ${row.netTagihan.toLocaleString("id-ID")}
• Total Pembayaran: Rp ${row.totalPembayaran.toLocaleString("id-ID")}
• Kurang Bayar (Sisa): Rp ${row.kurangBayar.toLocaleString("id-ID")}
• Status: ${row.statusPembayaran}

Mohon konfirmasi jika ada pertanyaan. Terima kasih.
PT VAUZA TAMMA ABADI`;

    const waUrl = getWhatsAppUrl(rawPhone, text);
    window.open(waUrl, "_blank");
  };

  // Handler: Export Financial Excel with Multi-Tier Formatted Headers
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(viewMode === "group" ? "Manifest Grup" : "Manifest Jamaah");

      // Title & Meta Info
      sheet.addRow(["PT VAUZA TAMMA ABADI — SISTEM OPERASIONAL TRAVEL"]);
      sheet.addRow([
        viewMode === "group"
          ? "MASTER MANIFEST PEMBAYARAN & DETAIL RINCIAN TAGIHAN (RINGKASAN PER GRUP / PIC)"
          : "MASTER MANIFEST PEMBAYARAN & DETAIL RINCIAN ITEM TAGIHAN",
      ]);
      sheet.addRow([
        `Paket: ${activePackage.namaPaket || activePackage.kode} | Berangkat: ${activePackage.tanggalBerangkat || "-"} | Total: ${filteredRows.length} ${viewMode === "group" ? "Grup" : "Pax"}`,
      ]);
      sheet.addRow([]); // Blank line

      // Row 5: Grouped Top Header
      const groupHeaderRow = sheet.addRow([
        viewMode === "group" ? "IDENTITAS PIC / GRUP" : "IDENTITAS JAMAAH",
        "",
        "STATUS & RINGKASAN PEMBAYARAN",
        "",
        "",
        "",
        "",
        "DETAIL RINCIAN ITEM TAGIHAN",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "DETAIL POTONGAN & DISKON",
        "",
        "",
        "",
        "KETERANGAN & REKAP",
      ]);

      // Row 6: Detailed Sub Headers
      const subHeaderRow = sheet.addRow([
        "NO",
        viewMode === "group" ? "NAMA PIC / GRUP (PAX)" : "NAMA JAMAAH",
        "NO INVOICE TERAKHIR",
        "TOTAL TAGIHAN",
        "TOTAL PEMBAYARAN",
        "KURANG BAYAR",
        "STATUS PEMBAYARAN",
        "BIAYA PAKET",
        "UPGRADE KAMAR",
        "KERETA CEPAT",
        "CITY TOUR THOIF",
        "PASPOR",
        "KURSI RODA",
        "ONGKIR",
        "TAMBAHAN",
        "DISKON PROMO",
        "POTONGAN ONGKIR",
        "TOTAL POTONGAN",
        "NET TAGIHAN",
        "KETERANGAN",
      ]);

      // Merge Cells for Grouped Header (Row 5)
      sheet.mergeCells("A5:B5"); // Identitas
      sheet.mergeCells("C5:G5"); // Status & Kas
      sheet.mergeCells("H5:O5"); // Detail Item
      sheet.mergeCells("P5:S5"); // Detail Diskon
      sheet.mergeCells("T5:T5"); // Keterangan

      // Style Group Header (Row 5)
      groupHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      groupHeaderRow.alignment = { vertical: "middle", horizontal: "center" };

      // Apply distinct background colors to groups
      sheet.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }; // Slate
      sheet.getCell("C5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }; // Teal
      sheet.getCell("H5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } }; // Orange/Peach
      sheet.getCell("P5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE11D48" } }; // Rose/Pink
      sheet.getCell("T5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } }; // Slate dark

      // Style Sub Header (Row 6)
      subHeaderRow.font = { bold: true, size: 9, color: { argb: "FF1E293B" } };
      subHeaderRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      for (let c = 1; c <= 20; c++) {
        const cell = subHeaderRow.getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF475569" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      }

      // Add Data Rows
      filteredRows.forEach((r) => {
        const row = sheet.addRow([
          r.nomorUrut,
          `${r.namaLengkap} (${r.registrationId})`,
          r.nomorInvoice,
          r.totalTagihan,
          r.totalPembayaran,
          r.kurangBayar,
          r.statusPembayaran,
          r.biayaPaket,
          r.upgradeKamar || 0,
          r.keretaCepat || 0,
          r.cityTourThoif || 0,
          r.paspor || 0,
          r.kursiRoda || 0,
          r.ongkir || 0,
          r.tambahanLain || 0,
          r.diskonPromo ? -r.diskonPromo : 0,
          r.potonganOngkir ? -r.potonganOngkir : 0,
          r.totalPotongan ? -r.totalPotongan : 0,
          r.netTagihan,
          r.keterangan,
        ]);

        // Currency formatting on numeric columns
        [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].forEach((colIdx) => {
          const cell = row.getCell(colIdx);
          cell.numFmt = '"Rp "#,##0;[Red]-"Rp "#,##0;"Rp "0';
          cell.alignment = { horizontal: "right" };
        });

        row.getCell(1).alignment = { horizontal: "center" };
        row.getCell(7).alignment = { horizontal: "center" };
      });

      // Bottom Grand Total Summary Row
      const totalRow = sheet.addRow([
        "TOTAL",
        `JUMLAH: ${filteredRows.length} PAX`,
        "-",
        summaryKPI.totalOmset + summaryKPI.sumTotalPotongan,
        summaryKPI.totalDanaMasuk,
        summaryKPI.totalKurangBayar,
        `${summaryKPI.countLunas} LUNAS`,
        summaryKPI.sumBiayaPaket,
        summaryKPI.sumUpgradeKamar,
        summaryKPI.sumKeretaCepat,
        summaryKPI.sumThoif,
        summaryKPI.sumPaspor,
        summaryKPI.sumKursiRoda,
        summaryKPI.sumOngkir,
        summaryKPI.sumTambahan,
        summaryKPI.sumDiskonPromo ? -summaryKPI.sumDiskonPromo : 0,
        summaryKPI.sumPotonganOngkir ? -summaryKPI.sumPotonganOngkir : 0,
        summaryKPI.sumTotalPotongan ? -summaryKPI.sumTotalPotongan : 0,
        summaryKPI.totalOmset,
        "REKAPITULASI RESMI",
      ]);

      totalRow.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
      for (let c = 1; c <= 20; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF0F172A" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
        };
      }

      [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].forEach((colIdx) => {
        const cell = totalRow.getCell(colIdx);
        cell.numFmt = '"Rp "#,##0;[Red]-"Rp "#,##0;"Rp "0';
      });

      // Auto-fit Column Widths
      sheet.columns.forEach((col, idx) => {
        let maxLen = 14;
        if (idx === 1) maxLen = 28; // Nama
        if (idx === 2) maxLen = 22; // Invoice
        col.width = maxLen;
      });

      // Trigger Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Manifest_Pembayaran_${(activePackage.kode || "UMROH").replace(/\W+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Excel:", err);
      alert("Gagal mengunduh file Excel. Silakan coba kembali.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOP KPI FINANCIAL SUMMARY CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Omset */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-850 text-white border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Omset Paket</p>
            <p className="text-xl font-black text-amber-400 mt-1">
              Rp {summaryKPI.totalOmset.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Akumulasi Net Tagihan Jamaah</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Dana Masuk */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 text-white border border-emerald-800/50 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Dana Masuk</p>
            <p className="text-xl font-black text-emerald-300 mt-1">
              Rp {summaryKPI.totalDanaMasuk.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Kas Terverifikasi Masuk</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Sisa Kurang Bayar */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/60 to-slate-900 text-white border border-rose-800/50 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Sisa Kurang Bayar</p>
            <p className="text-xl font-black text-rose-300 mt-1">
              Rp {summaryKPI.totalKurangBayar.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Outstanding / Piutang Belum Lunas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Status Pelunasan */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-850 text-white border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Pelunasan</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-black text-emerald-400">{summaryKPI.countLunas} Lunas</span>
              <span className="text-slate-500 font-bold">•</span>
              <span className="text-lg font-black text-amber-400">{summaryKPI.countCicilan} Cicilan</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dari Total {financialRows.length} Jamaah ({groupFinancialRows.length} Rombongan)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── ACTION TOOLBAR & VIEW MODE SWITCH ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
        {/* Left: Indicator & Segmented Toggle Switch (Saklar) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Tampilan Data: <strong className="text-foreground">{filteredRows.length} {viewMode === "group" ? "Grup / PIC" : "Pax Jamaah"}</strong>
            </span>
          </div>

          {/* SAKLAR TOGGLE MODE */}
          <div className="inline-flex items-center p-0.5 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                viewMode === "all"
                  ? "bg-white dark:bg-stone-800 text-teal-800 dark:text-teal-300 shadow-xs border border-stone-200/80 dark:border-stone-700"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              )}
            >
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Semua Jamaah</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200/80 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                {financialRows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("group")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                viewMode === "group"
                  ? "bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 shadow-xs border border-stone-200/80 dark:border-stone-700"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Per Grup (PIC)</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                {groupFinancialRows.length}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Export & Print Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-8 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            {exporting
              ? "Membuat Excel..."
              : viewMode === "group"
              ? "Export Excel (Ringkasan Grup)"
              : "Export Excel (Semua Jamaah)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs text-stone-700 dark:text-stone-300"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Cetak
          </Button>
        </div>
      </div>

      {/* ── ACCOUNTING DATA TABLE WITH STICKY COLUMNS & HORIZONTAL SCROLL ─ */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[720px]">
          <table className="w-full border-collapse text-left text-xs">
            {/* ── TIER 1: GROUPED HEADER ───────────────────────────── */}
            <thead className="sticky top-0 z-30 shadow-md select-none">
              <tr className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                {/* Fixed Sticky Left Group Header (No + Nama) */}
                <th
                  colSpan={2}
                  className="bg-slate-900 border-r-2 border-r-stone-500 dark:border-r-stone-600 px-3 py-2 text-center sticky left-0 z-40 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
                >
                  {viewMode === "group" ? "IDENTITAS PIC & GRUP" : "IDENTITAS JAMAAH"}
                </th>

                {/* Status & Kas Group Header (Teal) */}
                <th
                  colSpan={5}
                  className="bg-gradient-to-r from-teal-700 to-teal-800 border-r-2 border-r-teal-500 dark:border-r-teal-400 px-3 py-2 text-center"
                >
                  STATUS &amp; RINGKASAN PEMBAYARAN
                </th>

                {/* Detail Rincian Item Tagihan Header (Peach / Orange) */}
                <th
                  colSpan={8}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 border-r-2 border-r-amber-500 dark:border-r-amber-400 px-3 py-2 text-center"
                >
                  DETAIL RINCIAN ITEM TAGIHAN
                </th>

                {/* Detail Potongan & Diskon Header (Rose / Pink) */}
                <th
                  colSpan={4}
                  className="bg-gradient-to-r from-rose-700 to-rose-800 border-r-2 border-r-rose-500 dark:border-r-rose-400 px-3 py-2 text-center"
                >
                  DETAIL POTONGAN &amp; DISKON
                </th>

                {/* Keterangan */}
                <th
                  colSpan={1}
                  className="bg-slate-900 border-r border-r-slate-700 px-3 py-2 text-center"
                >
                  KETERANGAN
                </th>

                {/* Aksi Group Header (Sticky Right) */}
                <th
                  colSpan={1}
                  className="bg-slate-900 px-2 py-2 text-center sticky right-0 z-40 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.3)] border-l-2 border-l-stone-500 dark:border-l-stone-600"
                >
                  AKSI
                </th>
              </tr>

              {/* ── TIER 2: SUB-COLUMNS HEADER ──────────────────────── */}
              <tr className="bg-stone-100 dark:bg-stone-900 text-[10px] font-bold text-stone-800 dark:text-stone-200 border-b-2 border-b-stone-400 dark:border-b-stone-700 uppercase tracking-tight">
                {/* Sticky Left: No */}
                <th className="px-2 py-2.5 text-center w-[48px] min-w-[48px] max-w-[48px] border-r border-r-stone-200 dark:border-r-stone-800 sticky left-0 z-40 bg-stone-100 dark:bg-stone-900">
                  NO
                </th>

                {/* Sticky Left: Nama Jamaah / PIC */}
                <th className="px-3 py-2.5 min-w-[220px] max-w-[280px] border-r-2 border-r-stone-400 dark:border-r-stone-600 sticky left-[48px] z-40 bg-stone-100 dark:bg-stone-900 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]">
                  {viewMode === "group" ? "NAMA PIC & GRUP" : "NAMA JAMAAH"}
                </th>

                {/* Group 1: Status & Kas Sub-columns */}
                <th className="px-3 py-2.5 min-w-[140px] border-r border-r-stone-200 dark:border-r-stone-800">NO INVOICE TERAKHIR</th>
                <th className="px-3 py-2.5 min-w-[125px] text-right border-r border-r-stone-200 dark:border-r-stone-800">TOTAL TAGIHAN</th>
                <th className="px-3 py-2.5 min-w-[125px] text-right border-r border-r-stone-200 dark:border-r-stone-800">TOTAL PEMBAYARAN</th>
                <th className="px-3 py-2.5 min-w-[120px] text-right border-r border-r-stone-200 dark:border-r-stone-800">KURANG BAYAR</th>
                <th className="px-3 py-2.5 min-w-[110px] text-center border-r-2 border-r-teal-600 dark:border-r-teal-500">STATUS PEMBAYARAN</th>

                {/* Group 2: Detail Item Tagihan Sub-columns */}
                <th className="px-3 py-2.5 min-w-[120px] text-right border-l-2 border-l-teal-600 dark:border-l-teal-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">BIAYA PAKET</th>
                <th className="px-3 py-2.5 min-w-[110px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">UPGRADE</th>
                <th className="px-3 py-2.5 min-w-[105px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">KERETA CEPAT</th>
                <th className="px-3 py-2.5 min-w-[105px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">THOIF</th>
                <th className="px-3 py-2.5 min-w-[95px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">PASPOR</th>
                <th className="px-3 py-2.5 min-w-[95px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">KURSI RODA</th>
                <th className="px-3 py-2.5 min-w-[90px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">ONGKIR</th>
                <th className="px-3 py-2.5 min-w-[95px] text-right border-r-2 border-r-amber-600 dark:border-r-amber-500 bg-amber-50/50 dark:bg-amber-950/20">TAMBAHAN</th>

                {/* Group 3: Detail Diskon Sub-columns */}
                <th className="px-3 py-2.5 min-w-[105px] text-right border-l-2 border-l-amber-600 dark:border-l-amber-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20">DISKON PROMO</th>
                <th className="px-3 py-2.5 min-w-[110px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20">POTONGAN ONGKIR</th>
                <th className="px-3 py-2.5 min-w-[115px] text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-bold">TOTAL POTONGAN</th>
                <th className="px-3 py-2.5 min-w-[120px] text-right border-r-2 border-r-rose-600 dark:border-r-rose-500 bg-rose-50/70 dark:bg-rose-950/30 font-black text-stone-900 dark:text-white">NET TAGIHAN</th>

                {/* Regular Scrolling: Keterangan */}
                <th className="px-3 py-2.5 min-w-[150px] border-l-2 border-l-rose-600 dark:border-l-rose-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-stone-100 dark:bg-stone-900 font-sans">
                  KETERANGAN
                </th>

                {/* Sticky Right: Aksi */}
                <th className="px-2 py-2.5 w-[80px] min-w-[80px] max-w-[80px] text-center sticky right-0 z-40 bg-stone-100 dark:bg-stone-900 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.12)] border-l-2 border-l-stone-400 dark:border-l-stone-600">
                  AKSI
                </th>
              </tr>
            </thead>

            {/* ── TABLE BODY ───────────────────────────────────────── */}
            <tbody className="font-mono text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={21} className="py-12 text-center text-muted-foreground font-sans text-xs">
                    Tidak ditemukan data pembayaran yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, rowIdx) => {
                  const isEven = rowIdx % 2 === 0;
                  // 100% Solid opaque backgrounds for sticky columns to prevent see-through when scrolling
                  const stickyCellBg = isEven ? "bg-white dark:bg-stone-900" : "bg-slate-50 dark:bg-[#1c1917]";
                  const scrollCellBg = isEven ? "bg-white dark:bg-card" : "bg-stone-50/70 dark:bg-stone-900/40";

                  // Group boundary detection: identify the last member of each registration group/family (in all mode)
                  const nextRow = filteredRows[rowIdx + 1];
                  const currentGroupKey = r.groupId || (r.registrationId ? r.registrationId.replace(/-\d+$/, "") : r.jamaahId);
                  const nextGroupKey = nextRow ? (nextRow.groupId || (nextRow.registrationId ? nextRow.registrationId.replace(/-\d+$/, "") : nextRow.jamaahId)) : null;
                  const isLastInGroup = viewMode === "all" && currentGroupKey !== nextGroupKey;

                  // Bright, high-contrast separator line between different registration groups
                  const rowBorderClass = isLastInGroup
                    ? "border-b-[2.5px] border-b-amber-500 dark:border-b-amber-400 shadow-[0_1px_0_rgba(245,158,11,0.25)]"
                    : "border-b border-b-stone-200 dark:border-b-stone-800";

                  return (
                    <tr key={r.jamaahId} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/60 transition-colors group">
                      {/* Sticky Left: No (100% Solid Opaque) */}
                      <td className={cn("px-2 py-2.5 text-center font-bold text-stone-600 dark:text-stone-400 border-r border-r-stone-200 dark:border-r-stone-800 sticky left-0 z-20 w-[48px] min-w-[48px] max-w-[48px]", stickyCellBg, rowBorderClass)}>
                        {r.nomorUrut}
                      </td>

                      {/* Sticky Left: Nama Jamaah / PIC (100% Solid Opaque, locked offset at left-[48px]) */}
                      <td className={cn("px-3 py-2.5 border-r-2 border-r-stone-400 dark:border-r-stone-600 sticky left-[48px] z-20 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] min-w-[220px] max-w-[280px]", stickyCellBg, rowBorderClass)}>
                        {viewMode === "group" ? (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-sans font-black text-stone-900 dark:text-white leading-tight">
                                {r.namaLengkap}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                                {r.paxCount || 1} Pax
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{r.registrationId}</span>
                              <span className="text-stone-400 dark:text-stone-500">• PIC Rombongan</span>
                            </div>
                            {r.memberNames && r.memberNames.length > 1 && (
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[260px] mt-0.5" title={r.memberNames.join(", ")}>
                                Anggota: {r.memberNames.join(", ")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-sans font-bold text-stone-900 dark:text-white leading-tight">
                              {r.namaLengkap}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{r.registrationId}</span>
                              {r.nomorPaspor !== "-" && <span>• Paspor: {r.nomorPaspor}</span>}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* No Invoice */}
                      <td className={cn("px-3 py-2.5 border-r border-r-stone-200 dark:border-r-stone-800 font-sans", scrollCellBg, rowBorderClass)}>
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {r.nomorInvoice}
                        </span>
                      </td>

                      {/* Total Tagihan */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 font-medium text-stone-800 dark:text-stone-200", scrollCellBg, rowBorderClass)}>
                        Rp {r.totalTagihan.toLocaleString("id-ID")}
                      </td>

                      {/* Total Pembayaran */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 font-semibold text-emerald-700 dark:text-emerald-400", scrollCellBg, rowBorderClass)}>
                        Rp {r.totalPembayaran.toLocaleString("id-ID")}
                      </td>

                      {/* Kurang Bayar */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800", scrollCellBg, rowBorderClass)}>
                        {r.kurangBayar === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rp -</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                            Rp {r.kurangBayar.toLocaleString("id-ID")}
                          </span>
                        )}
                      </td>

                      {/* Status Pembayaran (Solid Teal Right Border) */}
                      <td className={cn("px-3 py-2.5 text-center border-r-2 border-r-teal-600 dark:border-r-teal-500 font-sans", scrollCellBg, rowBorderClass)}>
                        {r.statusPembayaran === "LUNAS" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <CheckCircle2 className="w-2.5 h-2.5" /> LUNAS
                          </span>
                        )}
                        {r.statusPembayaran === "CICILAN" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Clock className="w-2.5 h-2.5" /> CICILAN
                          </span>
                        )}
                        {r.statusPembayaran === "BELUM BAYAR" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      {/* Detail: Biaya Paket (Solid Teal Left Border) */}
                      <td className={cn("px-3 py-2.5 text-right border-l-2 border-l-teal-600 dark:border-l-teal-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        Rp {r.biayaPaket.toLocaleString("id-ID")}
                      </td>

                      {/* Detail: Upgrade Kamar */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.upgradeKamar > 0 ? (
                          <span className="text-amber-700 dark:text-amber-300 font-medium">
                            Rp {r.upgradeKamar.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Kereta Cepat */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.keretaCepat > 0 ? (
                          <span>Rp {r.keretaCepat.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Thoif */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.cityTourThoif > 0 ? (
                          <span>Rp {r.cityTourThoif.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Paspor */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.paspor > 0 ? (
                          <span>Rp {r.paspor.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Kursi Roda */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.kursiRoda > 0 ? (
                          <span>Rp {r.kursiRoda.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Ongkir */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.ongkir > 0 ? (
                          <span>Rp {r.ongkir.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Detail: Tambahan (Solid Amber Right Border) */}
                      <td className={cn("px-3 py-2.5 text-right border-r-2 border-r-amber-600 dark:border-r-amber-500 bg-amber-50/20 dark:bg-amber-950/10", rowBorderClass)}>
                        {r.tambahanLain > 0 ? (
                          <span>Rp {r.tambahanLain.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Diskon Promo (Solid Amber Left Border) */}
                      <td className={cn("px-3 py-2.5 text-right border-l-2 border-l-amber-600 dark:border-l-amber-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/20 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400", rowBorderClass)}>
                        {r.diskonPromo > 0 ? (
                          <span>-Rp {r.diskonPromo.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Potongan Ongkir */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/20 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400", rowBorderClass)}>
                        {r.potonganOngkir > 0 ? (
                          <span>-Rp {r.potonganOngkir.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Total Potongan */}
                      <td className={cn("px-3 py-2.5 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/20 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400 font-bold", rowBorderClass)}>
                        {r.totalPotongan > 0 ? (
                          <span>-Rp {r.totalPotongan.toLocaleString("id-ID")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Net Tagihan (Solid Rose Right Border) */}
                      <td className={cn("px-3 py-2.5 text-right border-r-2 border-r-rose-600 dark:border-r-rose-500 bg-rose-50/40 dark:bg-rose-950/20 font-black text-stone-900 dark:text-white", rowBorderClass)}>
                        Rp {r.netTagihan.toLocaleString("id-ID")}
                      </td>

                      {/* Regular Scroll: Keterangan (Solid Rose Left Border) */}
                      <td className={cn("px-3 py-2.5 border-l-2 border-l-rose-600 dark:border-l-rose-500 border-r border-r-stone-200 dark:border-r-stone-800 font-sans text-stone-600 dark:text-stone-300 text-[11px] min-w-[150px]", scrollCellBg, rowBorderClass)}>
                        {r.keterangan}
                      </td>

                      {/* Sticky Right: Aksi (100% Solid Opaque, locked width, clean border) */}
                      <td className={cn("px-2 py-2.5 text-center sticky right-0 z-20 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] border-l-2 border-l-stone-400 dark:border-l-stone-600 w-[80px] min-w-[80px] max-w-[80px]", stickyCellBg, rowBorderClass)}>
                        <div className="flex items-center justify-center gap-1.5">
                          {r.invoiceId ? (
                            <button
                              onClick={() => window.open(`/invoice/${r.invoiceId}`, "_blank")}
                              title="Buka Invoice PDF"
                              className="p-1 rounded-md text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-stone-400 dark:hover:text-emerald-300 dark:hover:bg-stone-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => window.open(`/admin/pembayaran/${r.groupId}`, "_blank")}
                              title="Buka Detail Pembayaran"
                              className="p-1 rounded-md text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-stone-400 dark:hover:text-emerald-300 dark:hover:bg-stone-800 transition-colors"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleSendWhatsApp(r)}
                            title="Kirim Rincian via WhatsApp"
                            className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950/80 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── TABLE FOOTER: STICKY GRAND TOTAL SUMMARY ROW ──────── */}
            {filteredRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-30 bg-stone-100 dark:bg-stone-900 border-t-2 border-t-stone-400 dark:border-t-stone-700 font-mono text-xs font-bold shadow-lg">
                <tr className="text-stone-900 dark:text-white">
                  {/* Sticky Left: Sigma */}
                  <td className="px-2 py-3 text-center border-r border-r-stone-200 dark:border-r-stone-800 sticky left-0 z-40 bg-stone-100 dark:bg-stone-900 w-[48px] min-w-[48px] max-w-[48px]">
                    ∑
                  </td>
                  {/* Sticky Left: Total Pax / Grup */}
                  <td className="px-3 py-3 border-r-2 border-r-stone-400 dark:border-r-stone-600 sticky left-[48px] z-40 bg-stone-100 dark:bg-stone-900 font-sans shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] min-w-[220px] max-w-[280px]">
                    TOTAL {filteredRows.length} {viewMode === "group" ? "GRUP" : "PAX"}
                  </td>
                  <td className="px-3 py-3 border-r border-r-stone-200 dark:border-r-stone-800 font-sans text-[11px] text-muted-foreground">-</td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 font-black text-amber-600 dark:text-amber-400">
                    Rp {(summaryKPI.totalOmset + summaryKPI.sumTotalPotongan).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 font-black text-emerald-600 dark:text-emerald-400">
                    Rp {summaryKPI.totalDanaMasuk.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 font-black text-rose-600 dark:text-rose-400">
                    Rp {summaryKPI.totalKurangBayar.toLocaleString("id-ID")}
                  </td>
                  {/* Status Pembayaran Footer (Solid Teal Right Border) */}
                  <td className="px-3 py-3 text-center border-r-2 border-r-teal-600 dark:border-r-teal-500 font-sans text-[10px]">
                    {summaryKPI.countLunas} LUNAS
                  </td>

                  {/* Detail Totals (Solid Teal Left Border) */}
                  <td className="px-3 py-3 text-right border-l-2 border-l-teal-600 dark:border-l-teal-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumBiayaPaket.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumUpgradeKamar.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumKeretaCepat.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumThoif.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumPaspor.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumKursiRoda.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumOngkir.toLocaleString("id-ID")}
                  </td>
                  {/* Detail Tambahan Footer (Solid Amber Right Border) */}
                  <td className="px-3 py-3 text-right border-r-2 border-r-amber-600 dark:border-r-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                    Rp {summaryKPI.sumTambahan.toLocaleString("id-ID")}
                  </td>

                  {/* Diskon Totals (Solid Amber Left Border) */}
                  <td className="px-3 py-3 text-right border-l-2 border-l-amber-600 dark:border-l-amber-500 border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                    -Rp {summaryKPI.sumDiskonPromo.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                    -Rp {summaryKPI.sumPotonganOngkir.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-r-stone-200 dark:border-r-stone-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-bold">
                    -Rp {summaryKPI.sumTotalPotongan.toLocaleString("id-ID")}
                  </td>
                  {/* Net Tagihan Footer (Solid Rose Right Border) */}
                  <td className="px-3 py-3 text-right border-r-2 border-r-rose-600 dark:border-r-rose-500 bg-rose-50/70 dark:bg-rose-950/30 font-black text-stone-900 dark:text-white">
                    Rp {summaryKPI.totalOmset.toLocaleString("id-ID")}
                  </td>

                  {/* Regular Scroll: Keterangan Footer (Solid Rose Left Border) */}
                  <td className="px-3 py-3 border-l-2 border-l-rose-600 dark:border-l-rose-500 border-r border-r-stone-200 dark:border-r-stone-800 font-sans text-[10px] text-muted-foreground min-w-[150px]">
                    REKAP
                  </td>

                  {/* Sticky Right: Aksi Footer (Solid Left Border) */}
                  <td className="px-2 py-3 text-center sticky right-0 z-40 bg-stone-100 dark:bg-stone-900 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.12)] border-l-2 border-l-stone-400 dark:border-l-stone-600 w-[80px] min-w-[80px] max-w-[80px]">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
