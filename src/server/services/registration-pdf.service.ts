// ============================================================
// REGISTRATION PDF SERVICE
// Generate official registration form PDF using PDFKit directly
// Pure Node.js — F4 Folio Size, Kop Surat Image Header, Transparent Table Layout
// Multi-page Annex: Complete Operational Terms & Conditions (64+ Points)
// ============================================================

import type { RegistrationRequest, Keberangkatan } from "@/shared/types";
import { getStorageAdapter } from "@/server/storage";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";
import { prisma } from "@/server/db/client";

interface PdfData {
  registration: RegistrationRequest;
  packageInfo: Keberangkatan | null;
  termsVersion: string;
  termsAcceptedAt: Date | string;
  signedAt?: Date | string;
  termsContent?: string;
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

// Clean HTML tags and parse into individual bullet items
function parseHtmlToPoints(html: string): string[] {
  if (!html) return [];
  const items: string[] = [];

  // Match <li> contents or <p> contents
  const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRegex.exec(html)) !== null) {
    if (match && match[1]) {
      let text = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        items.push(text);
      }
    }
  }

  if (items.length > 0) return items;

  // Fallback if no <li> tags: split by paragraphs or newlines
  const cleanStr = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  return cleanStr
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

// Fallback Operational Terms (64+ points) if DB document is not seeded
const FALLBACK_OPERATIONAL_TERMS: string[] = [
  "Calon jamaah wajib memiliki paspor yang masih berlaku minimal 12 bulan sejak tanggal jadwal keberangkatan yang telah ditentukan.",
  "Calon jamaah wajib melengkapi seluruh dokumen persyaratan administrasi (KTP, KK, Akta Kelahiran/Buku Nikah, Pas Foto latar putih 80% wajah, dan Buku Vaksin Meningitis/COVID-19) paling lambat 30 hari sebelum tanggal keberangkatan.",
  "Pembayaran Down Payment (DP) mengikat pendaftaran. Pelunasan biaya sisa wajib diselesaikan paling lambat 45 hari sebelum tanggal jadwal keberangkatan resmi.",
  "Pembatalan oleh pihak jamaah dikenakan pemotongan biaya administrasi, non-refundable deposit maskapai, dan hotel sesuai regulasi maskapai & hotel Arab Saudi.",
  "Calon jamaah menjamin bahwa seluruh data dan informasi yang diisikan dalam portal registrasi adalah sah, benar, dan dapat dipertanggungjawabkan secara hukum.",
  "Pihak VTU ABADI Travel berhak membatalkan pendaftaran secara sepihak apabila ditemukan data yang tidak sesuai atau dokumen yang tidak memenuhi kriteria permohonan visa umroh/haji.",
  "Calon jamaah memahami dan menyetujui bahwa jadwal penerbangan, penginapan hotel, dan visa dapat berubah sewaktu-waktu menyesuaikan regulasi Pemerintah Arab Saudi, Kementerian Agama RI, dan maskapai penerbangan.",
  "Kejadian di luar kendali pihak travel (bencana alam, wabah penyakit, larangan terbang dari pemerintah) akan diselesaikan berdasarkan azas musyawarah dan regulasi asosiasi penyelenggara umroh/haji.",
  "Pendaftar adalah perwakilan resmi dari seluruh anggota rombongan jamaah yang didaftarkan.",
  "Setiap pendaftaran wajib menyertakan minimal 1 (satu) nomor kontak WhatsApp aktif dan email perwakilan.",
  "Penentuan jenis kamar (Mix, Quad, Triple, Double) disesuaikan dengan ketersediaan paket dan persetujuan biaya tambahan.",
  "Jamaah berkewajiban membayar biaya penyesuaian kamar apabila terjadi kegagalan pemenuhan kuota kamar (misal kamar Quad hanya terisi 3 orang).",
  "Visa umroh yang diterbitkan oleh Kementerian Haji & Umrah Arab Saudi bersifat terbatas sesuai durasi program paket.",
  "Pihak travel tidak bertanggung jawab atas keterlambatan atau penolakan pengeluaran visa yang disebabkan oleh kebijakan otoritas Arab Saudi.",
  "Pengurusan dokumen paspor dan vaksin meningitis menjadi tanggung jawab mandiri jamaah kecuali apabila menggunakan layanan asistensi travel.",
  "Pembayaran resmi hanya diakui apabila disetorkan ke rekening resmi perusahaan PT VAUZA TAMMA ABADI.",
  "Bukti transfer wajib diunggah melalui portal registrasi atau dikonfirmasi kepada Tim Keuangan resmi travel.",
  "Kuitansi resmi akan diterbitkan oleh sistem setelah pembayaran diverifikasi oleh Tim Keuangan VTU ABADI.",
  "Keterlambatan pelunasan melampaui batas 45 hari sebelum keberangkatan dapat mengakibatkan pembatalan otomatis nomor kursi/penerbangan.",
  "Pengembalian dana (refund) akibat pembatalan diproses maksimal 30 hari kerja setelah dokumen permohonan refund disetujui.",
  "Potongan biaya pembatalan H-60 hingga H-45 sebelum keberangkatan sebesar 30% dari total paket.",
  "Potongan biaya pembatalan H-44 hingga H-30 sebelum keberangkatan sebesar 50% dari total paket.",
  "Pembatalan kurang dari H-30 sebelum keberangkatan dikenakan pemotongan 100% dari total biaya paket yang telah disetorkan.",
  "Penggantian nama jamaah (pindah tangan) diperbolehkan maksimal H-45 sebelum keberangkatan dengan dikenakan biaya administrasi pengubahan manifes maskapai.",
  "Jamaah wanita di bawah umur 45 tahun wajib didampingi mahram sesuai dengan ketentuan regulasi imigrasi dan visa yang berlaku.",
  "Jamaah lansia di atas 65 tahun atau memiliki riwayat penyakit medis khusus wajib menyertakan surat rekomendasi dokter dan didampingi keluarga.",
  "Tim Travel berhak meminta Surat Pernyataan Kesehatan dan Penanggung Jawab Medis dari keluarga jamaah lansia/risiko tinggi.",
  "Akomodasi hotel di Makkah dan Madinah disesuaikan dengan taraf bintang paket yang dipilih pada saat pendaftaran.",
  "Jarak hotel ke Masjidil Haram dan Masjid Nabawi disesuaikan dengan deskripsi resmi brosur paket.",
  "Layanan konsumsi (makanan) disajikan 3x sehari dengan menu masakan Indonesia / Internasional sesuai standar hotel setempat.",
  "Penerbangan menggunakan maskapai sesuai yang tercantum pada rincian paket (Direct / Transit).",
  "Bagasi cuma-cuma maskapai dibatasi sesuai regulasi penerbangan (umumnya 30 kg bagasi utama + 7 kg bagasi kabin per jamaah).",
  "Kelebihan berat bagasi (excess baggage) menjadi tanggung jawab biaya mandiri masing-masing jamaah.",
  "Air Zamzam 5 Liter diberikan secara cuma-cuma apabila regulasi penerbangan dan otoritas bandara Arab Saudi mengizinkan pengangkutan.",
  "Perjalanan ziarah/city tour di Makkah (Jabal Tsur, Arafah, Mina, Jabal Nur) dan Madinah (Masjid Quba, Uhud, Kebun Kurma) sudah termasuk dalam program paket.",
  "Setiap rombongan akan didampingi oleh Pembimbing Ibadah (Muthawwif) berpengalaman dan Tour Leader bersertifikasi dari Indonesia.",
  "Jamaah wajib mematuhi petunjuk dan instruksi dari Muthawwif dan Tour Leader selama berada di Tanah Suci.",
  "Jamaah wajib menjaga ketertiban, sopan santun, serta menghormati adat istiadat dan hukum yang berlaku di Kerajaan Arab Saudi.",
  "Dilarang keras membawa barang-barang terlarang (narkoba, senjata tajam, azimat/jimat, barang cetakan melanggar hukum) ke Arab Saudi.",
  "Pihak travel tidak bertanggung jawab atas implikasi hukum apabila jamaah melakukan pelanggaran hukum di Arab Saudi.",
  "Apabila terjadi jamaah hilang atau terpisah dari rombongan, jamaah wajib segera menghubungi nomor darurat Muthawwif atau Posko Travel.",
  "Segala bentuk kehilangan barang pribadi (uang, perhiasan, paspor, handphone) di hotel, bus, atau masjid merupakan tanggung jawab pribadi jamaah.",
  "Disarankan bagi jamaah untuk tidak membawa perhiasan atau uang tunai dalam jumlah berlebihan.",
  "Fasilitas asuransi perjalanan umroh sudah termasuk dalam komponen biaya pendaftaran sesuai standar regulasi Kementerian Agama RI.",
  "Klaim asuransi kesehatan/kecelakaan selama di Tanah Suci akan dibantu proses pengajuannya oleh Tim Layanan VTU ABADI.",
  "Keterlambatan atau perubahan jadwal penerbangan yang disebabkan oleh cuaca buruk, teknis pesawat, atau regulasi bandara menjadi tanggung jawab maskapai.",
  "Travel akan memberikan bantuan pendampingan maksimal apabila terjadi delayed penerbangan di bandara.",
  "Manasik Umroh wajib diikuti oleh seluruh calon jamaah sebelum jadwal keberangkatan pada waktu dan tempat yang ditentukan.",
  "Perlengkapan umroh (Koper, Kain Ihram/Batik, Mukena, Tas Paspor, Buku Doa) akan diserahterimakan setelah pelunasan DP diselesaikan.",
  "Pengambilan perlengkapan dapat dilakukan di kantor pusat/cabang VTU ABADI atau dikirim via ekspedisi dengan ongkos kirim ditanggung pendaftar.",
  "Persetujuan Syarat & Ketentuan ini dilakukan secara digital melalui checkbox dan tanda tangan elektronik pada portal registrasi.",
  "Tanda tangan elektronik yang dibubuhkan pada portal registrasi memiliki kekuatan hukum yang sah dan mengikat kedua belah pihak.",
  "Segala bentuk perselisihan yang timbul antara jamaah dan pihak travel akan diselesaikan secara musyawarah untuk mufakat.",
  "Apabila musyawarah tidak mencapai mufakat, perselisihan akan diselesaikan melalui Badan Arbitrase Syariah Nasional (BASYARNAS) atau Pengadilan Negeri setempat.",
  "Dokumen Formulir Pendaftaran dan Lampiran Syarat & Ketentuan ini merupakan satu kesatuan perjanjian yang tidak terpisahkan.",
  "Syarat dan ketentuan ini berlaku sejak tanggal pendaftaran disetujui dan ditandatangani oleh perwakilan jamaah.",
  "Jamaah menyatakan telah membaca, memahami, dan menyetujui seluruh 64 poin syarat dan ketentuan operasional ini tanpa paksaan dari pihak manapun.",
];

