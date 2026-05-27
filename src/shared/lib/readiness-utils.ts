import type {
  Jamaah,
  Keberangkatan,
  Rooming,
  Manifest,
  GroupPaymentSummary,
  JamaahReadinessResult,
  ReadinessCheckItem,
  ReadinessLevel,
} from "@/shared/types";

export function validateJamaahReadiness(
  jamaah: Jamaah,
  keberangkatan: Keberangkatan | null,
  paymentSummary: GroupPaymentSummary | null,
  roomings: Rooming[],
  manifests: Manifest[]
): JamaahReadinessResult {
  const checks: ReadinessCheckItem[] = [];
  const tglBerangkat = keberangkatan?.tanggalBerangkat;

  // 1. Paspor tersedia
  const paspor = jamaah.dokumen.find((d) => d.jenis === "paspor");
  checks.push({
    key: "paspor_tersedia",
    label: "Paspor tersedia",
    status: paspor && paspor.status !== "rejected" ? "passed" : "failed",
    detail: !paspor ? "Belum upload paspor" : undefined,
  });

  // 2. Paspor tidak expired (min 6 bulan dari keberangkatan)
  if (paspor && tglBerangkat && jamaah.masaBerlakuPaspor) {
    const expiry = new Date(jamaah.masaBerlakuPaspor);
    const depart = new Date(tglBerangkat);
    const minExpiry = new Date(depart);
    minExpiry.setMonth(minExpiry.getMonth() + 6);
    const isExpired = expiry < minExpiry;
    checks.push({
      key: "paspor_expiry",
      label: "Paspor berlaku min 6 bulan",
      status: isExpired ? "warning" : "passed",
      detail: isExpired
        ? `Berlaku sampai ${jamaah.masaBerlakuPaspor} (kurang dari 6 bulan dari keberangkatan)`
        : `Berlaku sampai ${jamaah.masaBerlakuPaspor}`,
    });
  } else if (paspor && !jamaah.masaBerlakuPaspor) {
    checks.push({
      key: "paspor_expiry",
      label: "Paspor berlaku min 6 bulan",
      status: "warning",
      detail: "Masa berlaku paspor belum tercatat",
    });
  } else {
    checks.push({
      key: "paspor_expiry",
      label: "Paspor berlaku min 6 bulan",
      status: "skipped",
      detail: "Paspor belum tersedia",
    });
  }

  // 3. Pas Foto
  const pasFoto = jamaah.dokumen.find((d) => d.jenis === "pas_foto");
  checks.push({
    key: "pas_foto",
    label: "Pas Foto tersedia",
    status: pasFoto && pasFoto.status !== "rejected" ? "passed" : "failed",
    detail: !pasFoto ? "Belum upload pas foto" : undefined,
  });

  // 4. Vaksin
  const vaksin = jamaah.dokumen.find((d) => d.jenis === "vaksin");
  checks.push({
    key: "vaksin",
    label: "Vaksin tersedia",
    status: vaksin && vaksin.status !== "rejected" ? "passed" : "failed",
    detail: !vaksin ? "Belum upload vaksin" : undefined,
  });

  // 5. KTP
  const ktp = jamaah.dokumen.find((d) => d.jenis === "ktp");
  checks.push({
    key: "ktp",
    label: "KTP tersedia",
    status: ktp && ktp.status !== "rejected" ? "passed" : "failed",
    detail: !ktp ? "Belum upload KTP" : undefined,
  });

  // 6. Pembayaran lunas
  const isLunas = paymentSummary?.status === "lunas";
  checks.push({
    key: "pembayaran_lunas",
    label: "Pembayaran lunas",
    status: isLunas ? "passed" : paymentSummary ? "warning" : "failed",
    detail: paymentSummary
      ? `Status: ${paymentSummary.status}, Sisa: Rp ${paymentSummary.sisaPembayaran.toLocaleString("id-ID")}`
      : "Tidak ada data pembayaran",
  });

  // 7. Rooming selesai
  const hasRooming = roomings.some((r) =>
    r.kamar.some((k) => k.penghuni.some((p) => p.jamaahId === jamaah.id))
  );
  checks.push({
    key: "rooming",
    label: "Rooming assigned",
    status: hasRooming ? "passed" : "warning",
    detail: hasRooming ? "Sudah ditempatkan di kamar" : "Belum ditugaskan ke kamar",
  });

  // 8. Manifest assigned
  const hasManifest = manifests.some((m) => m.data.some((r) => r.jamaahId === jamaah.id));
  checks.push({
    key: "manifest",
    label: "Manifest assigned",
    status: hasManifest ? "passed" : "warning",
    detail: hasManifest ? "Sudah masuk manifest" : "Belum masuk manifest",
  });

  // 9. Hotel assigned
  const hasHotel = Boolean(jamaah.hotelMekkah && jamaah.hotelMadinah);
  checks.push({
    key: "hotel",
    label: "Hotel assigned",
    status: hasHotel ? "passed" : "failed",
    detail: hasHotel
      ? `${jamaah.hotelMekkah} / ${jamaah.hotelMadinah}`
      : "Belum ada penugasan hotel",
  });

  const failedChecks = checks.filter((c) => c.status === "failed").length;
  const warningChecks = checks.filter((c) => c.status === "warning").length;
  const passedChecks = checks.filter((c) => c.status === "passed").length;
  const totalChecks = checks.length;

  let level: ReadinessLevel;
  if (failedChecks > 0) {
    level = failedChecks >= 2 ? "BLOCKED" : "INCOMPLETE";
  } else if (warningChecks > 0) {
    level = "WARNING";
  } else {
    level = "READY";
  }

  return {
    level,
    checks,
    passed: passedChecks,
    total: totalChecks,
    score: Math.round((passedChecks / totalChecks) * 100),
  };
}

export function getReadinessLabel(level: ReadinessLevel): string {
  switch (level) {
    case "READY":
      return "Siap Berangkat";
    case "WARNING":
      return "Perlu Perhatian";
    case "INCOMPLETE":
      return "Belum Lengkap";
    case "BLOCKED":
      return "Tertahan";
  }
}
