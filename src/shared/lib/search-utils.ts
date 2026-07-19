import type { Jamaah, RegistrationGroup, Invoice, Keberangkatan, GlobalSearchResult } from "@/shared/types";

export interface SearchScope {
  jamaah: Jamaah[];
  groups: RegistrationGroup[];
  invoices: Invoice[];
  keberangkatan: Keberangkatan[];
}

export function globalSearch(query: string, scope: SearchScope): GlobalSearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const results: GlobalSearchResult[] = [];

  // Search jamaah
  scope.jamaah.forEach((j) => {
    if (
      j.namaLengkap.toLowerCase().includes(q) ||
      j.nomorPaspor.toLowerCase().includes(q) ||
      j.nomorPeserta.toLowerCase().includes(q) ||
      j.nik.includes(q) ||
      j.registrationId.toLowerCase().includes(q)
    ) {
      results.push({
        type: "jamaah",
        id: j.id,
        title: j.namaLengkap,
        subtitle: `${j.nomorPeserta} · ${j.nomorPaspor}`,
        module: "jamaah",
        link: `/admin/jamaah/${j.id}`,
      });
    }
  });

  // Search groups
  scope.groups.forEach((g) => {
    if (
      g.kodeRegistrasi.toLowerCase().includes(q) ||
      g.namaGroup.toLowerCase().includes(q)
    ) {
      results.push({
        type: "group",
        id: g.id,
        title: g.namaGroup,
        subtitle: `${g.kodeRegistrasi} · ${g.jumlahAnggota} anggota`,
        module: "pembayaran",
        link: `/admin/pembayaran/${g.id}`,
      });
    }
  });

  // Search invoices
  scope.invoices.forEach((inv) => {
    if (inv.nomorInvoice.toLowerCase().includes(q)) {
      results.push({
        type: "invoice",
        id: inv.id,
        title: inv.nomorInvoice,
        subtitle: `${inv.tipe} · Rp ${inv.jumlah.toLocaleString("id-ID")}`,
        module: "pembayaran",
        link: `/admin/pembayaran/${inv.groupId}`,
      });
    }
  });

  // Search keberangkatan
  scope.keberangkatan.forEach((k) => {
    if (
      k.paketUmroh?.namaPaket?.toLowerCase().includes(q) ||
      k.kode.toLowerCase().includes(q)
    ) {
      results.push({
        type: "keberangkatan",
        id: k.id,
        title: k.paketUmroh?.namaPaket || k.kode,
        subtitle: `${k.kode} · ${k.tanggalBerangkat}`,
        module: "keberangkatan",
        link: `/admin/keberangkatan/${k.id}`,
      });
    }
  });

  return results.slice(0, 25);
}

const TYPE_LABELS: Record<string, string> = {
  jamaah: "Jamaah",
  group: "Group",
  invoice: "Invoice",
  keberangkatan: "Paket",
  hotel: "Hotel",
};

export function getResultTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}
