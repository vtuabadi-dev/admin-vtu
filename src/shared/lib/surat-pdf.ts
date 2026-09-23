import jsPDF from "jspdf";
import QRCode from "qrcode";
import { VAUZA_TAMMA_LOGO_BASE64, VAUZA_TAMMA_SIGNATURE_BASE64, VAUZA_TAMMA_QR_BASE64 } from "./invoice-logo";
import { toTitleCase } from "./utils";
import type { SuratTemplate } from "../types/surat";

export interface OfficialLetterPdfProps {
  template: SuratTemplate;
  rawText: string;
  computedNomorSurat: string;
  computedNomorSurat2?: string;
  renderedPerihal: string;
  renderedTujuan: string;
  renderedKotaTujuan: string;
  customLampiran?: string;
  todayInfo: {
    masehi: string;
    hijriyah: string;
    romanMonth: string;
    year: number;
  };
  effectiveShowBarcode: boolean;
  verificationUrl: string;
  selectedDocIndex?: number;
  activeJamaah?: any;
  activeKeberangkatan?: any;
}

interface ParsedLetterDoc {
  nomorSurat: string;
  lampiran: string;
  perihal: string;
  tanggalMasehi: string;
  tanggalHijriyah: string;
  tujuanKepada: string;
  kotaTujuan: string;
  salamPembuka: string;
  paragrafPembuka: string;
  pihakPertama: Array<{ label: string; value: string }>;
  keteranganAntara: string;
  dataJamaah: Array<{ label: string; value: string }>;
  paragraphs: string[];
  penutup: string;
  salamPenutup: string;
  signature: {
    kotaTanggal: string;
    jabatan: string;
    instansi: string;
    nama: string;
    tandaTanganUrl?: string;
  };
  entityCompany: "tamma" | "trikarsa" | "custom";
}

function splitMultipleDocuments(text: string): string[] {
  if (!text) return [""];
  const matches = Array.from(text.matchAll(/(?:^|\n)(?:No|Nomor)\s*:\s*[^\n]+/gi));
  if (matches.length > 1) {
    const docs: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (!match) continue;
      const startIdx = match.index ?? 0;
      const nextMatch = matches[i + 1];
      const endIdx = nextMatch ? (nextMatch.index ?? text.length) : text.length;
      const sub = text.substring(startIdx, endIdx).trim();
      if (sub) docs.push(sub);
    }
    if (docs.length > 0) return docs;
  }
  return [text];
}

