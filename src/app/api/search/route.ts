import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import type { GlobalSearchResult } from "@/shared/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: true, data: [] });

  try {
    const results: GlobalSearchResult[] = [];

    const jamaah = await prisma.jamaah.findMany({
      where: {
        OR: [
          { namaLengkap: { contains: q, mode: "insensitive" } },
          { registrationId: { contains: q, mode: "insensitive" } },
          { nomorPaspor: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, namaLengkap: true, registrationId: true, groupId: true },
    });
    for (const j of jamaah) {
      results.push({
        type: "jamaah",
        id: j.id,
        title: j.namaLengkap,
        subtitle: j.registrationId,
        module: "jamaah",
        link: `/admin/jamaah/${j.id}`,
      });
    }

    const groups = await prisma.registrationGroup.findMany({
      where: {
        OR: [
          { kodeRegistrasi: { contains: q, mode: "insensitive" } },
          { namaGroup: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, kodeRegistrasi: true, namaGroup: true },
    });
    for (const g of groups) {
      results.push({
        type: "group",
        id: g.id,
        title: g.namaGroup,
        subtitle: g.kodeRegistrasi,
        module: "group",
        link: `/admin/group?id=${g.id}`,
      });
    }

    const invoices = await prisma.invoice.findMany({
      where: { nomorInvoice: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, nomorInvoice: true, groupId: true },
    });
    for (const inv of invoices) {
      results.push({
        type: "invoice",
        id: inv.id,
        title: inv.nomorInvoice,
        subtitle: `Grup: ${inv.groupId}`,
        module: "invoice",
        link: `/admin/invoice?id=${inv.id}`,
      });
    }

    const keberangkatan = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          { kode: { contains: q, mode: "insensitive" } },
          { namaPaket: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, kode: true, namaPaket: true },
    });
    for (const k of keberangkatan) {
      results.push({
        type: "keberangkatan",
        id: k.id,
        title: k.namaPaket,
        subtitle: k.kode,
        module: "keberangkatan",
        link: `/admin/keberangkatan/${k.id}`,
      });
    }

    return NextResponse.json({ success: true, data: results.slice(0, 10) });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
