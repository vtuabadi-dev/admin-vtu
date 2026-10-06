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
  config: TelegramConfig,
  fallbackContextText?: string
): { groupId: string; targetName: string } {
  const primaryInput = (startingPointCodeOrName || "").toLowerCase().trim();
  const contextInput = (fallbackContextText || "").toLowerCase().trim();
  const combined = `${primaryInput} ${contextInput}`.trim();

  // 1. Deteksi Surabaya: SBY, SUB, Surabaya, Juanda (baik di starting point code/name maupun di kode/nama paket)
  const isSurabaya =
    primaryInput === "sby" ||
    primaryInput === "sub" ||
    primaryInput.includes("surabaya") ||
    primaryInput.includes("juanda") ||
    /\b(sby|sub)\b|surabaya|juanda/i.test(combined) ||
    combined.includes("_sby_") ||
    combined.includes("-sby-") ||
    combined.includes(" sby ") ||
    combined.includes("_sub_") ||
    combined.includes("-sub-") ||
    combined.includes(" sub ") ||
    combined.includes("surabaya");

  if (isSurabaya) {
    if (config.groupIdSurabaya) {
      return { groupId: config.groupIdSurabaya, targetName: "Surabaya" };
    }
  }

  // 2. Deteksi Jakarta: JKT, CGK, Jakarta, Soekarno-Hatta, Cengkareng
  const isJakarta =
    primaryInput === "jkt" ||
    primaryInput === "cgk" ||
    primaryInput.includes("jakarta") ||
    primaryInput.includes("cengkareng") ||
    /\b(jkt|cgk)\b|jakarta|cengkareng/i.test(combined) ||
    combined.includes("_jkt_") ||
    combined.includes("-jkt-") ||
    combined.includes(" jkt ") ||
    combined.includes("_cgk_") ||
    combined.includes("-cgk-") ||
    combined.includes(" cgk ") ||
    combined.includes("jakarta");

  if (isJakarta) {
    if (config.groupIdJakarta) {
      return { groupId: config.groupIdJakarta, targetName: "Jakarta" };
    }
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

  const pkgList = Array.isArray(params.packages) ? params.packages : [params.packages];
  const samplePkg = pkgList[0] || {};

  // Build context string from all package attributes to ensure accurate target routing
  const contextForDetection = [
    params.startingPointCode,
    params.startingPointName,
    params.kodeGrup,
    samplePkg.kode,
    samplePkg.kodeIndividu,
    samplePkg.namaPaket,
    samplePkg.startingPoint?.code,
    samplePkg.startingPoint?.name,
  ].filter(Boolean).join(" ");

  const { groupId, targetName } = resolveTargetGroupId(
    params.startingPointCode || params.startingPointName,
    config,
    contextForDetection
  );

  if (!groupId) {
    console.warn(`[Telegram Broadcast] ID Grup Telegram untuk Starting ${targetName} belum dikonfigurasi.`);
    return { success: false, message: `ID Grup Telegram ${targetName} belum dikonfigurasi.` };
  }

  if (pkgList.length === 0) {
    return { success: false, message: "Data paket kosong." };
  }

  const namaPaket = samplePkg.namaPaket || "Paket Umroh";
  const maskapai = samplePkg.maskapai || "Saudia";
  const hotelMekkah = samplePkg.hotelMekkah || "TBA";
  const hotelMadinah = samplePkg.hotelMadinah || "TBA";
  const hargaPaket = samplePkg.hargaPaket ? Number(samplePkg.hargaPaket).toLocaleString("id-ID") : "-";
  const kuota = samplePkg.kuota || 45;
  const starting = params.startingPointName || params.startingPointCode || targetName;

  // Build Caption: Gunakan input caption dari user APA ADANYA (verbatim) jika tersedia
  let caption = "";
  let useHtmlParseMode = false;

  if (params.customCaption && params.customCaption.trim().length > 0) {
    // SALIN APA ADANYA dari kolom caption tanpa template tambahan
    caption = params.customCaption;
    // Cek apakah caption mengandung tag HTML valid
    useHtmlParseMode = /<\/?(b|i|u|s|code|pre|a|strong|em)(\s+[^>]*)?>/i.test(caption);
  } else {
    // Default fallback template HANYA jika kolom caption benar-benar kosong
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

  // Helper untuk mengirim pesan teks Telegram dengan auto-fallback jika HTML error atau karakter panjang
  async function sendTextMessageSafe(chatId: string, text: string, replyToId?: number): Promise<number | undefined> {
    if (!text || text.trim().length === 0) return undefined;

    // Split jika teks melebihi limit 4096 karakter
    const chunks: string[] = [];
    if (text.length <= 4000) {
      chunks.push(text);
    } else {
      let cur = text;
      while (cur.length > 0) {
        if (cur.length <= 4000) {
          chunks.push(cur);
          break;
        }
        let splitIdx = cur.lastIndexOf("\n", 4000);
        if (splitIdx === -1) splitIdx = 4000;
        chunks.push(cur.slice(0, splitIdx));
        cur = cur.slice(splitIdx).trimStart();
      }
    }

    let lastSentMessageId: number | undefined;

    for (const chunk of chunks) {
      // Percobaan 1: coba dengan parse_mode HTML jika enabled
      let payload: any = {
        chat_id: chatId,
        text: chunk,
      };
      if (replyToId && !lastSentMessageId) {
        payload.reply_to_message_id = replyToId;
      }
      if (useHtmlParseMode) {
        payload.parse_mode = "HTML";
      }

      let res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let resJson = await res.json();

      // Jika gagal parse HTML (misal unescaped entity '&' atau '<'), fallback kirim teks polos
      if (!resJson.ok && useHtmlParseMode) {
        console.warn("[Telegram Broadcast] sendMessage HTML parse failed, retrying plain text:", resJson.description);
        delete payload.parse_mode;
        res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        resJson = await res.json();
      }

      if (resJson.ok) {
        lastSentMessageId = resJson.result?.message_id;
      } else {
        console.error("[Telegram Broadcast Error sendMessage]", resJson);
      }
    }

    return lastSentMessageId;
  }

  let flyerMessageId: number | undefined;
  let captionMessageId: number | undefined;

  try {
    const flyers = Array.isArray(params.flyerBase64List) ? params.flyerBase64List.filter(Boolean) : [];
    // Batas caption Telegram untuk foto adalah 1024 karakter.
    // Jika caption > 1000 karakter, kirim foto terpisah lalu kirim caption utuh sebagai teks.
    const isCaptionTooLongForPhoto = caption.length > 1000;

    if (flyers.length > 0) {
      if (flyers.length === 1) {
        // --- Single Photo ---
        const { buffer, mimeType } = base64ToBlob(flyers[0] || "");

        const buildFormData = (withCaption: boolean, htmlMode: boolean) => {
          const fd = new FormData();
          fd.append("chat_id", groupId);
          if (withCaption && caption) {
            fd.append("caption", caption);
            if (htmlMode) fd.append("parse_mode", "HTML");
          }
          const blob = new Blob([buffer as any], { type: mimeType });
          fd.append("photo", blob, "flyer.jpg");
          return fd;
        };

        if (!isCaptionTooLongForPhoto) {
          // Coba kirim foto beserta caption
          let res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
            method: "POST",
            body: buildFormData(true, useHtmlParseMode),
          });
          let resJson = await res.json();

          // Jika gagal karena HTML entities parse error, retry kirim foto dengan caption teks polos
          if (!resJson.ok && useHtmlParseMode) {
            console.warn("[Telegram Broadcast] sendPhoto HTML parse failed, retrying plain text:", resJson.description);
            res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
              method: "POST",
              body: buildFormData(true, false),
            });
            resJson = await res.json();
          }

          // Jika tetap gagal karena panjang caption atau hal lain, fallback kirim foto tanpa caption
          if (!resJson.ok) {
            console.warn("[Telegram Broadcast] sendPhoto with caption failed, fallback to photo only:", resJson.description);
            res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
              method: "POST",
              body: buildFormData(false, false),
            });
            resJson = await res.json();
          }

          if (resJson.ok) {
            flyerMessageId = resJson.result?.message_id;
          } else {
            console.error("[Telegram Broadcast Error sendPhoto]", resJson);
          }
        } else {
          // Caption > 1000 karakter: kirim foto murni dulu
          const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
            method: "POST",
            body: buildFormData(false, false),
          });
          const resJson = await res.json();
          if (resJson.ok) {
            flyerMessageId = resJson.result?.message_id;
          } else {
            console.error("[Telegram Broadcast Error sendPhoto]", resJson);
          }
        }
      } else {
        // --- Multiple Photos (Media Group) ---
        const buildMediaGroupFormData = (withCaption: boolean, htmlMode: boolean) => {
          const fd = new FormData();
          fd.append("chat_id", groupId);

          const mediaArray = flyers.map((flyer, idx) => {
            const attachName = `file${idx}`;
            const { buffer, mimeType } = base64ToBlob(flyer);
            const blob = new Blob([buffer as any], { type: mimeType });
            fd.append(attachName, blob, `flyer_${idx + 1}.jpg`);

            const item: any = {
              type: "photo",
              media: `attach://${attachName}`,
            };
            if (idx === 0 && withCaption && caption) {
              item.caption = caption;
              if (htmlMode) item.parse_mode = "HTML";
            }
            return item;
          });

          fd.append("media", JSON.stringify(mediaArray));
          return fd;
        };

        if (!isCaptionTooLongForPhoto) {
          let res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMediaGroup`, {
            method: "POST",
            body: buildMediaGroupFormData(true, useHtmlParseMode),
          });
          let resJson = await res.json();

          if (!resJson.ok && useHtmlParseMode) {
            console.warn("[Telegram Broadcast] sendMediaGroup HTML parse failed, retrying plain text:", resJson.description);
            res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMediaGroup`, {
              method: "POST",
              body: buildMediaGroupFormData(true, false),
            });
            resJson = await res.json();
          }

          if (!resJson.ok) {
            console.warn("[Telegram Broadcast] sendMediaGroup with caption failed, fallback to media only:", resJson.description);
            res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMediaGroup`, {
              method: "POST",
              body: buildMediaGroupFormData(false, false),
            });
            resJson = await res.json();
          }

          if (resJson.ok && Array.isArray(resJson.result) && resJson.result.length > 0) {
            flyerMessageId = resJson.result[0]?.message_id;
          } else {
            console.error("[Telegram Broadcast Error sendMediaGroup]", resJson);
          }
        } else {
          // Caption > 1000 karakter: kirim media group tanpa caption
          const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMediaGroup`, {
            method: "POST",
            body: buildMediaGroupFormData(false, false),
          });
          const resJson = await res.json();
          if (resJson.ok && Array.isArray(resJson.result) && resJson.result.length > 0) {
            flyerMessageId = resJson.result[0]?.message_id;
          } else {
            console.error("[Telegram Broadcast Error sendMediaGroup]", resJson);
          }
        }
      }

      // Jika caption belum terkirim bersama foto (karena > 1000 karakter atau fallback),
      // kirim caption secara utuh APA ADANYA via sendMessage
      if (isCaptionTooLongForPhoto || !flyerMessageId) {
        captionMessageId = await sendTextMessageSafe(groupId, caption, flyerMessageId);
      }
    } else {
      // Tidak ada flyer: Kirim caption teks murni apa adanya
      captionMessageId = await sendTextMessageSafe(groupId, caption);
    }

    // Step 2: Send Reply Message containing Package Code(s) / Hashtag
    let replyMessageId: number | undefined;

    let replyText = "";
    if (pkgList.length === 1) {
      const code = pkgList[0].kodeIndividu || pkgList[0].kode || "KODE_PAKET_N/A";
      replyText = code.startsWith("#") ? code : `#${code}`;
    } else {
      const rawGrup = params.kodeGrup || pkgList[0].kodeGrup || "KODE_GRUP_N/A";
      const kodeGrup = rawGrup.startsWith("#") ? rawGrup : `#${rawGrup}`;
      const individualCodes = pkgList
        .map((p) => {
          const c = p.kodeIndividu || p.kode;
          return c ? (c.startsWith("#") ? c : `#${c}`) : null;
        })
        .filter(Boolean);
      replyText = [kodeGrup, ...individualCodes].join("\n");
    }

    // Balas (reply) ke pesan konten terakhir yang berhasil terkirim (caption atau flyer)
    const targetReplyMessageId = captionMessageId || flyerMessageId;

    const replyPayload: any = {
      chat_id: groupId,
      text: replyText,
    };
    if (targetReplyMessageId) {
      replyPayload.reply_to_message_id = targetReplyMessageId;
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
      flyerMessageId: flyerMessageId || captionMessageId,
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
