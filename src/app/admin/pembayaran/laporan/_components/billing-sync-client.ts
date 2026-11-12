"use client";

import {
  syncGroupBillingItems,
  updateJamaahHotels,
  getGroupPaymentSummary,
} from "@/server/actions/api";
import { broadcastMutation } from "@/shared/lib/realtime-bus";
import { useOperationalStore } from "@/stores/operational-store";
import type { GroupPaymentSummary, RegistrationGroup } from "@/shared/types";

export type BillingSyncPayload = Parameters<typeof syncGroupBillingItems>[0]["items"];

/**
 * Mengirim event broadcast terpadu ke seluruh modul/tab terkait perubahan tagihan grup.
 */
export function broadcastBillingGroupMutation(
  groupId: string,
  options?: { includeJamaah?: boolean; includePembayaran?: boolean; invoiceAction?: "INSERT" | "UPDATE"; invoiceId?: string }
) {
  broadcastMutation(
    "invoices",
    options?.invoiceAction ?? "UPDATE",
    options?.invoiceId ? { id: options.invoiceId, groupId } : { groupId }
  );
  broadcastMutation("registration_groups", "UPDATE", { id: groupId });
  broadcastMutation("manifest", "UPDATE", { groupId });
  broadcastMutation("manifest_rows", "UPDATE", { groupId });
  broadcastMutation("audit_entries", "INSERT", { groupId });
  if (options?.includePembayaran) {
    broadcastMutation("pembayaran", "UPDATE", { groupId });
  }
  if (options?.includeJamaah) {
    broadcastMutation("jamaah", "UPDATE", { groupId });
  }
}

/**
 * Menyinkronkan item tagihan/potongan grup ke database dan langsung memperbarui cache operational store
 * agar tampilan Manifest Pembayaran langsung menampilkan angka terbaru tanpa menunggu refetch penuh.
 */
export async function syncBillingItemsAndStore(params: {
  groupId: string;
  totalTagihan?: number;
  items: BillingSyncPayload;
}): Promise<{
  success: boolean;
  totalTagihan?: number;
  sisaPembayaran?: number;
  group?: RegistrationGroup | null;
  message?: string;
}> {
  const store = useOperationalStore.getState();
  store.invalidateOperationalData(["groups"]);

  const res = await syncGroupBillingItems(params);
  if (res.success) {
    if (res.group) {
      store.upsertGroupInStore(res.group as RegistrationGroup);
    } else if (res.totalTagihan !== undefined) {
      store.upsertGroupInStore({
        id: params.groupId,
        totalTagihan: res.totalTagihan,
        ...(res.sisaPembayaran !== undefined ? { sisaPembayaran: res.sisaPembayaran } : {}),
      });
    }
    broadcastBillingGroupMutation(params.groupId, { includePembayaran: true });
  }
  return res;
}

/**
 * Menyinkronkan pembaruan hotel upgrade jamaah ke database lalu langsung memperbarui store & broadcast.
 */
export async function syncJamaahHotelsAndStore(params: {
  jamaahIds?: string[];
  jamaahNames: string[];
  groupId: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
}) {
  const store = useOperationalStore.getState();
  store.invalidateOperationalData(["jamaah"]);

  const res = await updateJamaahHotels(params);
  if (res.success) {
    store.updateJamaahHotelsInStore({
      jamaahIds: params.jamaahIds,
      jamaahNames: params.jamaahNames,
      groupId: params.groupId,
      hotelMekkah: params.hotelMekkah,
      hotelMadinah: params.hotelMadinah,
    });
    broadcastMutation("jamaah", "UPDATE", { groupId: params.groupId });
    broadcastMutation("manifest", "UPDATE", { groupId: params.groupId });
    broadcastMutation("manifest_rows", "UPDATE", { groupId: params.groupId });
  }
  return res;
}

/**
 * Menyelaraskan GroupPaymentSummary ke operational store (atau mengambil snapshot segar berdasarkan groupId).
 */
export function syncGroupSummaryIntoStore(summary: GroupPaymentSummary | null | undefined) {
  if (!summary) return;
  useOperationalStore.getState().syncGroupSummaryInStore(summary);
}

export async function refreshStoreGroupSummaryById(
  groupId: string,
  extraScopes: ("jamaah" | "groups")[] = []
) {
  if (!groupId) return;
  const scopes = Array.from(new Set<"jamaah" | "groups">(["groups", ...extraScopes]));
  useOperationalStore.getState().invalidateOperationalData(scopes);
  try {
    const summary = await getGroupPaymentSummary(groupId);
    if (summary) {
      syncGroupSummaryIntoStore(summary);
    }
  } catch (err) {
    console.warn("[BillingSyncClient] Failed refreshing group summary for store:", err);
  }
}
