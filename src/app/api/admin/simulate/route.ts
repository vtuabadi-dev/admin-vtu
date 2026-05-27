import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";

// Dev/QA simulation endpoint — advance date, generate overdue, random uploads, process payments
export async function POST(request: NextRequest) {
  const session = await auth();
  const perm = checkServerPermission(session, "sistem", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Simulation not available in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    let result: unknown;

    switch (action) {
      case "advance-date": {
        const days = body.days || 7;
        result = { message: `Date advanced by ${days} days (simulated)`, newDate: new Date(Date.now() + days * 86400000).toISOString() };
        break;
      }
      case "generate-overdue": {
        result = { message: "Overdue payments generated", count: body.count || 5 };
        break;
      }
      case "random-uploads": {
        result = { message: "Random document uploads simulated", count: body.count || 10 };
        break;
      }
      case "process-payments": {
        result = { message: "Batch payment processing simulated", processed: body.count || 20 };
        break;
      }
      case "seed-test-data": {
        result = { message: "Test data seeded", jamaah: 50, groups: 10, keberangkatan: 5 };
        break;
      }
      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
