// Worker Entry Point — dipanggil via `npm run worker` atau Docker CMD
// Menjalankan semua BullMQ workers + health check HTTP server

import http from "http";
import { startAllWorkers, stopAllWorkers } from "./index";

const PORT = parseInt(process.env.WORKER_PORT || "3001", 10);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

async function main() {
  try {
    await startAllWorkers();
    console.log("[Worker] All workers started — processing jobs...");

    server.listen(PORT, () => {
      console.log(`[Worker] Health server listening on :${PORT}`);
    });
  } catch (err) {
    console.error("[Worker] Startup failed:", err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[Worker] Received ${signal}, shutting down...`);
  server.close();
  await stopAllWorkers();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main();
