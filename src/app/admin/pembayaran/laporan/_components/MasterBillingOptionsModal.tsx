"use client";

import React, { useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { broadcastMutation } from "@/shared/lib/realtime-bus";

interface MasterBillingOptionsModalProps {
  open: boolean;
  onClose: () => void;
  kategori: "tambahan" | "potongan";
  options: string[];
  onOptionsChange: (newOptions: string[]) => void;
  onResetDefaults?: () => void;
  onActiveOptionAdded?: (newName: string) => void;
  onActiveOptionRenamed?: (oldName: string, newName: string) => void;
  onActiveOptionDeleted?: (deletedName: string) => void;
}

export default function MasterBillingOptionsModal({
  open,
  onClose,
  kategori,
  options,
  onOptionsChange,
  onResetDefaults,
  onActiveOptionAdded,
  onActiveOptionRenamed,
  onActiveOptionDeleted,
}: MasterBillingOptionsModalProps) {
  const [tempNewJenis, setTempNewJenis] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const labelKategori = kategori === "tambahan" ? "Tambahan Tagihan" : "Potongan / Diskon";
  const placeholderKategori = kategori === "tambahan" ? "tambahan tagihan" : "potongan / diskon";

  // Helper to persist reordered list
  const persistOptions = (newOptions: string[]) => {
    onOptionsChange(newOptions);
    const storageKey = kategori === "tambahan" ? "vtu_master_tambahan_opts" : "vtu_master_potongan_opts";
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newOptions));
      } catch {}
    }

    // Persist reorder to database SystemSetting
    fetch("/api/admin/pembayaran/billing-options", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", kategori, options: newOptions }),
    }).catch((err) => console.warn("[MasterBillingOptions] Reorder error:", err));

    // Broadcast realtime event
    broadcastMutation("master_billing_options", "UPDATE", { kategori, options: newOptions });
  };

  // Add new item
  const handleAddNew = async () => {
    const trimmed = tempNewJenis.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) {
      setTempNewJenis("");
      return;
    }

    const updated = [...options, trimmed];
    persistOptions(updated);
    setTempNewJenis("");

    if (onActiveOptionAdded) {
      onActiveOptionAdded(trimmed);
    }

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori, nama: trimmed }),
      });
    } catch (err) {
      console.warn("[MasterBillingOptions] Add error:", err);
    }
  };

  // Edit item
  const handleSaveEdit = async (idx: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const oldName = options[idx];
    if (!oldName) return;

    const updated = [...options];
    updated[idx] = trimmed;
    persistOptions(updated);

    if (onActiveOptionRenamed) {
      onActiveOptionRenamed(oldName, trimmed);
    }

    setEditingIndex(null);
    setEditingText("");

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldNama: oldName, newNama: trimmed, kategori }),
      });
    } catch (err) {
      console.warn("[MasterBillingOptions] Edit error:", err);
    }
  };

  // Delete item
  const handleDelete = async (optName: string) => {
    if (!confirm(`Hapus opsi "${optName}" dari master pilihan?`)) return;

    const updated = options.filter((o) => o !== optName);
    persistOptions(updated);

    if (onActiveOptionDeleted) {
      onActiveOptionDeleted(optName);
    }

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: optName, kategori }),
      });
    } catch (err) {
      console.warn("[MasterBillingOptions] Delete error:", err);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...options];
    const [movedItem] = updated.splice(draggedIndex, 1);
    if (movedItem !== undefined) {
      updated.splice(targetIndex, 0, movedItem);
      persistOptions(updated);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Step Move Up / Down
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const updated = [...options];
    const item = updated[index];
    if (item === undefined) return;
    updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    persistOptions(updated);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Kelola Master Opsi — ${labelKategori}`}
      size="sm"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ubah nama, atur urutan opsi dengan <strong>drag & drop</strong> atau tombol panah, atau hapus jenis {placeholderKategori} yang kurang sesuai. Urutan di bawah akan otomatis menjadi urutan pada dropdown formulir.
        </p>

        {/* Input Tambah Jenis Langsung */}
        <div className="flex gap-2">
          <Input
            placeholder={`Tambah jenis ${placeholderKategori} baru...`}
            value={tempNewJenis}
            onChange={(e) => setTempNewJenis(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0 gap-1 text-xs"
            onClick={handleAddNew}
            disabled={!tempNewJenis.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </Button>
        </div>

        {/* List of current options with Drag & Drop, Edit & Delete controls */}
        <div className="max-h-72 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-stone-50 dark:bg-stone-900/50">
          {options.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Belum ada opsi {placeholderKategori}.
            </div>
          ) : (
            options.map((opt, idx) => {
              const isDraggingThis = draggedIndex === idx;
              const isDragTarget = dragOverIndex === idx && draggedIndex !== idx;

              return (
                <div
                  key={`${opt}-${idx}`}
                  draggable={editingIndex !== idx}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-all ${
                    isDraggingThis
                      ? "opacity-50 bg-amber-500/20 border-amber-400 shadow-lg scale-[0.99]"
                      : isDragTarget
                      ? "border-amber-500 bg-amber-100/50 dark:bg-amber-950/40 ring-1 ring-amber-400 scale-[1.01]"
                      : "bg-background border-slate-200 dark:border-slate-800 hover:border-amber-400/70"
                  }`}
                >
                  {/* Left: Drag Handle & Sequence Number */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors"
                      title="Geser untuk mengatur urutan (Drag & Drop)"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-4 text-center">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Center: Option Name or Edit Input */}
                  {editingIndex === idx ? (
                    <div className="flex-1 flex gap-1 items-center">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-7 text-xs flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(idx);
                          if (e.key === "Escape") setEditingIndex(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(idx)}
                        className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                        title="Simpan Nama Jenis"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1 text-stone-400 hover:bg-stone-500/10 rounded cursor-pointer"
                        title="Batal Edit"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="font-medium text-foreground truncate flex-1 select-none"
                      title={opt}
                    >
                      {opt}
                    </span>
                  )}

                  {/* Right: Step Up / Step Down Buttons & Action Buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, "up")}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                      title="Pindah ke atas"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === options.length - 1}
                      onClick={() => handleMoveStep(idx, "down")}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                      title="Pindah ke bawah"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(idx);
                        setEditingText(opt);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      title="Edit Nama Jenis"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(opt)}
                      className="p-1 text-slate-400 hover:text-destructive transition-colors cursor-pointer"
                      title="Hapus Jenis Ini"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-2 border-t text-xs">
          {onResetDefaults ? (
            <button
              type="button"
              onClick={onResetDefaults}
              className="text-stone-500 hover:text-foreground text-[11px] underline cursor-pointer"
            >
              Reset ke Opsi Standar Sistem
            </button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            onClick={onClose}
          >
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
