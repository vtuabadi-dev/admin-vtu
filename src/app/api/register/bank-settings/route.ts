import { NextResponse } from "next/server";
import { getGeneralSettings } from "@/server/services/system-settings.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getGeneralSettings();
    return NextResponse.json(
      {
        success: true,
        data: {
          bankName: settings.bankName || "Bank Mandiri",
          bankAccount: settings.bankAccount || "144-00-0018881-0",
          bankHolder: settings.bankHolder || "PT VTU ABADI TRAVEL",
          minDpPerPax: settings.minDpPerPax || "5000000",
          companyBrand: settings.companyBrand || "VTU ABADI Travel",
          companyPhone: settings.companyPhone || "(031) 854-4455",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message,
        data: {
          bankName: "Bank Mandiri",
          bankAccount: "144-00-0018881-0",
          bankHolder: "PT VTU ABADI TRAVEL",
          minDpPerPax: "5000000",
        },
      },
      { status: 500 }
    );
  }
}