function parseLetter(
  text: string,
  fallbackNomor: string,
  fallbackPerihal: string,
  fallbackTujuan: string,
  fallbackKota: string,
  fallbackLampiran: string,
  todayInfo: { masehi: string; hijriyah: string; year: number },
  template: SuratTemplate
): ParsedLetterDoc {
  const lines: string[] = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let nomorSurat = fallbackNomor;
  let perihal = fallbackPerihal;
  let lampiran = fallbackLampiran || "-";
  let tujuanKepada = fallbackTujuan;
  let kotaTujuan = fallbackKota;
  let salamPembuka = "Assalamu'alaikum Warahmatullahi Wabarakatuh,";
  let paragrafPembuka = "";
  const pihakPertama: Array<{ label: string; value: string }> = [];
  let keteranganAntara = "";
  const dataJamaah: Array<{ label: string; value: string }> = [];
  const paragraphs: string[] = [];
  let penutup = "";
  let salamPenutup = "Wassalamu'alaikum Warahmatullahi Wabarakatuh.";
  let signatureKotaTanggal = `Sidoarjo, ${todayInfo.masehi}`;
  let signatureJabatan = template.penandatangan?.jabatan || "Direktur Utama";
  let signatureInstansi = "PT. VAUZA TAMMA ABADI";
  let signatureNama = template.penandatangan?.nama || "H. FAISAL WAHYUDI";

  let currentSection = "meta";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line) continue;
    const lower = line.toLowerCase();

    // 1. Meta matching (No, Hal, Lamp)
    if (/^(?:no|nomor)\s*:/i.test(line)) {
      const val = line.replace(/^(?:no|nomor)\s*:\s*/i, "").trim();
      if (val) nomorSurat = val;
      continue;
    }
    if (/^(?:hal|perihal)\s*:/i.test(line)) {
      const val = line.replace(/^(?:hal|perihal)\s*:\s*/i, "").trim();
      if (val) perihal = val;
      continue;
    }
    if (/^(?:lamp|lampiran)\s*:/i.test(line)) {
      const val = line.replace(/^(?:lamp|lampiran)\s*:\s*/i, "").trim();
      if (val) lampiran = val;
      continue;
    }

    // 2. Tujuan matching (Kepada / Yth)
    if (lower.startsWith("kepada") || lower.startsWith("yth.") || lower.startsWith("yth ")) {
      currentSection = "tujuan";
      let dest = line;
      if (dest.toLowerCase().startsWith("kepada")) {
        const nextLine = lines[i + 1] ?? "";
        if (
          nextLine &&
          (nextLine.toLowerCase().startsWith("yth") ||
            nextLine.toLowerCase().startsWith("bapak") ||
            nextLine.toLowerCase().startsWith("kepala"))
        ) {
          i++;
          dest = nextLine;
        }
      }
      tujuanKepada = dest.replace(/^kepada\s*/i, "").trim();
      if (!tujuanKepada.toLowerCase().startsWith("yth")) {
        tujuanKepada = `Yth. ${tujuanKepada}`;
      }

      const next1 = lines[i + 1] ?? "";
      if (next1.toLowerCase() === "di") {
        i++;
        const next2 = lines[i + 1] ?? "";
        if (next2) {
          i++;
          kotaTujuan = next2;
        }
      } else if (next1.toLowerCase().startsWith("di ")) {
        i++;
        kotaTujuan = next1.replace(/^di\s+/i, "");
      }
      continue;
    }

    // 3. Salam Pembuka
    if (
      lower.includes("assalaamu'alaikum") ||
      lower.includes("assalamu'alaikum") ||
      lower.includes("assalamualaikum")
    ) {
      salamPembuka = line;
      currentSection = "opening";
      continue;
    }

    // 4. Paragraf Pembuka
    if (
      lower.includes("dengan hormat") ||
      lower.includes("yang bertanda tangan di bawah ini") ||
      lower.includes("kami yang bertanda tangan")
    ) {
      paragrafPembuka = line;
      currentSection = "pihak1";
      continue;
    }

    // 5. Keterangan Antara
    if (
      lower.includes("menerangkan dengan sebenarnya") ||
      lower.includes("menerangkan bahwa") ||
      lower.includes("memberitahukan bahwa")
    ) {
      keteranganAntara = line;
      currentSection = "jamaah";
      continue;
    }

    // 6. Penutup
    if (
      lower.includes("demikian surat") ||
      lower.includes("demikian permohonan") ||
      lower.includes("demikian rekomendasi") ||
      lower.includes("demikianlah surat")
    ) {
      penutup = line;
      currentSection = "closing";
      continue;
    }

    // 7. Salam Penutup
    if (
      lower.includes("wassalaamu'alaikum") ||
      lower.includes("wassalamu'alaikum") ||
      lower.includes("wassalamualaikum")
    ) {
      salamPenutup = line;
      currentSection = "ttd";
      continue;
    }

    // 8. Tanda Tangan Section
    if (currentSection === "ttd" || /^(?:malang|sidoarjo|surabaya|jakarta),\s*\d+/i.test(line)) {
      currentSection = "ttd";
      if (
        /^(?:malang|sidoarjo|surabaya|jakarta),\s*\d+/i.test(line) ||
        /\b\d{1,2}\s+[a-z]+\s+\d{4}\b/i.test(line)
      ) {
        signatureKotaTanggal = line;
      } else if (
        lower.includes("direktur") ||
        lower.includes("pimpinan") ||
        lower.includes("kepala")
      ) {
        signatureJabatan = line;
      } else if (lower.includes("pt.") || lower.includes("vauza")) {
        signatureInstansi = line;
      } else if (line.length > 2 && !lower.includes("tanda tangan") && !lower.includes("stempel")) {
        signatureNama = line.toUpperCase();
      }
      continue;
    }

    // Key-Value Rows (e.g. Nama : ..., TTL : ..., Alamat : ...)
    const kvMatch = line.match(/^([^:]{2,25})\s*:\s*(.+)$/);
    if (kvMatch && currentSection !== "body" && currentSection !== "closing") {
      const rawLabel = (kvMatch[1] ?? "").trim();
      const val = (kvMatch[2] ?? "").trim();
      const cleanLabel = toTitleCase(rawLabel);

      if (currentSection === "pihak1") {
        pihakPertama.push({ label: cleanLabel, value: val });
      } else {
        dataJamaah.push({ label: cleanLabel, value: val });
      }
      continue;
    }

    // Standard Body Paragraphs
    if (line.length > 0) {
      if (currentSection === "closing") {
        if (!penutup) penutup = line;
        else paragraphs.push(line);
      } else if (currentSection === "ttd") {
        if (lower.includes("pt.") || lower.includes("vauza")) {
          signatureInstansi = line;
        } else if (lower.includes("direktur") || lower.includes("pimpinan")) {
          signatureJabatan = line;
        } else if (line.length > 3 && !lower.includes("tanda tangan")) {
          signatureNama = line.toUpperCase();
        }
      } else {
        paragraphs.push(line);
      }
    }
  }

  // Detect company entity
  let entityCompany: "tamma" | "trikarsa" | "custom" = "tamma";
  const allText = text.toLowerCase();
  if (allText.includes("trikarsa") || allText.includes("vauza trikarsa")) {
    entityCompany = "trikarsa";
  } else {
    entityCompany = "tamma";
  }

  return {
    nomorSurat,
    lampiran,
    perihal,
    tanggalMasehi: todayInfo.masehi,
    tanggalHijriyah: todayInfo.hijriyah,
    tujuanKepada,
    kotaTujuan,
    salamPembuka,
    paragrafPembuka,
    pihakPertama,
    keteranganAntara,
    dataJamaah,
    paragraphs,
    penutup,
    salamPenutup,
    signature: {
      kotaTanggal: signatureKotaTanggal,
      jabatan: signatureJabatan,
      instansi: signatureInstansi,
      nama: signatureNama,
    },
    entityCompany,
  };
}

