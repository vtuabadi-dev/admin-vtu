import fs from "fs";
import path from "path";

export interface TelegramConfig {
  botToken: string;
  groupIdJakarta: string;
  groupIdSurabaya: string;
  enabled: boolean;
}

const CONFIG_DIR = path.join(process.cwd(), "storage");
const CONFIG_FILE = path.join(CONFIG_DIR, "telegram_config.json");

function getDefaultConfig(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    groupIdJakarta: process.env.TELEGRAM_GROUP_ID_JAKARTA || "",
    groupIdSurabaya: process.env.TELEGRAM_GROUP_ID_SURABAYA || "",
    enabled: process.env.TELEGRAM_BROADCAST_ENABLED !== "false",
  };
}

export function getTelegramConfig(): TelegramConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
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

export function updateTelegramConfig(partialConfig: Partial<TelegramConfig>): TelegramConfig {
  const current = getTelegramConfig();
  const updated: TelegramConfig = {
    ...current,
    ...partialConfig,
  };

  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
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
}

export async function sendPackageBroadcast(params: BroadcastPackageDataParams): Promise<{
  success: boolean;
  message?: string;
  targetGroup?: string;
  flyerMessageId?: number;
  replyMessageId?: number;
}> {
  const config = getTelegramConfig();

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

  // Build HTML Caption
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
  const caption = captionLines.join("\n");

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
        formData.append("parse_mode", "HTML");
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
            item.parse_mode = "HTML";
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
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: groupId,
          text: caption,
          parse_mode: "HTML",
        }),
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
