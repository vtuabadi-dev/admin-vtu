/**
 * Universal File Drop & Paste Utilities
 * Handles native files, WhatsApp Web/Desktop drag-and-drop, browser image drags,
 * Base64 data URIs, Blob URLs, and Clipboard paste (Ctrl+V).
 */

export async function extractFilesFromEvent(
  e: React.DragEvent | DragEvent | React.ClipboardEvent | ClipboardEvent
): Promise<File[]> {
  const resultFiles: File[] = [];

  const dt =
    "dataTransfer" in e && e.dataTransfer
      ? e.dataTransfer
      : "clipboardData" in e && (e as any).clipboardData
      ? (e as any).clipboardData
      : null;

  if (!dt) return resultFiles;

  // 1. Direct FileList from dataTransfer / clipboardData (Filesystem, WhatsApp Desktop, Explorer)
  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (f && f.size > 0) {
        resultFiles.push(f);
      }
    }
  }

  // 2. Scan DataTransferItemList for files or images
  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && !resultFiles.some((f) => f.name === file.name && f.size === file.size)) {
          resultFiles.push(file);
        }
      }
    }
  }

  // If already found files from native list, return early
  if (resultFiles.length > 0) {
    return resultFiles;
  }

  // 3. WhatsApp Web / Web Browser HTML extraction (dragged from chat bubble)
  const html = dt.getData("text/html");
  if (html) {
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const match of imgMatches) {
      const src = match[1];
      if (src) {
        const file = await convertUrlOrDataToBlobFile(src, `whatsapp-image-${Date.now()}.jpg`);
        if (file) resultFiles.push(file);
      }
    }
  }

  // 4. URL list or plain URI (Blob URLs, Data URLs, or direct image links)
  const uriList = dt.getData("text/uri-list") || dt.getData("text/plain");
  if (uriList && resultFiles.length === 0) {
    const lines = uriList.split(/[\r\n]+/).filter(Boolean);
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("data:image/") ||
        trimmed.startsWith("blob:") ||
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://")
      ) {
        const file = await convertUrlOrDataToBlobFile(trimmed, `whatsapp-doc-${Date.now()}.jpg`);
        if (file) resultFiles.push(file);
      }
    }
  }

  return resultFiles;
}

async function convertUrlOrDataToBlobFile(src: string, fallbackName: string): Promise<File | null> {
  try {
    if (src.startsWith("data:")) {
      const res = await fetch(src);
      const blob = await res.blob();
      const mime = blob.type || "image/jpeg";
      const ext = mime.includes("png") ? ".png" : mime.includes("pdf") ? ".pdf" : ".jpg";
      const fileName = fallbackName.replace(/\.[^.]+$/, ext);
      return new File([blob], fileName, { type: mime });
    }

    if (src.startsWith("blob:") || src.startsWith("http")) {
      const res = await fetch(src, { mode: "cors" }).catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const mime = blob.type || "image/jpeg";
        const ext = mime.includes("png") ? ".png" : mime.includes("pdf") ? ".pdf" : ".jpg";
        const fileName = fallbackName.replace(/\.[^.]+$/, ext);
        return new File([blob], fileName, { type: mime });
      }
    }
  } catch (err) {
    console.warn("[FileDropUtils] Could not parse dragged/pasted media:", err);
  }
  return null;
}
