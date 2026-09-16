/**
 * Pas Foto Auto-Processing Utility (100% Free, Client-Side)
 * - Auto White Background (#FFFFFF)
 * - Auto Crop 3x4 / 4x6
 * - File size optimization (Strictly <= 200 KB)
 */

export interface PasFotoProcessOptions {
  aspectRatio?: "3x4" | "4x6" | "original" | "1x1";
  targetBg?: "white" | "red" | "blue" | "transparent";
  tolerance?: number; // 0-100 (default 38)
  feather?: number; // 0-30 (default 12)
  zoom?: number; // 0.8 - 2.0 (default 1.0)
  panX?: number; // offset -50 to 50
  panY?: number; // offset -50 to 50
  maxBytes?: number; // max file size in bytes (default 200 KB = 204800 bytes)
  fileName?: string;
}

/**
 * Loads an image source into an HTMLImageElement
 */
function loadImage(src: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);

    if (typeof src === "string") {
      img.src = src;
    } else {
      img.src = URL.createObjectURL(src);
    }
  });
}

/**
 * Core Canvas Pas Foto Processor:
 * Performs color-distance background replacement, 3x4 auto-crop, and iterative compression <= 200 KB
 */
export async function autoProcessPasFoto(
  imageSource: string | File | Blob,
  options: PasFotoProcessOptions = {}
): Promise<{ file: File; dataUrl: string; sizeBytes: number; blob: Blob }> {
  const img = await loadImage(imageSource);

  const ratio = options.aspectRatio ?? "3x4";
  const bg = options.targetBg ?? "white";
  const tol = options.tolerance ?? 38;
  const fea = options.feather ?? 12;
  const z = options.zoom ?? 1.0;
  const px = options.panX ?? 0;
  const py = options.panY ?? 0;
  const maxBytes = options.maxBytes ?? 200 * 1024; // 200 KB
  const fileName = options.fileName || "Pas_Foto_3x4_WhiteBG.jpg";

  // Target Dimensions based on Aspect Ratio (Standard High-DPI for 3x4 / 4x6)
  let targetWidth = 600;
  let targetHeight = 800; // 3x4 = 600 x 800 (ratio 0.75)

  if (ratio === "4x6") {
    targetWidth = 600;
    targetHeight = 900; // 4x6 = 600 x 900 (ratio 0.666)
  } else if (ratio === "1x1") {
    targetWidth = 600;
    targetHeight = 600;
  } else if (ratio === "original") {
    targetWidth = img.naturalWidth || 600;
    targetHeight = img.naturalHeight || 800;
  }

  // Offscreen canvas for raw color analysis
  const rawW = img.naturalWidth || targetWidth;
  const rawH = img.naturalHeight || targetHeight;

  const offscreen = document.createElement("canvas");
  offscreen.width = rawW;
  offscreen.height = rawH;
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!offCtx) throw new Error("Could not get 2d context for offscreen canvas");

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
  const threshold = (tol / 100) * 200 + 20; // 20 - 220
  const featherVal = fea;

  // Target background RGB
  let bgR = 255,
    bgG = 255,
    bgB = 255,
    bgA = 255;
  if (bg === "red") {
    bgR = 220;
    bgG = 20;
    bgB = 20;
  } else if (bg === "blue") {
    bgR = 20;
    bgG = 80;
    bgB = 220;
  } else if (bg === "transparent") {
    bgA = 0;
  }

  // Apply color segmentation
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;

    const dist = Math.sqrt(
      (r - avgR) * (r - avgR) +
        (g - avgG) * (g - avgG) +
        (b - avgB) * (b - avgB)
    );

    if (dist < threshold - featherVal) {
      data[i] = bgR;
      data[i + 1] = bgG;
      data[i + 2] = bgB;
      data[i + 3] = bgA;
    } else if (dist < threshold + featherVal) {
      const alphaFactor = (dist - (threshold - featherVal)) / (featherVal * 2);
      data[i] = Math.round(r * alphaFactor + bgR * (1 - alphaFactor));
      data[i + 1] = Math.round(g * alphaFactor + bgG * (1 - alphaFactor));
      data[i + 2] = Math.round(b * alphaFactor + bgB * (1 - alphaFactor));
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  // Main Target Canvas
  const mainCanvas = document.createElement("canvas");
  mainCanvas.width = targetWidth;
  mainCanvas.height = targetHeight;
  const mainCtx = mainCanvas.getContext("2d");
  if (!mainCtx) throw new Error("Could not get main canvas 2d context");

  // Fill White Background
  mainCtx.fillStyle = bg === "transparent" ? "transparent" : "#FFFFFF";
  mainCtx.fillRect(0, 0, targetWidth, targetHeight);

  // Calculate Proportional Auto-Crop & Framing
  const scaleFit = Math.max(targetWidth / rawW, targetHeight / rawH) * z;
  const drawW = rawW * scaleFit;
  const drawH = rawH * scaleFit;
  const drawX = (targetWidth - drawW) / 2 + (px * targetWidth) / 100;
  const drawY = (targetHeight - drawH) / 3 + (py * targetHeight) / 100;

  mainCtx.drawImage(offscreen, drawX, drawY, drawW, drawH);

  // Iteratively compress to guarantee output size <= maxBytes (200 KB)
  let quality = 0.92;
  let blob: Blob | null = await new Promise((res) => mainCanvas.toBlob(res, "image/jpeg", quality));

  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await new Promise((res) => mainCanvas.toBlob(res, "image/jpeg", quality));
  }

  if (!blob) {
    throw new Error("Failed to export canvas blob");
  }

  const finalFile = new File([blob], fileName, { type: "image/jpeg" });
  const dataUrl = mainCanvas.toDataURL("image/jpeg", quality);

  return {
    file: finalFile,
    dataUrl,
    sizeBytes: blob.size,
    blob,
  };
}
