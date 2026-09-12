import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { DAFTAR_KANTOR_IMIGRASI } from "@/shared/lib/kantor-imigrasi";
import type { KantorImigrasiItem } from "@/shared/lib/kantor-imigrasi";

export const dynamic = "force-dynamic";

let cachedKanimList: KantorImigrasiItem[] | null = null;

async function getKanimListFromDb(): Promise<KantorImigrasiItem[]> {
  if (cachedKanimList) return cachedKanimList;

  try {
    const latestDbRecord = await prisma.auditEntry.findFirst({
      where: { action: "UPDATE_KANTOR_IMIGRASI" },
      orderBy: { timestamp: "desc" },
    });

    if (latestDbRecord?.after) {
      const parsed = JSON.parse(latestDbRecord.after);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with built-in list to ensure defaults are always present
        const customMap = new Map<string, KantorImigrasiItem>();
        DAFTAR_KANTOR_IMIGRASI.forEach((k) => customMap.set(k.nama.toLowerCase().trim(), k));
        parsed.forEach((k: KantorImigrasiItem) => {
          if (k?.nama) customMap.set(k.nama.toLowerCase().trim(), k);
        });
        cachedKanimList = Array.from(customMap.values());
        return cachedKanimList;
      }
    }
  } catch (err) {
    console.warn("[KantorImigrasi] Error reading from DB:", err);
  }

  cachedKanimList = [...DAFTAR_KANTOR_IMIGRASI];
  return cachedKanimList;
}

async function saveKanimListToDb(list: KantorImigrasiItem[], userName: string): Promise<void> {
  cachedKanimList = list;
  try {
    await prisma.auditEntry.create({
      data: {
        userId: "admin-settings",
        userName,
        role: "super_admin",
        module: "sistem",
        action: "UPDATE_KANTOR_IMIGRASI",
        detail: `Daftar Kantor Imigrasi diperbarui (${list.length} kantor) via auto-save`,
        after: JSON.stringify(list),
      },
    });
  } catch (err) {
    console.error("[KantorImigrasi] Failed to save list to DB:", err);
  }
}

export async function GET() {
  try {
    const list = await getKanimListFromDb();
    return NextResponse.json({
      success: true,
      data: list,
      total: list.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userName = session?.user?.name || "Admin Operasional";

  try {
    const body = (await request.json()) as Partial<KantorImigrasiItem>;
    if (!body.nama || !body.nama.trim()) {
      return NextResponse.json({ success: false, message: "Nama kantor imigrasi tidak boleh kosong" }, { status: 400 });
    }

    const currentList = await getKanimListFromDb();
    const cleanNama = body.nama.trim();

    const existing = currentList.find(
      (k) => k.nama.toLowerCase().trim() === cleanNama.toLowerCase()
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: "Kantor imigrasi sudah terdaftar",
      });
    }

    const newItem: KantorImigrasiItem = {
      id: `kanim-custom-${Date.now()}`,
      nama: cleanNama,
      shortLabel: body.shortLabel?.trim() || cleanNama,
      kota: body.kota?.trim() || "Di Tempat",
      provinsi: body.provinsi?.trim() || "Indonesia",
    };

    const updatedList = [newItem, ...currentList];
    await saveKanimListToDb(updatedList, userName);

    return NextResponse.json({
      success: true,
      data: newItem,
      message: `Kantor imigrasi "${cleanNama}" berhasil disimpan ke database`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
