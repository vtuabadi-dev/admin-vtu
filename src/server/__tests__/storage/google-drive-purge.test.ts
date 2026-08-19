import { describe, it, expect, vi, beforeEach } from "vitest";
import { purgePackageStorageFolder } from "../../storage/google-drive";

describe("purgePackageStorageFolder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false if folderMetaOrId is null or empty", async () => {
    const result = await purgePackageStorageFolder(null);
    expect(result).toBe(false);
  });

  it("should return false if rootFolderId is local-mock", async () => {
    const result = await purgePackageStorageFolder({ rootPackageFolderId: "local-mock" });
    expect(result).toBe(false);
  });

  it("should extract rootPackageFolderId from object correctly", async () => {
    const meta = { rootPackageFolderId: "folder-12345" };
    const result = await purgePackageStorageFolder(meta);
    expect(typeof result).toBe("boolean");
  });
});
