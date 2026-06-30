// ============================================================
// Next.js Instrumentation Hook — Startup Validation
// ============================================================
// Dipanggil saat server startup (sebelum request pertama).
// Validasi environment variables dan koneksi penting.
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import — hindari bundling di edge runtime
    const { bootstrapEnvironment } = await import("@/server/lib/env-validation");
    try {
      bootstrapEnvironment();
    } catch (err) {
      console.error("[STARTUP] Environment validation failed:", (err as Error).message);
      throw err; // Re-throw → Next.js akan gagal startup
    }
  }
}