/**
 * Renders a single letter document onto a jsPDF page.
 */
function renderLetterPage(
  doc: jsPDF,
  parsed: ParsedLetterDoc,
  effectiveShowBarcode: boolean,
  verificationUrl: string,
  qrDataUrl?: string
) {
  const marginX = 16;
  const contentWidth = 210 - marginX * 2; // 178mm
  let y = 10;

  // 1. Official Kop Surat Header (Clean Typographic Official Letterhead)
  try {
    if (VAUZA_TAMMA_LOGO_BASE64) {
      doc.addImage(VAUZA_TAMMA_LOGO_BASE64, "PNG", marginX, y, 22, 22);
    }
  } catch (err) {
    console.error("Failed to draw logo in PDF:", err);
  }

  // Header Typography
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // Emerald #064E3B
  const companyTitle =
    parsed.entityCompany === "trikarsa"
      ? "PT. VAUZA TRIKARSA UTAMA"
      : "PT. VAUZA TAMMA ABADI";
  doc.text(companyTitle, 44, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // Slate #1E293B
  const kemenagText =
    parsed.entityCompany === "trikarsa"
      ? "Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021"
      : "Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021 / No. 805 Tahun 2019";
  doc.text(kemenagText, 44, y + 11);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Muted #64748B
  doc.text("Jl. Kauman No. 21, Kauman, Klojen, Kota Malang • Telp: (0341) 399059", 44, y + 16);
  doc.text("Email: info@vauzatamma.co.id • Website: www.vauzatamma.co.id", 44, y + 20);

  y += 24;

  // Double line border below Kop Surat
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, marginX + contentWidth, y);
  doc.setLineWidth(0.25);
  doc.line(marginX, y + 1.2, marginX + contentWidth, y + 1.2);

  y += 6;

  // 2. Metadata Section (Nomor, Lampiran, Perihal on left; Tanggal on right)
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // Black / dark slate

  const metaLeftY = y;
  doc.setFont("helvetica", "normal");
  doc.text("Nomor", marginX, metaLeftY);
  doc.text(":", marginX + 18, metaLeftY);
  doc.setFont("helvetica", "bold");
  doc.text(parsed.nomorSurat, marginX + 22, metaLeftY);

  doc.setFont("helvetica", "normal");
  doc.text("Lampiran", marginX, metaLeftY + 4.2);
  doc.text(":", marginX + 18, metaLeftY + 4.2);
  doc.text(parsed.lampiran, marginX + 22, metaLeftY + 4.2);

  doc.text("Perihal", marginX, metaLeftY + 8.4);
  doc.text(":", marginX + 18, metaLeftY + 8.4);
  doc.setFont("helvetica", "bold");
  const perihalLines = doc.splitTextToSize(parsed.perihal, 80);
  doc.text(perihalLines, marginX + 22, metaLeftY + 8.4);

  // Date on right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Sidoarjo, ${parsed.tanggalMasehi}`, 210 - marginX, metaLeftY, { align: "right" });
  if (parsed.tanggalHijriyah) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(parsed.tanggalHijriyah, 210 - marginX, metaLeftY + 3.8, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
  }

  y = Math.max(metaLeftY + 10 + perihalLines.length * 2.8, metaLeftY + 14);

  // 3. Recipient (Kepada Yth)
  doc.setFont("helvetica", "normal");
  doc.text("Kepada Yth.", marginX, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(parsed.tujuanKepada || "Yth. Pimpinan Terkait", marginX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(parsed.kotaTujuan ? `di ${parsed.kotaTujuan}` : "Di Tempat", marginX, y);
  y += 6;

  // 4. Salam Pembuka
  if (parsed.salamPembuka) {
    doc.setFont("helvetica", "italic");
    doc.text(parsed.salamPembuka, marginX, y);
    y += 4.5;
  }

  // 5. Paragraf Pembuka
  if (parsed.paragrafPembuka) {
    doc.setFont("helvetica", "normal");
    const openLines = doc.splitTextToSize(parsed.paragrafPembuka, contentWidth);
    doc.text(openLines, marginX, y);
    y += openLines.length * 4.0 + 2;
  }

  // 6. Table Pihak 1 (if any)
  if (parsed.pihakPertama.length > 0) {
    parsed.pihakPertama.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.text(item.label, marginX + 8, y);
      doc.text(":", marginX + 48, y);
      doc.setFont("helvetica", "bold");
      const valLines = doc.splitTextToSize(item.value, contentWidth - 52);
      doc.text(valLines, marginX + 52, y);
      y += Math.max(4.0, valLines.length * 3.8);
    });
    y += 1.5;
  }

  // 7. Keterangan Antara
  if (parsed.keteranganAntara) {
    doc.setFont("helvetica", "normal");
    const ketLines = doc.splitTextToSize(parsed.keteranganAntara, contentWidth);
    doc.text(ketLines, marginX, y);
    y += ketLines.length * 4.0 + 2;
  }

  // 8. Table Data Jamaah
  if (parsed.dataJamaah.length > 0) {
    parsed.dataJamaah.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.text(item.label, marginX + 8, y);
      doc.text(":", marginX + 48, y);
      doc.setFont("helvetica", "bold");
      const valLines = doc.splitTextToSize(item.value, contentWidth - 52);
      doc.text(valLines, marginX + 52, y);
      y += Math.max(4.0, valLines.length * 3.8);
    });
    y += 2;
  }

  // 9. Body Paragraphs
  if (parsed.paragraphs.length > 0) {
    doc.setFont("helvetica", "normal");
    parsed.paragraphs.forEach((p) => {
      const pLines = doc.splitTextToSize(p, contentWidth);
      doc.text(pLines, marginX, y);
      y += pLines.length * 4.0 + 1.8;
    });
  }

  // 10. Penutup & Salam Penutup
  if (parsed.penutup) {
    doc.setFont("helvetica", "normal");
    const penutupLines = doc.splitTextToSize(parsed.penutup, contentWidth);
    doc.text(penutupLines, marginX, y);
    y += penutupLines.length * 4.0 + 2;
  }

  if (parsed.salamPenutup) {
    doc.setFont("helvetica", "italic");
    doc.text(parsed.salamPenutup, marginX, y);
    y += 5.5;
  }

  // 11. Signature and QR Verification Section (at bottom)
  const sigY = Math.max(y, 222);

  // QR Code on bottom-left
  if (effectiveShowBarcode) {
    let qrRendered = false;
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, "PNG", marginX, sigY + 2, 20, 20);
        qrRendered = true;
      } catch (err) {
        console.error("Failed to add high-res dynamic QR code:", err);
      }
    }
    if (!qrRendered && VAUZA_TAMMA_QR_BASE64) {
      try {
        doc.addImage(VAUZA_TAMMA_QR_BASE64, "PNG", marginX, sigY + 2, 20, 20);
      } catch {
        // Fallback if image fails
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(6, 78, 59);
    doc.text("DOKUMEN RESMI TERVERIFIKASI", marginX + 23, sigY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Pindai QR code untuk memeriksa keabsahan surat ini.", marginX + 23, sigY + 11);
    doc.text(verificationUrl.substring(0, 48) + (verificationUrl.length > 48 ? "..." : ""), marginX + 23, sigY + 15);
  }

  // Official Signature Block on right
  const sigX = 210 - marginX - 65;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(parsed.signature.kotaTanggal || `Sidoarjo, ${parsed.tanggalMasehi}`, sigX + 32.5, sigY, {
    align: "center",
  });
  doc.setFont("helvetica", "bold");
  doc.text(parsed.signature.instansi || "PT. VAUZA TAMMA ABADI", sigX + 32.5, sigY + 4.8, {
    align: "center",
  });

  // Stamp / Signature Image
  try {
    if (VAUZA_TAMMA_SIGNATURE_BASE64) {
      doc.addImage(VAUZA_TAMMA_SIGNATURE_BASE64, "PNG", sigX + 10, sigY + 8, 38, 22);
    }
  } catch {
    // Fallback space
  }

  // Signer name and title
  const signerY = sigY + 34;
  doc.setFont("helvetica", "bold");
  doc.text(parsed.signature.nama || "H. FAISAL WAHYUDI", sigX + 32.5, signerY, {
    align: "center",
  });
  doc.setLineWidth(0.3);
  doc.setDrawColor(15, 23, 42);
  const nameWidth = doc.getTextWidth(parsed.signature.nama || "H. FAISAL WAHYUDI");
  doc.line(sigX + 32.5 - nameWidth / 2, signerY + 0.8, sigX + 32.5 + nameWidth / 2, signerY + 0.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(parsed.signature.jabatan || "Direktur Utama", sigX + 32.5, signerY + 4.8, {
    align: "center",
  });
}

/**
 * Generates an official letter PDF instance.
 */
export async function generateOfficialLetterPdf(props: OfficialLetterPdfProps): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let qrDataUrl = "";
  if (props.effectiveShowBarcode && props.verificationUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(props.verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 600,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("Failed to generate QR Code data URL:", e);
    }
  }

  const rawDocs = splitMultipleDocuments(props.rawText);

  rawDocs.forEach((textSegment, idx) => {
    if (idx > 0) {
      doc.addPage();
    }
    const currentNomor =
      idx === 1 && props.computedNomorSurat2 ? props.computedNomorSurat2 : props.computedNomorSurat;

    const parsed = parseLetter(
      textSegment,
      currentNomor,
      props.renderedPerihal,
      props.renderedTujuan,
      props.renderedKotaTujuan,
      props.customLampiran || "-",
      props.todayInfo,
      props.template
    );

    renderLetterPage(doc, parsed, props.effectiveShowBarcode, props.verificationUrl, qrDataUrl);
  });

  return doc;
}

/**
 * Generates and downloads the official letter as a PDF file.
 */
export async function downloadOfficialLetterPdf(
  props: OfficialLetterPdfProps,
  fileName?: string
): Promise<void> {
  const doc = await generateOfficialLetterPdf(props);
  const cleanNomor = props.computedNomorSurat.replace(/[/\\?%*:|"<>]/g, "-");
  const fallbackName = `${cleanNomor}_${props.template.nama || "Surat_Resmi"}.pdf`;
  const finalFileName = fileName ? (fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`) : fallbackName;

  doc.save(finalFileName);
}
