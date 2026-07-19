/**
 * Enterprise Activity Center (EAC) Logger Service
 * Phase: Sprint 1 (Foundation)
 * 
 * Modul ini bertugas sebagai interceptor standar untuk mencatat semua
 * aktivitas CRUD (Create, Update, Inactive, Soft Delete) di Master Data
 * sesuai dengan arsitektur Append-Only Log.
 */

export interface EACLogPayload {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "INACTIVE" | "DELETE";
  oldValue?: any;
  newValue?: any;
  userId: string;
  userRole: string;
  correlationId?: string; // Untuk melacak rentetan aktivitas berantai
}

export class EACLoggerService {
  /**
   * Log aktivitas secara asinkron tanpa memblokir eksekusi utama (Fire and Forget)
   * Di masa depan, ini bisa diarahkan ke Message Queue (Kafka/RabbitMQ) atau tabel Audit khusus.
   */
  static async logAction(payload: EACLogPayload): Promise<void> {
    try {
      // TODO: Implementasi insert ke tabel EAC_Audit_Log via Prisma pada Sprint 13
      // Untuk Sprint 1, kita hanya stubbing fungsi agar bisa dipakai oleh CRUD Service.
      
      const logEntry = {
        ...payload,
        timestamp: new Date().toISOString(),
      };
      
      // Simulate async log processing
      if (process.env.NODE_ENV === "development") {
        console.log("[EAC_LOGGER] Activity Event Logged:", JSON.stringify(logEntry, null, 2));
      }
      
    } catch (error) {
      // Logger tidak boleh menggagalkan transaksi utama
      console.error("[EAC_LOGGER_ERROR] Gagal mencatat log aktivitas:", error);
    }
  }

  /**
   * Helper untuk meng-generate correlation ID standar
   */
  static generateCorrelationId(): string {
    return `eac-corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
