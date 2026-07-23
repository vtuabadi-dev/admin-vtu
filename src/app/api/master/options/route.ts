import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { masterDataService } from "@/server/services/master-data.service";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const perm = checkServerPermission(session, "sistem", "view");
    if (!perm.allowed) {
      return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
    }

    const [airlines, hotels, cities, packageTypes, routes, clusters] = await Promise.all([
      masterDataService.getAirlines({ isActive: true, limit: 100 }),
      masterDataService.getHotels({ isActive: true, limit: 100 }),
      masterDataService.getCities({ isActive: true, limit: 100 }),
      masterDataService.getPackageTypes({ isActive: true, limit: 100 }),
      masterDataService.getRoutes({ isActive: true, limit: 100 }),
      masterDataService.getClusters({ isActive: true, limit: 100 }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        airlines: airlines.data,
        hotels: hotels.data,
        cities: cities.data,
        packageTypes: packageTypes.data,
        routes: routes.data,
        clusters: clusters.data,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || "Internal Server Error",
    }, { status: 500 });
  }
}
