"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { 
  GripVertical, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Calendar, 
  Users, 
  Sparkles
} from "lucide-react";
import { formatDateDdMmmmTttt } from "@/shared/lib/utils";

export interface DepartureItemPair {
  parentId: string;
  parentName: string;
  parentDate: string;
  parentSeat: number;

  childTempId: string;
  childName: string;
  childDate: string;
  childSeat: number;
}

interface PairingCanvasProps {
  parentStartingCity: string;
  childStartingCity: string;
  parentItems: { id: string; name: string; date: string; seat: number }[];
  initialChildItems: { tempId: string; name: string; date: string }[];
  totalGroupCapacity: number;
  onConfirm: (pairs: DepartureItemPair[]) => void;
  onCancel: () => void;
}

export function PairingCanvas({
  parentStartingCity,
  childStartingCity,
  parentItems,
  initialChildItems,
  totalGroupCapacity,
  onConfirm,
  onCancel,
}: PairingCanvasProps) {
  const [childList, setChildList] = useState(initialChildItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Default parent seat allocations (half or split)
  const defaultParentSeat = Math.ceil(totalGroupCapacity / 2);
  const [parentSeats, setParentSeats] = useState<number[]>(
    parentItems.map(p => p.seat || defaultParentSeat)
  );

  // Keep child items in sync if initialChildItems change
  useEffect(() => {
    setChildList(initialChildItems);
  }, [initialChildItems]);

  const countMatch = parentItems.length === childList.length;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Swap positions
    const updated = [...childList];
    const item = updated[draggedIndex]!;
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, item);
    setDraggedIndex(targetIndex);
    setChildList(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleParentSeatChange = (index: number, val: number) => {
    const clamped = Math.max(0, Math.min(totalGroupCapacity, val));
    const updated = [...parentSeats];
    updated[index] = clamped;
    setParentSeats(updated);
  };

  const handleSubmit = () => {
    if (!countMatch) return;

    const pairs: DepartureItemPair[] = parentItems.map((parent, i) => {
      const child = childList[i]!;
      const parentSeatAlloc = parentSeats[i] ?? defaultParentSeat;
      const childSeatAlloc = Math.max(0, totalGroupCapacity - parentSeatAlloc);

      return {
        parentId: parent.id,
        parentName: parent.name,
        parentDate: parent.date,
        parentSeat: parentSeatAlloc,

        childTempId: child.tempId,
        childName: child.name,
        childDate: child.date,
        childSeat: childSeatAlloc,
      };
    });

    onConfirm(pairs);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Canvas Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
            <Sparkles className="h-4 w-4" /> Canvas Penyandingan Drag & Drop (Dual Starting Point)
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Menyandingkan Paket {parentStartingCity} &amp; {childStartingCity}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Geser (drag &amp; drop) baris di sebelah kanan untuk menyelaraskan urutan keberangkatan {childStartingCity} dengan {parentStartingCity}.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80">
          <Users className="h-4 w-4 text-emerald-400" />
          <div className="text-xs">
            <span className="text-slate-400">Kapasitas Rombongan: </span>
            <span className="font-bold text-white">{totalGroupCapacity} Seat</span>
          </div>
        </div>
      </div>

      {/* Validation Warning if counts mismatch */}
      {!countMatch && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <strong>Jumlah Tanggal Tidak Cocok:</strong> Paket Induk {parentStartingCity} memiliki <strong>{parentItems.length} tanggal</strong>, sedangkan Paket Baru {childStartingCity} diisi <strong>{childList.length} tanggal</strong>. Jumlah baris harus sama agar dapat disandingkan.
          </div>
        </div>
      )}

      {/* Side-by-Side Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Connection Line Indicator badge in middle */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-2 rounded-full shadow-lg">
          <ArrowRightLeft className="h-4 w-4" />
        </div>

        {/* LEFT COLUMN: Fixed Parent Starting Point */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <MapPin className="h-3.5 w-3.5" />
              COLUMNS LEFT: {parentStartingCity} (Paket Induk / Fixed)
            </div>
            <span className="text-[11px] text-slate-400">{parentItems.length} Baris</span>
          </div>

          <div className="space-y-3">
            {parentItems.map((parent, idx) => {
              const parentSeatVal = parentSeats[idx] ?? defaultParentSeat;

              return (
                <div
                  key={parent.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 relative group hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      BARIS #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateDdMmmmTttt(parent.date)}
                    </span>
                  </div>

                  <div className="font-semibold text-sm text-slate-200 truncate">
                    {parent.name}
                  </div>

                  {/* Seat allocation row */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Quota {parentStartingCity}:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={totalGroupCapacity}
                        value={parentSeatVal}
                        onChange={(e) => handleParentSeatChange(idx, parseInt(e.target.value, 10) || 0)}
                        className="w-16 h-7 text-center text-xs bg-slate-900 border-slate-700 text-emerald-400 font-bold"
                      />
                      <span className="text-slate-500">Seat</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Reorderable Drag-and-Drop Child Starting Point */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <GripVertical className="h-3.5 w-3.5" />
              COLUMNS RIGHT: {childStartingCity} (Drag &amp; Drop Reorderable)
            </div>
            <span className="text-[11px] text-amber-400/80">Tarik untuk mengubah posisi</span>
          </div>

          <div className="space-y-3">
            {childList.map((child, idx) => {
              const parentSeatVal = parentSeats[idx] ?? defaultParentSeat;
              const childSeatCalc = Math.max(0, totalGroupCapacity - parentSeatVal);
              const isDraggingThis = draggedIndex === idx;

              return (
                <div
                  key={child.tempId}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing space-y-2 ${
                    isDraggingThis
                      ? "bg-amber-500/20 border-amber-400 shadow-xl scale-[1.02]"
                      : "bg-slate-950/90 border-slate-800 hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-500" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        PASANGAN BARIS #{idx + 1}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateDdMmmmTttt(child.date)}
                    </span>
                  </div>

                  <div className="font-semibold text-sm text-slate-200 truncate pl-6">
                    {child.name}
                  </div>

                  {/* Calculated remaining seat */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs pl-6">
                    <span className="text-slate-400">Sisa Quota {childStartingCity}:</span>
                    <div className="font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                      {childSeatCalc} Seat
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel} className="text-slate-300 border-slate-700">
          Batal
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            disabled={!countMatch}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" /> Simpan &amp; Hubungkan Pasangan Paket
          </Button>
        </div>
      </div>
    </div>
  );
}