export async function generateRegistrationPdf(data: PdfData): Promise<Buffer> {
  const { registration: reg, packageInfo } = data;

  // Load signature image if available (supports direct base64 dataUrl, raw base64, buffer, or storage path)
  let signatureBuffer: Buffer | null = (data as any).signatureBuffer || null;
  const rawSig = (data as any).signatureBase64 || (reg as any).signatureBase64 || reg.signaturePath;

  if (!signatureBuffer && rawSig) {
    try {
      if (rawSig.startsWith("data:image")) {
        // base64 inline Data URL — extract raw buffer
        const base64Data = rawSig.split(",")[1];
        if (base64Data) signatureBuffer = Buffer.from(base64Data, "base64");
      } else if (rawSig.length > 500 && !rawSig.includes("/") && !rawSig.includes("\\")) {
        // Raw base64 string
        signatureBuffer = Buffer.from(rawSig, "base64");
      } else {
        try {
          const storage = getStorageAdapter();
          signatureBuffer = await storage.download(rawSig);
        } catch {
          try {
            const { createLocalAdapter } = await import("@/server/storage/local");
            const localAdapter = createLocalAdapter();
            signatureBuffer = await localAdapter.download(rawSig);
          } catch {
            signatureBuffer = null;
          }
        }
      }
    } catch (err) {
      console.warn("[registration-pdf] Failed to load signature image:", err);
    }
  }

  // Load complete operational terms from DB or fallback
  let termsPoints: string[] = [];
  try {
    const docRow = await (prisma as any).operationalDocument.findFirst({
      where: { type: "TERMS_CONDITIONS" },
      orderBy: { createdAt: "desc" },
    });
    if (docRow?.content) {
      termsPoints = parseHtmlToPoints(docRow.content);
    }
  } catch (e) {
    console.warn("[registration-pdf] Could not fetch operational terms from DB:", e);
  }

  if (termsPoints.length === 0) {
    termsPoints = FALLBACK_OPERATIONAL_TERMS;
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
      let kopBuffer: Buffer | null = null;
      if (KOP_SURAT_BASE64) {
        try {
          const base64Data = KOP_SURAT_BASE64.replace(/^data:image\/\w+;base64,/, "");
          kopBuffer = Buffer.from(base64Data, "base64");
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
        } catch {}
      }
      doc.fillColor(PRI_COLOR).fontSize(8.5).font("Helvetica-Bold")
        .text(`( ${reg.namaPerwakilan.toUpperCase()} )`, sigBoxX, y + 74, { width: 200, align: "center" });
      y += 90;

      // ── PAGE 1 FOOTER ───────────────────────────────────────────────────────
      doc.fillColor(GRAY).fontSize(7.5).font("Helvetica-Oblique")
        .text(
          "Catatan: Data paspor dan dokumen lainnya dapat dilengkapi pada tahap administrasi berikutnya. Dokumen ini sah sebagai bukti pendaftaran resmi VTU ABADI Travel.",
          40, y, { width: PAGE_W, align: "center" }
        );
      y += 16;
      doc.moveTo(40, y).lineTo(40 + PAGE_W, y).lineWidth(1.5).strokeColor(ACC_COLOR).stroke();

      // ── PAGE 2 ONWARDS — SYARAT & KETENTUAN LENGKAP OPERASIONAL (64+ POIN) ──
      doc.addPage({ size: [612, 936], margin: 40 });

      // Function to draw Kop Surat on new page and return proper top Y position (155pt)
      const startNewTermsPage = (): number => {
        let newY = 40;
        if (hasKopSurat && kopBuffer) {
          try {
            doc.image(kopBuffer, 40, 20, { width: PAGE_W });
            newY = 155; // SAFELY BELOW KOP SURAT IMAGE!
          } catch {
            newY = 50;
          }
        } else {
          newY = 50;
        }
        return newY;
      };

      let y2 = startNewTermsPage();

      // Section Header on Page 2
      y2 = drawSectionHeader(doc, y2, PAGE_W, ACC_COLOR, "F", "SYARAT & KETENTUAN LENGKAP PENDAFTARAN");

      doc.fillColor(GRAY).fontSize(8).font("Helvetica-Oblique")
        .text("Dokumen ini merupakan bagian hukum resmi yang tidak terpisahkan dari Formulir Pendaftaran VTU ABADI Travel.", 40, y2, { width: PAGE_W });
      y2 += 16;

      // Iterate and render all 64+ operational terms points across pages
      termsPoints.forEach((pointText, idx) => {
        const itemNumStr = `${idx + 1}.`;
        const bodyText = pointText.replace(/^\d+[\.\)]\s*/, ""); // remove existing number prefix if any

        // Calculate text height for page overflow check
        const textHeight = doc.heightOfString(bodyText, { width: PAGE_W - 30, align: "justify" });
        const itemTotalHeight = Math.max(textHeight, 12) + 8;

        // Check if content exceeds page boundary (bottom margin at 850pt)
        if (y2 + itemTotalHeight > 850) {
          doc.addPage({ size: [612, 936], margin: 40 });
          y2 = startNewTermsPage();
        }

        // Draw item number
        doc.fillColor(PRI_COLOR).fontSize(8).font("Helvetica-Bold")
          .text(itemNumStr, 44, y2, { width: 22 });

        // Draw item body
        doc.fillColor(GRAY).fontSize(8).font("Helvetica")
          .text(bodyText, 68, y2, { width: PAGE_W - 28, align: "justify" });

        y2 += itemTotalHeight;

        // Subtle divider line between items
        doc.moveTo(44, y2 - 3).lineTo(40 + PAGE_W, y2 - 3).lineWidth(0.2).strokeColor("#e2e8f0").stroke();
        y2 += 3;
      });

      // ── LEGAL ACKNOWLEDGMENT & SIGNATURE BOX AT END OF TERMS ───────────────
      if (y2 + 90 > 850) {
        doc.addPage({ size: [612, 936], margin: 40 });
        y2 = startNewTermsPage();
      }

      y2 += 12;
      doc.fillColor(GRAY).fontSize(8).font("Helvetica-Oblique")
        .text("Pernyataan Menyetujui Seluruh Syarat & Ketentuan Operasional di atas:", 40, y2, { width: PAGE_W, align: "center" });
      y2 += 14;

      const sigBoxX2 = (PAGE_W - 200) / 2 + 40;
      doc.rect(sigBoxX2, y2, 200, 50).lineWidth(0.6).strokeColor(ACC_COLOR).stroke();
      if (signatureBuffer) {
        try {
          doc.image(signatureBuffer, sigBoxX2 + 10, y2 + 4, { fit: [180, 42] });
        } catch {}
      }
      doc.fillColor(PRI_COLOR).fontSize(8).font("Helvetica-Bold")
        .text(`( ${reg.namaPerwakilan.toUpperCase()} )`, sigBoxX2, y2 + 54, { width: 200, align: "center" });

      // ── DYNAMIC PAGE NUMBERING FOOTER ON ALL PAGES ──────────────────────────
      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        doc.fillColor(GRAY).fontSize(7.5).font("Helvetica")
          .text(`Halaman ${i + 1} dari ${totalPages} — VTU ABADI Travel Official Document`, 40, 885, {
            width: PAGE_W,
            align: "center",
            lineBreak: false,
          });
      }

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
