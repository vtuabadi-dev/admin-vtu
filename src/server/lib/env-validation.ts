// ============================================================
// Environment Validation — Startup Check
// ============================================================
// Dipanggil saat aplikasi startup (instrumentation.ts atau
// health check endpoint). Validasi seluruh env var penting
// dan berikan error yang jelas jika ada yang kurang.
// ============================================================

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;        // gagal startup jika tidak ada
  productionOnly: boolean;  // hanya diwajibkan di production
  validator?: (v: string) => string | null; // return error message jika invalid, null jika ok
}

interface EnvValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_ENV_CHECKS: EnvCheck[] = [
  // ── Database ─────────────────────────────────────────────
  {
    name: "DATABASE_URL",
    value: process.env.DATABASE_URL,
    required: true,
    productionOnly: false,
    validator: (v) => {
      if (!v.startsWith("postgresql://") && !v.startsWith("postgres://")) {
        return "DATABASE_URL harus diawali dengan postgresql:// atau postgres://";
      }
      // Production: must use PgBouncer (port 6543) or Supabase pooler
      if (process.env.NODE_ENV === "production" && !v.includes("pgbouncer=true")) {
        return "Production DATABASE_URL harus menggunakan PgBouncer. Tambahkan ?pgbouncer=true di connection string Supabase Pooler (port 6543).";
      }
      return null;
    },
  },

  // ── Auth ─────────────────────────────────────────────────
  {
    name: "AUTH_SECRET / NEXTAUTH_SECRET",
    value: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    required: true,
    productionOnly: false,
    validator: (v) => {
      if (v.length < 32) {
        return "AUTH_SECRET / NEXTAUTH_SECRET harus minimal 32 karakter. Generate dengan: openssl rand -hex 32";
      }
      if (process.env.NODE_ENV === "production") {
        const weakPatterns = ["dev-secret", "changeme", "secret123", "password123"];
        for (const w of weakPatterns) {
          if (v.toLowerCase().includes(w)) {
            return `AUTH_SECRET / NEXTAUTH_SECRET mengandung nilai development ("${w}"). Gunakan production secret yang kuat.`;
          }
        }
      }
      return null;
    },
  },

  {
    name: "AUTH_URL",
    value: process.env.AUTH_URL,
    required: true,
    productionOnly: true,
    validator: (v) => {
      if (!v.startsWith("https://")) {
        return "AUTH_URL production HARUS menggunakan https://. Contoh: https://vtu-abadi.vercel.app";
      }
      return null;
    },
  },

  {
    name: "NEXTAUTH_URL",
    value: process.env.NEXTAUTH_URL,
    required: true,
    productionOnly: true,
    validator: (v) => {
      if (!v.startsWith("https://")) {
        return "NEXTAUTH_URL production HARUS menggunakan https://. Contoh: https://vtu-abadi.vercel.app";
      }
      return null;
    },
  },

  // ── Storage ──────────────────────────────────────────────
  {
    name: "GOOGLE_DRIVE_FOLDER_ID",
    value: process.env.GOOGLE_DRIVE_FOLDER_ID,
    required: false,
    productionOnly: true,
    validator: (v) => {
      if (!/^[a-zA-Z0-9_-]{15,60}$/.test(v)) {
        return "GOOGLE_DRIVE_FOLDER_ID format tidak valid. Folder ID bisa ditemukan di URL Google Drive: https://drive.google.com/drive/folders/<FOLDER_ID>";
      }
      return null;
    },
  },

  // ── OCR ──────────────────────────────────────────────────
  {
    name: "GOOGLE_VISION_API_KEY",
    value: process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY_2,
    required: false,
    productionOnly: false, // optional — OCR bisa pakai placeholder di development
    validator: undefined,  // no format validation for API keys
  },
];

const WARN_CHECKS: EnvCheck[] = [
  {
    name: "NOTIFICATION_PROVIDER",
    value: process.env.NOTIFICATION_PROVIDER,
    required: false,
    productionOnly: false,
  },
  {
    name: "LOG_LEVEL",
    value: process.env.LOG_LEVEL,
    required: false,
    productionOnly: false,
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    value: process.env.NEXT_PUBLIC_APP_URL,
    required: false,
    productionOnly: true,
  },
];

export function validateEnvironment(): EnvValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  for (const check of REQUIRED_ENV_CHECKS) {
    if (check.productionOnly && !isProduction) continue;

    if (!check.value || check.value.trim() === "") {
      if (check.required) {
        errors.push(`❌ ${check.name} — WAJIB di-set${check.productionOnly ? " di production" : ""}.`);
        continue;
      } else {
        warnings.push(`⚠️  ${check.name} — tidak di-set.${isProduction ? " Beberapa fitur mungkin tidak berfungsi." : ""}`);
        continue;
      }
    }

    if (check.validator) {
      const validationError = check.validator(check.value);
      if (validationError) {
        if (check.required) {
          errors.push(`❌ ${check.name} — ${validationError}`);
        } else {
          warnings.push(`⚠️  ${check.name} — ${validationError}`);
        }
      }
    }
  }

  for (const check of WARN_CHECKS) {
    if (check.productionOnly && !isProduction) continue;
    if (!check.value || check.value.trim() === "") {
      warnings.push(`💡 ${check.name} — tidak di-set (menggunakan default).`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Startup Bootstrap ─────────────────────────────────────

export function bootstrapEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const report = validateEnvironment();

  // Log warnings
  for (const w of report.warnings) {
    console.warn(`[ENV] ${w}`);
  }

  if (!report.valid) {
    const message =
      `\n╔══════════════════════════════════════════════════════════════╗\n` +
      `║  ENVIRONMENT VALIDATION FAILED                               ║\n` +
      `╠══════════════════════════════════════════════════════════════╣\n` +
      report.errors.map((e) => `║  ${e.padEnd(58)}║`).join("\n") +
      `\n` +
      `╠══════════════════════════════════════════════════════════════╣\n` +
      `║  Fix: set variabel di Vercel Dashboard → Settings →          ║\n` +
      `║  Environment Variables, atau di .env untuk development.      ║\n` +
      `╚══════════════════════════════════════════════════════════════╝\n`;

    if (isProduction) {
      // Production: throw — jangan lanjutkan startup dengan konfigurasi tidak valid
      throw new Error(message);
    } else {
      // Development: warn saja — biarkan developer melanjutkan
      console.warn(message);
    }
  } else if (isProduction) {
    console.log("[ENV] ✅ All production environment variables validated.");
  }
}
