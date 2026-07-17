# Enterprise Activity Center - Event Standard
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System
**Architecture:** Framework Agnostic

## 1. Overview
Dokumen ini menstandardisasi skema struktur Event (JSON/Object) yang akan menjadi bahasa universal (*Lingua Franca*) untuk seluruh log dan notifikasi aktivitas di dalam VTU ABADI. Dengan skema yang baku, proses penyerapan data (*ingestion*), pelacakan, dan visualisasi dapat berjalan konsisten lintas bahasa pemrograman dan lintas modul.

## 2. Event Structure Standard

Berikut adalah skema field wajib (Mandatory Metadata) yang harus dipatuhi saat suatu modul "memancarkan" event ke Activity Center.

```json
{
  "event_id": "UUID (Auto-generated)",
  "correlation_id": "String (Identifier rantai bisnis)",
  
  "context": {
    "domain": "String (e.g., 'Master Data', 'Order Jamaah')",
    "menu": "String (e.g., 'Hotel', 'Pembayaran')",
    "entity": "String (e.g., 'Hotel', 'Order', 'User')",
    "entity_id": "String/UUID (ID spesifik data)",
    "entity_name": "String (e.g., 'Swissotel Makkah', 'ORD-000123')"
  },

  "action": {
    "type": "Enum (Create, Update, Delete, Approve, Export, dll)",
    "severity": "Enum (Information, Warning, Critical, Emergency)",
    "source": "Enum (Manual User, System, Webhook, Import CSV, dll)",
    "timestamp": "ISO-8601 with Timezone (e.g., 2026-08-20T14:30:00+07:00)"
  },

  "actor": {
    "actor_id": "String/UUID (ID User atau System ID)",
    "actor_name": "String (e.g., 'Budi Admin', 'System Cron')",
    "role": "String (e.g., 'Super Admin', 'Finance')",
    "department": "String (e.g., 'Operasional', 'IT')"
  },

  "detail": {
    "description": "String (Human-readable summary of the action)",
    "reason": "String (Optional. Keterangan/alasan dari User)",
    "old_value": "JSON/Object (State sebelum perubahan. Null jika Create)",
    "new_value": "JSON/Object (State sesudah perubahan. Null jika Delete)"
  },
  
  "navigation": {
    "reference_action": "String (e.g., 'Open Order', 'View Invoice')",
    "url_path": "String (e.g., '/order/ORD-000123')"
  }
}
```

## 3. Correlation ID & Event Hierarchy

### The Power of Correlation ID
Dalam sistem ERP, satu pemantik aktivitas dapat memicu ratusan event lain. **Correlation ID** digunakan sebagai "benang merah" untuk menelusuri rentetan kejadian.
- *Contoh Pemicu:* Customer melakukan Pembayaran (Payment Gateway Webhook).
- *Event 1:* [Pembayaran] Payment status menjadi Paid. (Source: Webhook).
- *Event 2:* [Invoice] Sistem meng-update Invoice menjadi Settled. (Source: System).
- *Event 3:* [Order] Sistem mengganti status Order menjadi Confirmed. (Source: System).
- *Event 4:* [Manifest] Sistem meletakkan Jamaah ke Manifest Tunggu. (Source: System).
- *Event 5:* [Notification] Sistem mengirim WhatsApp e-Receipt ke Jamaah. (Source: System).

Semua 5 Event di atas WAJIB memiliki `correlation_id` yang SAMA (misal: id transaksi payment tersebut). Hal ini akan menciptakan *Event Hierarchy* dan memungkinkan auditor menyaring satu Correlation ID untuk melihat keseluruhan runtutan sebab-akibat secara kronologis sempurna.
