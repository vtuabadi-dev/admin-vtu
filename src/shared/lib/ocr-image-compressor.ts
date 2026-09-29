/**
 * Utility to compress document images (KTP, Akta, KK) to a maximum size of 200 KB
 * while maintaining crisp resolution and contrast for optimal OCR extraction.
 */

export async function compressOcrDocument(
  file: File,
  maxBytes: number = 200 * 1024
): Promise<File> {
  // If not an image (e.g. PDF), return as is
  if (
    file.type === "application/pdf" ||
    (!file.type.startsWith("image/") && file.name.toLowerCase().endsWith(".pdf"))
  ) {
    return file;
  }

  // Aturan Tegas: Jika ukuran file sudah <= maxBytes (200 KB), tidak perlu dikompres, kembalikan langsung file aslinya
  if (file.size <= maxBytes) {
    return file;
  }

  return new Promise((resolve) => {
    // Safety timeout in case browser hangs on corrupted image
    const safetyTimer = setTimeout(() => {
      resolve(file);
    }, 6000);

    const reader = new FileReader();
    reader.onerror = () => {
      clearTimeout(safetyTimer);
      resolve(file);
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        clearTimeout(safetyTimer);
        resolve(file);
      };

      img.onload = async () => {
        clearTimeout(safetyTimer);
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Bound dimensions to maximum 1600px on the longest side to preserve crisp text for OCR
          const maxDimension = 1600;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Fill white background in case of transparent PNG/WebP
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Iterative compression starting with high quality
          let quality = 0.88;
          let blob: Blob | null = await new Promise((res) =>
            canvas.toBlob(res, "image/jpeg", quality)
          );

          while (blob && blob.size > maxBytes && quality > 0.35) {
            quality -= 0.08;
            blob = await new Promise((res) =>
              canvas.toBlob(res, "image/jpeg", quality)
            );
          }

          // If still > maxBytes (very large complex image), downscale canvas dimensions
          while (blob && blob.size > maxBytes && (width > 600 || height > 600)) {
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            blob = await new Promise((res) =>
              canvas.toBlob(res, "image/jpeg", Math.min(quality, 0.72))
            );
          }

          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "dokumen_ocr";
          const cleanFileName = `${baseName}.jpg`;
          const compressedFile = new File([blob], cleanFileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        } catch (err) {
          console.warn("[compressOcrDocument] Fallback to original file:", err);
          resolve(file);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
