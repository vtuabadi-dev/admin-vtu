"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  Pencil,
  Download,
  CheckCheck,
  FileText,
  X,
  Building2,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Table } from "@/shared/components/ui/Table";
import { formatDateShort } from "@/shared/lib/utils";
import { getHotelCombinations, generateHotelLabel } from "@/shared/lib/hotel-utils";
import { getManifestList, getManifestByKeberangkatan, getKeberangkatanList, getJamaahList } from "@/services/mock/handlers";
import { mockManifests } from "@/services/mock/data";
import type { Manifest, ManifestRow, Keberangkatan, Jamaah, HotelCombinationSummary } from "@/shared/types";

export default function ManifestPage() {
  const router = useRouter();
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [selectedKeberangkatan, setSelectedKeberangkatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);

  // Form state for generate modal
  const [formKeberangkatan, setFormKeberangkatan] = useState("");
  const [formTemplate, setFormTemplate] = useState("default");
  const [formNama, setFormNama] = useState("");

  const loadManifests = useCallback(async () => {
    setLoading(true);
    try {
      let data: Manifest[];
      if (selectedKeberangkatan) {
        data = await getManifestByKeberangkatan(selectedKeberangkatan);
      } else {
        data = await getManifestList();
      }
      setManifests(data);
    } finally {
      setLoading(false);
    }
  }, [selectedKeberangkatan]);

  useEffect(() => {
    loadManifests();
  }, [loadManifests]);

  useEffect(() => {
    getKeberangkatanList().then(setKeberangkatanList);
    getJamaahList().then(setAllJamaah);
  }, []);

  function handleGenerate() {
    setFormKeberangkatan("");
    setFormTemplate("default");
    setFormNama("");
    setModalOpen(true);
  }

  const selectedKbr = useMemo(
    () => keberangkatanList.find((k) => k.id === formKeberangkatan) ?? null,
    [keberangkatanList, formKeberangkatan]
  );

  const kbrJamaah = useMemo(() => {
    if (!selectedKbr) return [];
    return allJamaah.filter((j) => selectedKbr.jamaahIds.includes(j.id));
  }, [selectedKbr, allJamaah]);

  const siskopatuhCombinations = useMemo<HotelCombinationSummary[]>(() => {
    if (!selectedKbr || formTemplate !== "siskopatuh") return [];
    return getHotelCombinations(kbrJamaah);
  }, [selectedKbr, formTemplate, kbrJamaah]);

  function generatePreviewRows(): ManifestRow[] {
    if (!selectedKbr) return [];
    if (formTemplate === "siskopatuh") return [];
    // Use real jamaah data for non-SISKOPATUH manifests
    return kbrJamaah.map((j, idx) => ({
      id: `preview-${idx}`,
      nomorUrut: idx + 1,
      jamaahId: j.id,
      nomorPaspor: j.nomorPaspor,
      namaLengkap: j.namaLengkap,
      tempatLahir: j.tempatLahir,
      tanggalLahir: j.tanggalLahir,
      nomorKursi: undefined,
      nomorKamar: undefined,
      catatan: undefined,
    }));
  }

  const previewColumns = [
    { key: "nomorUrut", header: "No.", accessor: (row: Record<string, unknown>) => row.nomorUrut as number, className: "w-12" },
    { key: "namaLengkap", header: "Nama Lengkap", accessor: (row: Record<string, unknown>) => row.namaLengkap as string },
    { key: "nomorPaspor", header: "No. Paspor", accessor: (row: Record<string, unknown>) => row.nomorPaspor as string },
    { key: "nomorKursi", header: "No. Kursi", accessor: (row: Record<string, unknown>) => (row.nomorKursi as string) ?? "-" },
    { key: "nomorKamar", header: "No. Kamar", accessor: (row: Record<string, unknown>) => (row.nomorKamar as string) ?? "-" },
  ];

  function doGenerate() {
    if (!selectedKbr || !formNama.trim()) return;

    if (formTemplate === "siskopatuh") {
      const combinations = getHotelCombinations(kbrJamaah);
      const newManifests: Manifest[] = combinations.map((combo, idx) => {
        const filteredJamaah = kbrJamaah.filter(
          (j) => j.hotelMekkah === combo.hotelMekkah && j.hotelMadinah === combo.hotelMadinah
        );
        const label = generateHotelLabel(combo.hotelMekkah, combo.hotelMadinah);
        const seq = String(idx + 1).padStart(3, "0");
        return {
          id: `man-${Date.now()}-${idx}`,
          keberangkatanId: selectedKbr.id,
          kode: `MAN/${selectedKbr.kode}/SKP/${seq}`,
          namaManifest: `${formNama.trim()} — ${label}`,
          hotelMekkah: combo.hotelMekkah,
          hotelMadinah: combo.hotelMadinah,
          createdAt: new Date().toISOString().split("T")[0]!,
          updatedAt: new Date().toISOString().split("T")[0]!,
          status: "draft" as const,
          data: filteredJamaah.map((j, i): ManifestRow => ({
            id: `mrow-${Date.now()}-${idx}-${i}`,
            nomorUrut: i + 1,
            jamaahId: j.id,
            nomorPaspor: j.nomorPaspor,
            namaLengkap: j.namaLengkap,
            tempatLahir: j.tempatLahir,
            tanggalLahir: j.tanggalLahir,
          })),
        };
      });
      mockManifests.push(...newManifests);
    } else {
      const seq = String(mockManifests.length + 1).padStart(3, "0");
      const newManifest: Manifest = {
        id: `man-${Date.now()}`,
        keberangkatanId: selectedKbr.id,
        kode: `MAN/${selectedKbr.kode}/${seq}`,
        namaManifest: formNama.trim(),
        createdAt: new Date().toISOString().split("T")[0]!,
        updatedAt: new Date().toISOString().split("T")[0]!,
        status: "draft",
        data: kbrJamaah.map((j, i): ManifestRow => ({
          id: `mrow-${Date.now()}-${i}`,
          nomorUrut: i + 1,
          jamaahId: j.id,
          nomorPaspor: j.nomorPaspor,
          namaLengkap: j.namaLengkap,
          tempatLahir: j.tempatLahir,
          tanggalLahir: j.tanggalLahir,
        })),
      };
      mockManifests.push(newManifest);
    }

    setModalOpen(false);
    loadManifests();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Manifest</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola manifest keberangkatan umroh dan haji
          </p>
        </div>
        <Button onClick={handleGenerate}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Manifest
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="w-72">
          <Select
            options={keberangkatanList.map((k) => ({
              value: k.id,
              label: `${k.kode} — ${k.namaPaket}`,
            }))}
            placeholder="Semua Keberangkatan"
            value={selectedKeberangkatan}
            onChange={(e) => setSelectedKeberangkatan(e.target.value)}
          />
        </div>
        {selectedKeberangkatan && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedKeberangkatan("")}
          >
            <X className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Manifest Cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Memuat data manifest...
        </div>
      ) : manifests.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Tidak ada manifest ditemukan
        </div>
      ) : (
        <div className="grid gap-4">
          {manifests.map((manifest) => {
            const keberangkatan = keberangkatanList.find(
              (k) => k.id === manifest.keberangkatanId
            );
            return (
              <Card key={manifest.id} variant="operational">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {manifest.namaManifest}
                        {manifest.hotelMekkah && manifest.hotelMadinah && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                            <Building2 className="h-3 w-3" />
                            {generateHotelLabel(manifest.hotelMekkah, manifest.hotelMadinah)}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {manifest.kode}
                      </CardDescription>
                    </div>
                    <StatusBadge status={manifest.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Keberangkatan:</span>
                      <p className="font-medium">{keberangkatan?.kode ?? "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jumlah Jamaah:</span>
                      <p className="font-medium">{manifest.data.length} orang</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dibuat:</span>
                      <p className="font-medium">{formatDateShort(manifest.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diupdate:</span>
                      <p className="font-medium">{formatDateShort(manifest.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/manifest/${manifest.id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Lihat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/manifest/${manifest.id}`)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/admin/manifest/${manifest.id}/export`)
                      }
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Export
                    </Button>
                    {manifest.status === "draft" && (
                      <Button size="sm" variant="default">
                        <CheckCheck className="mr-1 h-3 w-3" />
                        Finalkan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Manifest Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Manifest Baru"
        description="Pilih keberangkatan dan template untuk membuat manifest"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pilih Keberangkatan"
              options={keberangkatanList.map((k) => ({
                value: k.id,
                label: `${k.kode} — ${k.namaPaket}`,
              }))}
              placeholder="-- Pilih Keberangkatan --"
              value={formKeberangkatan}
              onChange={(e) => setFormKeberangkatan(e.target.value)}
            />
            <Select
              label="Template Manifest"
              options={[
                { value: "default", label: "Template Standar" },
                { value: "detailed", label: "Template Detail" },
                { value: "airline", label: "Template Maskapai" },
                { value: "siskopatuh", label: "Template SISKOPATUH" },
              ]}
              value={formTemplate}
              onChange={(e) => setFormTemplate(e.target.value)}
            />
          </div>
          <Input
            label="Nama Manifest"
            placeholder="Contoh: Manifest Penerbangan SV-818"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
          />

          {formKeberangkatan && formTemplate !== "siskopatuh" && (
            <div>
              <p className="text-sm font-medium mb-2">
                Pratinjau Data Jamaah ({generatePreviewRows().length} orang)
              </p>
              <Table
                columns={previewColumns}
                data={generatePreviewRows() as unknown as Record<string, unknown>[]}
                keyField="id"
                dense
              />
            </div>
          )}

          {formTemplate === "siskopatuh" && selectedKbr && (
            <div>
              <p className="text-sm font-medium mb-2">
                Hotel Combinations — {siskopatuhCombinations.length} manifest akan dibuat
              </p>
              {siskopatuhCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Tidak ada data jamaah untuk paket ini
                </p>
              ) : (
                <table className="w-full text-sm border rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">No.</th>
                      <th className="px-3 py-2">Kombinasi Hotel</th>
                      <th className="px-3 py-2 text-right">Jumlah Jamaah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {siskopatuhCombinations.map((combo, idx) => (
                      <tr key={combo.label}>
                        <td className="px-3 py-2 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{combo.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {combo.hotelMekkah} — {combo.hotelMadinah}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {combo.jumlahJamaah} orang
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Sistem akan otomatis membuat {siskopatuhCombinations.length} manifest terpisah berdasarkan kombinasi hotel
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!formKeberangkatan || !formNama.trim()}
              onClick={doGenerate}
            >
              Generate Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
