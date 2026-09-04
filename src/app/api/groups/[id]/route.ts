import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { groupRepo } from "@/server/repositories";
import { prisma } from "@/server/db/client";
import { hasPackageTourLeader, formatStandardDocumentFileName } from "@/shared/lib/file-standardization";
import { moveAndRenameDriveFile, provisionPackageStorage } from "@/server/storage/google-drive";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const group = await groupRepo.findById(params.id);
    if (!group) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();

    // Check if this is a package transfer (pindah paket)
    const existingGroup = await prisma.registrationGroup.findUnique({
      where: { id: params.id },
      include: {
        anggota: {
          include: {
            dokumen: true,
          },
          orderBy: { createdAt: "asc" },
        },
        keberangkatan: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ success: false, message: "Group tidak ditemukan" }, { status: 404 });
    }

    const isPackageTransfer =
      body.paketKeberangkatanId &&
      body.paketKeberangkatanId !== existingGroup.paketKeberangkatanId;

    if (isPackageTransfer) {
      const targetPaketId = body.paketKeberangkatanId;
      const targetPaket = await prisma.keberangkatan.findUnique({
        where: { id: targetPaketId },
        include: {
          groups: {
            include: {
              anggota: {
                where: { status: { not: "batal" as any } },
              },
            },
          },
        },
      });

      if (!targetPaket) {
        return NextResponse.json({ success: false, message: "Paket tujuan tidak ditemukan" }, { status: 400 });
      }

      // 1. Ensure target package has Google Drive folders provisioned
      let targetFolders = (targetPaket.driveFolderIds as any) || {};
      if (!targetFolders.rootPackageFolderId || targetFolders.rootPackageFolderId === "local-mock") {
        try {
          const prov = await provisionPackageStorage(targetPaket.id);
          if (prov) targetFolders = prov;
        } catch (provErr) {
          console.warn("[Cloud Vault] Provision target package notice:", provErr);
        }
      }

      // 2. Determine starting manifest number at the end of the new package
      const hasTL = hasPackageTourLeader(targetPaket);
      const offset = hasTL ? 2 : 1;
      
      // Count all active jamaah already in target package (excluding members from this moving group)
      let existingPaxCount = 0;
      for (const g of targetPaket.groups) {
        if (g.id !== existingGroup.id) {
          existingPaxCount += g.anggota.length;
        }
      }

      let currentManifestNo = offset + existingPaxCount;

      // 3. Move and rename documents in Google Drive for each member
      const oldFolders = (existingGroup.keberangkatan?.driveFolderIds as any) || {};

      for (const member of existingGroup.anggota) {
        if (member.status === "batal") continue;
        const noUrutBaru = currentManifestNo++;
        const regCode = member.registrationId || existingGroup.kodeRegistrasi || member.id;

        for (const dok of member.dokumen) {
          if (!dok.fileUrl) continue;
          
          let oldTargetFolder: string | undefined;
          let newTargetFolder: string | undefined;
          if (dok.jenis === "paspor") {
            oldTargetFolder = oldFolders.paspor;
            newTargetFolder = targetFolders.paspor;
          } else if (dok.jenis === "pas_foto") {
            oldTargetFolder = oldFolders.foto;
            newTargetFolder = targetFolders.foto;
          } else if (dok.jenis === "ktp") {
            oldTargetFolder = oldFolders.ktp;
            newTargetFolder = targetFolders.ktp;
          } else {
            oldTargetFolder = oldFolders.dokumenLain;
            newTargetFolder = targetFolders.dokumenLain;
          }

          // Extract extension from existing URL or default to jpg
          let ext = "jpg";
          const extMatch = dok.fileUrl.match(/\.([a-zA-Z0-9]{3,4})(?:[?#]|$)/i);
          if (extMatch && extMatch[1]) ext = extMatch[1];

          // ADR-0014: [no urut manifest baru]-[4 digit id reg]-[nama manifest].[ext]
          const newFileName = formatStandardDocumentFileName(noUrutBaru, regCode, member.namaLengkap, ext);

          // Asynchronously move and rename file in Google Drive
          moveAndRenameDriveFile(dok.fileUrl, newTargetFolder, oldTargetFolder, newFileName).catch((err) => {
            console.warn(`[Google Drive Move Warning] Failed moving doc ID ${dok.id}:`, err);
          });
        }
      }

      // Ensure updatedAt reflects now so group sorts chronologically at the end of new package
      body.updatedAt = new Date();

      // Record ActivityEvent for Package Movement Audit
      try {
        await prisma.activityEvent.create({
          data: {
            keberangkatanId: targetPaket.id,
            type: "info",
            module: "manifest",
            message: `Rombongan ${existingGroup.namaGroup} (${existingGroup.anggota.length} pax) dipindahkan dari paket ${existingGroup.keberangkatan?.namaPaket || existingGroup.paketKeberangkatanId} ke ${targetPaket.namaPaket}`,
            triggeredBy: session.user.name || session.user.email || "Admin",
          },
        });
      } catch { /* non-blocking */ }
    }

    const group = await groupRepo.update(params.id, body);
    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
