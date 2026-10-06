"use client";

import React, { useRef, useState, useCallback } from "react";
import { Users, Building2, PlaneTakeoff, ArrowLeftRight, Minus, Plus, ShieldCheck } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { cn } from "@/shared/lib/utils";

interface SplitStartingQuotaSliderProps {
  totalCapacity: number;
  parentCity: string;
  childCity: string;
  childSeat: number;
  targetMaterialisasi: number;
  onChangeChildSeat: (val: number) => void;
  onChangeTargetMaterialisasi: (val: number) => void;
}

export function SplitStartingQuotaSlider({
  totalCapacity,
  parentCity,
  childCity,
  childSeat,
  targetMaterialisasi,
  onChangeChildSeat,
  onChangeTargetMaterialisasi,
}: SplitStartingQuotaSliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeTotal = Math.max(2, totalCapacity || 45);
  // Pastikan childSeat berada dalam rentang [1, safeTotal - 1]
  const currentChildSeat = Math.max(1, Math.min(safeTotal - 1, childSeat || Math.floor(safeTotal / 3)));
  const parentSeat = Math.max(1, safeTotal - currentChildSeat);

  const parentPct = (parentSeat / safeTotal) * 100;
  const childPct = (currentChildSeat / safeTotal) * 100;

  // Handler untuk menghitung nilai seat berdasarkan posisi pointer (mouse / sentuhan)
  const calculateSeatFromPointer = useCallback(
    (clientX: number) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clickX / rect.width;

      // Sisi kiri adalah kuota Utama, sisi kanan adalah kuota Cabang (Split)
      // Jadi jika ditarik ke kanan, kuota Utama bertambah; jika ditarik ke kiri, kuota Cabang bertambah
      // ratio mewakili porsi parent: parentSeat = ratio * safeTotal => childSeat = safeTotal - parentSeat
      let computedParent = Math.round(ratio * safeTotal);
      computedParent = Math.max(1, Math.min(safeTotal - 1, computedParent));
      const newChild = safeTotal - computedParent;

      onChangeChildSeat(newChild);
    },
    [safeTotal, onChangeChildSeat]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    calculateSeatFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    calculateSeatFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const setPresetRatio = (childFraction: number) => {
    const val = Math.max(1, Math.min(safeTotal - 1, Math.round(safeTotal * childFraction)));
    onChangeChildSeat(val);
  };

  const adjustSeat = (delta: number) => {
    const nextVal = Math.max(1, Math.min(safeTotal - 1, currentChildSeat + delta));
    onChangeChildSeat(nextVal);
  };

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/70 via-white to-sky-50/50 border-2 border-amber-300 rounded-2xl shadow-sm space-y-4 text-slate-900">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
              📍 Split Starting Point
            </span>
            <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600" /> Pengaturan Alokasi Kursi Romobongan
            </span>
          </div>
          <p className="text-[11px] text-stone-600 mt-1">
            Geser <strong>Pil Alokasi</strong> di batang bawah untuk memecah kuota dari Paket Starting Utama (<strong>{parentCity}</strong>) ke Paket Split Baru (<strong>{childCity}</strong>).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-amber-300 px-3 py-1.5 rounded-xl shadow-2xs">
          <Users className="h-4 w-4 text-amber-600" />
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block leading-tight font-medium">Total Kuota Rombongan</span>
            <strong className="text-xs text-amber-950 font-black">{safeTotal} Seat</strong>
          </div>
        </div>
      </div>

      {/* Visual Batang Kuota Keseluruhan & Pil Draggable */}
      <div className="space-y-2 pt-1">
        {/* Labels di atas Batang */}
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <div className="flex items-center gap-1.5 text-indigo-900">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span>Utama: {parentCity}</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-black">
              {parentSeat} Seat ({Math.round(parentPct)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-900">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-black">
              {currentChildSeat} Seat ({Math.round(childPct)}%)
            </span>
            <span>Split Baru: {childCity}</span>
            <PlaneTakeoff className="h-4 w-4 text-amber-600" />
          </div>
        </div>

        {/* Batang Utama (Allocation Track) */}
        <div
          ref={barRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            "relative h-14 sm:h-16 w-full rounded-2xl bg-stone-200 border-2 border-stone-300 p-1.5 shadow-inner select-none cursor-ew-resize flex items-center overflow-visible transition-all",
            isDragging && "ring-2 ring-amber-400 ring-offset-1 border-amber-500"
          )}
          title="Klik atau geser pil di batang ini untuk mengatur alokasi kursi"
        >
          {/* Sisi Kiri: Kuota Paket Utama */}
          <div
            style={{ width: `${parentPct}%` }}
            className="h-full bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-500 rounded-l-xl transition-all duration-75 flex items-center justify-start pl-3 text-white text-xs font-bold overflow-hidden shadow-xs relative"
          >
            <span className="truncate pr-4 flex items-center gap-1">
              🏢 {parentCity} ({parentSeat} Seat)
            </span>
          </div>

          {/* Sisi Kanan: Kuota Paket Split Baru */}
          <div
            style={{ width: `${childPct}%` }}
            className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-r-xl transition-all duration-75 flex items-center justify-end pr-3 text-white text-xs font-bold overflow-hidden shadow-xs relative"
          >
            <span className="truncate pl-4 flex items-center gap-1">
              ✈️ {childCity} ({currentChildSeat} Seat)
            </span>
          </div>

          {/* PIL DI BATANG (Draggable Pill Handle) */}
          <div
            style={{ left: `${parentPct}%` }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-12 sm:h-14 px-3 sm:px-4 bg-white border-2 border-amber-600 rounded-full shadow-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform duration-75",
              isDragging && "scale-110 border-orange-600 shadow-2xl bg-amber-50"
            )}
          >
            {/* Grip lines / arrows */}
            <div className="flex flex-col gap-0.5 items-center justify-center text-amber-600">
              <span className="text-[10px] font-black leading-none">&#9664;</span>
              <span className="text-[10px] font-black leading-none">&#9654;</span>
            </div>
            <div className="text-center leading-tight">
              <span className="block text-[9px] font-extrabold uppercase text-stone-500 tracking-wider">
                PIL ALOKASI
              </span>
              <span className="block text-xs sm:text-sm font-black text-amber-950 font-mono">
                {currentChildSeat} Seat
              </span>
            </div>
          </div>
        </div>

        {/* Petunjuk Interaksi & Tombol Penyesuaian Cepat */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-stone-500">
          <span className="text-[11px] flex items-center gap-1 font-medium text-stone-600">
            💡 <em>Tarik pil di atas ke kiri atau ke kanan untuk membagi kuota.</em>
          </span>

          {/* Preset Buttons & Quick Adjust */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => adjustSeat(-1)}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Kurangi kuota split 1 seat"
            >
              <Minus className="h-3 w-3" /> 1
            </button>
            <button
              type="button"
              onClick={() => adjustSeat(1)}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Tambah kuota split 1 seat"
            >
              <Plus className="h-3 w-3" /> 1
            </button>

            <span className="text-stone-300">|</span>

            <button
              type="button"
              onClick={() => setPresetRatio(0.25)}
              className="px-2 py-1 bg-stone-100 hover:bg-amber-100 border border-stone-300 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer"
              title="Alokasikan 25% untuk cabang"
            >
              25% Cabang
            </button>
            <button
              type="button"
              onClick={() => setPresetRatio(0.33)}
              className="px-2 py-1 bg-stone-100 hover:bg-amber-100 border border-stone-300 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer"
              title="Alokasikan sepertiga (33%) untuk cabang"
            >
              33% Cabang
            </button>
            <button
              type="button"
              onClick={() => setPresetRatio(0.5)}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[11px] font-black text-amber-900 transition-colors cursor-pointer"
              title="Bagi rata 50% : 50%"
            >
              50:50 Seimbang
            </button>
          </div>
        </div>
      </div>

      {/* Rincian Kartu Komparasi Dua Paket */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Kartu 1: Paket Starting Utama */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600" /> Paket Starting Utama ({parentCity})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
              Sisa Kuota
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-indigo-950 font-mono">
              {parentSeat} <span className="text-xs font-semibold text-indigo-800">Seat</span>
            </div>
            <span className="text-xs text-indigo-700 font-medium">
              Dari total awal {safeTotal} Seat (-{currentChildSeat})
            </span>
          </div>
          <p className="text-[11px] text-indigo-800 leading-tight">
            Kuota Paket Utama otomatis dikurangi menjadi <strong>{parentSeat} Jamaah</strong> saat paket split ini diterbitkan.
          </p>
        </div>

        {/* Kartu 2: Paket Split Starting Baru */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <PlaneTakeoff className="h-4 w-4 text-amber-600" /> Paket Split Starting Baru ({childCity})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
              Alokasi Baru
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-black text-amber-950 font-mono">
                {currentChildSeat} <span className="text-xs font-semibold text-amber-800">Seat</span>
              </div>
            </div>

            {/* Field Target Materialisasi Mini */}
            <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-lg shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <label className="text-[10px] font-bold text-stone-600 whitespace-nowrap">
                Target Aman:
              </label>
              <Input
                type="number"
                min={1}
                max={currentChildSeat}
                value={targetMaterialisasi}
                onChange={(e) => onChangeTargetMaterialisasi(parseInt(e.target.value, 10) || 1)}
                className="w-14 h-6 text-xs text-center font-bold font-mono p-0 border-stone-300"
              />
              <span className="text-[10px] text-stone-500 font-medium">Seat</span>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 leading-tight">
            Paket cabang baru akan memiliki kuota maksimal <strong>{currentChildSeat} Jamaah</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
