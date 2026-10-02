import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { getStorageAdapter } from "@/server/storage";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit
  const rlKey = rateLimitKey(request);
  const rl = checkRateLimit(rlKey, getRateLimitConfig("upload"));
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many upload requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let kodeRegistrasi = "";
    let fileBuffer: Buffer | null = null;
    let fileMime = "image/jpeg";

    let metodePembayaran = "transfer";
    let nominalDpNum = 0;
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      kodeRegistrasi = (formData.get("kodeRegistrasi") as string) || "";
      metodePembayaran = (formData.get("metodePembayaran") as string) || "transfer";
      const nominalDpRaw = (formData.get("nominalDp") as string) || "";
      nominalDpNum = parseInt(nominalDpRaw.replace(/\D/g, ""), 10) || 0;
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
        fileMime = file.type || "image/jpeg";
      } else if (
        metodePembayaran !== "cash" &&
        metodePembayaran !== "tunai" &&
        metodePembayaran !== "transfer_wa" &&
        metodePembayaran !== "wa"
      ) {
        return NextResponse.json({ success: false, message: "File bukti transfer wajib diunggah untuk metode upload manual" }, { status: 400 });
      }
    } else {
      const body = await request.json();
      kodeRegistrasi = body.kodeRegistrasi || "";
      metodePembayaran = body.metodePembayaran || "transfer";
      if (body.nominalDp) {
        nominalDpNum = parseInt(String(body.nominalDp).replace(/\D/g, ""), 10) || 0;
      }
      if (body.fileBase64) {
        const base64Data = body.fileBase64.replace(/^data:image\/\w+;base64,/, "");
        fileBuffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!kodeRegistrasi) {
      return NextResponse.json({ success: false, message: "Kode registrasi wajib diisi" }, { status: 400 });
    }

    // Find registration record
    const reg = await prisma.registrationRequest.findUnique({
      where: { kodeRegistrasi },
      include: { keberangkatan: true, members: true },
    });

    if (!reg) {
      return NextResponse.json({ success: false, message: "Kode registrasi tidak ditemukan" }, { status: 404 });
    }

    if (!nominalDpNum) {
      nominalDpNum = 5000000 * (reg.paxCount || 1);
    }

    let buktiUrl = "";
    if (fileBuffer && fileBuffer.length > 0) {
      const storagePath = `BUKTI_TRANSFER/${kodeRegistrasi}_${Date.now()}.jpg`;

      // Always save a copy to local vault for immediate local preview fallback
      try {
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        await localVault.upload(storagePath, fileBuffer, fileMime);
      } catch (localCacheErr) {
        console.warn("[payment-proof] Local cache transit warning:", localCacheErr);
      }

      const storage = getStorageAdapter();
      try {
        const { getOrCreateFolder, isGoogleDriveConfigured, provisionPackageStorage } = await import("@/server/storage/google-drive");
        let targetFolderId: string | undefined = undefined;
        if (isGoogleDriveConfigured()) {
          if (reg?.paketId) {
            try {
              const paketInfo = await prisma.keberangkatan.findUnique({ where: { id: reg.paketId } });
              const driveFolders = (paketInfo?.driveFolderIds as Record<string, string> | null) || null;
              targetFolderId = driveFolders?.pembayaran;

              if (!targetFolderId || targetFolderId === "local-mock") {
                const regStorage = await provisionPackageStorage(reg.paketId);
                targetFolderId = regStorage?.pembayaran;
              }
            } catch (hErr) {
              console.warn("[payment-proof] Package folder resolution warning:", hErr);
            }
          }

          if (!targetFolderId) {
            targetFolderId = await getOrCreateFolder("PEMBAYARAN");
          }
        }
        const uploadedFileId = await storage.upload(storagePath, fileBuffer, fileMime, targetFolderId);
        buktiUrl = await storage.getUrl(uploadedFileId || storagePath);
      } catch (uploadErr) {
        console.warn("[payment-proof] Storage upload warning, saving to local vault:", uploadErr);
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        const uploadedFileId = await localVault.upload(storagePath, fileBuffer, fileMime);
        buktiUrl = await localVault.getUrl(uploadedFileId || storagePath);
      }
    }

    // Ensure RegistrationGroup exists and link to RegistrationRequest
    let groupId = reg.groupId;
    let group = groupId
      ? await prisma.registrationGroup.findUnique({ where: { id: groupId } })
      : await prisma.registrationGroup.findFirst({ where: { kodeRegistrasi: reg.kodeRegistrasi } });

    const parts = reg.kodeRegistrasi.split("-");
    const year = parts[1] ?? new Date().getFullYear().toString();
    const seq = parts[2] ?? "00001";

    const memberList = (reg.members && reg.members.length > 0)
      ? reg.members.sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
      : [{ namaLengkap: reg.namaPerwakilan, jenisKelamin: "L", tempatLahir: "-", tanggalLahir: "2000-01-01", urutan: 1 }];

    // ADR-0021: Resolve Varian / Klaster jika ada reg.hotelUpgrade
    let rawHOpts: any[] = [];
    try {
      rawHOpts = typeof reg.keberangkatan?.hotelOptions === "string"
        ? JSON.parse(reg.keberangkatan.hotelOptions)
        : (reg.keberangkatan?.hotelOptions || []);
    } catch {}
    const hOptsList = Array.isArray(rawHOpts) ? rawHOpts : [];
    const matchedVariant = reg.hotelUpgrade
      ? hOptsList.find((o: any) =>
          o.clusterName === reg.hotelUpgrade ||
          o.variantName === reg.hotelUpgrade ||
          (o.variantName && reg.hotelUpgrade?.includes(o.variantName))
        )
      : null;

    const isTanpaPerlengkapan = matchedVariant
      ? (matchedVariant.isTanpaPerlengkapan || matchedVariant.perlengkapan === "EXCLUDE")
      : (reg.hotelUpgrade ? reg.hotelUpgrade.toLowerCase().includes("tanpa perlengkapan") : false);
    const assignedStatusPerlengkapan = isTanpaPerlengkapan ? "TANPA" : "BELUM_AMBIL";
    const assignedMekkah = matchedVariant?.hotelMekkah || reg.keberangkatan?.hotelMekkah || "";
    const assignedMadinah = matchedVariant?.hotelMadinah || reg.keberangkatan?.hotelMadinah || "";

    const createdJamaah: any[] = [];
    for (let i = 0; i < memberList.length; i++) {
      const m = memberList[i]!;
      const regId = `${reg.kodeRegistrasi}-${i + 1}`;
      let j = await prisma.jamaah.findUnique({ where: { registrationId: regId } });
      if (!j) {
        j = await prisma.jamaah.create({
          data: {
            registrationId: regId,
            groupId: group?.id || "",
            nomorPeserta: `PS/${year}/${seq}/${i + 1}`,
            namaLengkap: m.namaLengkap || (i === 0 ? reg.namaPerwakilan : `Anggota ${i + 1}`),
            namaAyah: "",
            jenisKelamin: ((m.jenisKelamin) as any) || "L",
            tempatLahir: m.tempatLahir || "-",
            tanggalLahir: m.tanggalLahir ? new Date(m.tanggalLahir) : new Date("2000-01-01"),
            nik: "",
            nomorPaspor: "",
            masaBerlakuPaspor: new Date("2030-01-01"),
            nomorTelepon: reg.nomorTelepon,
            email: reg.emailPerwakilan,
            alamat: "-",
            provinsi: "-",
            kota: "-",
            kecamatan: "-",
            kelurahan: "-",
            status: "registered",
            hotelMekkah: assignedMekkah,
            hotelMadinah: assignedMadinah,
            statusPerlengkapan: assignedStatusPerlengkapan,
            syaratDisetujui: reg.termsAccepted ?? true,
            isKeretaCepat:
              (reg as any).isKeretaCepat !== undefined
                ? Boolean((reg as any).isKeretaCepat)
                : ((Array.isArray(reg.keberangkatan?.include) && reg.keberangkatan.include.some((inc: string) => /kereta|fast train|haramain/i.test(inc))) ||
                   /kereta|fast train|haramain/i.test(reg.keberangkatan?.namaPaket || "") ||
                   (reg.keberangkatan as any)?.isAdaKeretaCepat === "ya"),
            isCityTourThoif:
              (reg as any).isCityTourThoif !== undefined
                ? Boolean((reg as any).isCityTourThoif)
                : ((Array.isArray(reg.keberangkatan?.include) && reg.keberangkatan.include.some((inc: string) => /th[ao]'?if|ta'?if|toif/i.test(inc))) ||
                   /th[ao]'?if|ta'?if|toif/i.test(reg.keberangkatan?.namaPaket || "") ||
                   (reg.keberangkatan as any)?.isAdaThoif === "ya"),
          },
        });
      }
      createdJamaah.push(j);
    }

    if (!group) {
      const ketua = createdJamaah[0];
      const pax = reg.paxCount || memberList.length || 1;
      const basePricePerPax = matchedVariant?.hargaBase ? Number(matchedVariant.hargaBase) : (reg.keberangkatan?.hargaPaket || 0);
      const basePaket = basePricePerPax * pax;

      // Calculate room upgrade surcharge if selected during registration
      let roomSurcharge = 0;
      const roomType = (reg.roomUpgrade || "").toLowerCase().trim();
      let upDouble = Number(matchedVariant?.upgradeDouble || 2500000);
      let upTriple = Number(matchedVariant?.upgradeTriple || 1500000);
      if (hOptsList[0]) {
        if (!matchedVariant && Number(hOptsList[0].upgradeDouble) > 0) upDouble = Number(hOptsList[0].upgradeDouble);
        if (!matchedVariant && Number(hOptsList[0].upgradeTriple) > 0) upTriple = Number(hOptsList[0].upgradeTriple);
      }

      if (roomType.includes("double")) {
        roomSurcharge = upDouble * pax;
      } else if (roomType.includes("triple")) {
        roomSurcharge = upTriple * pax;
      }

      const totalTagihan = basePaket + roomSurcharge;
      const pkgInc = Array.isArray(reg.keberangkatan?.include) ? reg.keberangkatan.include : [];
      const hasKC =
        (reg as any).isKeretaCepat !== undefined
          ? Boolean((reg as any).isKeretaCepat)
          : (pkgInc.some((inc: string) => /kereta|fast train|haramain/i.test(inc)) ||
             /kereta|fast train|haramain/i.test(reg.keberangkatan?.namaPaket || "") ||
             (reg.keberangkatan as any)?.isAdaKeretaCepat === "ya");

      const hasThoif =
        (reg as any).isCityTourThoif !== undefined
          ? Boolean((reg as any).isCityTourThoif)
          : (pkgInc.some((inc: string) => /th[ao]'?if|ta'?if|toif/i.test(inc)) ||
             /th[ao]'?if|ta'?if|toif/i.test(reg.keberangkatan?.namaPaket || "") ||
             (reg.keberangkatan as any)?.isAdaThoif === "ya");

      group = await prisma.registrationGroup.create({
        data: {
          kodeRegistrasi: reg.kodeRegistrasi,
          namaGroup: `GRUP ${reg.namaPerwakilan}`,
          ketuaGroupId: ketua.id,
          paketKeberangkatanId: reg.paketId,
          jumlahAnggota: reg.paxCount || memberList.length,
          totalTagihan,
          totalPembayaran: 0,
          sisaPembayaran: totalTagihan,
          status: "active",
          isKeretaCepat: hasKC,
          isCityTourThoif: hasThoif,
        },
      });

      groupId = group.id;
    }

    // Ensure all jamaah in this registration are linked to the group
    await prisma.jamaah.updateMany({
      where: { id: { in: createdJamaah.map((j) => j.id) } },
      data: { groupId: group.id },
    });

    groupId = group.id;

    const isCash = metodePembayaran === "cash" || metodePembayaran === "tunai";
    const isWa = metodePembayaran === "transfer_wa" || metodePembayaran === "wa";
    const paymentMethod = isCash ? "cash" : "transfer";
    const catatanText = isCash
      ? `DP Pendaftaran (Tunai / Bayar di Kantor) ${reg.paxCount} Pax - ${reg.namaPerwakilan} (${reg.kodeRegistrasi})`
      : isWa
      ? `DP Pendaftaran (Transfer - Bukti via WhatsApp) ${reg.paxCount} Pax - ${reg.namaPerwakilan} (${reg.kodeRegistrasi})`
      : `DP Pendaftaran (Transfer Bank) ${reg.paxCount} Pax - ${reg.namaPerwakilan} (${reg.kodeRegistrasi})`;

    // Create Pembayaran entry for the review queue
    if (groupId) {

      const existingPembayaran = await prisma.pembayaran.findFirst({
        where: { groupId },
      });

      if (!existingPembayaran) {
        await prisma.pembayaran.create({
          data: {
            groupId,
            jumlah: nominalDpNum,
            metode: paymentMethod,
            tanggal: new Date(),
            buktiUrl: buktiUrl || undefined,
            status: "pending",
            sumber: "jamaah",
            catatan: catatanText,
          },
        });
      } else {
        await prisma.pembayaran.update({
          where: { id: existingPembayaran.id },
          data: {
            metode: paymentMethod,
            catatan: catatanText,
            ...(buktiUrl ? { buktiUrl } : {}),
            jumlah: nominalDpNum > 0 ? nominalDpNum : existingPembayaran.jumlah,
          },
        });
      }
    }

    // Update Registration Request status, groupId, and catatanAdmin
    const updatedNotes = [
      reg.catatanAdmin || "",
      `[Metode DP ${metodePembayaran.toUpperCase()} at ${new Date().toISOString()}]: ${buktiUrl || (isCash ? "Bayar Tunai di Kantor" : isWa ? "Konfirmasi Bukti Transfer via WhatsApp (Menunggu Approval Admin)" : "File received")}`,
    ].filter(Boolean).join("\n");

    await prisma.registrationRequest.update({
      where: { kodeRegistrasi },
      data: {
        catatanAdmin: updatedNotes,
        status: "PENDING_REVIEW",
        ...(groupId ? { groupId } : {}),
      },
    });

    // ── Generate PDF Formulir Pendaftaran ──────────────────────────────────────
    console.log(`[payment-proof][v4] Mulai generate PDF + Drive upload untuk ${kodeRegistrasi}`);
    let pdfBuf: Buffer | null = null;
    const pdfFileName = `${kodeRegistrasi}_${reg.namaPerwakilan.replace(/[^A-Z0-9]/gi, "_")}.pdf`;
    let fullRegRecord: any = null;
    try {
      const { generateRegistrationPdf } = await import("@/server/services/registration-pdf.service");
      const { registrationRepo } = await import("@/server/repositories");
      fullRegRecord = await registrationRepo.findByKode(kodeRegistrasi);
      if (fullRegRecord) {
        let paketInfo = null;
        if (fullRegRecord.paketId) {
          try {
            paketInfo = await prisma.keberangkatan.findUnique({ where: { id: fullRegRecord.paketId } });
          } catch { /* non-blocking */ }
        }
        pdfBuf = await generateRegistrationPdf({
          registration: fullRegRecord,
          packageInfo: paketInfo as any,
          termsVersion: "1.0",
          termsAcceptedAt: fullRegRecord.termsAcceptedAt ?? fullRegRecord.createdAt,
        });
        console.log(`[payment-proof] PDF formulir berhasil digenerate: ${pdfFileName}, size: ${pdfBuf.length} bytes`);
      } else {
        console.warn(`[payment-proof] Registration ${kodeRegistrasi} tidak ditemukan di repo — skip PDF generation`);
      }
    } catch (pdfErr) {
      console.warn("[payment-proof] PDF generation warning:", pdfErr);
    }

    // ── Simpan PDF ke Storage (Drive / Transit Vault) ─────────────────────────
    if (pdfBuf) {
      try {
        const { isGoogleDriveConfigured, provisionPackageStorage, getOrCreateFormulirPendaftaranDriveFolder } = await import("@/server/storage/google-drive");
        if (isGoogleDriveConfigured()) {
          const driveStorage = getStorageAdapter();
          let targetFolderId: string | undefined = undefined;

          if (reg?.paketId) {
            const paketInfo = await prisma.keberangkatan.findUnique({ where: { id: reg.paketId } });
            const driveFolders = (paketInfo?.driveFolderIds as Record<string, string> | null) || null;
            targetFolderId = driveFolders?.formulirPendaftaran || driveFolders?.pembayaran;

            if (!targetFolderId || targetFolderId === "local-mock") {
              console.log(`[payment-proof] Package "${reg.paketId}" lacks valid folder ID in DB. Running fallback provisioning...`);
              const registry = await provisionPackageStorage(reg.paketId);
              targetFolderId = registry?.formulirPendaftaran || registry?.pembayaran;
            }
          }

          if (!targetFolderId || targetFolderId === "local-mock") {
            targetFolderId = await getOrCreateFormulirPendaftaranDriveFolder();
          }

          if (targetFolderId && targetFolderId !== "local-mock") {
            await driveStorage.upload(pdfFileName, pdfBuf, "application/pdf", targetFolderId);
            console.log(`[payment-proof] PDF formulir berhasil disimpan ke Cloud Vault: ${pdfFileName} (Folder ID: ${targetFolderId})`);
          } else {
            console.warn(`[payment-proof] Storage Notice: STORAGE_NOT_PROVISIONED. Package ID "${reg?.paketId}" lacks folder ID.`);
          }
        }
      } catch (driveErr: any) {
        console.error("[payment-proof] Cloud Vault Storage FAILED:", driveErr?.message || driveErr);
      }
    }

    // ── Send email notification ──────────────────────────────────────────────────
    try {
      if (reg.emailPerwakilan) {
        const { getNotificationProvider } = await import("@/server/services/notify");
        const notifier = getNotificationProvider();
        await notifier.send({
          channel: "email",
          recipient: reg.emailPerwakilan,
          subject: `Tanda Terima Upload Bukti Transfer DP — ${kodeRegistrasi} (${reg.namaPerwakilan})`,
          body: [
            `Yth. ${reg.namaPerwakilan},`,
            "",
            `Assalamu'alaikum Warahmatullahi Wabarakatuh.`,
            "",
            `Bukti pembayaran Down Payment (DP) untuk pendaftaran rombongan Anda telah BERHASIL kami terima.`,
            "",
            `  ✅ Kode Registrasi : ${kodeRegistrasi}`,
            `  👤 Nama PIC         : ${reg.namaPerwakilan}`,
            `  👥 Jumlah Jamaah    : ${reg.paxCount} PAX`,
            `  📅 Tanggal Unggah   : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
            "",
            `📎 Formulir Pendaftaran Resmi terlampir dalam email ini (file PDF).`,
            "",
            `⏳ Status Saat Ini: MEMENUHI VERIFIKASI KEUANGAN (1x24 Jam)`,
            `   Tim Keuangan VTU ABADI Travel akan melakukan pencocokan mutasi bank. Setelah disetujui, kwitansi resmi akan dikirimkan ke email ini.`,
            "",
            `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
            `PT VTU ABADI TRAVEL`,
          ].join("\n"),
          attachments: pdfBuf
            ? [
                {
                  filename: pdfFileName,
                  content: pdfBuf,
                  contentType: "application/pdf",
                },
              ]
            : undefined,
        });
      }
    } catch (notifyErr) {
      console.warn("[payment-proof] Notification dispatch warning:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        kodeRegistrasi,
        buktiUrl,
        message: "Bukti transfer DP berhasil diterima. Tim keuangan akan memverifikasi dalam 1x24 jam.",
      },
    });
  } catch (error) {
    console.error("[payment-proof] Error handling payment proof:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
