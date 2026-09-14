import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { toTitleCase } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

function formatDdMmYyyy(dateInput?: Date | string | null): string {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function calculateAge(dateInput?: Date | string | null): string {
  if (!dateInput) return "-";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return `${Math.max(0, age)} Thn`;
}

function isPromoPackage(p: any): boolean {
  if (!p) return false;
  if (p.splitReason === "promo") return true;
  if (p.splitReason === "starting_point" || p.splitReason === "starting") return false;
  if (p.promoLabel && String(p.promoLabel).trim() !== "") return true;
  if (p.kode && /_V\d+$/i.test(p.kode)) return true;
  return false;
}

function isStartingPointPackage(p: any): boolean {
  if (!p) return false;
  if (p.splitReason === "starting_point" || p.splitReason === "starting") return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paketId = searchParams.get("paketId") || searchParams.get("id") || "";

    const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
    const workbook = new ExcelJS.Workbook();

    // ────────────────────────────────────────────────────────────
    // 1. FETCH & PREPARE MASTER DATA LOOKUPS (DROPDOWNS)
    // ────────────────────────────────────────────────────────────
    let makkahHotels: string[] = [];
    let madinahHotels: string[] = [];

    try {
      const hotels = await prisma.masterHotel.findMany({
        where: { isActive: true },
        include: { city: true },
        orderBy: { name: "asc" },
      });

      makkahHotels = hotels
        .filter(
          (h) =>
            h.city?.name?.toLowerCase().includes("makkah") ||
            h.city?.name?.toLowerCase().includes("mekkah")
        )
        .map((h) => toTitleCase(h.name));

      madinahHotels = hotels
        .filter((h) => h.city?.name?.toLowerCase().includes("madinah"))
        .map((h) => toTitleCase(h.name));
    } catch (dbErr) {
      console.warn("[TEMPLATE-EXCEL] Could not query masterHotel from DB, using fallback list:", dbErr);
    }

    if (makkahHotels.length === 0) {
      makkahHotels = [
        "Safwah Tower",
        "Pullman Hotel",
        "Fairmont Hotel",
        "Dar Al Eiman Sofwah",
        "Anjum",
        "Swissotel Al Maqom",
        "Hilton Suite",
        "Makkah Towers",
        "Marwa Rotana",
        "Elaf Kinda Hotel",
        "Movenpick Hajjar Tower",
        "Grand Al Massa",
        "Snood Ajyad",
        "Al Andalus Suites",
        "Al Fajr Albadea Hotel",
        "Almiqat Ajyad Hotel",
        "Le Meridien Towers",
        "Maysan Al Maqam",
        "Prestige Al Mashaer",
        "Rayyana Grand Plaza",
        "Royal Dar Eiman",
        "Safwah Orchid",
        "Villa Hilton",
      ];
    }

    if (madinahHotels.length === 0) {
      madinahHotels = [
        "Durrat Al Eiman",
        "Al Aqeeq Madinah",
        "Al Haram Hotel",
        "Al Eiman Ohud",
        "Al Saha",
        "Arkan Al Manar",
        "Artal International Hotel",
        "Concorde Dar Al Khair",
        "Deyar Al Eiman",
        "Grand Plaza Badr Al Maqam",
        "Grand Plaza Madinah",
        "Jawharat Rasheed",
        "Mirage Al Salam",
        "Movenpick Anwar",
        "Qar Al Amshar Golden Tulip",
        "Safwat Madinah",
        "Shaza Regency Plaza Hotel",
        "Taiba Front",
      ];
    }

    const kamarOptions = [
      "QUAD (Sekamar Ber-4)",
      "TRIPLE (Sekamar Ber-3)",
      "DOUBLE (Sekamar Ber-2)",
      "UPGRADE DOUBLE",
      "UPGRADE TRIPLE",
      "QUAD FAMILY",
      "SINGLE (Sekamar Sendiri)",
    ];

    const statusPembayaranOptions = ["LUNAS", "CICILAN", "BELUM BAYAR"];
    const metodePembayaranOptions = [
      "TRANSFER BSI",
      "TRANSFER MANDIRI",
      "TRANSFER BCA",
      "CASH / TUNAI",
      "QRIS",
      "LAINNYA",
    ];
    const jkOptions = ["L", "P"];
    const jenisIdOptions = ["KTP", "PASPOR"];
    const statusMenikahOptions = ["Menikah", "Belum Menikah", "Cerai Hidup", "Cerai Mati"];

    // ────────────────────────────────────────────────────────────
    // 2. CREATE REFERENCE SHEET FOR DROPDOWN VALIDATIONS
    // ────────────────────────────────────────────────────────────
    const refSheet = workbook.addWorksheet("Data Referensi");
    refSheet.columns = [
      { header: "HOTEL MAKKAH", key: "makkah", width: 28 },
      { header: "HOTEL MADINAH", key: "madinah", width: 28 },
      { header: "TIPE KAMAR", key: "kamar", width: 26 },
      { header: "STATUS PEMBAYARAN", key: "statusBayar", width: 20 },
      { header: "METODE PEMBAYARAN", key: "metodeBayar", width: 20 },
      { header: "JK", key: "jk", width: 10 },
      { header: "JENIS IDENTITAS", key: "jenisId", width: 18 },
      { header: "STATUS MENIKAH", key: "statusMenikah", width: 18 },
    ];

    const maxRefRows = Math.max(
      makkahHotels.length,
      madinahHotels.length,
      kamarOptions.length,
      statusPembayaranOptions.length,
      metodePembayaranOptions.length,
      jkOptions.length,
      jenisIdOptions.length,
      statusMenikahOptions.length
    );

    for (let i = 0; i < maxRefRows; i++) {
      refSheet.addRow({
        makkah: makkahHotels[i] || "",
        madinah: madinahHotels[i] || "",
        kamar: kamarOptions[i] || "",
        statusBayar: statusPembayaranOptions[i] || "",
        metodeBayar: metodePembayaranOptions[i] || "",
        jk: jkOptions[i] || "",
        jenisId: jenisIdOptions[i] || "",
        statusMenikah: statusMenikahOptions[i] || "",
      });
    }

    const refHeader = refSheet.getRow(1);
    refHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    refHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }; // Slate 700
    refHeader.alignment = { vertical: "middle", horizontal: "center" };
    refHeader.height = 24;

    // ────────────────────────────────────────────────────────────
    // 3. CREATE MAIN WORKSHEET: MANIFEST JAMAAH & PEMBAYARAN
    // ────────────────────────────────────────────────────────────
    const sheet = workbook.addWorksheet("Manifest Jamaah");

    // Build installment columns (1 s/d 20)
    const cicilanColumns: { header: string; key: string; width: number }[] = [];
    for (let i = 1; i <= 20; i++) {
      cicilanColumns.push(
        { header: `TGL BAYAR ${i}`, key: `tglBayar${i}`, width: 16 },
        { header: `NOMINAL ${i} (RP)`, key: `nominal${i}`, width: 20 }
      );
    }

    sheet.columns = [
      // ── SEKSI 1: DOKUMEN & IDENTITAS JAMAAH (A s/d V, Col 1..22) ──
      { header: "KELUARGA/ROMBONGAN", key: "rombongan", width: 42 }, // Col 1 (A)
      { header: "NO JAMAAH", key: "noJamaah", width: 14 }, // Col 2 (B)
      { header: "ID REGISTER", key: "idRegister", width: 16 }, // Col 3 (C)
      { header: "NO ID (*)", key: "noId", width: 22 }, // Col 4 (D)
      { header: "JENIS IDENTITAS (*)", key: "jenisIdentitas", width: 20 }, // Col 5 (E) [Dropdown]
      { header: "NAMA", key: "nama", width: 30 }, // Col 6 (F)
      { header: "NO PASPOR", key: "noPaspor", width: 20 }, // Col 7 (G)
      { header: "TGL DIKELUARKAN", key: "tglDikeluarkan", width: 18 }, // Col 8 (H)
      { header: "TGL HABIS", key: "tglHabis", width: 18 }, // Col 9 (I)
      { header: "KOTA PASPOR", key: "kotaPaspor", width: 22 }, // Col 10 (J)
      { header: "HOTEL MAKKAH", key: "hotelMekkah", width: 26 }, // Col 11 (K) [Dropdown]
      { header: "HOTEL MADINAH", key: "hotelMadinah", width: 26 }, // Col 12 (L) [Dropdown]
      { header: "KAMAR", key: "kamar", width: 24 }, // Col 13 (M) [Dropdown]
      { header: "JK (*)", key: "jenisKelamin", width: 10 }, // Col 14 (N) [Dropdown]
      { header: "TEMPAT LAHIR (*)", key: "tempatLahir", width: 20 }, // Col 15 (O)
      { header: "TGL LAHIR (*)", key: "tanggalLahir", width: 16 }, // Col 16 (P)
      { header: "UMUR", key: "umur", width: 14 }, // Col 17 (Q)
      { header: "STATUS MENIKAH", key: "statusMenikah", width: 18 }, // Col 18 (R) [Dropdown]
      { header: "NO TELP/HP", key: "noTelp", width: 18 }, // Col 19 (S)
      { header: "KOTA/KAB (*)", key: "kota", width: 24 }, // Col 20 (T)
      { header: "PROVINSI (*)", key: "provinsi", width: 22 }, // Col 21 (U)
      { header: "ALAMAT", key: "alamat", width: 35 }, // Col 22 (V)

      // ── SEKSI 2: MANIFEST PEMBAYARAN & FINANSIAL (W s/d AI, Col 23..35) ──
      { header: "NO INVOICE", key: "noInvoice", width: 20 }, // Col 23 (W)
      { header: "BIAYA PAKET (RP)", key: "biayaPaket", width: 20 }, // Col 24 (X)
      { header: "UPGRADE KAMAR (RP)", key: "upgradeKamar", width: 22 }, // Col 25 (Y)
      { header: "UPGRADE HOTEL (RP)", key: "upgradeHotel", width: 22 }, // Col 26 (Z)
      { header: "ONGKOS JAHIT SERAGAM (RP)", key: "ongkosJahit", width: 26 }, // Col 27 (AA)
      { header: "TAMBAHAN PERLENGKAPAN (RP)", key: "addOns", width: 26 }, // Col 28 (AB)
      { header: "DISKON / POTONGAN (RP)", key: "diskon", width: 22 }, // Col 29 (AC)
      { header: "TOTAL TAGIHAN (RP)", key: "totalTagihan", width: 22 }, // Col 30 (AD)
      { header: "SUDAH BAYAR / DANA MASUK (RP)", key: "totalPembayaran", width: 28 }, // Col 31 (AE)
      { header: "SISA TAGIHAN / KURANG BAYAR (RP)", key: "kurangBayar", width: 28 }, // Col 32 (AF)
      { header: "STATUS PEMBAYARAN", key: "statusPembayaran", width: 22 }, // Col 33 (AG) [Dropdown]
      { header: "METODE PEMBAYARAN", key: "metodePembayaran", width: 22 }, // Col 34 (AH) [Dropdown]
      { header: "KETERANGAN PEMBAYARAN", key: "keteranganPembayaran", width: 35 }, // Col 35 (AI)

      // ── SEKSI 3: RIWAYAT PEMBAYARAN CICILAN 1 S/D 20 (AJ s/d BW, Col 36..75) ──
      ...cicilanColumns,
    ];

    // ────────────────────────────────────────────────────────────
    // 4. DATA ROWS: EXPORT REAL DATA OR DEFAULT TEMPLATE SAMPLE
    // ────────────────────────────────────────────────────────────
    let downloadFilename = "Template_Manifest_Jamaah_VTU.xlsx";

    if (paketId) {
      // Query package and linked packages
      const currentPkg = await prisma.keberangkatan.findUnique({
        where: { id: paketId },
      });

      if (currentPkg) {
        const cleanCode = (currentPkg.kode || "PAKET").replace(/[^a-zA-Z0-9_-]/g, "_");
        const dateStr = currentPkg.tanggalBerangkat
          ? new Date(currentPkg.tanggalBerangkat).toISOString().slice(0, 10)
          : "export";
        downloadFilename = `Manifest_${cleanCode}_${dateStr}.xlsx`;

        const isCurrentStartingPoint = isStartingPointPackage(currentPkg);
        const isCurrentPromo = isPromoPackage(currentPkg);

        let parentPkgId = currentPkg.id;
        if (!isCurrentStartingPoint && currentPkg.parentKeberangkatanId && isCurrentPromo) {
          parentPkgId = currentPkg.parentKeberangkatanId;
        }

        let packageIds: string[] = [];

        if (isCurrentStartingPoint) {
          // BEDA ITINERARY: Manifest Starting Point terpisah secara mandiri.
          // Hanya mencakup paket starting point ini dan promo children langsung di bawah starting point ini.
          const childPromos = await prisma.keberangkatan.findMany({
            where: {
              parentKeberangkatanId: currentPkg.id,
              OR: [
                { splitReason: "promo" },
                { promoLabel: { not: null } },
                { kode: { contains: "_V" } },
              ],
            },
            select: { id: true },
          });
          packageIds = [currentPkg.id, ...childPromos.map((c) => c.id)];
        } else {
          // SATU ITINERARY: Manifest Induk menyatukan seluruh varian Promo Split.
          // Eksklusikan paket pecahan split starting point (karena beda itinerary).
          const childCandidates = await prisma.keberangkatan.findMany({
            where: {
              parentKeberangkatanId: parentPkgId,
              NOT: {
                splitReason: { in: ["starting_point", "starting"] },
              },
            },
            select: { id: true, splitReason: true, promoLabel: true, kode: true },
          });

          // Pastikan hanya yang promo/bukan starting point
          const validChildPromoIds = childCandidates
            .filter((c) => !isStartingPointPackage(c))
            .map((c) => c.id);

          packageIds = Array.from(new Set([parentPkgId, ...validChildPromoIds]));
        }

        // Fetch all related package records for individual service specifications
        const allRelatedPkgs = await prisma.keberangkatan.findMany({
          where: { id: { in: packageIds } },
        });
        const packageMap = new Map<string, typeof currentPkg>();
        allRelatedPkgs.forEach((p) => packageMap.set(p.id, p));
        if (!packageMap.has(currentPkg.id)) packageMap.set(currentPkg.id, currentPkg);

        // Query all groups and members for this manifest's packageIds
        const groups = await prisma.registrationGroup.findMany({
          where: { paketKeberangkatanId: { in: packageIds } },
          include: {
            anggota: {
              where: { status: { not: "batal" } },
              include: {
                dokumen: true,
                detailPengambilan: { include: { barang: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            invoices: {
              where: { status: { not: "cancelled" } },
              include: { items: true },
              orderBy: { createdAt: "desc" },
            },
            pembayaran: {
              where: { status: "verified" },
              orderBy: { tanggal: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        // Chronological sort: match the exact entry order of the manifest table
        const sortedGroups = [...groups].sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeA - timeB;
        });

        let noUrut = 1;
        const realRows: any[] = [];

        sortedGroups.forEach((group) => {
          const members = group.anggota || [];
          if (members.length === 0) return;

          // Identify specific package where this rombongan registered
          const groupPkg = packageMap.get(group.paketKeberangkatanId) || currentPkg;
          const isGroupPromo = isPromoPackage(groupPkg);

          // Sort members within this rombongan group:
          // Ensure ketuaGroupId (PIC) is placed first at index 0, followed by nomorPeserta ASC, registrationId ASC, createdAt ASC
          const sortedMembers = [...members].sort((a, b) => {
            if (group.ketuaGroupId) {
              if (a.id === group.ketuaGroupId) return -1;
              if (b.id === group.ketuaGroupId) return 1;
            }
            const numA = parseInt((a.nomorPeserta || "0").replace(/\D/g, ""), 10) || 0;
            const numB = parseInt((b.nomorPeserta || "0").replace(/\D/g, ""), 10) || 0;
            if (numA !== numB) return numA - numB;
            const regA = a.registrationId || "";
            const regB = b.registrationId || "";
            if (regA !== regB) return regA.localeCompare(regB);
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

          const memberCount = Math.max(1, sortedMembers.length);
          const activeInvoice = group.invoices?.[0];
          const payments = group.pembayaran || [];

          // Total tagihan & pembayaran terpusat pada tingkat grup/PIC
          let groupTagihan = group.totalTagihan
            ? Number(group.totalTagihan)
            : activeInvoice?.jumlah
            ? Number(activeInvoice.jumlah)
            : groupPkg.hargaPaket * memberCount;

          const groupPembayaran =
            group.totalPembayaran !== null && group.totalPembayaran !== undefined
              ? Number(group.totalPembayaran)
              : payments.reduce((sum, p) => sum + Number(p.jumlah || 0), 0);

          let groupKurang =
            group.sisaPembayaran !== null && group.sisaPembayaran !== undefined
              ? Number(group.sisaPembayaran)
              : activeInvoice?.sisaTagihan !== null && activeInvoice?.sisaTagihan !== undefined
              ? Number(activeInvoice.sisaTagihan)
              : Math.max(0, groupTagihan - groupPembayaran);

          if (groupPembayaran >= groupTagihan && groupTagihan > 0) {
            groupKurang = 0;
          }

          let statusBayar: "LUNAS" | "CICILAN" | "BELUM BAYAR" = "BELUM BAYAR";
          if (groupKurang === 0 && groupPembayaran > 0) statusBayar = "LUNAS";
          else if (groupPembayaran > 0) statusBayar = "CICILAN";

          const primaryMetode = payments[0]?.metode ? payments[0].metode.toUpperCase().replace("_", " ") : "TRANSFER BSI";
          const defaultCatatan = statusBayar === "LUNAS" ? "Lunas Paket" : `Cicilan ${groupPembayaran > 0 ? "Berjalan" : "Belum Masuk"}`;
          const primaryCatatan = payments[0]?.catatan || (isGroupPromo && groupPkg.id !== parentPkgId ? `[Varian Promo: ${groupPkg.promoLabel || groupPkg.splitLabel || groupPkg.kode}] ${defaultCatatan}` : defaultCatatan);

          // Rombongan label: if registered in a promo package variant or specific board type, tag it
          let groupTitle = group.namaGroup || group.kodeRegistrasi;
          const isBF = (groupPkg.include || []).some((inc: string) => /breakfast only|\bbf\b|sarapan saja/i.test(inc)) || (groupPkg as any).tipeMakan === "BF";
          const boardTag = isBF ? "[BF]" : "[FB]";

          if (isGroupPromo && groupPkg.id !== parentPkgId) {
            const promoTag = groupPkg.promoLabel || groupPkg.splitLabel || groupPkg.kode;
            if (!groupTitle.toUpperCase().includes("PROMO")) {
              groupTitle = `[PROMO ${promoTag}] ${boardTag} ${groupTitle}`;
            } else if (!groupTitle.includes("[FB]") && !groupTitle.includes("[BF]")) {
              groupTitle = `${boardTag} ${groupTitle}`;
            }
          } else if (!groupTitle.includes("[FB]") && !groupTitle.includes("[BF]")) {
            groupTitle = `${boardTag} ${groupTitle}`;
          }

          // Hitung rincian item tagihan invoice (Upgrade Kamar, Upgrade Hotel, Ongkos Jahit, Tambahan Perlengkapan, Diskon)
          let invoiceUpgradeHotel = 0;
          let invoiceUpgradeKamar = 0;
          let invoiceOngkosJahit = 0;
          let invoiceTambahanPerlengkapan = 0;
          let invoiceDiskon = 0;

          (group.invoices || []).forEach((inv: any) => {
            (inv.items || []).forEach((item: any) => {
              if (item.status === "cancelled") return;
              const text = `${item.kategori || ""} ${item.deskripsi || ""}`.toLowerCase();
              const itemVal = Number(item.jumlah || 0);

              if (text.includes("upgrade hotel") || (text.includes("hotel") && (text.includes("bintang") || text.includes("upgrade")))) {
                invoiceUpgradeHotel += itemVal;
              } else if (text.includes("upgrade kamar") || text.includes("double") || text.includes("triple") || text.includes("single")) {
                invoiceUpgradeKamar += itemVal;
              } else if (text.includes("jahit") || text.includes("tailor") || text.includes("jahitan")) {
                invoiceOngkosJahit += itemVal;
              } else if (
                text.includes("perlengkapan") ||
                text.includes("equipment") ||
                text.includes("koper") ||
                text.includes("seragam") ||
                text.includes("ihram") ||
                (item.kategori || "").toLowerCase().includes("perlengkapan")
              ) {
                invoiceTambahanPerlengkapan += itemVal;
              } else if (text.includes("diskon") || text.includes("promo") || text.includes("voucher") || itemVal < 0) {
                invoiceDiskon += Math.abs(itemVal);
              } else if (!text.includes("paket umroh") && !text.includes("biaya paket")) {
                if (itemVal > 0) invoiceTambahanPerlengkapan += itemVal;
              }
            });
          });

          // Otomatisasi 100.000 / pax jika jamaah mengambil seragam jadi (bukan kain)
          if (invoiceOngkosJahit === 0) {
            const seragamJadiCount = sortedMembers.filter((m: any) => {
              const cat = (m.catatanPerlengkapan || "").toLowerCase();
              const hasNote = cat.includes("seragam jadi") || cat.includes("ongkos jahit") || cat.includes("jahit");
              const details = m.detailPengambilan || [];
              const tookJadi = details.some((dp: any) => {
                const code = (dp.code || dp.barang?.code || "").toUpperCase();
                const name = (dp.name || dp.namaBarang || dp.barang?.name || "").toLowerCase();
                const isSeragam = code.startsWith("SRG") || name.includes("seragam") || name.includes("batik");
                const isSudah = dp.status === "SUDAH";
                const uk = (dp.kodeUkuran || dp.petugas?.match(/#UK:([A-Za-z0-9_-]+)/)?.[1] || "").toUpperCase();
                return isSeragam && isSudah && uk && uk !== "KAIN";
              });
              return hasNote || tookJadi;
            }).length;

            if (seragamJadiCount > 0) {
              invoiceOngkosJahit = seragamJadiCount * 100000;
              if (!group.totalTagihan || Number(group.totalTagihan) <= groupPkg.hargaPaket * memberCount) {
                groupTagihan += invoiceOngkosJahit;
                groupKurang += invoiceOngkosJahit;
              }
            }
          }

          sortedMembers.forEach((j, memberIdx) => {
            const isPic = memberIdx === 0;

            // SOT Name: Paspor > KTP > namaLengkap
            const pasporDoc = j.dokumen?.find((d) => d.jenis === "paspor");
            const ktpDoc = j.dokumen?.find((d) => d.jenis === "ktp");
            const sotNama =
              (pasporDoc?.manualData as any)?.namaLengkap ||
              (pasporDoc?.ocrData as any)?.namaLengkap ||
              (ktpDoc?.manualData as any)?.namaLengkap ||
              (ktpDoc?.ocrData as any)?.namaLengkap ||
              j.namaLengkap;

            const noPasporVal =
              j.nomorPaspor && j.nomorPaspor !== "-"
                ? j.nomorPaspor
                : (pasporDoc?.manualData as any)?.nomorPaspor || (pasporDoc?.ocrData as any)?.nomorPaspor || "-";

            const tglTerbit =
              (pasporDoc?.manualData as any)?.tanggalTerbitPaspor ||
              (pasporDoc?.manualData as any)?.tanggalTerbit ||
              (pasporDoc?.manualData as any)?.tanggalDikeluarkan ||
              (pasporDoc?.ocrData as any)?.tanggalTerbitPaspor ||
              (pasporDoc?.ocrData as any)?.tanggalTerbit ||
              (pasporDoc?.ocrData as any)?.tanggalDikeluarkan ||
              "";

            const tglHabis =
              (pasporDoc?.manualData as any)?.tanggalKadaluarsa ||
              (pasporDoc?.manualData as any)?.tanggalHabis ||
              (pasporDoc?.ocrData as any)?.tanggalKadaluarsa ||
              (pasporDoc?.ocrData as any)?.tanggalHabis ||
              j.masaBerlakuPaspor ||
              "";

            const kotaPasporVal =
              (pasporDoc?.manualData as any)?.kotaPaspor ||
              (pasporDoc?.manualData as any)?.tempatTerbit ||
              (pasporDoc?.manualData as any)?.kantorPenerbit ||
              (pasporDoc?.ocrData as any)?.kotaPaspor ||
              (pasporDoc?.ocrData as any)?.tempatTerbit ||
              "-";

            const rowData: any = {
              rombongan: groupTitle,
              noJamaah: noUrut++,
              idRegister: j.registrationId,
              noId: j.nik || noPasporVal || "-",
              jenisIdentitas: noPasporVal && noPasporVal !== "-" ? "PASPOR" : "KTP",
              nama: sotNama,
              noPaspor: noPasporVal,
              tglDikeluarkan: formatDdMmYyyy(tglTerbit),
              tglHabis: formatDdMmYyyy(tglHabis),
              kotaPaspor: kotaPasporVal,
              hotelMekkah: j.hotelMekkah || groupPkg.hotelMekkah || currentPkg.hotelMekkah || "Safwah Tower",
              hotelMadinah: j.hotelMadinah || groupPkg.hotelMadinah || currentPkg.hotelMadinah || "Durrat Al Eiman",
              kamar: "QUAD (Sekamar Ber-4)",
              jenisKelamin: j.jenisKelamin || "L",
              tempatLahir: j.tempatLahir || "-",
              tanggalLahir: formatDdMmYyyy(j.tanggalLahir),
              umur: calculateAge(j.tanggalLahir),
              statusMenikah: "Belum Menikah",
              noTelp: j.nomorTelepon || "-",
              kota: j.kota || "JAKARTA SELATAN",
              provinsi: j.provinsi || "DKI JAKARTA",
              alamat: j.alamat || "-",

              // Finansial: Hanya terisi penuh di baris PIC grup (memberIdx === 0).
              // Anggota grup lainnya dikosongkan karena tagihan terpusat oleh PIC.
              noInvoice: isPic ? (activeInvoice?.nomorInvoice || (group.kodeRegistrasi ? `INV/${group.kodeRegistrasi}` : "")) : "",
              biayaPaket: isPic ? Math.max(0, groupTagihan - invoiceUpgradeKamar - invoiceUpgradeHotel - invoiceOngkosJahit - invoiceTambahanPerlengkapan + invoiceDiskon) : "",
              upgradeKamar: isPic ? invoiceUpgradeKamar : "",
              upgradeHotel: isPic ? invoiceUpgradeHotel : "",
              ongkosJahit: isPic ? invoiceOngkosJahit : "",
              addOns: isPic ? invoiceTambahanPerlengkapan : "",
              diskon: isPic ? invoiceDiskon : "",
              totalTagihan: isPic ? groupTagihan : "",
              totalPembayaran: isPic ? groupPembayaran : "",
              kurangBayar: isPic ? groupKurang : "",
              statusPembayaran: isPic ? statusBayar : "",
              metodePembayaran: isPic ? (primaryMetode.includes("TRANSFER") ? primaryMetode : `TRANSFER ${primaryMetode}`) : "",
              keteranganPembayaran: isPic ? primaryCatatan : "",
            };

            // Riwayat Pembayaran Cicilan 1 s/d 20:
            // Nominal penuh dialokasikan ke baris PIC, anggota grup dikosongkan
            for (let i = 1; i <= 20; i++) {
              const pay = payments[i - 1];
              if (isPic && pay) {
                rowData[`tglBayar${i}`] = formatDdMmYyyy(pay.tanggal);
                rowData[`nominal${i}`] = Number(pay.jumlah || 0);
              } else {
                rowData[`tglBayar${i}`] = "";
                rowData[`nominal${i}`] = "";
              }
            }

            realRows.push(rowData);
          });
        });

        if (realRows.length > 0) {
          sheet.addRows(realRows);
        }
      }
    }

    // If no real rows were added (template mode or empty package)
    if (sheet.rowCount <= 1) {
      const sampleRows = [
        {
          rombongan: "2 PAX UPGRADE DOUBLE + PLATINUM (38.900) 11/03/2026",
          noJamaah: 1,
          idRegister: "2980-1",
          noId: "3172045303990006",
          jenisIdentitas: "KTP",
          nama: "FARHAH KAMILAH",
          noPaspor: "X1234567",
          tglDikeluarkan: "10/01/2022",
          tglHabis: "10/01/2032",
          kotaPaspor: "JAKARTA SELATAN",
          hotelMekkah: "Safwah Tower",
          hotelMadinah: "Durrat Al Eiman",
          kamar: "UPGRADE DOUBLE",
          jenisKelamin: "P",
          tempatLahir: "JAKARTA",
          tanggalLahir: "03/03/1999",
          umur: "27 Thn",
          statusMenikah: "Belum Menikah",
          noTelp: "081234567890",
          kota: "JAKARTA SELATAN",
          provinsi: "DKI JAKARTA",
          alamat: "Jl. Tebet Raya No. 45, Jakarta Selatan",
          noInvoice: "INV/2026/03/2980",
          biayaPaket: 34900000,
          upgradeKamar: 4000000,
          upgradeHotel: 0,
          ongkosJahit: 0,
          addOns: 0,
          diskon: 0,
          totalTagihan: 38900000,
          totalPembayaran: 38900000,
          kurangBayar: 0,
          statusPembayaran: "LUNAS",
          metodePembayaran: "TRANSFER BSI",
          keteranganPembayaran: "Lunas Pelunasan via BSI",
          tglBayar1: "15/01/2026",
          nominal1: 10000000,
          tglBayar2: "10/02/2026",
          nominal2: 15000000,
          tglBayar3: "01/03/2026",
          nominal3: 13900000,
        },
        {
          rombongan: "2 PAX UPGRADE DOUBLE + PLATINUM (38.900) 11/03/2026",
          noJamaah: 2,
          idRegister: "2980-2",
          noId: "3175061707000015",
          jenisIdentitas: "KTP",
          nama: "SAMSURYA GANDI",
          noPaspor: "X7654321",
          tglDikeluarkan: "15/02/2021",
          tglHabis: "15/02/2031",
          kotaPaspor: "JAKARTA SELATAN",
          hotelMekkah: "Safwah Tower",
          hotelMadinah: "Durrat Al Eiman",
          kamar: "UPGRADE DOUBLE",
          jenisKelamin: "L",
          tempatLahir: "JAKARTA",
          tanggalLahir: "17/07/2000",
          umur: "26 Thn",
          statusMenikah: "Belum Menikah",
          noTelp: "081987654321",
          kota: "JAKARTA SELATAN",
          provinsi: "DKI JAKARTA",
          alamat: "Jl. Tebet Raya No. 45, Jakarta Selatan",
          noInvoice: "",
          biayaPaket: "",
          upgradeKamar: "",
          upgradeHotel: "",
          ongkosJahit: "",
          addOns: "",
          diskon: "",
          totalTagihan: "",
          totalPembayaran: "",
          kurangBayar: "",
          statusPembayaran: "",
          metodePembayaran: "",
          keteranganPembayaran: "",
          tglBayar1: "",
          nominal1: "",
          tglBayar2: "",
          nominal2: "",
          tglBayar3: "",
          nominal3: "",
        },
        {
          rombongan: "1 PAX QUAD FAMILY + PLATINUM (34.900) 12/03/2026",
          noJamaah: 3,
          idRegister: "2981",
          noId: "A1234567",
          jenisIdentitas: "PASPOR",
          nama: "Ahmad Zaki",
          noPaspor: "A1234567",
          tglDikeluarkan: "20/05/2023",
          tglHabis: "20/05/2033",
          kotaPaspor: "SURABAYA",
          hotelMekkah: "Safwah Tower",
          hotelMadinah: "Durrat Al Eiman",
          kamar: "QUAD FAMILY",
          jenisKelamin: "L",
          tempatLahir: "SURABAYA",
          tanggalLahir: "15/05/1992",
          umur: "34 Thn",
          statusMenikah: "Menikah",
          noTelp: "081122334455",
          kota: "KOTA SURABAYA",
          provinsi: "JAWA TIMUR",
          alamat: "Jl. Pemuda No. 12, Surabaya",
          noInvoice: "INV/2026/03/2981",
          biayaPaket: 34900000,
          upgradeKamar: 0,
          upgradeHotel: 0,
          ongkosJahit: 0,
          addOns: 0,
          diskon: 1000000,
          totalTagihan: 33900000,
          totalPembayaran: 10000000,
          kurangBayar: 23900000,
          statusPembayaran: "CICILAN",
          metodePembayaran: "TRANSFER MANDIRI",
          keteranganPembayaran: "DP Masuk Rp 10.000.000, Sisa Rp 23.900.000",
          tglBayar1: "15/02/2026",
          nominal1: 10000000,
        },
      ];
      sheet.addRows(sampleRows);
    }

    // ────────────────────────────────────────────────────────────
    // 5. DATA VALIDATION DROPDOWNS & NUMBER FORMATTING (ROWS 2..N)
    // ────────────────────────────────────────────────────────────
    const totalDataRows = Math.max(sheet.rowCount, 300);

    for (let r = 2; r <= totalDataRows; r++) {
      // E: Jenis Identitas
      sheet.getCell(`E${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$G$2:$G$${jenisIdOptions.length + 1}`],
      };

      // K: Hotel Makkah
      sheet.getCell(`K${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$A$2:$A$${makkahHotels.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Pilihan Hotel Makkah",
        error: "Pilihlah salah satu Hotel Makkah dari daftar master referensi.",
      };

      // L: Hotel Madinah
      sheet.getCell(`L${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$B$2:$B$${madinahHotels.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Pilihan Hotel Madinah",
        error: "Pilihlah salah satu Hotel Madinah dari daftar master referensi.",
      };

      // M: Tipe Kamar
      sheet.getCell(`M${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$C$2:$C$${kamarOptions.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Pilihan Tipe Kamar",
        error: "Pilihlah salah satu Tipe Kamar dari daftar master referensi.",
      };

      // N: Jenis Kelamin
      sheet.getCell(`N${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$F$2:$F$${jkOptions.length + 1}`],
      };

      // R: Status Menikah
      sheet.getCell(`R${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$H$2:$H$${statusMenikahOptions.length + 1}`],
      };

      // AG: Status Pembayaran
      sheet.getCell(`AG${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$D$2:$D$${statusPembayaranOptions.length + 1}`],
      };

      // AH: Metode Pembayaran
      sheet.getCell(`AH${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Data Referensi'!$E$2:$E$${metodePembayaranOptions.length + 1}`],
      };

      // Number Formatting for Currency columns (X s/d AF: 9 columns)
      ["X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF"].forEach((col) => {
        sheet.getCell(`${col}${r}`).numFmt = "#,##0";
      });

      // Date center alignment (H, I, P)
      sheet.getCell(`H${r}`).alignment = { horizontal: "center" };
      sheet.getCell(`I${r}`).alignment = { horizontal: "center" };
      sheet.getCell(`P${r}`).alignment = { horizontal: "center" };

      // Riwayat Pembayaran Cicilan 1 s/d 20 (Col 36..75)
      for (let i = 1; i <= 20; i++) {
        const tglCol = 35 + 2 * i - 1;
        const nomCol = 35 + 2 * i;
        sheet.getCell(r, tglCol).alignment = { horizontal: "center" };
        sheet.getCell(r, nomCol).numFmt = "#,##0";
        sheet.getCell(r, nomCol).alignment = { horizontal: "right" };
      }
    }

    // ────────────────────────────────────────────────────────────
    // 6. MULTI-COLOR HEADER STYLING (AMBER, NAVY BLUE & EMERALD)
    // ────────────────────────────────────────────────────────────
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    headerRow.height = 34;

    // Columns 1..22: Dokumen & Data Jamaah (Amber 900)
    for (let c = 1; c <= 22; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF78350F" }, // Warm Amber 900
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF451A03" } },
        left: { style: "thin", color: { argb: "FF451A03" } },
        bottom: { style: "medium", color: { argb: "FF451A03" } },
        right: { style: "thin", color: { argb: "FF451A03" } },
      };
    }

    // Columns 23..35: Manifest Pembayaran Ringkasan (Dark Navy Blue 900)
    for (let c = 23; c <= 35; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Deep Navy Blue 900
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF172554" } },
        left: { style: "thin", color: { argb: "FF172554" } },
        bottom: { style: "medium", color: { argb: "FF172554" } },
        right: { style: "thin", color: { argb: "FF172554" } },
      };
    }

    // Columns 36..75: Riwayat Pembayaran Cicilan 1 s/d 20 (Dark Emerald 800)
    for (let c = 36; c <= 75; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF065F46" }, // Dark Emerald 800
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF022C22" } },
        left: { style: "thin", color: { argb: "FF022C22" } },
        bottom: { style: "medium", color: { argb: "FF022C22" } },
        right: { style: "thin", color: { argb: "FF022C22" } },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
      },
    });
  } catch (error: any) {
    console.error("[MANIFEST TEMPLATE/EXPORT ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal membuat file Excel manifest" }, { status: 500 });
  }
}
