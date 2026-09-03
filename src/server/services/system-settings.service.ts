import fs from "fs";
import path from "path";
import { prisma } from "@/server/db/client";

export interface GeneralSystemSettings {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  minDpPerPax: string;
  waHeader?: string;
  waBadalFormat?: string;
  masterTambahanOpts?: string[];
  masterPotonganOpts?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: GeneralSystemSettings = {
  bankName: "Bank Syariah Indonesia (BSI)",
  bankAccount: "7123 4567 89",
  bankHolder: "PT VTU ABADI TRAVEL",
  minDpPerPax: "5000000",
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

let cachedGeneralSettings: GeneralSystemSettings | null = null;

function getGeneralStoragePath(): string {
  const dir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return path.join(dir, "general-settings.json");
}

export async function getGeneralSettings(): Promise<GeneralSystemSettings> {
  if (cachedGeneralSettings) return cachedGeneralSettings;

  // 1. Try reading from PostgreSQL Database via AuditEntry (Persistent across cold-starts)
  try {
    const latestDbRecord = await prisma.auditEntry.findFirst({
      where: { action: "UPDATE_GENERAL_SETTINGS" },
      orderBy: { timestamp: "desc" },
    });

    if (latestDbRecord?.after) {
      const parsed = JSON.parse(latestDbRecord.after);
      if (parsed && typeof parsed === "object") {
        cachedGeneralSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          updatedAt: latestDbRecord.timestamp.toISOString(),
        };
        return cachedGeneralSettings!;
      }
    }
  } catch (dbErr) {
    console.warn("[SystemSettings] Error reading settings from Database:", dbErr);
  }

  // 2. Fallback to file storage if DB is empty
  try {
    const filePath = getGeneralStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        cachedGeneralSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        return cachedGeneralSettings!;
      }
    }
  } catch (err) {
    console.warn("[SystemSettings] Error reading settings file:", err);
  }

  cachedGeneralSettings = DEFAULT_SETTINGS;
  return DEFAULT_SETTINGS;
}

export async function updateGeneralSettings(
  newSettings: Partial<GeneralSystemSettings>,
  updatedBy: string = "admin"
): Promise<GeneralSystemSettings> {
  const current = await getGeneralSettings();

  const updated: GeneralSystemSettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  cachedGeneralSettings = updated;

  // Save to PostgreSQL Database
  try {
    await prisma.auditEntry.create({
      data: {
        userId: "admin-settings",
        userName: updatedBy,
        role: "super_admin",
        module: "sistem",
        action: "UPDATE_GENERAL_SETTINGS",
        detail: `Konfigurasi umum operasional sistem disimpan di database`,
        after: JSON.stringify(updated),
      },
    });
  } catch (dbErr) {
    console.error("[SystemSettings] Failed to save settings to PostgreSQL Database:", dbErr);
  }

  // Save to file
  try {
    const filePath = getGeneralStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("[SystemSettings] Failed saving settings to file:", err);
  }

  return updated;
}
