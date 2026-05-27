"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Image,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import type { UploadResult } from "@/shared/types";

// ─── Types ───────────────────────────────────────────────────────────

type UploadState =
  | "idle"
  | "dragging"
  | "preview"
  | "uploading"
  | "processing"
  | "complete"
  | "error"
  | "blurry_warning";

export interface DocumentUploadProps {
  jenis: string;
  label: string;
  onUploadComplete?: (result: UploadResult) => void;
  existingFile?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 85) return "bg-success/10 text-success border-success/20";
  if (confidence >= 60) return "bg-warning/10 text-warning border-warning/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

// ─── Component ───────────────────────────────────────────────────────

export default function DocumentUpload({
  jenis: _jenis,
  label,
  onUploadComplete,
  existingFile,
  maxSizeMB = 5,
  acceptedFormats = [".jpg", ".jpeg", ".png", ".pdf"],
}: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage("");
    setOcrConfidence(0);
    setState("idle");
  }, [previewUrl]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `Ukuran file melebihi batas maksimal ${maxSizeMB}MB`;
      }

      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidFormat = acceptedFormats.some((fmt) => fmt.toLowerCase() === ext);
      if (!isValidFormat) {
        const formatList = acceptedFormats.join(", ");
        return `Format file tidak didukung. Gunakan ${formatList}`;
      }

      return null;
    },
    [maxSizeMB, acceptedFormats]
  );

  const simulateUpload = useCallback(async () => {
    // Upload phase: 2 second progress
    setState("uploading");
    setProgress(0);

    await new Promise<void>((resolve) => {
      const steps = 20; // 20 steps of 100ms each = 2 seconds
      let currentStep = 0;
      progressIntervalRef.current = setInterval(() => {
        currentStep++;
        const pct = Math.min(Math.round((currentStep / steps) * 100), 100);
        setProgress(pct);
        if (currentStep >= steps) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          resolve();
        }
      }, 100);
    });

    // 10% chance of simulated failure
    if (Math.random() < 0.1) {
      setState("error");
      setErrorMessage("Upload gagal. Silakan coba lagi.");
      return;
    }

    // OCR processing phase: 2 seconds
    setState("processing");
    await new Promise<void>((resolve) => {
      processingTimeoutRef.current = setTimeout(() => {
        processingTimeoutRef.current = null;
        resolve();
      }, 2000);
    });

    // Generate OCR confidence between 60-95
    const confidence = Math.round((60 + Math.random() * 35));
    setOcrConfidence(confidence);

    // 20% chance of blurry warning
    if (Math.random() < 0.2) {
      setState("blurry_warning");
    } else {
      setState("complete");
    }

    // Callback
    if (onUploadComplete && selectedFile) {
      onUploadComplete({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        uploadedAt: new Date().toISOString(),
        ocrConfidence: confidence / 100,
      });
    }
  }, [onUploadComplete, selectedFile]);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        setState("error");
        return;
      }

      setErrorMessage("");
      setSelectedFile(file);

      // Create preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setState("preview");
    },
    [validateFile, previewUrl]
  );

  // ── Drag handlers ──

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("dragging");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      } else {
        setState("idle");
      }
    },
    [handleFileSelect]
  );

  // ── Click to open file dialog ──

  const handleDropZoneClick = useCallback(() => {
    if (state === "idle" || state === "error") {
      fileInputRef.current?.click();
    }
  }, [state]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(() => {
    simulateUpload();
  }, [simulateUpload]);

  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  const isImageFile = (file: File | null): boolean => {
    if (!file) return false;
    return file.type.startsWith("image/");
  };

  const isPdfFile = (file: File | null): boolean => {
    if (!file) return false;
    return file.type === "application/pdf";
  };

  // ── Render ──

  const renderDropZoneContent = () => {
    switch (state) {
      case "idle":
        return (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {existingFile
                ? "Klik untuk mengganti file"
                : "Seret file ke sini atau klik untuk upload"}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {label} &mdash; {acceptedFormats.join(", ").toUpperCase()} (maks. {maxSizeMB}MB)
            </p>
            {existingFile && (
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  File tersimpan
                </span>
              </div>
            )}
          </div>
        );

      case "dragging":
        return (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-primary/60" />
            <p className="text-sm font-medium text-primary">
              Lepaskan file di sini
            </p>
          </div>
        );

      case "preview":
        return null; // Handled separately below the drop zone

      case "uploading":
        return (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Mengupload... {progress}%
            </p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memproses OCR...</p>
          </div>
        );

      case "complete":
        return (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-success">
              {label} berhasil diupload
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                getConfidenceBg(ocrConfidence)
              )}
            >
              OCR: {ocrConfidence}%
            </span>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center gap-2">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          </div>
        );

      case "blurry_warning":
        return (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-success">
              {label} berhasil diupload
            </p>
            <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
              <p className="text-xs text-warning-foreground">
                Gambar terdeteksi buram. Disarankan upload ulang.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                getConfidenceBg(ocrConfidence)
              )}
            >
              OCR: {ocrConfidence}%
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
    if (state !== "preview" || !selectedFile || !previewUrl) return null;

    return (
      <div className="flex flex-col items-center gap-3">
        {/* Preview */}
        {isImageFile(selectedFile) ? (
          <img
            src={previewUrl}
            alt={selectedFile.name}
            className="max-h-48 w-auto rounded object-contain"
          />
        ) : isPdfFile(selectedFile) ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 px-6 py-4">
            <FileText className="h-12 w-12 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 px-6 py-4">
            <FileText className="h-12 w-12 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
          </div>
        )}

        {/* File info */}
        <div className="flex w-full max-w-xs items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-medium">{selectedFile.name}</span>
          <span className="shrink-0">{formatFileSize(selectedFile.size)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleUpload}>
            Upload
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Batal
          </Button>
        </div>
      </div>
    );
  };

  const renderActions = () => {
    switch (state) {
      case "complete":
        return (
          <div className="flex justify-center mt-2">
            <Button size="sm" variant="outline" onClick={reset}>
              Upload Ulang
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="flex justify-center mt-2">
            <Button size="sm" variant="outline" onClick={reset}>
              Coba Lagi
            </Button>
          </div>
        );

      case "blurry_warning":
        return (
          <div className="flex justify-center gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={reset}>
              Upload Ulang
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setState("complete")}>
              Tetap Gunakan
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Determine border color based on state
  const borderClass = (() => {
    switch (state) {
      case "dragging":
        return "border-primary/50 bg-primary/5";
      case "complete":
        return "border-success/30 bg-success/5";
      case "error":
        return "border-destructive/30 bg-destructive/5";
      case "blurry_warning":
        return "border-warning/30 bg-warning/5";
      default:
        return "border-muted-foreground/20";
    }
  })();

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          (state === "idle" || state === "error") && "cursor-pointer hover:border-primary/30 hover:bg-accent/30",
          borderClass
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={state === "idle" || state === "error" ? handleDropZoneClick : undefined}
      >
        {renderDropZoneContent()}
        {renderPreview()}
      </div>
      {renderActions()}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
