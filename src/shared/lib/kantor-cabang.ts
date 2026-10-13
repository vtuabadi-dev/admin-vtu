export interface KantorCabangItem {
  id: string; // "Malang" | "Surabaya" | "Jakarta"
  nama: string;
  kota: string;
  alamat: string;
  telepon?: string;
  isPusat?: boolean;
}

export const DAFTAR_KANTOR_CABANG: KantorCabangItem[] = [
  {
    id: "Malang",
    nama: "Kantor Malang (Kantor Pusat)",
    kota: "Malang",
    alamat: "Jl. Kauman No. 21, Kauman, Klojen, Kota Malang",
    telepon: "(0341) 399059 / 081-776655-000",
    isPusat: true,
  },
  {
    id: "Surabaya",
    nama: "Kantor Surabaya",
    kota: "Surabaya",
    alamat: "Royal Residence Cluster Crown Hill B15 No. 61, Sumur Welut, Lakarsantri, Kota Surabaya",
    telepon: "081-776655-000",
  },
  {
    id: "Jakarta",
    nama: "Kantor Jakarta",
    kota: "Jakarta Selatan",
    alamat: "Jl. Kemang Timur Dalam No. 18B, Bangka, Mampang Prapatan, Kota Jakarta Selatan",
    telepon: "081-776655-000",
  },
];

export function getKantorCabang(id?: string | null): KantorCabangItem {
  const found = DAFTAR_KANTOR_CABANG.find(
    (k) => k.id.toLowerCase() === (id || "").toLowerCase()
  );
  return found ?? DAFTAR_KANTOR_CABANG[0]!;
}
