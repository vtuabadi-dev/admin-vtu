// ============================================================
// REGISTRATION PDF SERVICE
// Generate official registration form PDF using PDFKit directly
// Pure Node.js — F4 Folio Size, Kop Surat Image Header, Transparent Table Layout
// ============================================================

import type { RegistrationRequest, Keberangkatan } from "@/shared/types";
import { getStorageAdapter } from "@/server/storage";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";

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
  const { registration: reg, packageInfo } = data;

  // Load signature image if available
  let signatureBuffer: Buffer | null = null;
  if (reg.signaturePath) {
    try {
      if (reg.signaturePath.startsWith("data:image")) {
        // base64 inline — extract raw buffer
        const base64Data = reg.signaturePath.split(",")[1];
        if (base64Data) signatureBuffer = Buffer.from(base64Data, "base64");
      } else {
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localAdapter = createLocalAdapter();
        try {
          signatureBuffer = await localAdapter.download(reg.signaturePath);
        } catch {
          const storage = getStorageAdapter();
          signatureBuffer = await storage.download(reg.signaturePath).catch(() => null);
        }
      }
    } catch (err) {
      console.warn("[registration-pdf] Failed to load signature image:", err);
    }
  }

  // Use PDFKit directly — pure Node.js
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    try {
      // F4 / Folio Size: 612 x 936 pt (8.5 in x 13 in / 215.9 mm x 330 mm)
      const doc = new PDFDocument({ size: [612, 936], margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const PAGE_W = 532; // usable width at margin=40 (612 - 80)
      const PRI_COLOR = "#0f172a";
      const ACC_COLOR = "#1e40af";
      const GRAY = "#64748b";

      // ── HEADER (Kop Surat Image Asset) ───────────────────────────────────
      let hasKopSurat = false;
      if (KOP_SURAT_BASE64) {
        try {
          const base64Data = KOP_SURAT_BASE64.replace(/^data:image\/\w+;base64,/, "");
          const kopBuffer = Buffer.from(base64Data, "base64");
          if (kopBuffer.length > 0) {
            doc.image(kopBuffer, 40, 20, { width: PAGE_W });
            hasKopSurat = true;
          }
        } catch (e) {
          console.warn("[registration-pdf] Failed to draw kop surat image:", e);
        }
      }

      // Title position starts AFTER Kop Surat (y = 168 to avoid overlap)
      let y = hasKopSurat ? 168 : 110;

      if (!hasKopSurat) {
        doc.rect(40, 40, PAGE_W, 56).fill(ACC_COLOR);
        doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold")
          .text("VTU ABADI TRAVEL", 50, 48, { align: "center", width: PAGE_W - 20 });
        doc.fontSize(9).font("Helvetica")
          .text("Formulir Pendaftaran Jamaah Umroh | Travel Umroh Terpercaya", 50, 68, { align: "center", width: PAGE_W - 20 });
        doc.moveTo(40, 96).lineTo(40 + PAGE_W, 96).lineWidth(1.5).strokeColor(ACC_COLOR).stroke();
      }

      // ── TITLE BLOCK ─────────────────────────────────────────────────────────
      doc.fillColor(PRI_COLOR).fontSize(13).font("Helvetica-Bold")
        .text("FORMULIR PENDAFTARAN JAMAAH UMROH", 40, y, { align: "center", width: PAGE_W });
      y += 18;
      doc.fontSize(10).font("Helvetica-Bold").fillColor(ACC_COLOR)
        .text(`No. Registrasi: ${reg.kodeRegistrasi}`, 40, y, { align: "center", width: PAGE_W });
      y += 24;

      // ── SECTION A — DATA PENDAFTARAN ───────────────────────────────────────
      y = drawSectionHeader(doc, y, PAGE_W, ACC_COLOR, "A", "DATA PENDAFTARAN");
      const paketName = packageInfo?.namaPaket ?? "-";
      const dateKeberangkatan = packageInfo?.tanggalBerangkat
        ? formatShortDate(packageInfo.tanggalBerangkat as string | Date)
        : "-";
      const roomText = reg.roomUpgrade ? (ROOM_LABELS[reg.roomUpgrade] ?? reg.roomUpgrade.toUpperCase()) : "QUAD (Standar)";

      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Tanggal Pendaftaran", formatShortDate(reg.createdAt));
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Kode Registrasi", reg.kodeRegistrasi);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Paket Umroh", paketName);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Tanggal Keberangkatan", dateKeberangkatan);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Preferensi Kamar", roomText);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Jumlah Pax", `${reg.paxCount} Jamaah`);
      y += 12;

      // ── SECTION B — DATA PERWAKILAN ────────────────────────────────────────
      y = drawSectionHeader(doc, y, PAGE_W, ACC_COLOR, "B", "DATA PERWAKILAN");
      const picMember = reg.members?.[0];
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Nama Perwakilan", reg.namaPerwakilan);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "No. Telepon / WA", reg.nomorTelepon);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Email Perwakilan", reg.emailPerwakilan);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Tempat Lahir", picMember?.tempatLahir ?? "-");
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Tanggal Lahir", picMember?.tanggalLahir ? formatShortDate(picMember.tanggalLahir) : "-");
      y += 12;

      // ── SECTION C — DAFTAR ANGGOTA ──────────────────────────────────────────
      y = drawSectionHeader(doc, y, PAGE_W, ACC_COLOR, "C", "DAFTAR ANGGOTA ROMBONGAN");

      // Transparent Table Header (Subtle Outline)
      doc.rect(40, y, PAGE_W, 18).lineWidth(0.8).strokeColor(ACC_COLOR).stroke();
      doc.fillColor(ACC_COLOR).fontSize(8.5).font("Helvetica-Bold");
      doc.text("No.", 46, y + 5, { width: 30 });
      doc.text("Nama Lengkap", 80, y + 5, { width: 190 });
      doc.text("Tempat Lahir", 275, y + 5, { width: 110 });
      doc.text("Tgl Lahir", 390, y + 5, { width: 85 });
      doc.text("Hub.", 480, y + 5, { width: 45 });
      y += 18;

      const members = reg.members ?? [];
      members.forEach((m, i) => {
        // Transparent Row with bottom border
        doc.fillColor(PRI_COLOR).fontSize(8.5).font("Helvetica");
        doc.text(String(i + 1), 46, y + 4, { width: 30 });
        doc.text(m.namaLengkap.toUpperCase(), 80, y + 4, { width: 190 });
        doc.text(m.tempatLahir?.toUpperCase() ?? "-", 275, y + 4, { width: 110 });
        doc.text(m.tanggalLahir ? formatShortDate(m.tanggalLahir) : "-", 390, y + 4, { width: 85 });
        doc.text(m.hubungan ?? (i === 0 ? "Ketua Grup" : "-"), 480, y + 4, { width: 45 });
        y += 16;
        doc.moveTo(40, y).lineTo(40 + PAGE_W, y).lineWidth(0.3).strokeColor("#cbd5e1").stroke();
      });
      y += 12;

      // ── SECTION D — SYARAT & KETENTUAN ──────────────────────────────────────
      y = drawSectionHeader(doc, y, PAGE_W, ACC_COLOR, "D", "PERSETUJUAN SYARAT & KETENTUAN");
      const acceptedAt = data.termsAcceptedAt ? formatShortDate(data.termsAcceptedAt) : "-";
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Syarat & Ketentuan Diterima", "Ya — Pendaftar telah menyetujui S&K VTU ABADI Travel");
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Versi Syarat & Ketentuan", `v${data.termsVersion}`);
      y = drawInfoRow(doc, y, PAGE_W, PRI_COLOR, GRAY, "Tanggal Persetujuan", acceptedAt);
      y += 16;

      // ── SECTION E — TANDA TANGAN DIGITAL ───────────────────────────────────
      y = drawSectionHeader(doc, y, PAGE_W, ACC_COLOR, "E", "TANDA TANGAN DIGITAL");
      doc.fillColor(GRAY).fontSize(8.5).font("Helvetica-Oblique")
        .text("Pendaftar telah menandatangani formulir ini secara digital melalui portal registrasi VTU ABADI Travel.", 40, y, { width: PAGE_W });
      y += 16;

      // Signature block (Transparent Box)
      const sigBoxX = (PAGE_W - 200) / 2 + 40;
      doc.rect(sigBoxX, y, 200, 70).lineWidth(0.6).strokeColor(ACC_COLOR).stroke();
      if (signatureBuffer) {
        try {
          doc.image(signatureBuffer, sigBoxX + 10, y + 5, { fit: [180, 55] });
        } catch {
          // skip if image fails
        }
      }
      doc.fillColor(PRI_COLOR).fontSize(8.5).font("Helvetica-Bold")
        .text(`( ${reg.namaPerwakilan.toUpperCase()} )`, sigBoxX, y + 74, { width: 200, align: "center" });
      y += 90;

      // ── FOOTER ─────────────────────────────────────────────────────────────
      doc.fillColor(GRAY).fontSize(7.5).font("Helvetica-Oblique")
        .text(
          "Catatan: Data paspor dan dokumen lainnya dapat dilengkapi pada tahap administrasi berikutnya. Dokumen ini sah sebagai bukti pendaftaran resmi VTU ABADI Travel.",
          40, y, { width: PAGE_W, align: "center" }
        );

      // Bottom divider line
      y += 16;
      doc.moveTo(40, y).lineTo(40 + PAGE_W, y).lineWidth(1.5).strokeColor(ACC_COLOR).stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Helper: Transparent Section Header ─────────────────────────────────────
