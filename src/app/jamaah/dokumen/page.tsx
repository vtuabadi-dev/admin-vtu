"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Modal,
} from "@/shared/components/ui";
import { formatDate } from "@/shared/lib/utils";
import {
  Upload,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import type { DokumenItem, DokumenJenis, OcrData } from "@/shared/types";

// ============================================================
// Dokumen display names
// ============================================================
const DOKUMEN_LABEL: Record<DokumenJenis, string> = {
  paspor: "Paspor",
  pas_foto: "Pas Foto",
  vaksin: "Sertifikat Vaksin",
  ktp: "KTP",
  kk: "Kartu Keluarga",
  akta: "Akta Lahir",
};

function getStatusIcon(status: string) {
  switch (status) {
    case "lengkap":
    case "verified":
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case "revisi":
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    case "pending":
      return <ShieldAlert className="h-3.5 w-3.5 text-warning" />;
    default:
      return null;
  }
}

// ============================================================
// Detail Modal: shows OCR data
// ============================================================
function DetailModal({
  doc,
  open,
  onClose,
}: {
  doc: DokumenItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!doc) return null;

  const ocrData: OcrData | undefined = doc.ocrData;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail Dokumen: ${DOKUMEN_LABEL[doc.jenis] ?? doc.jenis}`}
      description="Informasi lengkap dan hasil OCR dokumen"
      size="lg"
    >
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <StatusBadge status={doc.status} />
        </div>

        {/* Upload info */}
        {doc.uploadedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tanggal Upload</span>
            <span className="text-sm">{formatDate(doc.uploadedAt)}</span>
          </div>
        )}

        {doc.verifiedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tanggal Verifikasi</span>
            <span className="text-sm">{formatDate(doc.verifiedAt)}</span>
          </div>
        )}

        {doc.verifiedBy && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Diverifikasi Oleh</span>
            <span className="text-sm">{doc.verifiedBy}</span>
          </div>
        )}

        {doc.catatan && (
          <div className="rounded-md bg-warning/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-xs font-medium text-warning-foreground">Catatan:</p>
                <p className="text-sm text-muted-foreground">{doc.catatan}</p>
              </div>
            </div>
          </div>
        )}

        {/* OCR Result */}
        {ocrData && (
          <div className="space-y-2 rounded-md border p-4">
            <h4 className="text-sm font-semibold">Hasil OCR</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Akurasi:</span>
              <Badge
                variant={ocrData.confidence >= 85 ? "success" : ocrData.confidence >= 60 ? "warning" : "destructive"}
                size="sm"
              >
                {ocrData.confidence}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {ocrData.namaLengkap && (
                <>
                  <span className="text-muted-foreground">Nama:</span>
                  <span>{ocrData.namaLengkap}</span>
                </>
              )}
              {ocrData.nik && (
                <>
                  <span className="text-muted-foreground">NIK:</span>
                  <span>{ocrData.nik}</span>
                </>
              )}
              {ocrData.nomorPaspor && (
                <>
                  <span className="text-muted-foreground">No. Paspor:</span>
                  <span>{ocrData.nomorPaspor}</span>
                </>
              )}
              {ocrData.tanggalLahir && (
                <>
                  <span className="text-muted-foreground">Tgl. Lahir:</span>
                  <span>{formatDate(ocrData.tanggalLahir)}</span>
                </>
              )}
              {ocrData.tempatLahir && (
                <>
                  <span className="text-muted-foreground">Tempat Lahir:</span>
                  <span>{ocrData.tempatLahir}</span>
                </>
              )}
              {ocrData.masaBerlaku && (
                <>
                  <span className="text-muted-foreground">Masa Berlaku:</span>
                  <span>{formatDate(ocrData.masaBerlaku)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// Dokumen Status Page
// ============================================================
export default function DokumenStatusPage() {
  const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DokumenItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jamaah/me/documents");
        if (res.ok) {
          const json = await res.json();
          setDokumenList(json.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load dokumen:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleViewDetail(doc: DokumenItem) {
    setSelectedDoc(doc);
    setShowDetail(true);
  }

  function handleUploadUlang(doc: DokumenItem) {
    // Mock: redirect to upload page
    console.log(`Upload ulang: ${doc.jenis}`);
    window.location.href = "/jamaah/dokumen/upload";
  }

  if (loading) {
    return <LoadingSkeleton variant="table" rows={6} />;
  }

  const revisiDocs = dokumenList.filter((d) => d.status === "revisi" || d.status === "rejected");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Status Dokumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status verifikasi dokumen persyaratan Anda
        </p>
      </div>

      {/* Revision notification banner */}
      {revisiDocs.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Dokumen Perlu Direvisi</p>
              <p className="text-sm text-muted-foreground">
                {revisiDocs.length === 1
                  ? `Dokumen ${DOKUMEN_LABEL[revisiDocs[0]!.jenis] ?? revisiDocs[0]!.jenis} perlu diperbaiki.`
                  : `${revisiDocs.length} dokumen Anda memerlukan perbaikan:`}
              </p>
              {revisiDocs.length > 1 && (
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {revisiDocs.map((d) => (
                    <li key={d.id}>
                      {DOKUMEN_LABEL[d.jenis] ?? d.jenis}
                      {d.catatan && <span className="text-destructive"> — {d.catatan}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {revisiDocs.length === 1 && revisiDocs[0]?.catatan && (
                <p className="text-sm text-destructive">Alasan: {revisiDocs[0].catatan}</p>
              )}
              <p className="text-sm font-medium mt-1">
                Klik tombol <span className="text-destructive font-semibold">Upload Ulang</span> pada dokumen terkait untuk memperbaiki.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {dokumenList.filter((d) => d.status === "lengkap" || d.status === "verified").length}
              </p>
              <p className="text-xs text-muted-foreground">Lengkap</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {dokumenList.filter((d) => d.status === "pending" || d.status === "kurang").length}
              </p>
              <p className="text-xs text-muted-foreground">Menunggu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">
                {dokumenList.filter((d) => d.status === "revisi" || d.status === "rejected").length}
              </p>
              <p className="text-xs text-muted-foreground">Revisi / Ditolak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{dokumenList.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table
            columns={[
              {
                key: "jenis",
                header: "Jenis Dokumen",
                accessor: (row: DokumenItem) => (
                  <span className="font-medium capitalize">
                    {DOKUMEN_LABEL[row.jenis] ?? row.jenis.replace(/_/g, " ")}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                accessor: (row: DokumenItem) => (
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.status)}
                    <StatusBadge status={row.status} />
                  </div>
                ),
              },
              {
                key: "uploadedAt",
                header: "Tgl. Upload",
                accessor: (row: DokumenItem) =>
                  row.uploadedAt ? (
                    <span className="text-sm">{formatDate(row.uploadedAt)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Belum upload</span>
                  ),
              },
              {
                key: "verifiedAt",
                header: "Tgl. Verifikasi",
                accessor: (row: DokumenItem) =>
                  row.verifiedAt ? (
                    <span className="text-sm">{formatDate(row.verifiedAt)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  ),
              },
              {
                key: "catatan",
                header: "Catatan",
                accessor: (row: DokumenItem) =>
                  row.catatan ? (
                    <span className="max-w-[200px] truncate text-xs text-muted-foreground block">
                      {row.catatan}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  ),
              },
              {
                key: "aksi",
                header: "Aksi",
                accessor: (row: DokumenItem) => (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(row);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {(row.status === "revisi" || row.status === "rejected") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadUlang(row);
                        }}
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        Upload Ulang
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={dokumenList}
            keyField="id"
            onRowClick={(row) => handleViewDetail(row)}
            emptyMessage="Belum ada dokumen yang diupload"
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <DetailModal doc={selectedDoc} open={showDetail} onClose={() => setShowDetail(false)} />
    </div>
  );
}
