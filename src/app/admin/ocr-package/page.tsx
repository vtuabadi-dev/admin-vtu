"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2, CheckCircle, AlertTriangle, Save, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { extractFilesFromEvent } from "@/shared/lib/file-drop-utils";
import { cn } from "@/shared/lib/utils";

interface ExtractedFields {
  namaPaket?: string;
  kode?: string;
  maskapai?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
  hargaPaket?: number;
  tanggalBerangkat?: string;
  tanggalPulang?: string;
  durasi?: string;
  kotaKeberangkatan?: string;
  roomType?: string;
  upgradePricing?: string;
  highlights?: string;
  facilities?: string;
  notes?: string;
  captionSnippets?: string;
}

export default function OcrPackagePage() {
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = await extractFilesFromEvent(e);
    const file = files[0];
    if (file) setFlyerFile(file);
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const files = await extractFilesFromEvent(e);
    const file = files[0];
    if (file) {
      e.preventDefault();
      setFlyerFile(file);
    }
  }, []);

  async function handleUpload() {
    if (!flyerFile) return;
    setUploading(true);
    setExtracted(null);
    setWarning("");

    try {
      const formData = new FormData();
      formData.append("file", flyerFile);
      if (caption) formData.append("caption", caption);

      const res = await fetch("/api/admin/ocr-package", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memproses flyer");

      setExtracted(json.data.extracted);
      setDraftId(json.data.draftId);
      if (json.data.warning) setWarning(json.data.warning);
    } catch (err: any) {
      setWarning(err.message || "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!draftId || !extracted) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/ocr-package/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extracted),
      });

      if (!res.ok) throw new Error("Gagal menyimpan paket");
      setSaved(true);
    } catch (err: any) {
      setWarning(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof ExtractedFields, value: any) {
    if (!extracted) return;
    setExtracted({ ...extracted, [key]: value });
  }

  const FIELD_LABELS: Record<keyof ExtractedFields, string> = {
    namaPaket: "Nama Paket", kode: "Kode Paket", maskapai: "Maskapai",
    hotelMekkah: "Hotel Mekkah", hotelMadinah: "Hotel Madinah",
    hargaPaket: "Harga Paket", tanggalBerangkat: "Tgl Berangkat", tanggalPulang: "Tgl Pulang",
    durasi: "Durasi", kotaKeberangkatan: "Kota Keberangkatan",
    roomType: "Tipe Kamar", upgradePricing: "Harga Upgrade",
    highlights: "Highlights", facilities: "Fasilitas",
    notes: "Catatan", captionSnippets: "Caption",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OCR Package Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload flyer paket untuk ekstraksi otomatis
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload Flyer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-6 py-4 transition-all w-full max-w-md justify-center",
                isDragging
                  ? "border-primary bg-primary/10 ring-2 ring-primary/40 scale-[1.01]"
                  : "border-stone-300 dark:border-stone-700 hover:border-primary hover:bg-primary/5"
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <span className="text-sm font-medium block">
                  {flyerFile ? flyerFile.name : "Pilih / Drag Flyer (Komputer atau WhatsApp)"}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Mendukung JPG, PNG, drag-and-drop & paste Ctrl+V
                </span>
              </div>
              <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                onChange={(e) => setFlyerFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Caption / Marketing Text (optional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Copy caption dari postingan marketing..."
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={handleUpload} disabled={!flyerFile || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {uploading ? "Memproses..." : "Proses Flyer"}
          </Button>
          {warning && (
            <div className="flex items-center gap-2 rounded-md bg-warning/5 border border-warning/20 px-3 py-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {warning}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extraction Results */}
      {extracted && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hasil Ekstraksi</CardTitle>
              {draftId && <Badge variant="secondary">Draft: {draftId}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(FIELD_LABELS) as (keyof ExtractedFields)[]).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{FIELD_LABELS[key]}</label>
                  {key === "highlights" || key === "facilities" || key === "notes" || key === "captionSnippets" ? (
                    <textarea
                      value={(extracted[key] as string) ?? ""}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <Input
                      value={key === "hargaPaket" ? String(extracted[key] ?? "") : (extracted[key] as string) ?? ""}
                      onChange={(e) => updateField(key, key === "hargaPaket" ? parseInt(e.target.value) || 0 : e.target.value)}
                      type={key === "hargaPaket" ? "number" : "text"}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={saving || saved}>
                {saved ? <CheckCircle className="mr-2 h-4 w-4 text-success" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? "Tersimpan" : saving ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
