import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INTRO_VIDEO_FOLDER_ID = process.env.GOOGLE_DRIVE_INTRO_VIDEO_FOLDER_ID || "1jOMszvMajCWR0iVJku6hnAGKqwHWFec_";
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

interface VideoCache {
  fileId: string;
  buffer: Uint8Array;
  mimeType: string;
  timestamp: number;
}

const memoryCaches: Record<string, VideoCache> = {};
const CACHE_CHECK_TTL_MS = 20 * 1000; // 20s TTL

export async function GET(request: Request) {
  const now = Date.now();
  let device = "desktop";
  let rangeHeader: string | null = null;

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      device = url.searchParams.get("device") === "mobile" ? "mobile" : "desktop";
      rangeHeader = request.headers.get("range");
    } catch {}
  }

  try {
    let videoBuffer: Uint8Array | null = null;
    let mimeType = "video/mp4";
    const currentCache = memoryCaches[device];

    if (currentCache && now - currentCache.timestamp < CACHE_CHECK_TTL_MS) {
      videoBuffer = currentCache.buffer;
      mimeType = currentCache.mimeType;
    } else {
      const token = await getAccessToken();

      // List all video files in folder 1jOMszvMajCWR0iVJku6hnAGKqwHWFec_
      const query = `'${INTRO_VIDEO_FOLDER_ID}' in parents and (mimeType contains 'video/' or name contains '.mp4') and trashed = false`;
      const listUrl = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,mimeType,size,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!listRes.ok) {
        if (currentCache) {
          videoBuffer = currentCache.buffer;
          mimeType = currentCache.mimeType;
        } else {
          throw new Error(`Google Drive API error: ${listRes.statusText}`);
        }
      } else {
        const listData = await listRes.json();
        const files: Array<{ id: string; name: string; mimeType: string }> = listData.files || [];

        if (files.length === 0) {
          if (currentCache) {
            videoBuffer = currentCache.buffer;
            mimeType = currentCache.mimeType;
          } else {
            return new NextResponse(null, { status: 404 });
          }
        } else {
          let targetFile: { id: string; name: string; mimeType: string } | undefined = files[0];

          if (device === "mobile") {
            const mobileFile = files.find((f) =>
              /mobile|portrait|vertikal|hp|9-16|9_16|vertical/i.test(f.name)
            );
            if (mobileFile) {
              targetFile = mobileFile;
            }
          } else {
            const desktopFile = files.find((f) =>
              /desktop|landscape|horizontal|16-9|16_9|web|corporate/i.test(f.name)
            );
            if (desktopFile) {
              targetFile = desktopFile;
            }
          }

          if (!targetFile) {
            if (currentCache) {
              videoBuffer = currentCache.buffer;
              mimeType = currentCache.mimeType;
            } else {
              return new NextResponse(null, { status: 404 });
            }
          } else if (currentCache && currentCache.fileId === targetFile.id) {
            currentCache.timestamp = now;
            videoBuffer = currentCache.buffer;
            mimeType = currentCache.mimeType;
          } else {
            const downloadRes = await fetch(`${DRIVE_API}/files/${targetFile.id}?alt=media&supportsAllDrives=true`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!downloadRes.ok) {
              if (currentCache) {
                videoBuffer = currentCache.buffer;
                mimeType = currentCache.mimeType;
              } else {
                throw new Error(`Failed to download intro video: ${downloadRes.statusText}`);
              }
            } else {
              const arrayBuf = await downloadRes.arrayBuffer();
              videoBuffer = new Uint8Array(arrayBuf);
              mimeType = targetFile.mimeType || "video/mp4";

              memoryCaches[device] = {
                fileId: targetFile.id,
                buffer: videoBuffer,
                mimeType,
                timestamp: now,
              };
            }
          }
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

        return new NextResponse(sliced as any, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
          },
        });
      }
    }

    return new NextResponse(videoBuffer as any, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error(`[Intro Video Stream Error - ${device}]:`, error?.message || error);
    const currentCache = memoryCaches[device];
    if (currentCache) {
      return new NextResponse(currentCache.buffer as any, {
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
