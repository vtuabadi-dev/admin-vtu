"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Plane,
  UserCheck,
  UserPlus,
  Hotel,
  Lock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clipboard,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { getKeberangkatanById } from "@/server/actions/api";
import type { Keberangkatan } from "@/shared/types";

interface FlightSegment {
  tanggal: string;
  kodeFlight: string;
  pnr: string;
  asal: string;
  tujuan: string;
  jamBerangkat: string;
  jamTiba: string;
}

export default function EditKeberangkatanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan | null>(null);

  // Form State
  const [namaPaket, setNamaPaket] = useState("");
  const [tanggalBerangkat, setTanggalBerangkat] = useState("");
  const [tanggalPulang, setTanggalPulang] = useState("");
  const [kuota, setKuota] = useState<number>(45);
  const [targetMaterialisasi, setTargetMaterialisasi] = useState<number>(30);
  const [hargaPaket, setHargaPaket] = useState<number>(0);
  const [hotelMekkah, setHotelMekkah] = useState("");
  const [hotelMadinah, setHotelMadinah] = useState("");
  const [pnrMain, setPnrMain] = useState("");
  
  // Staff State
  const [tourLeaderNama, setTourLeaderNama] = useState("");
  const [tourLeaderKontak, setTourLeaderKontak] = useState("");
  const [muthowifNama, setMuthowifNama] = useState("");
  const [muthowifKontak, setMuthowifKontak] = useState("");

  // Master Petugas State
  const [masterPetugas, setMasterPetugas] = useState<Array<{ id: string; nama: string; tipe: string; noHp?: string | null }>>([]);

  useEffect(() => {
    async function fetchPetugas() {
      try {
        const res = await fetch("/api/master/petugas");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setMasterPetugas(json.data);
          }
        }
      } catch (err) {
        console.warn("[EditKeberangkatan] Gagal memuat Master Petugas:", err);
      }
    }
    fetchPetugas();
  }, []);

  const tlOptions = useMemo(() => {
    return masterPetugas
      .filter((p) => p.tipe === "TOUR_LEADER" || !p.tipe)
      .map((p) => ({
        value: p.nama,
        label: p.nama,
        sublabel: p.noHp ? `No. HP: ${p.noHp}` : "Tanpa Kontak",
        noHp: p.noHp || "",
      }));
  }, [masterPetugas]);

  const muthOptions = useMemo(() => {
    return masterPetugas
      .filter((p) => p.tipe === "MUTHOWIF" || !p.tipe)
      .map((p) => ({
        value: p.nama,
        label: p.nama,
        sublabel: p.noHp ? `No. HP: ${p.noHp}` : "Tanpa Kontak",
        noHp: p.noHp || "",
      }));
  }, [masterPetugas]);

  // Flight Segments State
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getKeberangkatanById(id);
        if (!data) {
          setError(new Error("Paket keberangkatan tidak ditemukan"));
          return;
        }
        setKeberangkatan(data);

        const depStr: string = data.tanggalBerangkat ? (new Date(data.tanggalBerangkat).toISOString().split("T")[0] ?? "") : "";
        const retStr: string = data.tanggalPulang ? (new Date(data.tanggalPulang).toISOString().split("T")[0] ?? "") : "";

        setNamaPaket(data.namaPaket || "");
        setTanggalBerangkat(depStr);
        setTanggalPulang(retStr);
        setKuota(data.maxSeat || data.kuota || 45);
        setTargetMaterialisasi(data.targetMaterialisasi || 30);
        setHargaPaket(data.hargaPaket || 0);
        setHotelMekkah(data.hotelMekkah || "");
        setHotelMadinah(data.hotelMadinah || "");

        const meta = (data as any).driveFolderIds || {};
        const flight = meta.flightDetails || {};
        const tl = meta.tourLeader || {};
        const muth = meta.muthowif || {};

        setPnrMain(flight.pnr || data.nomorPenerbangan || "");
        setTourLeaderNama(tl.nama || "");
        setTourLeaderKontak(tl.kontak || "");
        setMuthowifNama(muth.nama || "");
        setMuthowifKontak(muth.kontak || "");

        // Multi-segment flight
        if (Array.isArray(flight.segments) && flight.segments.length > 0) {
          setFlightSegments(flight.segments);
        } else {
          // Default segments matching flight details sheet
          setFlightSegments([
            {
              tanggal: depStr,
              kodeFlight: data.nomorPenerbangan || "1796",
              pnr: flight.pnr || "17J4HP / ROYAL BRUNEI",
              asal: "SUB",
              tujuan: "BWN",
              jamBerangkat: "05:00",
              jamTiba: "09:15",
            },
            {
              tanggal: depStr,
              kodeFlight: "1001",
              pnr: flight.pnr || "17J4HP / ROYAL BRUNEI",
              asal: "BWN",
              tujuan: "JED",
              jamBerangkat: "11:15",
              jamTiba: "16:15",
            },
            {
              tanggal: retStr,
              kodeFlight: "1002",
              pnr: flight.pnr || "17J4HP / ROYAL BRUNEI",
              asal: "JED",
              tujuan: "BWN",
              jamBerangkat: "18:15",
              jamTiba: "09:35+1",
            },
            {
              tanggal: retStr,
              kodeFlight: "1795",
              pnr: flight.pnr || "17J4HP / ROYAL BRUNEI",
              asal: "BWN",
              tujuan: "SUB",
              jamBerangkat: "19:45",
              jamTiba: "21:00",
            },
          ]);
        }
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error("Gagal memuat data paket"));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleAddSegment = () => {
    setFlightSegments((prev) => [
      ...prev,
      {
        tanggal: tanggalBerangkat || "",
        kodeFlight: "",
        pnr: pnrMain || "",
        asal: "",
        tujuan: "",
        jamBerangkat: "",
        jamTiba: "",
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    setFlightSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSegmentChange = (index: number, field: keyof FlightSegment, value: string) => {
    setFlightSegments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as FlightSegment;
      return updated;
    });
  };

  const handlePasteTable = (
    e: React.ClipboardEvent,
    startRowIndex: number,
    startColField: keyof FlightSegment
  ) => {
    const clipboardData = e.clipboardData.getData("text/plain");
    if (!clipboardData || (!clipboardData.includes("\t") && !clipboardData.includes("\n"))) {
      return; // Regular single field paste
    }

    e.preventDefault();

    const lines = clipboardData
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) return;

    const columnOrder: (keyof FlightSegment)[] = [
      "tanggal",
      "kodeFlight",
      "pnr",
      "asal",
      "tujuan",
      "jamBerangkat",
      "jamTiba",
    ];

    const startColIndex = columnOrder.indexOf(startColField);
    const targetColIndex = startColIndex >= 0 ? startColIndex : 0;

    setFlightSegments((prev) => {
      const updated = [...prev];

      lines.forEach((line, rOffset) => {
        const targetRow = startRowIndex + rOffset;
        const cells = line.split("\t");

        while (updated.length <= targetRow) {
          updated.push({
            tanggal: "",
            kodeFlight: "",
            pnr: "",
            asal: "",
            tujuan: "",
            jamBerangkat: "",
            jamTiba: "",
          });
        }

        const rowObj = { ...updated[targetRow] };

        cells.forEach((cellText, cOffset) => {
          const cIndex = targetColIndex + cOffset;
          if (cIndex < columnOrder.length) {
            const field = columnOrder[cIndex];
            if (field) {
              let val = cellText.trim();

              if (field === "tanggal") {
                try {
                  const parsed = new Date(val);
                  if (!isNaN(parsed.getTime())) {
                    val = parsed.toISOString().split("T")[0] ?? "";
                  }
                } catch {
                  // Keep raw string if parse fails
                }
              }

              (rowObj as any)[field] = val;
            }
          }
        });

        updated[targetRow] = rowObj as FlightSegment;
      });

      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      if (keberangkatan && Number(kuota) < (keberangkatan.terisi || 0)) {
        alert(`Kuota seat (${kuota} Pax) tidak boleh lebih kecil dari jumlah jamaah yang sudah terdaftar (${keberangkatan.terisi} Pax).`);
        setSaving(false);
        return;
      }

      const mainFlightNo = flightSegments[0]?.kodeFlight || pnrMain || "SV-816";
      const mainRouteStr = flightSegments.length > 0
        ? `${flightSegments[0]?.asal || "SUB"} -> ${flightSegments[flightSegments.length - 1]?.tujuan || "JED"}`
        : "SUB -> JED";

      const res = await fetch(`/api/keberangkatan/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPaket,
          tanggalBerangkat,
          tanggalPulang,
          kuota: Number(kuota || 45),
          maxSeat: Number(kuota || 45),
          targetMaterialisasi: Number(targetMaterialisasi || 30),
          hargaPaket: Number(hargaPaket || 0),
          nomorPenerbangan: mainFlightNo,
          hotelMekkah,
          hotelMadinah,
          flightDetails: {
            pnr: pnrMain,
            nomorPenerbangan: mainFlightNo,
            rutePenerbangan: mainRouteStr,
            segments: flightSegments,
          },
          tourLeader: {
            nama: tourLeaderNama,
            kontak: tourLeaderKontak,
          },
          muthowif: {
            nama: muthowifNama,
            kontak: muthowifKontak,
          },
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSuccessMessage("Data paket berhasil diperbarui dan dicatat ke History Log Audit!");
        setTimeout(() => {
          router.push(`/admin/keberangkatan`);
        }, 1500);
      } else {
        alert(resJson.message || "Gagal memperbarui paket");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !keberangkatan) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ErrorState
          title="Gagal Memuat Paket"
          message={error?.message || "Paket tidak ditemukan"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/keberangkatan")}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Lengkapi & Edit Data Operasional Paket
            </h1>
            <p className="text-xs text-muted-foreground">
              Kelola rute flight multi-segment, PNR, Tour Leader, Muthowif, dan jadwal paket
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/keberangkatan")}
            disabled={saving}
          >
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2 animate-in fade-in-0">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Single Source of Truth Banner */}
      <Card className="border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded border">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                ID Paket:
              </span>
              <code className="font-mono font-bold text-foreground text-sm select-all">
                {keberangkatan.id}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Kode Paket:</span>
              <code className="font-mono text-primary font-bold text-sm select-all">
                {keberangkatan.kode}
              </code>
            </div>
            <span className="w-full text-[11px] text-muted-foreground italic border-t pt-2 mt-1">
              🔒 ID Paket & Kode Keberangkatan bersifat permanen (Single Source of Truth) dan tidak dapat diubah demi keamanan audit transaksi.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Jadwal, Kuota & Identitas Paket */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Calendar className="h-4 w-4" />
            Jadwal Keberangkatan, Kuota Seat &amp; Identitas Paket
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nama Paket Keberangkatan
            </label>
            <Input
              type="text"
              value={namaPaket}
              onChange={(e) => setNamaPaket(e.target.value)}
              className="text-sm font-medium"
            />
          </div>

          {/* Kuota & Kapasitas Seat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center justify-between">
                <span>Kuota Kapasitas Seat (Pax)</span>
                <span className="text-[11px] font-semibold text-primary">
                  Terisi: {keberangkatan.terisi || 0} Pax
                </span>
              </label>
              <Input
                type="number"
                min={keberangkatan.terisi || 1}
                value={kuota}
                onChange={(e) => setKuota(parseInt(e.target.value, 10) || 0)}
                className="font-bold text-base text-primary bg-card"
                placeholder="45"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Kapasitas maksimal kursi yang dialokasikan untuk paket ini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Target Materialisasi (Pax)
              </label>
              <Input
                type="number"
                min={1}
                value={targetMaterialisasi}
                onChange={(e) => setTargetMaterialisasi(parseInt(e.target.value, 10) || 0)}
                className="font-semibold bg-card"
                placeholder="30"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Target minimal jamaah untuk keberangkatan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Harga Base Paket (Rp)
              </label>
              <Input
                type="number"
                min={0}
                value={hargaPaket}
                onChange={(e) => setHargaPaket(parseInt(e.target.value, 10) || 0)}
                className="font-semibold bg-card"
                placeholder="35000000"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Harga per pax paket (di luar add-on).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tanggal Keberangkatan
              </label>
              <Input
                type="date"
                value={tanggalBerangkat}
                onChange={(e) => setTanggalBerangkat(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tanggal Kepulangan
              </label>
              <Input
                type="date"
                value={tanggalPulang}
                onChange={(e) => setTanggalPulang(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Tabel Multi-Segment Flight Details */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Plane className="h-4 w-4" />
            Detail Penerbangan & Multi-Segment Flight (PNR)
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSegment}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Segmen
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="max-w-md">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Kode PNR / Nama Maskapai Lengkap
            </label>
            <Input
              type="text"
              placeholder="Misal: 17J4HP / 17J4Y8 ROYAL BRUNEI"
              value={pnrMain}
              onChange={(e) => setPnrMain(e.target.value)}
              className="font-mono text-sm font-semibold uppercase"
            />
          </div>

          {/* Banner Tip Paste Excel */}
          <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Clipboard className="h-4 w-4 shrink-0 text-blue-500" />
            <span>
              <strong>Dukungan Copy-Paste Excel / Spreadsheet:</strong> Anda dapat me-copy 7 kolom sekaligus (Tanggal, Kode Flight, PNR, Asal, Tujuan, Jam Berangkat, Jam Tiba) dari Excel/Google Sheets, lalu <strong>Paste (Ctrl+V)</strong> pada sel pertama di bawah untuk otomatis mengisi seluruh tabel dan menambah baris otomatis!
            </span>
          </div>

          {/* Tabel Segment Penerbangan (Excel style matching User Screenshot) */}
          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-primary/10 border-b text-primary font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 border-r w-36">TANGGAL</th>
                  <th className="py-2.5 px-3 border-r w-28">KODE FLIGHT</th>
                  <th className="py-2.5 px-3 border-r w-44">PNR / MASKAPAI</th>
                  <th className="py-2.5 px-3 border-r text-center" colSpan={4}>
                    DETAIL FLIGHT (RUTE & WAKTU)
                  </th>
                  <th className="py-2.5 px-2 text-center w-12">AKSI</th>
                </tr>
                <tr className="bg-muted/40 border-b text-[10px] text-muted-foreground font-semibold uppercase">
                  <th className="py-1 px-3 border-r"></th>
                  <th className="py-1 px-3 border-r"></th>
                  <th className="py-1 px-3 border-r"></th>
                  <th className="py-1 px-2 border-r text-center w-20">ASAL</th>
                  <th className="py-1 px-2 border-r text-center w-20">TUJUAN</th>
                  <th className="py-1 px-2 border-r text-center w-24">JAM DEPART</th>
                  <th className="py-1 px-2 border-r text-center w-24">JAM ARRIVAL</th>
                  <th className="py-1 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {flightSegments.map((segment, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-1.5 border-r">
                      <Input
                        type="date"
                        value={segment.tanggal}
                        onChange={(e) => handleSegmentChange(idx, "tanggal", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "tanggal")}
                        className="h-8 text-xs font-mono px-2"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="Misal: 1796"
                        value={segment.kodeFlight}
                        onChange={(e) => handleSegmentChange(idx, "kodeFlight", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "kodeFlight")}
                        className="h-8 text-xs font-mono uppercase px-2 font-bold"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="ROYAL BRUNEI"
                        value={segment.pnr}
                        onChange={(e) => handleSegmentChange(idx, "pnr", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "pnr")}
                        className="h-8 text-xs font-mono uppercase px-2"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="SUB"
                        value={segment.asal}
                        onChange={(e) => handleSegmentChange(idx, "asal", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "asal")}
                        className="h-8 text-xs font-mono uppercase text-center font-bold px-1"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="JED"
                        value={segment.tujuan}
                        onChange={(e) => handleSegmentChange(idx, "tujuan", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "tujuan")}
                        className="h-8 text-xs font-mono uppercase text-center font-bold px-1"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="05:00"
                        value={segment.jamBerangkat}
                        onChange={(e) => handleSegmentChange(idx, "jamBerangkat", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "jamBerangkat")}
                        className="h-8 text-xs font-mono text-center px-1"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <Input
                        type="text"
                        placeholder="09:15"
                        value={segment.jamTiba}
                        onChange={(e) => handleSegmentChange(idx, "jamTiba", e.target.value)}
                        onPaste={(e) => handlePasteTable(e, idx, "jamTiba")}
                        className="h-8 text-xs font-mono text-center px-1"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSegment(idx)}
                        disabled={flightSegments.length <= 1}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-30"
                        title="Hapus Segmen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Petugas Lapangan (Tour Leader & Muthowif) */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <UserCheck className="h-4 w-4" />
            Petugas Lapangan (Tour Leader & Muthowif)
          </CardTitle>
          <a
            href="/admin/master/petugas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            + Kelola Master Petugas <ExternalLink className="h-3 w-3" />
          </a>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tour Leader Column */}
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Tour Leader (TL)
                </span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                  {tlOptions.length} Petugas Terdaftar
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Pilih dari Master Petugas (Tour Leader)
                </label>
                <SearchableSelect
                  options={tlOptions}
                  value={tourLeaderNama}
                  onChange={(val) => {
                    setTourLeaderNama(val);
                    const selected = tlOptions.find((o) => o.value === val);
                    if (selected?.noHp) setTourLeaderKontak(selected.noHp);
                  }}
                  placeholder="-- Cari / Pilih Tour Leader --"
                  searchPlaceholder="Ketik nama Tour Leader..."
                  size="sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nama Lengkap Tour Leader (Bisa Ketik Custom)
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Ustadz Ahmad"
                  value={tourLeaderNama}
                  onChange={(e) => setTourLeaderNama(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  No. HP / WhatsApp Tour Leader
                </label>
                <Input
                  type="text"
                  placeholder="Misal: 08123456789"
                  value={tourLeaderKontak}
                  onChange={(e) => setTourLeaderKontak(e.target.value)}
                  className="text-xs font-mono bg-background"
                />
              </div>
            </div>

            {/* Muthowif Column */}
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" /> Muthowif
                </span>
                <span className="text-[10px] text-sky-700 bg-sky-600/10 px-1.5 py-0.5 rounded font-medium">
                  {muthOptions.length} Petugas Terdaftar
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Pilih dari Master Petugas (Muthowif)
                </label>
                <SearchableSelect
                  options={muthOptions}
                  value={muthowifNama}
                  onChange={(val) => {
                    setMuthowifNama(val);
                    const selected = muthOptions.find((o) => o.value === val);
                    if (selected?.noHp) setMuthowifKontak(selected.noHp);
                  }}
                  placeholder="-- Cari / Pilih Muthowif --"
                  searchPlaceholder="Ketik nama Muthowif..."
                  size="sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nama Lengkap Muthowif (Bisa Ketik Custom)
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Syekh Abdullah"
                  value={muthowifNama}
                  onChange={(e) => setMuthowifNama(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  No. HP / WhatsApp Muthowif
                </label>
                <Input
                  type="text"
                  placeholder="Misal: +966 50 123 4567"
                  value={muthowifKontak}
                  onChange={(e) => setMuthowifKontak(e.target.value)}
                  className="text-xs font-mono bg-background"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Akomodasi Hotel */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Hotel className="h-4 w-4" />
            Akomodasi Hotel (Mekkah & Madinah)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hotel Mekkah
              </label>
              <Input
                type="text"
                placeholder="Misal: Safwah Tower / Pulman Zamzam"
                value={hotelMekkah}
                onChange={(e) => setHotelMekkah(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hotel Madinah
              </label>
              <Input
                type="text"
                placeholder="Misal: Taiba Front / Mirage Al Salam"
                value={hotelMadinah}
                onChange={(e) => setHotelMadinah(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Setiap perubahan akan dicatat secara permanen ke Audit Trail & Activity Event Log.
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/keberangkatan")}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
