import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { success: false, error: "GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET env vars are required" },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const host = req.headers.get("host") || "vtu-admin-iota.vercel.app";
  const protocol = req.nextUrl.protocol || "https:";
  const redirectUri = `${protocol}//${host}/api/auth/google-drive-setup`;

  // Step 1: Redirect user to Google Login if no code
  if (!code) {
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "consent");
    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // Step 2: Exchange authorization code for refresh token
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const data = await tokenRes.json();
    if (!data.refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "No refresh token received",
          details: data,
        },
        { status: 400 }
      );
    }

    // Step 3: Success HTML page
    const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Google Drive Setup — VTU ABADI</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
          .card { background: white; max-width: 650px; width: 100%; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #059669; font-size: 24px; margin-bottom: 12px; }
          p { color: #4b5563; font-size: 15px; line-height: 1.5; margin-bottom: 20px; }
          textarea { width: 100%; height: 110px; font-family: monospace; font-size: 14px; padding: 12px; border: 2px solid #10b981; border-radius: 10px; box-sizing: border-box; background: #ecfdf5; color: #065f46; outline: none; }
          .badge { display: inline-block; background: #d1fae5; color: #065f46; font-weight: 600; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✅ GOOGLE DRIVE CONNECTED!</div>
          <h1>BERHASIL MENDAPATKAN REFRESH TOKEN</h1>
          <p>Klik teks di bawah untuk menyalin <b>Refresh Token</b> milik akun Google Drive 200 GB Anda:</p>
          <textarea readonly onclick="this.select(); document.execCommand('copy'); alert('Refresh Token berhasil disalin!');">${data.refresh_token}</textarea>
          <p style="font-size: 13px; color: #9ca3af; margin-top: 16px;">Token ini aktif selamanya untuk menyimpan PDF Formulir & Bukti Transfer langsung ke Google Drive Anda.</p>
        </div>
      </body>
    </html>
    `;

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
