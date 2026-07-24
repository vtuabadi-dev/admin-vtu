import { NextRequest, NextResponse } from "next/server";
import { paketUmrohService, BusinessValidationError } from "@/server/services/paket-umroh.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawList = Array.isArray(body)
      ? body
      : Array.isArray(body.packages)
      ? body.packages
      : [body];

    const results = await Promise.all(
      rawList.map(async (item: any) => {
        const data = {
          namaPaket: item.namaPaket,
          deskripsi: item.deskripsi || item.kodePaket || "",
          hargaBase: Number(item.hargaBase || 35000000),
          durasiHari: Number(item.durasiHari || 9),
          hotelMekkahOptions: item.hotelMekkahId ? [item.hotelMekkahId] : item.hotelMekkahOptions || [],
          hotelMadinahOptions: item.hotelMadinahId ? [item.hotelMadinahId] : item.hotelMadinahOptions || [],
        };
        return paketUmrohService.create(data);
      })
    );

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/packages:", error);
    if (error instanceof BusinessValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await paketUmrohService.findAll();
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
