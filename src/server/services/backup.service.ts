// Backup & Recovery Service
// pg_dump-based database backup + storage backup (tar) + retention
//
// TODO(PRODUCTION): Service ini menggunakan pg_dump, tar, psql, gunzip (shell commands)
// dan local filesystem — TIDAK kompatibel dengan Vercel serverless.
// Lihat PRODUCTION_TODO.md untuk strategi backup production.
// Jangan panggil service ini di Vercel environment.

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream";
import { getStorageAdapter, backupPath } from "@/server/storage";

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);
const STORAGE_ROOT = process.env.STORAGE_PATH || "./storage";
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10);

export interface BackupRecord {
  id: string;
  type: "full" | "schema" | "data";
  timestamp: string;
  filePath: string;
  sizeBytes: number;
  databaseUrl?: string;
}

// ── Database Backup (pg_dump) ─────────────────────────────────

export async function runDatabaseBackup(type: "full" | "schema" | "data" = "full"): Promise<BackupRecord> {
  const dbUrl = process.env.DATABASE_URL || "";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = `db-${type}-${timestamp}`;
  const tempFile = path.join(STORAGE_ROOT, "temp", `${id}.sql`);

  await fs.mkdir(path.dirname(tempFile), { recursive: true });

  const schemaOnly = type === "schema" ? " --schema-only" : "";
  const dataOnly = type === "data" ? " --data-only" : "";

  try {
    await execAsync(`pg_dump ${dbUrl}${schemaOnly}${dataOnly} --no-owner --no-acl -f "${tempFile}"`, {
      timeout: 300000,
      env: { ...process.env, PGPASSWORD: extractPassword(dbUrl) },
    });

    // Compress
    const gzipFile = tempFile + ".gz";
    const readStream = (await import("fs")).createReadStream(tempFile);
    const writeStream = (await import("fs")).createWriteStream(gzipFile);
    await pipelineAsync(readStream, createGzip(), writeStream);
    await fs.unlink(tempFile);

    // Upload to storage
    const storage = getStorageAdapter();
    const storagePath = backupPath(type, timestamp);
    const gzipBuffer = await fs.readFile(gzipFile);
    await storage.upload(storagePath, gzipBuffer, "application/gzip");

    const stat = await fs.stat(gzipFile);
    await fs.unlink(gzipFile);

    return { id, type, timestamp, filePath: storagePath, sizeBytes: stat.size, databaseUrl: dbUrl };
  } catch (err) {
    throw new Error(`Database backup failed: ${(err as Error).message}`);
  }
}

// ── Storage Backup (tar archive) ──────────────────────────────

export async function runStorageBackup(): Promise<BackupRecord> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = `storage-${timestamp}`;
  const tarFile = path.join(STORAGE_ROOT, "temp", `${id}.tar.gz`);

  await fs.mkdir(path.dirname(tarFile), { recursive: true });

  try {
    // Back up all storage subdirectories
    const dirs = ["passports", "ktp", "vaccines", "pasfoto", "exports", "invoices", "manifests", "dokumen"];
    const dirArgs = dirs.join(" ");
    await execAsync(`tar -czf "${tarFile}" -C "${STORAGE_ROOT}" ${dirArgs} 2>/dev/null || echo "no files to backup"`, {
      timeout: 600000,
    });

    const storage = getStorageAdapter();
    const buffer = await fs.readFile(tarFile);
    const storagePath = backupPath("full", timestamp);
    await storage.upload(storagePath, buffer, "application/gzip");

    const stat = await fs.stat(tarFile);
    await fs.unlink(tarFile);

    return { id, type: "full", timestamp, filePath: storagePath, sizeBytes: stat.size };
  } catch (err) {
    throw new Error(`Storage backup failed: ${(err as Error).message}`);
  }
}

// ── List & Restore ────────────────────────────────────────────

export async function listBackups(): Promise<BackupRecord[]> {
  const storage = getStorageAdapter();
  const files = await storage.list("backups/");
  return files.map((f) => {
    const name = path.basename(f.path, ".sql.gz").replace(/\.tar\.gz$/, "");
    // Expected format: db-{type}-{timestamp} or storage-{timestamp}
    const match = name.match(/^(db|storage)-(\w+)-(.+)$/);
    if (match) {
      return {
        id: name,
        type: (match[2] === "full" || match[2] === "schema" || match[2] === "data" ? match[2] : "full") as "full" | "schema" | "data",
        timestamp: match[3]!,
        filePath: f.path,
        sizeBytes: f.size,
      };
    }
    return { id: name, type: "full", timestamp: "", filePath: f.path, sizeBytes: f.size };
  });
}

export async function restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
  const dbUrl = process.env.DATABASE_URL || "";
  const storage = getStorageAdapter();
  const storagePath = `backups/${backupId}.sql.gz`;

  const exists = await storage.exists(storagePath);
  if (!exists) return { success: false, message: "Backup not found" };

  const tempDir = path.join(STORAGE_ROOT, "temp", "restore");
  await fs.mkdir(tempDir, { recursive: true });

  const gzipFile = path.join(tempDir, `${backupId}.sql.gz`);
  const sqlFile = path.join(tempDir, `${backupId}.sql`);

  try {
    const buffer = await storage.download(storagePath);
    await fs.writeFile(gzipFile, buffer);

    await execAsync(`gunzip -c "${gzipFile}" > "${sqlFile}"`);
    await execAsync(`psql ${dbUrl} -f "${sqlFile}"`, {
      timeout: 300000,
      env: { ...process.env, PGPASSWORD: extractPassword(dbUrl) },
    });

    return { success: true, message: `Backup ${backupId} restored successfully` };
  } catch (err) {
    return { success: false, message: `Restore failed: ${(err as Error).message}` };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function cleanupOldBackups(retentionDays: number = RETENTION_DAYS): Promise<{ deleted: number }> {
  const storage = getStorageAdapter();
  const files = await storage.list("backups/");
  const cutoff = Date.now() - retentionDays * 86400000;
  let deleted = 0;

  for (const file of files) {
    if (file.modifiedAt.getTime() < cutoff) {
      await storage.delete(file.path);
      deleted++;
    }
  }

  return { deleted };
}

// ── Helpers ───────────────────────────────────────────────────

function extractPassword(url: string): string {
  try {
    const u = new URL(url);
    return u.password || "";
  } catch {
    return "";
  }
}
