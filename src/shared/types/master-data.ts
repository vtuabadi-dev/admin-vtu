/**
 * Interface dasar untuk seluruh entitas Master Data
 * Sesuai dengan Blueprint Enterprise Activity Center dan Master Data Implementation Map
 */
export enum LifecycleStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED"
}

export interface IBaseMasterData {
  id: string;
  status: LifecycleStatus;
  is_deleted: boolean; // Retained for soft delete compatibility if needed, though DELETED status can also be used
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface IMasterDataRequestParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}
