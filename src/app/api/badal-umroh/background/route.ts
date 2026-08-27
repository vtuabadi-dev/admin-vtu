import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/assets/portals/bg-badal.jpg";
  return NextResponse.redirect(url, 307);
}
