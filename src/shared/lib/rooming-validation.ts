import type { Rooming, Jamaah } from "@/shared/types";

export interface RoomingValidationCheck {
  key: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}

export interface RoomingValidationResult {
  canFinalize: boolean;
  checks: RoomingValidationCheck[];
  blockingCount: number;
  totalCount: number;
}

export function validateRoomingFinalization(
  roomings: Rooming[],
  jamaahList: Jamaah[]
): RoomingValidationResult {
  const checks: RoomingValidationCheck[] = [];

  // 1. No incomplete room (semua kamar harus penuh quad atau mix valid)
  const allAssigned = jamaahList.every((j) =>
    roomings.some((r) => r.kamar.some((k) => k.penghuni.some((p) => p.jamaahId === j.id)))
  );
  const assignedCount = jamaahList.filter((j) =>
    roomings.some((r) => r.kamar.some((k) => k.penghuni.some((p) => p.jamaahId === j.id)))
  ).length;
  checks.push({
    key: "all_assigned",
    label: "Semua jamaah di-assign kamar",
    passed: allAssigned,
    blocking: true,
    detail: `${assignedCount}/${jamaahList.length} jamaah ter-assign`,
  });

  // 2. No mixed gender per room
  let mixedGenderCount = 0;
  roomings.forEach((r) => {
    r.kamar.forEach((k) => {
      const genders = new Set(
        k.penghuni
          .map((p) => jamaahList.find((j) => j.id === p.jamaahId)?.jenisKelamin)
          .filter(Boolean)
      );
      if (genders.size > 1) mixedGenderCount++;
    });
  });
  checks.push({
    key: "no_mixed_gender",
    label: "Tidak ada kamar campur gender",
    passed: mixedGenderCount === 0,
    blocking: true,
    detail: mixedGenderCount > 0 ? `${mixedGenderCount} kamar bermasalah` : "Semua kamar OK",
  });

  // 3. No hotel conflict (jamaah di rooming harus sesuai assignment)
  let hotelConflict = 0;
  jamaahList.forEach((j) => {
    const found = roomings.some((r) => {
      const matchMekkah = r.hotelMekkah === j.hotelMekkah || r.hotelMadinah === j.hotelMekkah;
      const matchMadinah = r.hotelMekkah === j.hotelMadinah || r.hotelMadinah === j.hotelMadinah;
      return matchMekkah || matchMadinah;
    });
    if (!found && j.hotelMekkah && j.hotelMadinah) hotelConflict++;
  });
  checks.push({
    key: "no_hotel_conflict",
    label: "Tidak ada konflik hotel",
    passed: hotelConflict === 0,
    blocking: false,
    detail: hotelConflict > 0 ? `${hotelConflict} jamaah konflik` : "Semua sesuai",
  });

  // 4. No orphan jamaah (semua punya rooming assignment)
  const assignedJamaahIds = new Set(
    roomings.flatMap((r) => r.kamar.flatMap((k) => k.penghuni.map((p) => p.jamaahId)))
  );
  const orphanCount = jamaahList.filter((j) => !assignedJamaahIds.has(j.id)).length;
  checks.push({
    key: "no_orphan",
    label: "Tidak ada jamaah tanpa rooming",
    passed: orphanCount === 0,
    blocking: true,
    detail: orphanCount > 0 ? `${orphanCount} jamaah orphan` : "Semua punya rooming",
  });

  const blockingChecks = checks.filter((c) => c.blocking && !c.passed);
  return {
    canFinalize: blockingChecks.length === 0,
    checks,
    blockingCount: blockingChecks.length,
    totalCount: checks.length,
  };
}
