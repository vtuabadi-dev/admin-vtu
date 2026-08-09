import { JWT } from "google-auth-library";
import { join } from "path";
import { promises as fs } from "fs";

const FILE_ID = "1CnqQc0FfQLM1m3eGmhiwuQ9dCApOEHOS";

async function serveFallback() {
  try {
    const pngPath = join(process.cwd(), "public", "images", "bg-makkah-madinah.png");
    const fileBuffer = await fs.readFile(pngPath);
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    try {
      const fallbackPath = join(process.cwd(), "public", "images", "bg-makkah-madinah-canvas.jpg");
      const fileBuffer = await fs.readFile(fallbackPath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (err) {
      console.error("[Login Background API] Failed to read fallback file:", err);
      return new Response("Background Image Not Found", { status: 404 });
    }
  }
}

export async function GET(_request: Request) {
  try {
    const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let email: string | undefined;
    let key: string | undefined;

    if (jsonRaw) {
      const creds = JSON.parse(jsonRaw);
      email = creds.client_email;
      key = creds.private_key;
    } else {
      email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      key = process.env.GOOGLE_PRIVATE_KEY;
    }

    if (!email || !key) {
      console.warn("[Login Background API] Google Service Account credentials not configured. Serving local fallback.");
      return serveFallback();
    }

    const jwt = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const authHeaders = await jwt.getRequestHeaders();
    const accessToken = (authHeaders as any).Authorization;

    if (!accessToken) {
      throw new Error("Failed to generate Google access token");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${FILE_ID}?alt=media`,
      {
        headers: {
          Authorization: accessToken,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Login Background API] Google Drive download failed:", errText);
      throw new Error(`Google Drive API returned status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Login Background API] Error fetching image, serving fallback:", error);
    return serveFallback();
  }
}
