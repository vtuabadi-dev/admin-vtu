// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLocalAdapter } from "../../storage/local";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("LocalStorageAdapter", () => {
  let adapter: ReturnType<typeof createLocalAdapter>;
  let tmpDir: string;
  let origStoragePath: string | undefined;

  beforeEach(async () => {
    origStoragePath = process.env.STORAGE_PATH;
    tmpDir = path.join(os.tmpdir(), `vtu-storage-test-${Date.now()}`);
    process.env.STORAGE_PATH = tmpDir;
    await fs.mkdir(tmpDir, { recursive: true });
    adapter = createLocalAdapter();
  });

  afterEach(async () => {
    process.env.STORAGE_PATH = origStoragePath;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should upload and download a file", async () => {
    const content = Buffer.from("test content");
    const fileUrl = await adapter.upload("test/file.txt", content, "text/plain");

    expect(fileUrl).toContain("file.txt");
    expect(await adapter.exists("test/file.txt")).toBe(true);

    const downloaded = await adapter.download("test/file.txt");
    expect(downloaded.toString()).toBe("test content");
  });

  it("should check file existence", async () => {
    const exists = await adapter.exists("nonexistent.txt");
    expect(exists).toBe(false);

    await adapter.upload("exists.txt", Buffer.from("x"), "text/plain");
    expect(await adapter.exists("exists.txt")).toBe(true);
  });

  it("should delete a file", async () => {
    await adapter.upload("todelete.txt", Buffer.from("x"), "text/plain");
    await adapter.delete("todelete.txt");
    expect(await adapter.exists("todelete.txt")).toBe(false);
  });

  it("should not throw when deleting non-existent file", async () => {
    await expect(adapter.delete("nonexistent.txt")).resolves.not.toThrow();
  });

  it("should list files in directory", async () => {
    await adapter.upload("dir/a.txt", Buffer.from("a"), "text/plain");
    await adapter.upload("dir/b.txt", Buffer.from("bb"), "text/plain");

    const files = await adapter.list("dir");
    expect(files).toHaveLength(2);
    expect(files[0]!.size).toBeGreaterThan(0);
  });

  it("should return empty array for non-existent directory", async () => {
    const files = await adapter.list("nonexistent-dir");
    expect(files).toEqual([]);
  });

  it("should block path traversal", async () => {
    await expect(adapter.upload("../../../etc/passwd", Buffer.from("x"), "text/plain"))
      .rejects.toThrow("Path traversal");
  });

  it("should get URL for file", async () => {
    await adapter.upload("url-test.txt", Buffer.from("x"), "text/plain");
    const url = await adapter.getUrl("url-test.txt");
    expect(url).toContain("url-test.txt");
  });
});
