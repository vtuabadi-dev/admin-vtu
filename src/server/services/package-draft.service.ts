import { packageDraftRepo } from "../repositories/package-draft.repository";
import type { PackageDraftStatus } from "@prisma/client";
import type { PackageDraft } from "../repositories/package-draft.repository";

export const packageDraftService = {
  async findAll(params?: { status?: PackageDraftStatus; limit?: number; offset?: number }) {
    return packageDraftRepo.findAll(params);
  },

  async findById(id: string) {
    return packageDraftRepo.findById(id);
  },

  async create(data: Omit<PackageDraft, "id" | "createdAt" | "updatedAt">) {
    return packageDraftRepo.create(data);
  },

  async update(id: string, data: Partial<PackageDraft>) {
    return packageDraftRepo.update(id, data);
  },

  async delete(id: string) {
    return packageDraftRepo.delete(id);
  },
};
