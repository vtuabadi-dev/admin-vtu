"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Download,
  Hotel,
  Users,
  GripVertical,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Badge, StatusBadge } from "@/shared/components/ui/Badge";
import { formatDateShort, cn } from "@/shared/lib/utils";
import { getHotelCombinations, generateHotelLabel } from "@/shared/lib/hotel-utils";
import type { Rooming, Kamar, PenghuniKamar, Keberangkatan, Jamaah, HotelCombinationSummary } from "@/shared/types";

function PenghuniAvatar({ penghuni }: { penghuni: PenghuniKamar }) {
  const isL = penghuni.jenisKelamin === "L";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
        isL
          ? "bg-info/10 text-info border-info/20"
          : "bg-destructive/10 text-destructive border-destructive/20"
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
          isL ? "bg-info" : "bg-destructive"
        )}
      >
        {penghuni.jenisKelamin}
      </span>
      <span className="truncate max-w-[140px]">{penghuni.namaLengkap}</span>
      {penghuni.isPasangan && (
        <Badge variant="secondary" size="sm" className="ml-auto shrink-0">
          Pasangan
        </Badge>
      )}
    </div>
  );
}

const tipeKamarLabel: Record<string, string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
};

const kapasitasTipe: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
};

function KamarCard({ kamar }: { kamar: Kamar }) {
  const kapasitas = kapasitasTipe[kamar.tipe] ?? 2;
  const terisi = kamar.penghuni.length;
  const isPenuh = terisi >= kapasitas;
  const isWaiting = kamar.tipe === "quad" && terisi > 0 && terisi < kapasitas;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        isPenuh ? "border-success/40 bg-success/5" : isWaiting ? "border-warning/40 bg-warning/5" : "border-border bg-card"
      )}
    >
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {kamar.mixLabel ? kamar.mixLabel : `Km. ${kamar.nomorKamar}`}
          </span>
          {!kamar.mixLabel && (
            <span className="text-[10px] text-muted-foreground">
              Lantai {kamar.lantai}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" size="sm">
            {tipeKamarLabel[kamar.tipe]}
          </Badge>
          <span
            className={cn(
              "text-[10px] font-medium",
              isPenuh ? "text-success" : isWaiting ? "text-warning" : "text-muted-foreground"
            )}
          >
            {terisi}/{kapasitas}
          </span>
        </div>
      </div>

      {/* Waiting indicator for incomplete mix rooms */}
      {isWaiting && (
        <div className="flex items-center gap-1 text-[10px] text-warning font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
          waiting room completion ({kapasitas - terisi} slot tersisa)
        </div>
      )}

      {/* Drag handle hint */}
      {!isWaiting && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-default select-none">
          <GripVertical className="h-3 w-3" />
          <span>tahan & seret untuk pindah</span>
        </div>
      )}

      {/* Penghuni list */}
      {kamar.penghuni.length > 0 ? (
        <div className="space-y-1">
          {kamar.penghuni.map((p) => (
            <PenghuniAvatar key={p.jamaahId} penghuni={p} />
          ))}
        </div>
      ) : (
        <div className="flex h-8 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">
          Kosong — seret jamaah ke sini
        </div>
      )}
    </div>
  );
}

