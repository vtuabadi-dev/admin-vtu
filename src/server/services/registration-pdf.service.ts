// ============================================================
// REGISTRATION PDF SERVICE
// Generate professional registration form PDF for internal archive
// and email attachment. Uses pdfmake.
// ============================================================

import type { RegistrationRequest, Keberangkatan } from "@/shared/types";

interface PdfData {
  registration: RegistrationRequest;
  packageInfo: Keberangkatan | null;
  termsVersion: string;
  termsAcceptedAt: string;
  signedAt?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const ROOM_LABELS: Record<string, string> = {
  mix: "MIX — Penempatan kamar akan diatur oleh pihak travel",
  quad: "QUAD — 4 orang per kamar",
  triple: "TRIPLE — 3 orang per kamar",
  double: "DOUBLE — 2 orang per kamar",
};

export async function generateRegistrationPdf(data: PdfData): Promise<Buffer> {
  // Dynamic import — pdfmake is CommonJS and only used server-side
  const PdfPrinter = (await import("pdfmake")).default;
  const { registration: reg, packageInfo, termsVersion } = data;

  const fonts = {
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };

  const printer = new PdfPrinter(fonts);
  const roomLabel = reg.roomUpgrade ? (ROOM_LABELS[reg.roomUpgrade] ?? reg.roomUpgrade) : "Belum dipilih";

  // Build member list
  const memberRows = reg.members.map((m: { namaLengkap: string; jenisKelamin: string; hubungan?: string }, i: number) => [
    { text: String(i + 1), alignment: "center" as const },
    { text: m.namaLengkap.toUpperCase(), bold: i === 0 },
    { text: m.jenisKelamin === "L" ? "Laki-laki" : "Perempuan", alignment: "center" as const },
    { text: m.hubungan || "-", alignment: "center" as const },
  ]);

  // Insert ketua row marker
  const memberTableBody = [
    [
      { text: "No", style: "tableHeader", alignment: "center" },
      { text: "Nama Lengkap", style: "tableHeader" },
      { text: "Jenis Kelamin", style: "tableHeader", alignment: "center" },
      { text: "Hubungan", style: "tableHeader", alignment: "center" },
    ],
    ...memberRows,
  ];

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: "#1e293b" },
    styles: {
      header: { fontSize: 16, bold: true, color: "#1e40af", alignment: "center", margin: [0, 0, 0, 4] },
      subheader: { fontSize: 11, color: "#64748b", alignment: "center", margin: [0, 0, 0, 16] },
      sectionTitle: { fontSize: 12, bold: true, color: "#1e293b", margin: [0, 12, 0, 6], decoration: "underline" },
      tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: "#1e40af" },
      label: { fontSize: 9, color: "#64748b" },
      value: { fontSize: 10, color: "#1e293b", bold: true },
      footer: { fontSize: 8, color: "#94a3b8", alignment: "center", margin: [0, 8, 0, 0] },
    },
    content: [
      // ── HEADER ────────────────────────────────────────────
      { text: "FORMULIR REGISTRASI JAMAAH", style: "header" },
      { text: "Sistem Pendaftaran Resmi Travel — Dokumen Internal", style: "subheader" },

      // ── KODE REGISTRASI ───────────────────────────────────
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            table: {
              body: [
                [
                  { text: "No. Registrasi", style: "label" },
                  { text: reg.kodeRegistrasi, style: "value", alignment: "right" },
                ],
              ],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 8],
          },
        ],
      },

      // ── SECTION 1: DATA PIC ───────────────────────────────
      { text: "1. Data Penanggung Jawab (PIC)", style: "sectionTitle" },
      buildInfoTable([
        ["Nama PIC", reg.namaPerwakilan.toUpperCase()],
        ["Nomor WhatsApp", reg.nomorTelepon],
        ["Email", reg.emailPerwakilan],
        ["Tanggal Registrasi", formatDate(reg.createdAt)],
      ]),

      // ── SECTION 2: PAKET ──────────────────────────────────
      { text: "2. Paket Keberangkatan", style: "sectionTitle" },
      buildInfoTable(
      packageInfo
          ? [
              ["Nama Paket", packageInfo.paketUmroh?.namaPaket || "-"],
              ["Kode Paket", packageInfo.kode],
              ["Harga per Orang", formatCurrency(packageInfo.paketUmroh?.hargaBase || 0)],
              ["Maskapai", packageInfo.maskapaiId || "-"], // Placeholder, would need maskapai relation
              ["No. Penerbangan", packageInfo.nomorPenerbangan],
              ["Tanggal Berangkat", formatShortDate(packageInfo.tanggalBerangkat as any)],
              ["Tanggal Pulang", formatShortDate(packageInfo.tanggalPulang as any)],
              ["Hotel Mekkah", packageInfo.paketUmroh?.hotelMekkahOptions?.[0] || "-"],
              ["Hotel Madinah", packageInfo.paketUmroh?.hotelMadinahOptions?.[0] || "-"],
            ]
          : [["Status", "Paket tidak ditemukan"]],
      ),

      // ── SECTION 3: PREFERENSI KAMAR ───────────────────────
      { text: "3. Preferensi Kamar", style: "sectionTitle" },
      { text: roomLabel, margin: [0, 2, 0, 0] },
      ...(reg.hotelUpgrade ? [{ text: `Hotel Upgrade: ${reg.hotelUpgrade.toUpperCase()}`, margin: [0, 2, 0, 0] }] : []),

      // ── SECTION 4: DAFTAR JAMAAH ──────────────────────────
      { text: `4. Daftar Jamaah — ${reg.paxCount} Orang`, style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: [30, "*", 70, 70],
          body: memberTableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? "#1e40af" : rowIndex % 2 === 0 ? "#f1f5f9" : null,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#cbd5e1",
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },

      // ── SECTION 5: PERSETUJUAN ────────────────────────────
      { text: "5. Persetujuan Syarat & Ketentuan", style: "sectionTitle" },
      {
        ul: [
          `Syarat & Ketentuan: Disetujui`,
          `Kebijakan Pembayaran: Disetujui`,
          `Kebijakan Pembatalan: Disetujui`,
          `Pengolahan Data & Komunikasi: Disetujui`,
          `Versi: ${termsVersion}`,
          `Disetujui pada: ${formatDate(data.termsAcceptedAt || reg.createdAt)}`,
        ],
        margin: [4, 2, 0, 0],
        fontSize: 9,
      },

      // ── SECTION 6: TANDA TANGAN ───────────────────────────
      { text: "6. Tanda Tangan Digital PIC", style: "sectionTitle" },
      ...(data.signedAt ? [{ text: `Ditandatangani secara digital pada: ${formatDate(data.signedAt)}`, margin: [0, 4, 0, 4], fontSize: 9 }] : []),
      // Signature image is rendered separately via getImages()
      // We include a placeholder that gets replaced by the actual image if available
      ...(reg.signaturePath
        ? [
            {
              text: "[ Tanda tangan PIC terlampir — lihat di halaman berikutnya ]",
              italics: true,
              color: "#94a3b8",
              fontSize: 8,
              margin: [0, 4, 0, 0],
            },
          ]
        : []),

      // ── FOOTER ────────────────────────────────────────────
      {
        text: `Dokumen ini dibuat secara otomatis oleh sistem pada ${formatDate(new Date().toISOString())}. Dokumen ini merupakan bagian dari arsip internal dan berlaku sebagai bukti pendaftaran.`,
        style: "footer",
        absolutePosition: { x: 40, y: 790 },
      },
    ],
  };

  // Build PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

// ── HELPER: Build key-value info table ──────────────────────
function buildInfoTable(rows: [string, string][]): any {
  return {
    table: {
      headerRows: 0,
      widths: [140, "*"],
      body: rows.map(([label, value]) => [
        { text: label, style: "label", margin: [0, 2, 8, 2] },
        { text: value, style: "value", margin: [0, 2, 0, 2] },
      ]),
    },
    layout: "noBorders",
    margin: [0, 0, 0, 8],
  };
}
