import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "./adapter";

const BASE_PATH = process.env.STORAGE_PATH || (process.env.VERCEL ? "/tmp/storage" : "./storage");

function resolve(p: string): string {
  const resolved = path.resolve(path.join(BASE_PATH, p));
  if (!resolved.startsWith(path.resolve(BASE_PATH))) {
    throw new Error(`Path traversal attempt: ${p}`);
  }
  return resolved;
}

export function createLocalAdapter(): StorageAdapter {
  return {
    async upload(p: string, buffer: Buffer, _contentType: string): Promise<string> {
      const fullPath = resolve(p);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);
      return fullPath;
    },

    async download(p: string): Promise<Buffer> {
      const fullPath = resolve(p);
      return fs.readFile(fullPath);
    },

    async delete(p: string): Promise<void> {
      const fullPath = resolve(p);
      try { await fs.unlink(fullPath); } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    },

    async exists(p: string): Promise<boolean> {
      try { await fs.access(resolve(p)); return true; } catch { return false; }
    },

    async getUrl(p: string): Promise<string> {
      try {
        const fullPath = resolve(p);
        const buffer = await fs.readFile(fullPath);
        const ext = p.split(".").pop()?.toLowerCase() || "jpeg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      } catch {
        return resolve(p);
      }
    },

    async list(prefix: string): Promise<{ path: string; size: number; modifiedAt: Date }[]> {
      const dir = resolve(prefix);
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results: { path: string; size: number; modifiedAt: Date }[] = [];
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          results.push({ path: fullPath, size: stat.size, modifiedAt: stat.mtime });
        }
        return results;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
      }
    },
  };
}
