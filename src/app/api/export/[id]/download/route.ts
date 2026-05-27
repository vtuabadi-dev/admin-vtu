import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getStorageAdapter } from "@/server/storage";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const storage = getStorageAdapter();
    const filePath = `exports/${params.id}`;

    const exists = await storage.exists(filePath);
    if (!exists) return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });

    const buffer = await storage.download(filePath);
    const ext = params.id.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[ext || ""] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${params.id}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
