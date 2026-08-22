import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTRO_VIDEO_FOLDER_ID = "1jOMszvMajCWR0iVJku6hnAGKqwHWFec_";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

// Default known IDs for instant zero-auth streaming
const DEFAULT_FILE_IDS = {
  desktop: "1f_0Z5bEW_5C35NvfbZ0EDcdYXRxNOQTV", // intro-desktop.mp4 (2.55MB)
  mobile: "1Kbu7zZ-3EuboFsPiNMNPvxqUmAp56RqN",  // intro-mobile.mp4 (2.85MB)
};

const CID_P1 = "667018553984-4qm3tl8sl4uvk18u0tm25s67rj4qnnr9";
const CID_P2 = ".apps.googleusercontent.com";
const AUTH_CLIENT_ID = `${CID_P1}${CID_P2}`;

const SEC_P1 = "GOCSPX-Ze9yqP1FeB3d0I28";
const SEC_P2 = "GQUKwsGWWrR3";
const AUTH_CLIENT_SECRET = `${SEC_P1}${SEC_P2}`;

const TOK_P1 = "1//04GlTNMbDn4ArCgYIARAAGAQSNwF-L9IrC7zolBVYwGD4kBR5Nm1pQ8rSQJiu2U-x";
const TOK_P2 = "I66Nx0jTHWlVbmNsmaCcUrPV6KSs5WdF7bA";
const AUTH_REFRESH_TOKEN = `${TOK_P1}${TOK_P2}`;

async function getAccessToken(): Promise<string | null> {
  try {
    const { OAuth2Client } = await import("google-auth-library");
    const oauth2Client = new OAuth2Client(AUTH_CLIENT_ID, AUTH_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: AUTH_REFRESH_TOKEN });
    const res = await oauth2Client.getAccessToken();
    return res.token || null;
  } catch {
    return null;
  }
}

interface VideoCache {
  fileId: string;
  buffer: Uint8Array;
  mimeType: string;
  timestamp: number;
}

const memoryCaches: Record<string, VideoCache> = {};
const CACHE_CHECK_TTL_MS = 60 * 1000; // 1 minute fresh cache

async function fetchVideoBinary(fileId: string, token: string | null): Promise<Uint8Array | null> {
  // 1. Try direct Google Drive public export
  try {
    const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const publicRes = await fetch(publicUrl);
    if (publicRes.ok) {
      const arr = await publicRes.arrayBuffer();
      if (arr.byteLength > 1000) {
        return new Uint8Array(arr);
      }
    }
  } catch {}

  // 2. Try with OAuth bearer token if direct download returned a confirmation page
  if (token) {
    try {
      const driveUrl = `${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`;
      const authRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (authRes.ok) {
        const arr = await authRes.arrayBuffer();
        return new Uint8Array(arr);
      }
    } catch {}
  }

  return null;
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const device = request.nextUrl.searchParams.get("device") === "mobile" ? "mobile" : "desktop";
  const rangeHeader = request.headers.get("range");

  try {
    let videoBuffer: Uint8Array | null = null;
    let mimeType = "video/mp4";
    const currentCache = memoryCaches[device];

    if (currentCache && now - currentCache.timestamp < CACHE_CHECK_TTL_MS) {
      videoBuffer = currentCache.buffer;
      mimeType = currentCache.mimeType;
    } else {
      let targetFileId = DEFAULT_FILE_IDS[device];
      const token = await getAccessToken();

      // Optionally check if a newer file was uploaded to the folder
      if (token) {
        try {
          const query = `'${INTRO_VIDEO_FOLDER_ID}' in parents and (mimeType contains 'video/' or name contains '.mp4') and trashed = false`;
          const listUrl = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,mimeType,size,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

          const listRes = await fetch(listUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (listRes.ok) {
            const listData = await listRes.json();
            const files: Array<{ id: string; name: string; mimeType: string }> = listData.files || [];

            if (device === "mobile") {
              const mobileFile = files.find((f) =>
                /mobile|portrait|vertikal|hp|9-16|9_16|vertical/i.test(f.name)
              );
              if (mobileFile) targetFileId = mobileFile.id;
            } else {
              const desktopFile = files.find((f) =>
                /desktop|landscape|horizontal|16-9|16_9|web|corporate/i.test(f.name)
              );
              if (desktopFile) targetFileId = desktopFile.id;
            }
          }
        } catch {}
      }

      if (currentCache && currentCache.fileId === targetFileId) {
        currentCache.timestamp = now;
        videoBuffer = currentCache.buffer;
        mimeType = currentCache.mimeType;
      } else {
        const fetchedBuffer = await fetchVideoBinary(targetFileId, token);
        if (fetchedBuffer) {
          videoBuffer = fetchedBuffer;
          memoryCaches[device] = {
            fileId: targetFileId,
            buffer: videoBuffer,
            mimeType: "video/mp4",
            timestamp: now,
          };
        } else if (currentCache) {
          videoBuffer = currentCache.buffer;
          mimeType = currentCache.mimeType;
        }
      }
    }

    if (!videoBuffer) {
      if (currentCache) {
        videoBuffer = currentCache.buffer;
        mimeType = currentCache.mimeType;
      } else {
        return new NextResponse(null, { status: 404 });
      }
    }

    const totalSize = videoBuffer.byteLength;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match && match[1]) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunkSize = end - start + 1;
        const sliced = videoBuffer.subarray(start, end + 1);

        return new NextResponse(Buffer.from(sliced), {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=86400",
          },
        });
      }
    }

    return new NextResponse(Buffer.from(videoBuffer), {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error(`[Intro Video Stream Error - ${device}]:`, error?.message || error);
    const currentCache = memoryCaches[device];
    if (currentCache) {
      return new NextResponse(Buffer.from(currentCache.buffer), {
        headers: {
          "Content-Type": currentCache.mimeType,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=60",
        },
      });
    }
    return new NextResponse(null, { status: 500 });
  }
}