function drawSectionHeader(
  doc: any,
  y: number,
  pageW: number,
  color: string,
  letter: string,
  title: string
): number {
  doc.rect(40, y, 4, 18).fill(color);
  doc.fillColor(color).fontSize(10).font("Helvetica-Bold")
    .text(`${letter}.  ${title}`, 52, y + 3, { width: pageW - 20 });
  y += 21;
  doc.moveTo(40, y).lineTo(40 + pageW, y).lineWidth(0.8).strokeColor(color).stroke();
  return y + 6;
}

// ── Helper: Transparent Info Row ───────────────────────────────────────────
function drawInfoRow(
  doc: any,
  y: number,
  pageW: number,
  labelColor: string,
  valueColor: string,
  label: string,
  value: string
): number {
  doc.fillColor(labelColor).fontSize(8.5).font("Helvetica-Bold")
    .text(label, 50, y + 3, { width: 160 });
  doc.fillColor("#64748b").fontSize(8.5).font("Helvetica")
    .text(":", 210, y + 3, { width: 15 });
  doc.fillColor(valueColor).fontSize(8.5).font("Helvetica")
    .text(value, 222, y + 3, { width: pageW - 190 });
  y += 15;
  doc.moveTo(50, y).lineTo(40 + pageW, y).lineWidth(0.3).strokeColor("#cbd5e1").stroke();
  return y + 3;
}
