import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const hasGmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasResend = Boolean(process.env.RESEND_API_KEY);

  const isConfigured = hasGmail || hasSmtp || hasResend;
  const activeProvider = hasGmail ? "Gmail SMTP" : hasSmtp ? "Custom SMTP" : hasResend ? "Resend API" : "Belum Dikonfigurasi (Mock)";
  const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.RESEND_FROM_EMAIL || "-";

  return NextResponse.json({
    success: true,
    data: {
      isConfigured,
      activeProvider,
      senderEmail,
      hasGmail,
      hasSmtp,
      hasResend,
    },
  });
}
