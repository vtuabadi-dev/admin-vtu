"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertCircle } from "lucide-react";

interface StatusToggleProps {
  isActive: boolean;
  onToggle: (newStatus: boolean) => Promise<void>;
  entityName?: string;
  disabled?: boolean;
}

export function StatusToggle({
  isActive,
  onToggle,
  entityName = "Data ini",
  disabled = false,
}: StatusToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleClick = () => {
    if (disabled) return;
    // If turning inactive, show confirmation
    if (isActive) {
      setShowConfirm(true);
    } else {
      // If turning active, you might want a confirm too, but typically only deactivating is risky
      executeToggle(true);
    }
  };

  const executeToggle = async (newStatus: boolean) => {
    setLoading(true);
    try {
      await onToggle(newStatus);
      setShowConfirm(false);
    } catch (error) {
      console.error("Gagal mengubah status", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={disabled || loading}
        onClick={handleToggleClick}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isActive ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            isActive ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>

      <Modal
        open={showConfirm}
        onClose={() => !loading && setShowConfirm(false)}
        title="Konfirmasi Perubahan Status"
      >
        <div className="py-4 flex items-start gap-4 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p>
            Anda yakin ingin menonaktifkan <strong>{entityName}</strong>? <br /><br />
            Data yang dinonaktifkan tidak akan muncul lagi dalam pilihan pembuatan paket baru. 
            Paket lama yang sudah menggunakannya tidak akan terpengaruh.
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => executeToggle(false)}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Ya, Nonaktifkan"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
