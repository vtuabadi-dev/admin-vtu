"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { getHotelCombinations, generateHotelLabel } from "@/shared/lib/hotel-utils";
import { getKeberangkatanList, getJamaahList } from "@/server/actions/api";
import type { Keberangkatan, Jamaah, HotelCombinationSummary } from "@/shared/types";

export default function HotelCombinationPage() {
  const router = useRouter();
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);
  const [selectedKbrId, setSelectedKbrId] = useState("");
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);

  useEffect(() => {
    getKeberangkatanList().then(setKeberangkatanList);
    getJamaahList().then(setAllJamaah);
  }, []);

  const selectedKbr = useMemo(
    () => (selectedKbrId ? keberangkatanList.find((k) => k.id === selectedKbrId) ?? null : null),
    [keberangkatanList, selectedKbrId]
  );

  const kbrJamaah = useMemo(() => {
    if (!selectedKbr) return [];
    return allJamaah.filter((j) => selectedKbr.jamaahIds.includes(j.id));
  }, [selectedKbr, allJamaah]);

  const hotelCombinations = useMemo<HotelCombinationSummary[]>(() => {
    if (!selectedKbr) return [];
    return getHotelCombinations(kbrJamaah);
  }, [selectedKbr, kbrJamaah]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/rooming")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali ke Rooming
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hotel Combination Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola kombinasi hotel per paket — dasar pemisahan manifest SISKOPATUH dan rooming
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-80">
          <Select
            options={keberangkatanList.map((k) => ({
              value: k.id,
              label: `${k.kode} — ${k.paketUmroh?.namaPaket || "-"}`,
            }))}
            placeholder="-- Pilih Paket Keberangkatan --"
            value={selectedKbrId}
            onChange={(e) => {
              setSelectedKbrId(e.target.value);
              setExpandedCombo(null);
            }}
          />
        </div>
      </div>

      {selectedKbr && (
        <>
          {/* Package hotel options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Hotel Options — {selectedKbr.paketUmroh?.namaPaket || "-"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedKbr.paketUmroh?.hotelMekkahOptions && selectedKbr.paketUmroh?.hotelMadinahOptions ? (
                  <Badge variant="outline" size="sm">
                    {generateHotelLabel(
                      (selectedKbr.paketUmroh.hotelMekkahOptions as string[])[0] || "TBD",
                      (selectedKbr.paketUmroh.hotelMadinahOptions as string[])[0] || "TBD"
                    )}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Hotel combination table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Distribusi Jamaah per Kombinasi Hotel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hotelCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Belum ada jamaah terdaftar di paket ini
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3 w-12"></th>
                      <th className="px-4 py-3">Kombinasi Hotel</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3 text-right">Jumlah Jamaah</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hotelCombinations.map((combo) => {
                      const isExpanded = expandedCombo === combo.label;
                      const members = kbrJamaah.filter(
                        (j) =>
                          j.hotelMekkah === combo.hotelMekkah &&
                          j.hotelMadinah === combo.hotelMadinah
                      );
                      const pria = members.filter((j) => j.jenisKelamin === "L").length;
                      const wanita = members.length - pria;

                      return (
                        <>
                          <tr
                            key={combo.label}
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() =>
                              setExpandedCombo(isExpanded ? null : combo.label)
                            }
                          >
                            <td className="px-4 py-3">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{combo.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              Mekkah: {combo.hotelMekkah} &middot; Madinah: {combo.hotelMadinah}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                {combo.jumlahJamaah}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCombo(isExpanded ? null : combo.label);
                                }}
                              >
                                {isExpanded ? "Sembunyikan" : "Lihat Jamaah"}
                              </Button>
                            </td>
                          </tr>

                          {/* Expanded member rows */}
                          {isExpanded && (
                            <tr key={`${combo.label}-expanded`}>
                              <td colSpan={5} className="bg-muted/20 px-8 py-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1">
                                      Pria ({pria})
                                    </p>
                                    {members
                                      .filter((j) => j.jenisKelamin === "L")
                                      .map((j) => (
                                        <div
                                          key={j.id}
                                          className="flex items-center gap-2 py-0.5"
                                        >
                                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-info text-[8px] font-bold text-white">
                                            L
                                          </span>
                                          <span>{j.namaLengkap}</span>
                                          <span className="text-muted-foreground">
                                            {j.nomorPeserta}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1">
                                      Wanita ({wanita})
                                    </p>
                                    {members
                                      .filter((j) => j.jenisKelamin === "P")
                                      .map((j) => (
                                        <div
                                          key={j.id}
                                          className="flex items-center gap-2 py-0.5"
                                        >
                                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                                            P
                                          </span>
                                          <span>{j.namaLengkap}</span>
                                          <span className="text-muted-foreground">
                                            {j.nomorPeserta}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedKbr && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Pilih paket keberangkatan untuk melihat kombinasi hotel
        </div>
      )}
    </div>
  );
}
