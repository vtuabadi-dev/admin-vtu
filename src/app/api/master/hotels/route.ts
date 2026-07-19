import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { masterDataService } from "@/server/services/master-data.service";
import { z } from "zod";

const createHotelSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  cityId: z.string().min(1, "City ID is required"),
  starRating: z.number().min(1).max(5).optional(),
  isActive: z.boolean().optional(),
});

function formatError(error: any) {
  if (error.message === "DUPLICATE_CODE" || error.message === "DUPLICATE_NAME") {
    return NextResponse.json({ success: false, message: error.message }, { status: 409 });
  }
  return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "view");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;
    const sort = searchParams.get("sort") || "name";
    const order = (searchParams.get("order") as "asc" | "desc") || "asc";
    const search = searchParams.get("search") || undefined;
    const isActive = searchParams.has("isActive") ? searchParams.get("isActive") === "true" : undefined;
    const cityId = searchParams.get("cityId") || undefined;

    const result = await masterDataService.getHotels({ limit, offset, sort, order, search, isActive, cityId });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasNext: offset + limit < result.total,
        hasPrevious: offset > 0,
      }
    });
  } catch (error) {
    return formatError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "create");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    const body = await request.json();
    
    // Rename nama/name to name
    if (body.nama && !body.name) body.name = body.nama;

    // Generate unique code if not provided
    if (!body.code) {
      const cleanName = (body.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "-");
      body.code = `HTL-${cleanName || "GEN"}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    // Parse rating as number if it is string
    if (typeof body.bintang === "string" || typeof body.starRating === "string") {
      body.starRating = parseInt(body.bintang || body.starRating, 10);
    } else if (body.bintang !== undefined) {
      body.starRating = body.bintang;
    }
    
    // Set isActive based on status string
    if (body.status === "Aktif") body.isActive = true;
    if (body.status === "Nonaktif") body.isActive = false;

    const parsed = createHotelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Validation Error", data: parsed.error.format() }, { status: 400 });
    }

    const data = await masterDataService.createHotel(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return formatError(error);
  }
}
