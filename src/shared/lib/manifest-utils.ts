import type { Jamaah, Rooming, ManifestRow, ManifestType } from "@/shared/types";

const MANIFEST_TYPE_LABELS: Record<ManifestType, string> = {
  visa: "Manifest Visa",
  blockseat: "Manifest Blockseat",
  siskopatuh: "Manifest SISKOPATUH",
  hotel: "Manifest Hotel",
  rooming: "Manifest Rooming",
};

export function getManifestTypeLabel(type: ManifestType): string {
  return MANIFEST_TYPE_LABELS[type];
}

export function generateManifestRows(
  jamaahList: Jamaah[],
  type: ManifestType,
  roomings?: Rooming[]
): ManifestRow[] {
  const rows: ManifestRow[] = [];
  let sorted: Jamaah[];

  switch (type) {
    case "visa":
      sorted = [...jamaahList].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
      break;
    case "blockseat":
      sorted = [...jamaahList].sort((a, b) => {
        const g = a.jenisKelamin.localeCompare(b.jenisKelamin);
        if (g !== 0) return g;
        return a.namaLengkap.localeCompare(b.namaLengkap);
      });
      break;
    case "siskopatuh":
      sorted = [...jamaahList].sort((a, b) => {
        const h = a.hotelMekkah.localeCompare(b.hotelMekkah);
        if (h !== 0) return h;
        return a.hotelMadinah.localeCompare(b.hotelMadinah);
      });
      break;
    case "hotel":
      sorted = [...jamaahList].sort((a, b) => {
        const h = a.hotelMekkah.localeCompare(b.hotelMekkah);
        if (h !== 0) return h;
        const hm = a.hotelMadinah.localeCompare(b.hotelMadinah);
        if (hm !== 0) return hm;
        return a.namaLengkap.localeCompare(b.namaLengkap);
      });
      break;
    case "rooming":
      // Build room lookup from roomings
      const kamarMap = new Map<string, { nomorKamar: string; nomorKursi?: string }>();
      if (roomings) {
        roomings.forEach((r) => {
          r.kamar.forEach((k) => {
            k.penghuni.forEach((p, idx) => {
              kamarMap.set(p.jamaahId, {
                nomorKamar: k.nomorKamar,
                nomorKursi: k.tipe === "double" && idx === 0 ? "A" : k.tipe === "double" ? "B" : undefined,
              });
            });
          });
        });
      }
      sorted = [...jamaahList].sort((a, b) => {
        const ka = kamarMap.get(a.id)?.nomorKamar ?? "ZZZ";
        const kb = kamarMap.get(b.id)?.nomorKamar ?? "ZZZ";
        return ka.localeCompare(kb);
      });
      sorted.forEach((j) => {
        const km = kamarMap.get(j.id);
        rows.push({
          id: `row-${j.id}`,
          nomorUrut: rows.length + 1,
          jamaahId: j.id,
          nomorPaspor: j.nomorPaspor,
          namaLengkap: j.namaLengkap,
          tempatLahir: j.tempatLahir,
          tanggalLahir: j.tanggalLahir,
          nomorKamar: km?.nomorKamar,
          nomorKursi: km?.nomorKursi,
        });
      });
      return rows;
    default:
      sorted = [...jamaahList];
  }

  sorted.forEach((j) => {
    rows.push({
      id: `row-${j.id}`,
      nomorUrut: rows.length + 1,
      jamaahId: j.id,
      nomorPaspor: j.nomorPaspor,
      namaLengkap: j.namaLengkap,
      tempatLahir: j.tempatLahir,
      tanggalLahir: j.tanggalLahir,
    });
  });

  return rows;
}
