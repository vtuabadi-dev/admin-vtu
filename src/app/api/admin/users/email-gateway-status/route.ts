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
  const hasSupabase = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.DATABASE_URL));

  const isConfigured = hasSupabase || hasResend || hasGmail || hasSmtp;
  const activeProvider = hasSupabase
    ? "Supabase Auth Mailer"
    : hasResend
    ? "Resend API"
    : hasGmail
    ? "Gmail SMTP"
    : hasSmtp
    ? "Custom SMTP"
    : "Belum Dikonfigurasi";
  const senderEmail = hasSupabase ? "Supabase Built-in Mailer" : (process.env.RESEND_FROM_EMAIL || process.env.GMAIL_USER || process.env.SMTP_USER || "-");

  return NextResponse.json({
    success: true,
    data: {
      isConfigured,
      activeProvider,
      senderEmail,
      hasGmail,
      hasSmtp,
      hasResend,
      hasSupabase,
    },
  });
}
