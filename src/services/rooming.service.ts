import type { Rooming } from "@/shared/types";
import type { RoomOccupancy, RoomStatsByHotel } from "./contracts";

const kapasitasTipe: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
};

export function computeRoomOccupancy(rooming: Rooming): RoomOccupancy {
  const totalKapasitas = rooming.kamar.reduce(
    (sum, k) => sum + (kapasitasTipe[k.tipe] ?? 2),
    0
  );
  const totalTerisi = rooming.kamar.reduce(
    (sum, k) => sum + k.penghuni.length,
    0
  );
  return {
    roomingId: rooming.id,
    hotelName: rooming.hotelNama,
    totalKamar: rooming.kamar.length,
    totalKapasitas,
    totalTerisi,
    occupancyRate: totalKapasitas > 0 ? totalTerisi / totalKapasitas : 0,
  };
}

export function getRoomStatsByHotel(
  roomings: Rooming[]
): RoomStatsByHotel[] {
  return roomings.map((r) => {
    const maleCount = r.kamar.reduce(
      (sum, k) =>
        sum +
        k.penghuni.filter((p) => p.jenisKelamin === "L").length,
      0
    );
    const totalTerisi = r.kamar.reduce(
      (sum, k) => sum + k.penghuni.length,
      0
    );
    return {
      hotelMekkah: r.hotelMekkah ?? "",
      hotelMadinah: r.hotelMadinah ?? "",
      jamaahCount: totalTerisi,
      maleCount,
      femaleCount: totalTerisi - maleCount,
      roomCount: r.kamar.length,
    };
  });
}

export function getRoomingsByKeberangkatan(
  roomings: Rooming[],
  keberangkatanId: string
): Rooming[] {
  if (!keberangkatanId) return roomings;
  return roomings.filter((r) => r.keberangkatanId === keberangkatanId);
}
