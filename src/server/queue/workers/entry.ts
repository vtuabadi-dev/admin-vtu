// Worker entrypoint — spawned by Dockerfile.worker
// Runs all BullMQ workers in a single process.

import { startAllWorkers, stopAllWorkers } from "./index";

async function main(): Promise<void> {
  console.log("[Worker Entry] Booting...");
  await startAllWorkers();
  console.log("[Worker Entry] All workers running. Awaiting jobs...");

  process.on("SIGTERM", async () => {
    console.log("[Worker Entry] SIGTERM received, shutting down...");
    await stopAllWorkers();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Worker Entry] SIGINT received, shutting down...");
    await stopAllWorkers();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Worker Entry] Fatal error:", err);
  process.exit(1);
});
