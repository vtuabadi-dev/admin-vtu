import fs from "fs";
import path from "path";

export interface ReminderStageConfig {
  id: string;
  title: string;
  daysBefore: number;
  template: string;
}

export interface GlobalReminderSettings {
  globalDeadlineDays: number;
  stages: ReminderStageConfig[];
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_STAGES: ReminderStageConfig[] = [
  {
    id: "stage-1",
    title: "Reminder #1 (Pengingat Awal H-50)",
    daysBefore: 50,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Kami menginfokan bahwa pendaftaran paket {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}) telah memasuki periode pengingat H-50.

Batas akhir pelunasan resmi jatuh pada tanggal {DEADLINE_DATE} (tersisa {SISA_HARI_DEADLINE} hari lagi). Saat ini sisa tagihan rombongan Anda sebesar Rp{SISA_TAGIHAN}.

Mohon dapat dipersiapkan pelunasannya sebelum tanggal deadline tersebut. Terima kasih.

*VTU Travel Operational*`,
  },
  {
    id: "stage-2",
    title: "Reminder #2 (Pengingat Kedua H-45)",
    daysBefore: 45,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Pengingat kedua untuk pendaftaran paket {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}).

Batas akhir pelunasan resmi jatuh pada tanggal {DEADLINE_DATE} (tinggal {SISA_HARI_DEADLINE} hari lagi ke deadline H-{DEADLINE_DAYS}). Saat ini masih terdapat sisa tagihan sebesar Rp{SISA_TAGIHAN}.

Mohon segera melakukan konfirmasi dan pelunasan. Terima kasih.

*VTU Travel Operational*`,
  },
  {
    id: "stage-3",
    title: "Reminder #3 (Peringatan Batas Akhir H-40)",
    daysBefore: 40,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

PERINGATAN DEADLINE: Hari ini adalah batas akhir pelunasan resmi tanggal {DEADLINE_DATE} (H-{DEADLINE_DAYS} sebelum keberangkatan).

Sisa tagihan rombongan sebesar Rp{SISA_TAGIHAN} WAJIB dilunasi sekarang untuk pemrosesan visa dan perlengkapan jamaah.

Terima kasih atas perhatian dan kerja samanya.

*VTU Travel Operational*`,
  },
];

const DEFAULT_SETTINGS: GlobalReminderSettings = {
  globalDeadlineDays: 40,
  stages: DEFAULT_STAGES,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

// In-memory server cache
let cachedSettings: GlobalReminderSettings | null = null;

function getStorageFilePath(): string {
  const dir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return path.join(dir, "reminder-settings.json");
}

export async function getGlobalReminderSettings(): Promise<GlobalReminderSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
        cachedSettings = {
          globalDeadlineDays: Number(parsed.globalDeadlineDays) || 40,
          stages: parsed.stages,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          updatedBy: parsed.updatedBy || "system",
        };
        return cachedSettings;
      }
    }
  } catch (err) {
    console.warn("[ReminderSettings] Error reading settings from file:", err);
  }

  cachedSettings = DEFAULT_SETTINGS;
  return DEFAULT_SETTINGS;
}

export async function updateGlobalReminderSettings(
  newSettings: Partial<GlobalReminderSettings>,
  updatedBy: string = "admin"
): Promise<GlobalReminderSettings> {
  const current = await getGlobalReminderSettings();

  const stages = Array.isArray(newSettings.stages) && newSettings.stages.length > 0
    ? newSettings.stages
    : current.stages;

  // Sort stages descending by daysBefore (e.g. H-50, H-45, H-40)
  const sortedStages = [...stages].sort((a, b) => b.daysBefore - a.daysBefore);

  const updated: GlobalReminderSettings = {
    globalDeadlineDays: Number(newSettings.globalDeadlineDays) || current.globalDeadlineDays || 40,
    stages: sortedStages,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  cachedSettings = updated;

  try {
    const filePath = getStorageFilePath();
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("[ReminderSettings] Failed saving settings to file:", err);
  }

  return updated;
}