export default function RoomingPage() {
  const [roomings, setRoomings] = useState<Rooming[]>([]);
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [selectedKeberangkatan, setSelectedKeberangkatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeRoomingId, setActiveRoomingId] = useState<string | null>(null);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);

  const selectedKbr = useMemo(
    () => (selectedKeberangkatan ? keberangkatanList.find((k) => k.id === selectedKeberangkatan) ?? null : null),
    [keberangkatanList, selectedKeberangkatan]
  );

  const kbrJamaah = useMemo(() => {
    if (!selectedKbr) return [];
    return allJamaah.filter((j) => selectedKbr.jamaahIds.includes(j.id));
  }, [selectedKbr, allJamaah]);

  const hotelCombinations = useMemo<HotelCombinationSummary[]>(() => {
    if (!selectedKbr) return [];
    return getHotelCombinations(kbrJamaah);
  }, [selectedKbr, kbrJamaah]);

  const loadRoomings = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedKeberangkatan ? `?keberangkatanId=${selectedKeberangkatan}` : "";
      const res = await fetch(`/api/roomings${params}`);
      if (res.ok) {
        const json = await res.json();
        setRoomings(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedKeberangkatan]);

  useEffect(() => {
    loadRoomings();
  }, [loadRoomings]);

  useEffect(() => {
    fetch("/api/keberangkatan").then(r => r.json()).then(j => setKeberangkatanList(j.data ?? []));
    fetch("/api/jamaah").then(r => r.json()).then(j => setAllJamaah(j.data ?? []));
  }, []);

  function getKeberangkatanName(keberangkatanId: string): string {
    const k = keberangkatanList.find((x) => x.id === keberangkatanId);
    return k ? `${k.kode} — ${k.paketUmroh?.namaPaket || "-"}` : "-";
  }

  function totalTerisi(rooming: Rooming): number {
    return rooming.kamar.reduce((sum, k) => sum + k.penghuni.length, 0);
  }

  function totalKapasitas(rooming: Rooming): number {
    return rooming.kamar.reduce((sum, k) => sum + (kapasitasTipe[k.tipe] ?? 2), 0);
  }

  const tipeSortOrder: Record<string, number> = { double: 0, triple: 1, quad: 2, single: 3 };

  function isQuadFamily(kamar: Kamar): boolean {
    if (kamar.tipe !== "quad" || kamar.penghuni.length < 2) return false;
    // If explicitly labeled as Mix, it's not Family
    if (kamar.mixLabel) return false;
    const groups = new Set(
      kamar.penghuni.map((p) => allJamaah.find((j) => j.id === p.jamaahId)?.groupId)
    );
    return groups.size === 1 && !groups.has(undefined);
  }

  function getQuadLabel(kamar: Kamar): string {
    if (kamar.tipe !== "quad") return "";
    return isQuadFamily(kamar) ? "Family" : "Mix";
  }

  function sortKamar(list: Kamar[]): Kamar[] {
    return [...list].sort((a, b) => {
      const orderA = tipeSortOrder[a.tipe] ?? 99;
      const orderB = tipeSortOrder[b.tipe] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      // Both quad: family before mix
      if (a.tipe === "quad" && b.tipe === "quad") {
        const aFam = isQuadFamily(a) ? 0 : 1;
        const bFam = isQuadFamily(b) ? 0 : 1;
        return aFam - bFam;
      }
      return 0;
    });
  }

  function groupKamarByTipe(kamarList: Kamar[]): Map<string, Kamar[]> {
    const map = new Map<string, Kamar[]>();
    const sorted = sortKamar(kamarList);
    for (const k of sorted) {
      let key = tipeKamarLabel[k.tipe] ?? k.tipe;
      if (k.tipe === "quad") {
        key = `Quad ${getQuadLabel(k)}`;
      }
      const existing = map.get(key);
      if (existing) {
        existing.push(k);
      } else {
        map.set(key, [k]);
      }
    }
    return map;
  }

  const visibleRoomings = useMemo(() => {
    if (!selectedKeberangkatan) return roomings;
    return roomings.filter((r) => r.keberangkatanId === selectedKeberangkatan);
  }, [roomings, selectedKeberangkatan]);

  // Auto-select first rooming when list changes
  useEffect(() => {
    if (visibleRoomings.length > 0 && !visibleRoomings.find((r) => r.id === activeRoomingId)) {
      setActiveRoomingId(visibleRoomings[0]!.id);
    }
  }, [visibleRoomings, activeRoomingId]);

  const activeRooming = useMemo(
    () => visibleRoomings.find((r) => r.id === activeRoomingId) ?? null,
    [visibleRoomings, activeRoomingId]
  );

  async function handleGenerateRooming() {
    if (!selectedKbr) return;

    const combinations = getHotelCombinations(kbrJamaah);
    const newRoomings: Rooming[] = combinations.map((combo, idx) => {
      const comboJamaah = kbrJamaah.filter(
        (j) => j.hotelMekkah === combo.hotelMekkah && j.hotelMadinah === combo.hotelMadinah
      );
      const kamarList: Kamar[] = [];
      let roomSeq = 1;

      // Split into Family vs Mix per gender
      function separateFamilyMix(list: Jamaah[]): { family: Jamaah[]; mix: Jamaah[] } {
        // Group by groupId
        const byGroup = new Map<string, Jamaah[]>();
        for (const j of list) {
          const g = byGroup.get(j.groupId);
          if (g) g.push(j);
          else byGroup.set(j.groupId, [j]);
        }
        const family: Jamaah[] = [];
        const mix: Jamaah[] = [];
        byGroup.forEach((members) => {
          if (members.length >= 2) {
            family.push(...members);
          } else {
            mix.push(...members);
          }
        });
        return { family, mix };
      }

      // Allocate family rooms: double → triple → quad
      function allocateFamily(list: Jamaah[]) {
        let i = 0;
        while (i < list.length) {
          const remaining = list.length - i;
          let tipe: Kamar["tipe"];
          let cap: number;
          if (remaining === 1) { tipe = "single"; cap = 1; }
          else if (remaining === 2) { tipe = "double"; cap = 2; }
          else if (remaining === 3) { tipe = "triple"; cap = 3; }
          else { tipe = "quad"; cap = 4; }

          kamarList.push({
            id: `kamar-${combo.label}-fam-${roomSeq}`,
            roomingId: `rooming-${idx}`,
            nomorKamar: `${roomSeq}0${(roomSeq % 3) + 1}`,
            tipe,
            lantai: Math.floor(roomSeq / 4) + 1,
            penghuni: list.slice(i, i + cap).map((j): PenghuniKamar => ({
              jamaahId: j.id,
              namaLengkap: j.namaLengkap,
              jenisKelamin: j.jenisKelamin,
            })),
          });
          i += cap;
          roomSeq++;
        }
      }

      // Allocate mix rooms: quad only, by gender
      function allocateMix(list: Jamaah[], genderLabel: string) {
        let mixNum = 1;
        let i = 0;
        while (i < list.length) {
          const remaining = list.length - i;
          const cap = Math.min(4, remaining);
          const isFull = cap === 4;

          kamarList.push({
            id: `kamar-${combo.label}-mix-${genderLabel}-${mixNum}`,
            roomingId: `rooming-${idx}`,
            nomorKamar: `MX-${genderLabel}-${String(mixNum).padStart(2, "0")}`,
            tipe: "quad",
            lantai: 99,
            penghuni: list.slice(i, i + cap).map((j): PenghuniKamar => ({
              jamaahId: j.id,
              namaLengkap: j.namaLengkap,
              jenisKelamin: j.jenisKelamin,
            })),
            mixLabel: isFull
              ? `Quad Mix ${genderLabel === "M" ? "Male" : "Female"} ${mixNum}`
              : `Quad Mix ${genderLabel === "M" ? "Male" : "Female"} ${mixNum} (waiting)`,
          });
          i += cap;
          mixNum++;
        }
      }

      // Process: Family first (by gender), then Mix (by gender)
      for (const gender of ["L", "P"] as const) {
        const genderList = comboJamaah.filter((j) => j.jenisKelamin === gender);
        const { family, mix } = separateFamilyMix(genderList);
        if (family.length > 0) allocateFamily(family);
        if (mix.length > 0) allocateMix(mix, gender === "L" ? "M" : "F");
      }

      const label = generateHotelLabel(combo.hotelMekkah, combo.hotelMadinah);
      return {
        id: `rooming-${label}-${Date.now()}-${idx}`,
        keberangkatanId: selectedKbr.id,
        hotelMekkah: combo.hotelMekkah,
        hotelMadinah: combo.hotelMadinah,
        hotelNama: `${combo.hotelMekkah} — ${combo.hotelMadinah}`,
        createdAt: new Date().toISOString().split("T")[0]!,
        status: "draft" as const,
        kamar: kamarList,
      };
    });

    // Post each rooming to real API
    for (const r of newRoomings) {
      await fetch("/api/roomings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
    }
    loadRoomings();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automated Rooming</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur dan kelola pembagian kamar hotel untuk jamaah
          </p>
        </div>
        <Button onClick={handleGenerateRooming} disabled={!selectedKbr}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Rooming
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="w-72">
          <Select
            options={keberangkatanList.map((k) => ({
              value: k.id,
              label: `${k.kode} — ${k.paketUmroh?.namaPaket || "-"}`,
            }))}
            placeholder="Semua Keberangkatan"
            value={selectedKeberangkatan}
            onChange={(e) => setSelectedKeberangkatan(e.target.value)}
          />
        </div>
      </div>

      {/* Hotel Combination Overview */}
      {selectedKbr && hotelCombinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Hotel Combinations — {selectedKbr.paketUmroh?.namaPaket || "-"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Rooming grouping: <span className="font-medium text-foreground">Hotel Combination</span>
              <ArrowRight className="inline mx-1 h-3 w-3" />
              <span className="font-medium text-foreground">Gender</span>
              <ArrowRight className="inline mx-1 h-3 w-3" />
              <span className="font-medium text-foreground">Room Type</span>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2">Kombinasi Hotel</th>
                  <th className="pb-2 text-right">Jumlah Jamaah</th>
                  <th className="pb-2 text-right">Pria</th>
                  <th className="pb-2 text-right">Wanita</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hotelCombinations.map((combo) => {
                  const pria = kbrJamaah.filter(
                    (j) => j.hotelMekkah === combo.hotelMekkah && j.hotelMadinah === combo.hotelMadinah && j.jenisKelamin === "L"
                  ).length;
                  const wanita = combo.jumlahJamaah - pria;
                  return (
                    <tr key={combo.label}>
                      <td className="py-2">
                        <span className="font-medium">{combo.label}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {combo.hotelMekkah} — {combo.hotelMadinah}
                        </p>
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {combo.jumlahJamaah}
                        </span>
                      </td>
                      <td className="py-2 text-right text-xs">{pria} L</td>
                      <td className="py-2 text-right text-xs">{wanita} P</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Rooming Result — Tab-based */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Memuat data rooming...
        </div>
      ) : visibleRoomings.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Tidak ada data rooming ditemukan
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs — satu per kombinasi hotel */}
          <div className="flex flex-wrap items-center gap-2">
            {visibleRoomings.map((r) => {
              const label = (r.hotelMekkah && r.hotelMadinah)
                ? generateHotelLabel(r.hotelMekkah, r.hotelMadinah)
                : r.hotelNama;
              return (
                <Button
                  key={r.id}
                  size="sm"
                  variant={activeRoomingId === r.id ? "default" : "outline"}
                  onClick={() => setActiveRoomingId(r.id)}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {label}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({r.kamar.length})
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Active tab content */}
          {activeRooming && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hotel className="h-4 w-4 text-muted-foreground" />
                      {activeRooming.hotelNama}
                      <StatusBadge status={activeRooming.status} />
                    </CardTitle>
                    <CardDescription>
                      {getKeberangkatanName(activeRooming.keberangkatanId)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Dibuat: {formatDateShort(activeRooming.createdAt)}
                    </span>
                    <span>
                      <Users className="mr-1 inline h-3 w-3" />
                      {totalTerisi(activeRooming)}/{totalKapasitas(activeRooming)} jamaah
                    </span>
                    <Button size="sm" variant="outline">
                      <Download className="mr-1 h-3 w-3" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Room type groups */}
                {Array.from(groupKamarByTipe(activeRooming.kamar).entries()).map(([groupLabel, kamarList]) => (
                  <div key={groupLabel}>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      {groupLabel}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({kamarList.length} kamar)
                      </span>
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      {kamarList.map((kamar) => (
                        <KamarCard key={kamar.id} kamar={kamar} />
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
