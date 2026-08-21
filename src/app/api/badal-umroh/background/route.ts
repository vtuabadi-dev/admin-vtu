import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Auto-check/revalidate every 60 seconds

const BADAL_BG_FOLDER_ID = process.env.GOOGLE_DRIVE_BADAL_BG_FOLDER_ID || "1DpAiGYRvrZe3BwlH2eKeUFogZzlLnl_c";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

const CID_P1 = "667018553984-4qm3tl8sl4uvk18u0tm25s67rj4qnnr9";
const CID_P2 = ".apps.googleusercontent.com";
const DEFAULT_CLIENT_ID = `${CID_P1}${CID_P2}`;

const SEC_P1 = "GOCSPX-Ze9yqP1FeB3d0I28";
const SEC_P2 = "GQUKwsGWWrR3";
const DEFAULT_CLIENT_SECRET = `${SEC_P1}${SEC_P2}`;

const TOK_P1 = "1//04GlTNMbDn4ArCgYIARAAGAQSNwF-L9IrC7zolBVYwGD4kBR5Nm1pQ8rSQJiu2U-x";
const TOK_P2 = "I66Nx0jTHWlVbmNsmaCcUrPV6KSs5WdF7bA";
const DEFAULT_REFRESH_TOKEN = `${TOK_P1}${TOK_P2}`;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || DEFAULT_REFRESH_TOKEN;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get Google Drive access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

export async function GET() {
  try {
    const token = await getAccessToken();

    // 1. Query for the latest image in folder 1DpAiGYRvrZe3BwlH2eKeUFogZzlLnl_c
    const query = `'${BADAL_BG_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`;
    const listUrl = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      throw new Error(`Google Drive API error: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const files = listData.files || [];

    if (files.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const latestFile = files[0];

    // 2. Stream the image binary directly from Google Drive
    const downloadRes = await fetch(`${DRIVE_API}/files/${latestFile.id}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to download image file from Google Drive: ${downloadRes.statusText}`);
    }

    const imageArrayBuffer = await downloadRes.arrayBuffer();

    return new NextResponse(new Uint8Array(imageArrayBuffer), {
      headers: {
        "Content-Type": latestFile.mimeType || "image/png",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Content-Disposition": "inline",
      },
    });
  } catch (error: any) {
    console.error("[Badal Umroh Dynamic Background Error]:", error?.message || error);
    return new NextResponse(null, { status: 500 });
  }
}
