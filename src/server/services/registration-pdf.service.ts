// ============================================================
// REGISTRATION PDF SERVICE
// Generate official registration form PDF using VTU Kop Surat
// matching official template sections A, B, C, D, E, F.
// ============================================================

import fs from "fs";
import path from "path";
import type { RegistrationRequest, Keberangkatan } from "@/shared/types";
import { getStorageAdapter } from "@/server/storage";

interface PdfData {
  registration: RegistrationRequest;
  packageInfo: Keberangkatan | null;
  termsVersion: string;
  termsAcceptedAt: Date | string;
  signedAt?: Date | string;
}

function formatShortDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ROOM_LABELS: Record<string, string> = {
  mix: "MIX — Penempatan kamar diatur travel",
  quad: "QUAD — 4 Orang / Kamar",
  triple: "TRIPLE — 3 Orang / Kamar",
  double: "DOUBLE — 2 Orang / Kamar",
};

export async function generateRegistrationPdf(data: PdfData): Promise<Buffer> {
  const PdfPrinter = (await import("pdfmake")).default;
  const { registration: reg, packageInfo } = data;

  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };

  const printer = new PdfPrinter(fonts);
  if (!(printer as any).urlResolver) {
    (printer as any).urlResolver = {
      resolve: (url: string) => Promise.resolve(url),
      resolved: () => Promise.resolve(),
    };
  }

  // 1. Load Kop Surat Header Image
  let kopSuratBase64 = "";
  try {
    const kopPath = path.join(process.cwd(), "public", "templates", "template-surat", "kop_surat.jpeg");
    if (fs.existsSync(kopPath)) {
      const kopBuffer = fs.readFileSync(kopPath);
      kopSuratBase64 = `data:image/jpeg;base64,${kopBuffer.toString("base64")}`;
    }
  } catch (err) {
    console.warn("[registration-pdf] Failed to load kop_surat.jpeg:", err);
  }

  // 2. Load Digital Signature Image if available
  let signatureBase64 = "";
  if (reg.signaturePath) {
    try {
      const storage = getStorageAdapter();
      const sigBuffer = await storage.download(reg.signaturePath);
      if (sigBuffer && sigBuffer.length > 0) {
        signatureBase64 = `data:image/jpeg;base64,${sigBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("[registration-pdf] Failed to load signature image:", err);
    }
  }

  // 3. Build Section B Member Table Rows (Dynamic member count)
  const memberRows = reg.members.map((m, i) => {
    let tglStr = "-";
    if (m.tanggalLahir) {
      tglStr = formatShortDate(m.tanggalLahir);
    }
    return [
      { text: String(i + 1), alignment: "center" as const, fontSize: 9 },
      { text: m.namaLengkap.toUpperCase(), bold: true, fontSize: 9 },
      { text: m.tempatLahir ? m.tempatLahir.toUpperCase() : "-", fontSize: 9 },
      { text: tglStr, alignment: "center" as const, fontSize: 9 },
      { text: m.hubungan || (i === 0 ? "Ketua Grup" : "-"), alignment: "center" as const, fontSize: 9 },
    ];
  });

  const memberTableBody = [
    [
      { text: "No.", style: "tableHeader", alignment: "center" },
      { text: "Nama Anggota", style: "tableHeader" },
      { text: "Tempat Lahir", style: "tableHeader" },
      { text: "Tanggal Lahir", style: "tableHeader", alignment: "center" },
      { text: "Hubungan", style: "tableHeader", alignment: "center" },
    ],
    ...memberRows,
  ];

  const roomText = reg.roomUpgrade ? (ROOM_LABELS[reg.roomUpgrade] ?? reg.roomUpgrade.toUpperCase()) : "QUAD (Standar)";
  const picBirthPlace = reg.members[0]?.tempatLahir ? reg.members[0].tempatLahir.toUpperCase() : "-";
  const picBirthDate = reg.members[0]?.tanggalLahir ? formatShortDate(reg.members[0].tanggalLahir) : "-";

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 30, 40, 40],
    defaultStyle: { font: "Helvetica", fontSize: 9.5, color: "#0f172a" },
    styles: {
      docTitle: { fontSize: 13, bold: true, alignment: "center", margin: [0, 6, 0, 1] },
      docSubTitle: { fontSize: 11, bold: true, alignment: "center", margin: [0, 0, 0, 12] },
      sectionHeader: { fontSize: 10, bold: true, color: "#0f172a", margin: [0, 10, 0, 4] },
      tableHeader: { fontSize: 9, bold: true, color: "#0f172a", fillColor: "#e2e8f0" },
      subCaption: { fontSize: 8.5, italics: true, color: "#475569", margin: [0, 0, 0, 4] },
      labelText: { fontSize: 9, color: "#334155" },
      valueText: { fontSize: 9.5, bold: true, color: "#0f172a" },
      termsItem: { fontSize: 8.5, color: "#334155", margin: [0, 1, 0, 1] },
      footerNote: { fontSize: 8, italics: true, alignment: "center", color: "#64748b", margin: [0, 10, 0, 0] },
    },
    content: [
      // ── KOP SURAT HEADER ─────────────────────────────────
      ...(kopSuratBase64
        ? [{ image: kopSuratBase64, width: 515, margin: [0, 0, 0, 10] }]
        : [{ text: "VTU ABADI TRAVEL", style: "docTitle", margin: [0, 0, 0, 10] }]),

      // ── FORM TITLE ───────────────────────────────────────
      { text: "FORMULIR PENDAFTARAN UMROH", style: "docTitle" },
      { text: "VTU ABADI", style: "docSubTitle" },

      // ── A. DATA PENDAFTAR ────────────────────────────────
      { text: "A. DATA PENDAFTAR", style: "sectionHeader" },
      {
        table: {
          widths: [140, 5, "*"],
          body: [
            [{ text: "ID / No. Registrasi Rombongan", style: "labelText" }, ":", { text: reg.kodeRegistrasi, style: "valueText" }],
            [{ text: "Nama Lengkap PIC", style: "labelText" }, ":", { text: reg.namaPerwakilan.toUpperCase(), style: "valueText" }],
            [{ text: "Nomor Telepon / WhatsApp", style: "labelText" }, ":", { text: reg.nomorTelepon, style: "valueText" }],
            [{ text: "Email", style: "labelText" }, ":", { text: reg.emailPerwakilan, style: "valueText" }],
            [
              { text: "Tempat & Tanggal Lahir", style: "labelText" },
              ":",
              { text: `${picBirthPlace}  /  ${picBirthDate}`, style: "valueText" },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 6],
      },

      // ── B. DATA ANGGOTA PENDAFTAR ────────────────────────
      { text: "B. DATA ANGGOTA PENDAFTAR", style: "sectionHeader" },
      { text: "Diisi apabila pendaftaran dilakukan untuk lebih dari satu jamaah.", style: "subCaption" },
      {
        table: {
          headerRows: 1,
          widths: [25, "*", 110, 95, 80],
          body: memberTableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#94a3b8",
          vLineColor: () => "#94a3b8",
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 8],
      },

      // ── C. PAKET & KLASTER PAKET UMROH ───────────────────
      { text: "C. PAKET & KLASTER PAKET UMROH", style: "sectionHeader" },
      {
        table: {
          widths: [140, 5, "*"],
          body: [
            [{ text: "Paket Umroh", style: "labelText" }, ":", { text: packageInfo?.namaPaket || packageInfo?.kode || "Paket Regular Umroh", style: "valueText" }],
            [{ text: "Klaster Paket", style: "labelText" }, ":", { text: roomText, style: "valueText" }],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 2],
      },
      {
        text: "Informasi paket dan klaster paket yang dipilih menjadi bagian dari pendaftaran ini dan mengacu pada ketentuan paket yang berlaku.",
        style: "subCaption",
        margin: [0, 2, 0, 8],
      },

      // ── D. SYARAT & KETENTUAN (OPERASIONAL RULES) ───────
      { text: "D. SYARAT & KETENTUAN", style: "sectionHeader" },
      {
        ol: [
          "Pendaftar adalah perwakilan resmi rombongan jamaah Umroh VTU ABADI.",
          "Seluruh data anggota jamaah yang diserahkan wajib sesuai dengan dokumen identitas resmi (KTP/Paspor).",
          "Minimal pendaftaran adalah 1 orang dan maksimal 100 orang per grup pendaftaran.",
          "Biaya paket belum termasuk biaya pembuatan paspor, vaksin, sertifikat mahram, dan kebutuhan pribadi jamaah.",
          "Pembayaran Down Payment (DP) minimal 30% wajib dilunasi dalam kurun waktu 14 hari kerja sejak registrasi.",
          "Pelunasan sisa biaya paket wajib diselesaikan selambat-lambatnya 30 hari sebelum jadwal keberangkatan.",
          "Pembatalan pendaftaran secara sepihak dikenakan biaya administrasi & pembatalan sesuai ketentuan operasional.",
          "Berkas fisik dokumen kelengkapan (Paspor aktif min. 7 bulan, Pas Foto, Sertifikat Vaksin, KTP, KK) wajib diserahkan pada tahap pemberkasan.",
          "Tanda Tangan Digital pada formulir ini dinyatakan sah dan memiliki kekuatan hukum persetujuan yang mengikat.",
        ],
        style: "termsItem",
        margin: [10, 0, 0, 8],
      },

      // ── E. PERSETUJUAN SYARAT & KETENTUAN ─────────────────
      { text: "E. PERSETUJUAN SYARAT & KETENTUAN", style: "sectionHeader" },
      {
        text: "Dengan mengisi dan menandatangani formulir ini, saya menyatakan bahwa saya telah membaca, memahami, dan menyetujui Syarat & Ketentuan Umroh VTU ABADI yang berlaku.",
        style: "subCaption",
        margin: [0, 0, 0, 4],
      },
      {
        ul: [
          "[x]  Saya telah membaca, memahami, dan menyetujui Syarat & Ketentuan Umroh VTU ABADI.",
          "[x]  Saya menyetujui paket dan klaster paket Umroh yang dipilih.",
          "[x]  Saya menyatakan bahwa data yang saya berikan dalam formulir ini adalah benar.",
          "[x]  Saya bersedia mengikuti seluruh ketentuan perjalanan Umroh yang berlaku.",
        ],
        style: "termsItem",
        margin: [10, 0, 0, 10],
      },

      // ── F. PERNYATAAN PERSETUJUAN (SIGNATURE BOX) ─────────
      { text: "F. PERNYATAAN PERSETUJUAN", style: "sectionHeader" },
      {
        table: {
          widths: [140, 5, "*"],
          body: [
            [{ text: "Nama Pendaftar", style: "labelText" }, ":", { text: reg.namaPerwakilan.toUpperCase(), style: "valueText" }],
            [
              { text: "Tanggal Persetujuan", style: "labelText" },
              ":",
              { text: formatShortDate(data.termsAcceptedAt || reg.createdAt), style: "valueText" },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: [240, 240],
          body: [
            [
              { text: "PENDAFTAR", alignment: "center", bold: true, fontSize: 9.5, fillColor: "#f1f5f9" },
              { text: "PETUGAS", alignment: "center", bold: true, fontSize: 9.5, fillColor: "#f1f5f9" },
            ],
            [
              {
                stack: [
                  signatureBase64
                    ? { image: signatureBase64, height: 45, alignment: "center" as const, margin: [0, 4, 0, 4] }
                    : { text: "\n\n", margin: [0, 15, 0, 15] },
                  { text: `( ${reg.namaPerwakilan.toUpperCase()} )`, alignment: "center" as const, bold: true, fontSize: 9 },
                ],
                margin: [0, 4, 0, 4],
              },
              {
                stack: [
                  { text: "\n\n", margin: [0, 15, 0, 15] },
                  { text: "( _______________________ )", alignment: "center" as const, bold: true, fontSize: 9 },
                ],
                margin: [0, 4, 0, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#94a3b8",
          vLineColor: () => "#94a3b8",
        },
        margin: [0, 0, 0, 6],
      },

      // ── FOOTER NOTE ──────────────────────────────────────
      {
        text: "Catatan: Data paspor dan dokumen lainnya dapat dilengkapi pada tahap administrasi berikutnya.",
        style: "footerNote",
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
