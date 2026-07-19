import type { OperationalAlert, Keberangkatan, Jamaah, Invoice } from "@/shared/types";

export function generatePackageWarnings(
  keberangkatan: Keberangkatan,
  jamaahList: Jamaah[],
  invoices: Invoice[]
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const now = new Date();

  // 1. Cek paspor near expiry (< 6 bulan dari sekarang atau < 6 bulan dari keberangkatan)
  const departDate = new Date(keberangkatan.tanggalBerangkat);
  const minExpiry = new Date(departDate);
  minExpiry.setMonth(minExpiry.getMonth() + 6);

  const pasporNearExpiry = jamaahList.filter((j) => {
    if (!j.masaBerlakuPaspor) return false;
    return new Date(j.masaBerlakuPaspor) < minExpiry;
  });

  if (pasporNearExpiry.length > 0) {
    alerts.push({
      id: `wrn-paspor-${keberangkatan.id}`,
      tipe: "danger",
      pesan: `${pasporNearExpiry.length} jamaah memiliki paspor yang akan expired sebelum/dalam 6 bulan setelah keberangkatan`,
      jumlahTerdampak: pasporNearExpiry.length,
      module: "dokumen",
      link: `/admin/dokumen`,
      createdAt: now.toISOString(),
    });
  }

  // 2. Cek pembayaran overdue
  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "overdue" || (inv.status === "unpaid" && new Date(inv.jatuhTempo) < now)
  );
  if (overdueInvoices.length > 0) {
    alerts.push({
      id: `wrn-overdue-${keberangkatan.id}`,
      tipe: "danger",
      pesan: `${overdueInvoices.length} invoice pembayaran overdue untuk paket ini`,
      jumlahTerdampak: overdueInvoices.length,
      module: "pembayaran",
      link: `/admin/pembayaran`,
      createdAt: now.toISOString(),
    });
  }

  // 3. Cek dokumen belum lengkap
  const dokumenKurang = jamaahList.filter((j) => {
    const paspor = j.dokumen.find((d) => d.jenis === "paspor");
    const pasFoto = j.dokumen.find((d) => d.jenis === "pas_foto");
    const vaksin = j.dokumen.find((d) => d.jenis === "vaksin");
    const ktp = j.dokumen.find((d) => d.jenis === "ktp");
    return !paspor || !pasFoto || !vaksin || !ktp;
  });

  if (dokumenKurang.length > 0) {
    alerts.push({
      id: `wrn-dokumen-${keberangkatan.id}`,
      tipe: "warning",
      pesan: `${dokumenKurang.length} jamaah belum melengkapi dokumen wajib`,
      jumlahTerdampak: dokumenKurang.length,
      module: "dokumen",
      link: `/admin/dokumen`,
      createdAt: now.toISOString(),
    });
  }

  // 4. Cek jamaah belum assigned hotel
  const noHotel = jamaahList.filter((j) => !j.hotelMekkah || !j.hotelMadinah);
  if (noHotel.length > 0) {
    alerts.push({
      id: `wrn-hotel-${keberangkatan.id}`,
      tipe: "warning",
      pesan: `${noHotel.length} jamaah belum mendapat assignment hotel`,
      jumlahTerdampak: noHotel.length,
      module: "rooming",
      link: `/admin/rooming/hotel`,
      createdAt: now.toISOString(),
    });
  }

  // 5. Cek rooming belum penuh
  const currentMaxSeat = keberangkatan.maxSeat || 0;
  const terisiPct = currentMaxSeat > 0 ? Math.round((keberangkatan.terisi / currentMaxSeat) * 100) : 0;

  if (terisiPct < 50 && currentMaxSeat > 0) {
    alerts.push({
      id: `wrn-kuota-${keberangkatan.id}`,
      tipe: "warning",
      pesan: `Kuota paket baru terisi ${terisiPct}% (${keberangkatan.terisi}/${currentMaxSeat})`,
      jumlahTerdampak: currentMaxSeat - keberangkatan.terisi,
      module: "keberangkatan",
      link: `/admin/keberangkatan`,
      createdAt: now.toISOString(),
    });
  }

  // 6. Cek manifest incomplete — page-level check (needs manifest data)
  // 7. Cek orphan jamaah — page-level check (needs group data)

  // 8. Cek hotel combination conflict (Mekkah + Madinah pair tidak cocok)
  // Moved to PaketUmroh validation later.
  

  // 9. Cek quad mix incomplete — page-level check (needs rooming data)

  return alerts;
}

export function getWarningPriority(tipe: string): "HIGH" | "MEDIUM" | "LOW" {
  switch (tipe) {
    case "danger":
      return "HIGH";
    case "warning":
      return "MEDIUM";
    default:
      return "LOW";
  }
}
