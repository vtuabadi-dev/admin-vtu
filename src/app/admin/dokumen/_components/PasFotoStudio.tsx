"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Crop,
  CheckCircle,
  RefreshCw,
  Download,
  Sliders,
  Undo2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/lib/utils";

interface PasFotoStudioProps {
  imageUrl: string;
  jamaahName: string;
  onSave: (processedFile: File) => Promise<void>;
  isSaving?: boolean;
}

export type AspectRatioMode = "3x4" | "4x6" | "original" | "1x1";
export type TargetBgColor = "white" | "red" | "blue" | "transparent";

export default function PasFotoStudio({
  imageUrl,
  jamaahName,
  onSave,
  isSaving = false,
}: PasFotoStudioProps) {
  // Processing States
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("3x4");
  const [targetBg, setTargetBg] = useState<TargetBgColor>("white");
  const [tolerance, setTolerance] = useState<number>(38); // Background sensitivity (0-100)
  const [feather, setFeather] = useState<number>(12); // Edge smoothing (0-30)
  const [zoom, setZoom] = useState<number>(1.0); // 0.7 - 2.0
  const [panX, setPanX] = useState<number>(0); // -100 to 100
  const [panY, setPanY] = useState<number>(0); // -100 to 100
  const [processing, setProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"side" | "result" | "original">("side");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  /**
   * Smart Color-Distance & Edge Segmentation Algorithm
   * Converts any solid or studio background (red, blue, grey, etc.) to clean white (#FFFFFF)
   * while keeping natural hair/hijab/peci/skin edges intact.
   */
  const processPasFoto = useCallback(
    (
      img: HTMLImageElement,
      options: {
        ratio: AspectRatioMode;
        bg: TargetBgColor;
        tol: number;
        fea: number;
        z: number;
        px: number;
        py: number;
      }
    ) => {
      const canvas = canvasRef.current;
      if (!canvas || !img) return;

      setProcessing(true);

      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Target Dimensions based on Aspect Ratio (High-DPI Standard)
        let targetWidth = 600;
        let targetHeight = 800; // 3x4 = 600 x 800 (ratio 0.75)

        if (options.ratio === "4x6") {
          targetWidth = 600;
          targetHeight = 900; // 4x6 = 600 x 900 (ratio 0.666)
        } else if (options.ratio === "1x1") {
          targetWidth = 600;
          targetHeight = 600;
        } else if (options.ratio === "original") {
          targetWidth = img.naturalWidth || 600;
          targetHeight = img.naturalHeight || 800;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Offscreen canvas for raw color analysis
        const rawW = img.naturalWidth || targetWidth;
        const rawH = img.naturalHeight || targetHeight;

        const offscreen = document.createElement("canvas");
        offscreen.width = rawW;
        offscreen.height = rawH;
        const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
        if (!offCtx) return;

        offCtx.drawImage(img, 0, 0, rawW, rawH);
        const imgData = offCtx.getImageData(0, 0, rawW, rawH);
        const data = imgData.data;

        // Sample background color from top corners & top edge
        const samplePoints: [number, number][] = [
          [2, 2],
          [rawW - 3, 2],
          [Math.floor(rawW / 2), 2],
          [2, Math.floor(rawH * 0.1)],
          [rawW - 3, Math.floor(rawH * 0.1)],
        ];

        let avgR = 0,
          avgG = 0,
          avgB = 0;
        samplePoints.forEach(([x, y]) => {
          const safeX = x ?? 0;
          const safeY = y ?? 0;
          const idx = (safeY * rawW + safeX) * 4;
          avgR += data[idx] ?? 0;
          avgG += data[idx + 1] ?? 0;
          avgB += data[idx + 2] ?? 0;
        });
        avgR = Math.round(avgR / samplePoints.length);
        avgG = Math.round(avgG / samplePoints.length);
        avgB = Math.round(avgB / samplePoints.length);

        // Threshold and Color Replacement Loop
        const threshold = (options.tol / 100) * 200 + 20; // 20 - 220
        const featherVal = options.fea;

        // Target background RGB
        let bgR = 255,
          bgG = 255,
          bgB = 255,
          bgA = 255;
        if (options.bg === "red") {
          bgR = 220;
          bgG = 20;
          bgB = 20;
        } else if (options.bg === "blue") {
          bgR = 20;
          bgG = 80;
          bgB = 220;
        } else if (options.bg === "transparent") {
          bgA = 0;
        }

        // Apply segmentation
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;

          // Euclidean color distance from sampled background color
          const dist = Math.sqrt(
            (r - avgR) * (r - avgR) +
              (g - avgG) * (g - avgG) +
              (b - avgB) * (b - avgB)
          );

          if (dist < threshold - featherVal) {
            // Definite Background: Replace with Target Background
            data[i] = bgR;
            data[i + 1] = bgG;
            data[i + 2] = bgB;
            data[i + 3] = bgA;
          } else if (dist < threshold + featherVal) {
            // Edge / Feathering Transition
            const alphaFactor = (dist - (threshold - featherVal)) / (featherVal * 2);
            data[i] = Math.round(r * alphaFactor + bgR * (1 - alphaFactor));
            data[i + 1] = Math.round(g * alphaFactor + bgG * (1 - alphaFactor));
            data[i + 2] = Math.round(b * alphaFactor + bgB * (1 - alphaFactor));
          }
        }

        offCtx.putImageData(imgData, 0, 0);

        // Clear target canvas with White Background
        ctx.fillStyle = options.bg === "transparent" ? "transparent" : "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate Proportional Auto-Crop & Framing
        // Standard Pas Foto: Subject centered, face takes ~75% of height with top margin
        const scaleFit = Math.max(targetWidth / rawW, targetHeight / rawH) * options.z;
        const drawW = rawW * scaleFit;
        const drawH = rawH * scaleFit;

        // Center Horizontally with user pan offset
        const drawX = (targetWidth - drawW) / 2 + (options.px * targetWidth) / 100;
        // Align with standard head top margin with user pan offset
        const drawY = (targetHeight - drawH) / 3 + (options.py * targetHeight) / 100;

        // Render processed image into main high-DPI canvas
        ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);
      } catch (err) {
        console.error("Error processing pas foto in canvas:", err);
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  // Load Image into HTMLImageElement
  useEffect(() => {
    if (!imageUrl) {
      setImageLoaded(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      setImageLoaded(true);
      // Auto-trigger processing once image is loaded
      processPasFoto(img, {
        ratio: "3x4",
        bg: "white",
        tol: 38,
        fea: 12,
        z: 1.0,
        px: 0,
        py: 0,
      });
    };
    img.onerror = () => {
      console.error("Failed to load pas foto image:", imageUrl);
      setImageLoaded(false);
    };
    img.src = imageUrl;
  }, [imageUrl, processPasFoto]);

  // Reset to default presets
  const handleReset = () => {
    setAspectRatio("3x4");
    setTargetBg("white");
    setTolerance(38);
    setFeather(12);
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    if (originalImageRef.current) {
      processPasFoto(originalImageRef.current, {
        ratio: "3x4",
        bg: "white",
        tol: 38,
        fea: 12,
        z: 1.0,
        px: 0,
        py: 0,
      });
    }
  };

  // Save to Jamaah Manifest Documents
  const handleSaveToManifest = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaveSuccess(false);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const cleanName = (jamaahName || "Jamaah").replace(/[/\\?%*:|"<>]/g, "_").trim();
      const fileName = `Pas_Foto_${cleanName}_3x4.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      try {
        await onSave(file);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } catch (err) {
        console.error("Error saving pas foto:", err);
      }
    }, "image/jpeg", 0.95);
  };

  // Download local file
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanName = (jamaahName || "Jamaah").replace(/[/\\?%*:|"<>]/g, "_").trim();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.download = `Pas_Foto_${cleanName}_${aspectRatio}_WhiteBG.jpg`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50/70 dark:bg-stone-900/60 shadow-xs animate-in fade-in duration-200">
      {/* ── HEADER TITLE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              Pass Foto Engine
              <Badge variant="success" size="sm" className="font-mono text-[9px] px-1.5 py-0">
                100% GRATIS
              </Badge>
            </h4>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">
              Otomatisasi Background Putih & Auto Crop 3×4 / 4×6 Standar Paspor & Visa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-7 text-[10.5px] px-2 text-stone-600 hover:text-stone-900"
            title="Kembalikan ke pengaturan awal"
          >
            <Undo2 className="mr-1 h-3 w-3" /> Reset
          </Button>
        </div>
      </div>

      {/* ── QUICK PRESET ACTIONS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Ratio: 3x4 */}
        <button
          type="button"
          onClick={() => {
            setAspectRatio("3x4");
            if (originalImageRef.current) {
              processPasFoto(originalImageRef.current, {
                ratio: "3x4",
                bg: targetBg,
                tol: tolerance,
                fea: feather,
                z: zoom,
                px: panX,
                py: panY,
              });
            }
          }}
          className={cn(
            "p-2 rounded-lg border text-left transition-all text-xs flex flex-col gap-0.5",
            aspectRatio === "3x4"
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-stone-300"
          )}
        >
          <span className="flex items-center gap-1 text-[11px] font-bold">
            <Crop className="h-3 w-3 text-emerald-600" /> Rasio 3×4 cm
          </span>
          <span className="text-[9px] opacity-75 font-normal">Standar Paspor / ID</span>
        </button>

        {/* Ratio: 4x6 */}
        <button
          type="button"
          onClick={() => {
            setAspectRatio("4x6");
            if (originalImageRef.current) {
              processPasFoto(originalImageRef.current, {
                ratio: "4x6",
                bg: targetBg,
                tol: tolerance,
                fea: feather,
                z: zoom,
                px: panX,
                py: panY,
              });
            }
          }}
          className={cn(
            "p-2 rounded-lg border text-left transition-all text-xs flex flex-col gap-0.5",
            aspectRatio === "4x6"
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-stone-300"
          )}
        >
          <span className="flex items-center gap-1 text-[11px] font-bold">
            <Crop className="h-3 w-3 text-emerald-600" /> Rasio 4×6 cm
          </span>
          <span className="text-[9px] opacity-75 font-normal">Standar Visa Umroh</span>
        </button>

        {/* Background Color: White */}
        <button
          type="button"
          onClick={() => {
            setTargetBg("white");
            if (originalImageRef.current) {
              processPasFoto(originalImageRef.current, {
                ratio: aspectRatio,
                bg: "white",
                tol: tolerance,
                fea: feather,
                z: zoom,
                px: panX,
                py: panY,
              });
            }
          }}
          className={cn(
            "p-2 rounded-lg border text-left transition-all text-xs flex flex-col gap-0.5",
            targetBg === "white"
              ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 font-bold"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-stone-300"
          )}
        >
          <span className="flex items-center gap-1 text-[11px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-white border border-stone-400 inline-block shrink-0" />
            Background Putih
          </span>
          <span className="text-[9px] opacity-75 font-normal">Syarat Resmi Umroh</span>
        </button>

        {/* 1-Click Instant Action */}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setAspectRatio("3x4");
            setTargetBg("white");
            setZoom(1.0);
            setPanX(0);
            setPanY(0);
            if (originalImageRef.current) {
              processPasFoto(originalImageRef.current, {
                ratio: "3x4",
                bg: "white",
                tol: 38,
                fea: 12,
                z: 1.0,
                px: 0,
                py: 0,
              });
            }
          }}
          className="h-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-[11px] shadow-sm flex flex-col items-center justify-center p-2"
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Auto Putih 3×4
          </span>
          <span className="text-[8.5px] font-normal opacity-90">1-Klik Standar Paspor</span>
        </Button>
      </div>

      {/* ── LIVE PREVIEW & COMPARISON CANVAS ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
            Hasil Edit Pas Foto Resmi ({aspectRatio === "3x4" ? "3×4 cm" : aspectRatio === "4x6" ? "4×6 cm" : aspectRatio}):
          </span>
          <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab("side")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-colors",
                activeTab === "side" ? "bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs" : "text-stone-600 dark:text-stone-400"
              )}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("result")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-colors",
                activeTab === "result" ? "bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs" : "text-stone-600 dark:text-stone-400"
              )}
            >
              Hasil Saja
            </button>
          </div>
        </div>

        {/* Visual Preview Box */}
        <div className="p-3 bg-stone-100 dark:bg-stone-950/80 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-center min-h-[220px]">
          {activeTab === "side" ? (
            <div className="flex items-center justify-center gap-4 flex-wrap sm:flex-nowrap">
              {/* Original Photo Preview */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-stone-500">Foto Asli</span>
                <div className="h-44 w-32 rounded-lg border border-stone-300 dark:border-stone-700 overflow-hidden bg-white shadow-xs flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Foto Asli"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="text-stone-400 font-bold text-xs flex flex-col items-center">
                <span>➔</span>
                <span className="text-[9px] text-emerald-600 font-bold">Auto Putih</span>
              </div>

              {/* Processed Studio Canvas */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Hasil Background Putih ({aspectRatio})
                </span>
                <div className="h-44 w-32 rounded-lg border-2 border-emerald-500/80 overflow-hidden bg-white shadow-md flex items-center justify-center relative">
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full object-contain"
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Result Only View */
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="h-56 w-40 rounded-lg border-2 border-emerald-500 overflow-hidden bg-white shadow-lg flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  className="h-full w-full object-contain"
                />
                {processing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FINE TUNING SLIDERS (COLLAPSIBLE / COMPACT) ── */}
      <div className="space-y-2 p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-stone-300">
          <span className="flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-stone-500" />
            Penyesuaian Presisi (Opsional)
          </span>
          <span className="text-[10px] font-normal text-stone-500">
            Toleransi: {tolerance}% | Zoom: {zoom.toFixed(1)}x
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Sensitivity / Tolerance Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-600 dark:text-stone-400 font-medium">
              <span>Kepekaan Warna BG:</span>
              <span>{tolerance}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={80}
              value={tolerance}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTolerance(val);
                if (originalImageRef.current) {
                  processPasFoto(originalImageRef.current, {
                    ratio: aspectRatio,
                    bg: targetBg,
                    tol: val,
                    fea: feather,
                    z: zoom,
                    px: panX,
                    py: panY,
                  });
                }
              }}
              className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Zoom / Scale Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-600 dark:text-stone-400 font-medium">
              <span>Zoom / Ukuran Wajah:</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={zoom}
              onChange={(e) => {
                const val = Number(e.target.value);
                setZoom(val);
                if (originalImageRef.current) {
                  processPasFoto(originalImageRef.current, {
                    ratio: aspectRatio,
                    bg: targetBg,
                    tol: tolerance,
                    fea: feather,
                    z: val,
                    px: panX,
                    py: panY,
                  });
                }
              }}
              className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Vertical Pan Offset */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-600 dark:text-stone-400 font-medium">
              <span>Posisi Wajah (Naik/Turun):</span>
              <span>{panY > 0 ? `+${panY}` : panY}</span>
            </div>
            <input
              type="range"
              min={-25}
              max={25}
              value={panY}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPanY(val);
                if (originalImageRef.current) {
                  processPasFoto(originalImageRef.current, {
                    ratio: aspectRatio,
                    bg: targetBg,
                    tol: tolerance,
                    fea: feather,
                    z: zoom,
                    px: panX,
                    py: val,
                  });
                }
              }}
              className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── FINAL ACTION BUTTONS ── */}
      <div className="pt-2 flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Save to Manifest Button */}
        <Button
          type="button"
          onClick={handleSaveToManifest}
          disabled={isSaving || processing || !imageLoaded}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs shadow-sm"
        >
          {isSaving ? (
            <>
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
              Menyimpan Pas Foto ke Manifest...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="mr-1.5 h-4 w-4 text-white" />
              Pas Foto Resmi Berhasil Disimpan!
            </>
          ) : (
            <>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Simpan Pas Foto Resmi ke Manifest
            </>
          )}
        </Button>

        {/* Download Local HD Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadImage}
          disabled={!imageLoaded || processing}
          className="h-9 text-xs font-semibold px-3"
          title="Unduh file gambar pas foto ke komputer"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download JPG
        </Button>
      </div>
    </div>
  );
}
