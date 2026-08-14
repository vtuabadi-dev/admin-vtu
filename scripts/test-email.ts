// Environment variables are loaded via --env-file flag

async function testEmailSend() {
  const resendKey = process.env.RESEND_API_KEY;
  console.log("RESEND_API_KEY present:", !!resendKey);
  console.log("RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL || "(not set)");

  if (!resendKey) {
    console.error("❌ RESEND_API_KEY is missing from environment. Email cannot be sent.");
    console.log("\nTo fix: set RESEND_API_KEY in .env.local and in Vercel project env variables.");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || "VTU Abadi Travel <onboarding@resend.dev>";
    const to = process.env.TEST_EMAIL || "zamroni@example.com";

    console.log(`\nSending test email from: ${from}`);
    console.log(`Sending test email to: ${to}`);

    const res = await resend.emails.send({
      from,
      to,
      subject: "[TEST] VTU Email Delivery Test",
      text: [
        "Ini adalah email pengujian dari sistem registrasi VTU ABADI.",
        "Jika email ini diterima, konfigurasi email berjalan dengan baik.",
        `Timestamp: ${new Date().toISOString()}`,
      ].join("\n"),
    });

    if (res.error) {
      console.error("❌ Resend returned error:", res.error);
    } else {
      console.log("✅ Email berhasil dikirim! ID:", res.data?.id);
    }
  } catch (err: any) {
    console.error("❌ Email send exception:", err?.message || err);
  }
}

testEmailSend();
