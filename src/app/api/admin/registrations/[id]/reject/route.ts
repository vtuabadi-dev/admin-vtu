import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { isValidTransition } from "@/shared/lib/registration-state-machine";
import { registrationRepo, auditRepo, notificationRepo } from "@/server/repositories";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "approve");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const reg = await registrationRepo.findById(params.id);
  if (!reg) return NextResponse.json({ success: false, message: "Registrasi tidak ditemukan" }, { status: 404 });

  // Validate state transition using state machine
  if (!isValidTransition(reg.status, "REJECTED")) {
    return NextResponse.json({
      success: false,
      message: `Registrasi tidak dapat ditolak dari status ${reg.status}`,
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const catatanAdmin = (body.catatanAdmin as string)?.trim();

    // Require rejection reason
    if (!catatanAdmin || catatanAdmin.length === 0) {
      return NextResponse.json({ success: false, message: "Alasan penolakan (catatanAdmin) wajib diisi" }, { status: 400 });
    }

    if (catatanAdmin.length < 10) {
      return NextResponse.json({ success: false, message: "Alasan penolakan minimal 10 karakter" }, { status: 400 });
    }

    await registrationRepo.updateStatus(params.id, "REJECTED", {
      catatanAdmin,
      reviewedBy: session.user.id ?? undefined,
    });

    // Audit
    try {
      await auditRepo.create({
        userId: session.user.id ?? "system",
        userName: session.user.name ?? "Unknown",
        role: "super_admin",
        module: "jamaah",
        action: "registration.reject",
        detail: `Registrasi ${reg.kodeRegistrasi} ditolak: ${catatanAdmin}`,
        entityId: params.id,
        entityType: "RegistrationRequest",
      });
    } catch { /* Non-critical */ }

    // Notify the perwakilan if a user account exists with their email
    const { prisma } = await import("@/server/db/client");
    try {
      // Look for a user matching the perwakilan's email or synthetic jamaah email
      const userAccount = await prisma.user.findFirst({
        where: {
          OR: [
            { email: reg.emailPerwakilan },
            { email: { contains: reg.kodeRegistrasi.toLowerCase() } },
          ],
        },
        select: { id: true, name: true, email: true },
      });

      if (userAccount) {
        await notificationRepo.create({
          userId: userAccount.id,
          type: "error",
          category: "sistem",
          title: "Registrasi Ditolak",
          message: `Registrasi ${reg.kodeRegistrasi} atas nama ${reg.namaPerwakilan} ditolak. Alasan: ${catatanAdmin}. Silakan hubungi admin untuk informasi lebih lanjut.`,
          link: "/register",
        });
      } else {
        // No user account yet — notify admins so they can follow up manually
        const admins = await prisma.user.findMany({
          where: { role: { in: ["super_admin", "admin_operasional"] } },
          select: { id: true },
        });
        for (const admin of admins) {
          await notificationRepo.create({
            userId: admin.id,
            type: "info",
            category: "sistem",
            title: "Registrasi Ditolak (Belum Ada Akun)",
            message: `Registrasi ${reg.kodeRegistrasi} (${reg.namaPerwakilan}) ditolak. Alasan: ${catatanAdmin}. Perwakilan belum memiliki akun — hubungi manual.`,
            link: `/admin/pembayaran/registrasi-baru?id=${reg.id}`,
          });
        }
      }
    } catch { /* Non-critical — notification failure does not block rejection */ }

    return NextResponse.json({
      success: true,
      data: { kodeRegistrasi: reg.kodeRegistrasi, status: "REJECTED", catatanAdmin },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
