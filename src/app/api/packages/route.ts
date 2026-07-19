import { NextRequest, NextResponse } from "next/server";
import { paketUmrohService, BusinessValidationError } from "@/server/services/paket-umroh.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = {
      namaPaket: body.namaPaket,
      deskripsi: body.deskripsi || "",
      hargaBase: Number(body.hargaBase),
      durasiHari: Number(body.durasiHari),
      hotelMekkahOptions: body.hotelMekkah ? [body.hotelMekkah] : [],
      hotelMadinahOptions: body.hotelMadinah ? [body.hotelMadinah] : [],
    };

    const result = await paketUmrohService.create(data);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof BusinessValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
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
