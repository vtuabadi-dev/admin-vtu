import { NextResponse } from "next/server";
import { keberangkatanRepo } from "@/server/repositories/keberangkatan.repository";

export async function GET() {
  try {
    const groups = await keberangkatanRepo.findExistingGroupsForSplit();
    return NextResponse.json({ success: true, data: groups });
  } catch (err: any) {
    console.error("[existing-groups API error]", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load existing groups" },
      { status: 500 }
    );
  }
}
