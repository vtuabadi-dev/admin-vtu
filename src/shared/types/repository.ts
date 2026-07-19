import { IBaseMasterData, IMasterDataRequestParams, IPaginatedResponse } from "./master-data";

/**
 * Generic Repository Contract for Master Data Platform
 * Ensures all repositories implement the exact same signature.
 */
export interface IGenericRepository<T extends IBaseMasterData, CreateDTO, UpdateDTO> {
  // Basic CRUD
  create(data: CreateDTO, userId: string): Promise<T>;
  update(id: string, data: UpdateDTO, userId: string): Promise<T>;
  findById(id: string): Promise<T | null>;
  
  // Queries
  search(params: IMasterDataRequestParams): Promise<IPaginatedResponse<T>>;
  
  // Lifecycle Management
  activate(id: string, userId: string): Promise<T>;
  deactivate(id: string, userId: string): Promise<T>;
  archive(id: string, userId: string): Promise<T>;
  restore(id: string, userId: string): Promise<T>;
  
  // Deletion Policies
  /**
   * Only allowed if no dependencies exist (reference check)
   */
  delete(id: string, userId: string, forceHardDelete?: boolean): Promise<boolean>;
  
  // Validations & Constraints
  existCheck(field: keyof T, value: any): Promise<boolean>;
  referenceCheck(id: string): Promise<{ isReferenced: boolean; referencedBy: string[] }>;
  
  // Bulk Operations
  bulkUpdate(ids: string[], data: Partial<UpdateDTO>, userId: string): Promise<number>;
  bulkArchive(ids: string[], userId: string): Promise<number>;
  bulkDelete(ids: string[], userId: string): Promise<number>;
}
