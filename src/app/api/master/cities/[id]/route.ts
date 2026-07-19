import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { masterDataService } from "@/server/services/master-data.service";
import { z } from "zod";

const updateCitySchema = z.object({
  code: z.string().min(1, "Code is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  country: z.string().min(1, "Country is required").optional(),
  isActive: z.boolean().optional(),
});

function formatError(error: any) {
  if (error.message === "DUPLICATE_CODE" || error.message === "DUPLICATE_NAME") {
    return NextResponse.json({ success: false, message: error.message }, { status: 409 });
  }
  if (error.message === "NOT_FOUND") {
    return NextResponse.json({ success: false, message: "City not found" }, { status: 404 });
  }
  if (error.message === "REFERENCE_CONSTRAINT") {
    return NextResponse.json({ success: false, message: "Data tidak bisa dihapus karena masih digunakan sebagai referensi oleh data lain." }, { status: 400 });
  }
  return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "view");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    const data = await masterDataService.getCityById(params.id);
    if (!data) return NextResponse.json({ success: false, message: "City not found" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return formatError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "edit");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    const body = await request.json();
    // Rename nama/name to name
    if (body.nama !== undefined) body.name = body.nama;
    // Map kode to code
    if (body.kode !== undefined) body.code = body.kode;
    // Set isActive based on status string
    if (body.status === "Aktif") body.isActive = true;
    if (body.status === "Nonaktif") body.isActive = false;

    const parsed = updateCitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Validation Error", data: parsed.error.format() }, { status: 400 });
    }

    const data = await masterDataService.updateCity(params.id, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return formatError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "delete");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    await masterDataService.deleteCity(params.id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return formatError(error);
  }
}
