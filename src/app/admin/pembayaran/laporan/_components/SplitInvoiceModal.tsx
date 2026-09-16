"use client";

import { useState, useEffect } from "react";
import { sortGroupMembers } from "@/shared/lib/document-utils";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import type { GroupPaymentSummary, InvoiceSplitConfig, InvoiceSplitItem } from "@/shared/types";

export default
function SplitInvoiceModal({
  open,
  onClose,
  groupData,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  groupData: GroupPaymentSummary;
  onSubmit: (config: InvoiceSplitConfig) => void;
}) {
  const anggota = sortGroupMembers(groupData.anggota);
  const [splitCount, setSplitCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  useEffect(() => {
    const newAssignments: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAssignments[a.id] = i % splitCount;
    });
    setAssignments(newAssignments);
  }, [splitCount, anggota]);

  function handleSubmit() {
    const splits: InvoiceSplitItem[] = Array.from({ length: splitCount }, (_, i) => {
      const label = String.fromCharCode(65 + i);
      const anggotaIds = anggota.filter((a) => assignments[a.id] === i).map((a) => a.id);
      return {
        id: `${groupData.groupId}-split-${label}`,
        label: `Invoice ${label}`,
        anggotaIds,
      };
    }).filter((s) => s.anggotaIds.length > 0);

    const config: InvoiceSplitConfig = {
      groupId: groupData.groupId,
      createdAt: new Date().toISOString(),
      splits,
    };
    onSubmit(config);
  }

  return (
    <Modal open={open} onClose={onClose} title="Pecah Invoice" size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Pecah menjadi berapa invoice?</label>
          <Select
            options={[
              { value: "2", label: "2 Invoice" },
              { value: "3", label: "3 Invoice" },
              { value: "4", label: "4 Invoice" },
            ]}
            value={String(splitCount)}
            onChange={(e) => setSplitCount(Number(e.target.value))}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Pilih anggota per invoice:</p>
          <div className="space-y-3">
            {Array.from({ length: splitCount }, (_, i) => {
              const label = String.fromCharCode(65 + i);
              const members = anggota.filter((a) => assignments[a.id] === i);
              return (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-xs font-semibold mb-1.5">Invoice {label}</p>
                  <div className="flex flex-wrap gap-1">
                    {members.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Belum ada anggota</span>
                    ) : (
                      members.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            const nextSplit = (assignments[a.id]! + 1) % splitCount;
                            setAssignments((prev) => ({ ...prev, [a.id]: nextSplit }));
                          }}
                          title="Klik untuk pindahkan ke invoice lain"
                        >
                          {a.namaLengkap}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Klik nama anggota untuk memindahkan ke invoice lain
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit}>Simpan Split</Button>
        </div>
      </div>
    </Modal>
  );
}
