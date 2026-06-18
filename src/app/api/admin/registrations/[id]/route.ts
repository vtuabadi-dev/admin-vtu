import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { registrationRepo } from "@/server/repositories";
import { isValidLeadTransition } from "@/shared/lib/registration-state-machine";
import type { LeadStatus } from "@/shared/types";
import { auditRepo } from "@/server/repositories";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const reg = await registrationRepo.findById(params.id);
  if (!reg) return NextResponse.json({ success: false, message: "Registrasi tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ success: true, data: reg });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const reg = await registrationRepo.findById(params.id);
  if (!reg) return NextResponse.json({ success: false, message: "Registrasi tidak ditemukan" }, { status: 404 });

  const body = await request.json();
  const newLeadStatus = body.leadStatus as string;
  const newStatus = body.status as string;

  // If leadStatus is provided, validate and update lead pipeline
  if (newLeadStatus) {
    const currentLead = (reg.leadStatus ?? "BARU") as LeadStatus;
    const nextLead = newLeadStatus as LeadStatus;

    if (!isValidLeadTransition(currentLead, nextLead)) {
      return NextResponse.json({
        success: false,
        message: `Transisi lead dari ${currentLead} ke ${nextLead} tidak diizinkan`,
      }, { status: 400 });
    }

    // If DIKONVERSI, also move registration status to PENDING_REVIEW
    const updated = await registrationRepo.updateStatus(params.id, nextLead === "DIKONVERSI" ? "PENDING_REVIEW" : undefined, {
      reviewedBy: session.user.id,
      catatanAdmin: body.catatanAdmin,
      leadStatus: nextLead,
    });

    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role as any,
        module: "jamaah",
        action: "lead.status_change",
        detail: `Lead ${reg.kodeRegistrasi}: ${currentLead} → ${nextLead}${nextLead === "DIKONVERSI" ? " (→ PENDING_REVIEW)" : ""}`,
        entityId: params.id,
        entityType: "RegistrationRequest",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, data: updated });
  }

  // Fallback: update registration status directly (existing behavior)
  if (newStatus) {
    const updated = await registrationRepo.updateStatus(params.id, newStatus, {
      reviewedBy: session.user.id,
      catatanAdmin: body.catatanAdmin,
    });
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ success: false, message: "leadStatus atau status wajib diisi" }, { status: 400 });
}
