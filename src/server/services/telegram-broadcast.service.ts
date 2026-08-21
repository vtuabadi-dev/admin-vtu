import fs from "fs";
import path from "path";
import { prisma } from "@/server/db/client";

export interface TelegramConfig {
  botToken: string;
  groupIdJakarta: string;
  groupIdSurabaya: string;
  enabled: boolean;
}

function getConfigDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "storage");
  }
  return path.join(process.cwd(), "storage");
}

function getConfigFile(): string {
  return path.join(getConfigDir(), "telegram_config.json");
}

function getDefaultConfig(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    groupIdJakarta: process.env.TELEGRAM_GROUP_ID_JAKARTA || "",
    groupIdSurabaya: process.env.TELEGRAM_GROUP_ID_SURABAYA || "",
    enabled: process.env.TELEGRAM_BROADCAST_ENABLED !== "false",
  };
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  // 1. Try reading from PostgreSQL Database (Primary Storage across Serverless Instances)
  try {
    const rows = await prisma.$queryRawUnsafe<{ value: any }[]>(
      `SELECT value FROM system_settings WHERE key = 'telegram_config' LIMIT 1;`
    );
    if (rows && rows.length > 0 && rows[0]?.value) {
      const parsed = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return {
        botToken: parsed.botToken || process.env.TELEGRAM_BOT_TOKEN || "",
        groupIdJakarta: parsed.groupIdJakarta || process.env.TELEGRAM_GROUP_ID_JAKARTA || "",
        groupIdSurabaya: parsed.groupIdSurabaya || process.env.TELEGRAM_GROUP_ID_SURABAYA || "",
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : process.env.TELEGRAM_BROADCAST_ENABLED !== "false",
      };
    }
  } catch {
    // Database table not yet created or connection error — fallback to file/env
  }

  // 2. Try reading from local file system
  try {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
      const raw = fs.readFileSync(configFile, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || process.env.TELEGRAM_BOT_TOKEN || "",
        groupIdJakarta: parsed.groupIdJakarta || process.env.TELEGRAM_GROUP_ID_JAKARTA || "",
        groupIdSurabaya: parsed.groupIdSurabaya || process.env.TELEGRAM_GROUP_ID_SURABAYA || "",
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : process.env.TELEGRAM_BROADCAST_ENABLED !== "false",
      };
    }
  } catch (err) {
    console.error("[Telegram Service] Gagal membaca file konfigurasi:", err);
  }

  return getDefaultConfig();
}

export async function updateTelegramConfig(partialConfig: Partial<TelegramConfig>): Promise<TelegramConfig> {
  const current = await getTelegramConfig();
  const updated: TelegramConfig = {
    ...current,
    ...partialConfig,
  };

  // 1. Persist to PostgreSQL Database
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('telegram_config', $1::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `, JSON.stringify(updated));
  } catch (dbErr) {
    console.error("[Telegram Service] Gagal menyimpan konfigurasi ke database:", dbErr);
  }

  // 2. Also write to local file system
  try {
    const configDir = getConfigDir();
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(getConfigFile(), JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("[Telegram Service] Gagal menyimpan file konfigurasi:", err);
  }

  return updated;
}

export function resolveTargetGroupId(
  startingPointCodeOrName: string | undefined,
  config: TelegramConfig
): { groupId: string; targetName: string } {
  const input = (startingPointCodeOrName || "").toLowerCase();

  if (input.includes("sub") || input.includes("surabaya")) {
    return { groupId: config.groupIdSurabaya, targetName: "Surabaya" };
  }

  if (input.includes("jkt") || input.includes("jakarta")) {
    return { groupId: config.groupIdJakarta, targetName: "Jakarta" };
  }

  // Fallback to Jakarta if available, else Surabaya
  if (config.groupIdJakarta) {
    return { groupId: config.groupIdJakarta, targetName: "Jakarta (Default Fallback)" };
  }
  return { groupId: config.groupIdSurabaya, targetName: "Surabaya (Fallback)" };
}

function base64ToBlob(base64Str: string): { buffer: Uint8Array; mimeType: string } {
  let cleanStr = base64Str || "";
  let mimeType = "image/jpeg";

  if (cleanStr.startsWith("data:")) {
    const parts = cleanStr.split(",");
    const meta = parts[0] || "";
    cleanStr = parts[1] || "";
    const mimeMatch = meta.match(/data:(.*?);base64/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
  }

  const nodeBuf = Buffer.from(cleanStr, "base64");
  const uint8 = new Uint8Array(nodeBuf.buffer, nodeBuf.byteOffset, nodeBuf.byteLength);
  return { buffer: uint8, mimeType };
}

export interface BroadcastPackageDataParams {
  packages: any[];
  kodeGrup?: string;
  flyerBase64List?: string[];
  startingPointCode?: string;
  startingPointName?: string;
  customCaption?: string;
}

export async function sendPackageBroadcast(
  params: BroadcastPackageDataParams,
  configOverride?: Partial<TelegramConfig>
): Promise<{
  success: boolean;
  message?: string;
  targetGroup?: string;
  flyerMessageId?: number;
  replyMessageId?: number;
}> {
  const baseConfig = await getTelegramConfig();
  const config: TelegramConfig = {
    ...baseConfig,
    ...configOverride,
  };

  if (!config.enabled) {
    console.log("[Telegram Broadcast] Telegram broadcast non-aktif dalam konfigurasi.");
    return { success: false, message: "Telegram broadcast non-aktif." };
  }

  if (!config.botToken) {
    console.warn("[Telegram Broadcast] Telegram Bot Token belum dikonfigurasi.");
    return { success: false, message: "Bot token belum dikonfigurasi." };
  }

  const startingKey = params.startingPointCode || params.startingPointName || "JKT";
  const { groupId, targetName } = resolveTargetGroupId(startingKey, config);

  if (!groupId) {
    console.warn(`[Telegram Broadcast] ID Grup Telegram untuk Starting ${targetName} belum dikonfigurasi.`);
    return { success: false, message: `ID Grup Telegram ${targetName} belum dikonfigurasi.` };
  }

  const pkgList = Array.isArray(params.packages) ? params.packages : [params.packages];
  if (pkgList.length === 0) {
    return { success: false, message: "Data paket kosong." };
  }

  const samplePkg = pkgList[0];
  const namaPaket = samplePkg.namaPaket || "Paket Umroh";
  const maskapai = samplePkg.maskapai || "Saudia";
  const hotelMekkah = samplePkg.hotelMekkah || "TBA";
  const hotelMadinah = samplePkg.hotelMadinah || "TBA";
  const hargaPaket = samplePkg.hargaPaket ? Number(samplePkg.hargaPaket).toLocaleString("id-ID") : "-";
  const kuota = samplePkg.kuota || 45;
  const starting = params.startingPointName || params.startingPointCode || targetName;

  // Build Caption: Use User's uploaded/entered custom caption as primary
  let caption = "";
  let useHtmlParseMode = true;

  if (params.customCaption && params.customCaption.trim()) {
    caption = params.customCaption.trim();
    // Only enable HTML parse mode if user's caption contains basic HTML tags, otherwise send as plain text
    const hasHtmlTags = /<\/?(b|i|u|s|code|pre|a|strong|em)(\s+[^>]*)?>/i.test(caption);
    useHtmlParseMode = hasHtmlTags;
  } else {
    // Default fallback template ONLY if user didn't enter any custom caption
    const captionLines = [
      `<b>🎉 PAKET UMROH BARU DIBUAT</b>`,
      ``,
      `📌 <b>Nama Paket:</b> ${namaPaket}`,
      `📍 <b>Starting Point:</b> ${starting}`,
      `✈️ <b>Maskapai:</b> ${maskapai}`,
      `🏨 <b>Hotel Mekkah:</b> ${hotelMekkah}`,
      `🏨 <b>Hotel Madinah:</b> ${hotelMadinah}`,
      `💰 <b>Harga Base:</b> Rp ${hargaPaket}`,
      `👥 <b>Kuota:</b> ${kuota} Pax`,
      `📅 <b>Jumlah Tanggal:</b> ${pkgList.length} Tanggal Keberangkatan`,
      ``,
      `<i>Sistem Operasional VTU Abadi</i>`,
    ];
    caption = captionLines.join("\n");
    useHtmlParseMode = true;
  }

  let flyerMessageId: number | undefined;

  try {
    const flyers = Array.isArray(params.flyerBase64List) ? params.flyerBase64List.filter(Boolean) : [];

    if (flyers.length > 0) {
      if (flyers.length === 1) {
        // Single Photo -> sendPhoto
        const { buffer, mimeType } = base64ToBlob(flyers[0] || "");
        const formData = new FormData();
        formData.append("chat_id", groupId);
        formData.append("caption", caption);
        if (useHtmlParseMode) {
          formData.append("parse_mode", "HTML");
        }
        const blob = new Blob([buffer as any], { type: mimeType });
        formData.append("photo", blob, "flyer.jpg");

        const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
          method: "POST",
          body: formData,
        });

        const resJson = await res.json();
        if (resJson.ok) {
          flyerMessageId = resJson.result?.message_id;
        } else {
          console.error("[Telegram Broadcast Error sendPhoto]", resJson);
        }
      } else {
        // Multiple Photos -> sendMediaGroup
        const formData = new FormData();
        formData.append("chat_id", groupId);

        const mediaArray = flyers.map((flyer, idx) => {
          const attachName = `file${idx}`;
          const { buffer, mimeType } = base64ToBlob(flyer);
          const blob = new Blob([buffer as any], { type: mimeType });
          formData.append(attachName, blob, `flyer_${idx + 1}.jpg`);

          const item: any = {
            type: "photo",
            media: `attach://${attachName}`,
          };
          // Attach caption only to the first photo in media group
          if (idx === 0) {
            item.caption = caption;
            if (useHtmlParseMode) {
              item.parse_mode = "HTML";
            }
          }
          return item;
        });

        formData.append("media", JSON.stringify(mediaArray));

        const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMediaGroup`, {
          method: "POST",
          body: formData,
        });

        const resJson = await res.json();
        if (resJson.ok && Array.isArray(resJson.result) && resJson.result.length > 0) {
          flyerMessageId = resJson.result[0]?.message_id;
        } else {
          console.error("[Telegram Broadcast Error sendMediaGroup]", resJson);
        }
      }
    } else {
      // No flyer uploaded -> Send text message as main message
      const textPayload: any = {
        chat_id: groupId,
        text: caption,
      };
      if (useHtmlParseMode) {
        textPayload.parse_mode = "HTML";
      }

      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textPayload),
      });
      const resJson = await res.json();
      if (resJson.ok) {
        flyerMessageId = resJson.result?.message_id;
      }
    }

    // Step 2: Send Reply Message containing Package Code(s)
    let replyMessageId: number | undefined;

    let replyText = "";
    if (pkgList.length === 1) {
      replyText = pkgList[0].kodeIndividu || pkgList[0].kode || "KODE_PAKET_N/A";
    } else {
      const kodeGrup = params.kodeGrup || pkgList[0].kodeGrup || "KODE_GRUP_N/A";
      const individualCodes = pkgList.map((p) => p.kodeIndividu || p.kode).filter(Boolean);
      replyText = [kodeGrup, ...individualCodes].join("\n");
    }

    const replyPayload: any = {
      chat_id: groupId,
      text: replyText,
    };
    if (flyerMessageId) {
      replyPayload.reply_to_message_id = flyerMessageId;
    }

    const replyRes = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replyPayload),
    });

    const replyJson = await replyRes.json();
    if (replyJson.ok) {
      replyMessageId = replyJson.result?.message_id;
    } else {
      console.error("[Telegram Broadcast Error Reply Message]", replyJson);
    }

    return {
      success: true,
      targetGroup: targetName,
      flyerMessageId,
      replyMessageId,
    };
  } catch (err) {
    console.error("[Telegram Broadcast Exception]", err);
    return {
      success: false,
      message: (err as Error).message,
    };
  }
}
