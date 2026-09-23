"use client";

import React, { useMemo, useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode, CheckCircle2, ExternalLink } from "lucide-react";
import type { SuratTemplate } from "@/shared/types/surat";
import { toTitleCase } from "@/shared/lib/utils";

interface OfficialLetterPreviewProps {
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
  selectedDocIndex: number;
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

/**
 * Splits multi-document text (e.g. Doc 1: Rekomendasi, Doc 2: Jaminan) into discrete document strings.
 */
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

/**
 * Parses raw text into rich structured letter sections.
 */
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
  let signatureKotaTanggal = `Malang, ${todayInfo.masehi}`;
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
        if (nextLine && (nextLine.toLowerCase().startsWith("yth") || nextLine.toLowerCase().startsWith("bapak") || nextLine.toLowerCase().startsWith("kepala"))) {
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
    if (lower.includes("assalaamu'alaikum") || lower.includes("assalamu'alaikum") || lower.includes("assalamualaikum")) {
      salamPembuka = line;
      currentSection = "opening";
      continue;
    }

    // 4. Paragraf Pembuka
    if (lower.includes("dengan hormat") || lower.includes("yang bertanda tangan di bawah ini") || lower.includes("kami yang bertanda tangan")) {
      paragrafPembuka = line;
      currentSection = "pihak1";
      continue;
    }

    // 5. Keterangan Antara
    if (lower.includes("menerangkan dengan sebenarnya") || lower.includes("menerangkan bahwa") || lower.includes("memberitahukan bahwa")) {
      keteranganAntara = line;
      currentSection = "jamaah";
      continue;
    }

    // 6. Penutup
    if (lower.includes("demikian surat") || lower.includes("demikian permohonan") || lower.includes("demikian rekomendasi") || lower.includes("demikianlah surat")) {
      penutup = line;
      currentSection = "closing";
      continue;
    }

    // 7. Salam Penutup
    if (lower.includes("wassalaamu'alaikum") || lower.includes("wassalamu'alaikum") || lower.includes("wassalamualaikum")) {
      salamPenutup = line;
      currentSection = "ttd";
      continue;
    }

    // 8. Tanda Tangan Section
    if (currentSection === "ttd" || /^(?:malang|sidoarjo|surabaya|jakarta),\s*\d+/i.test(line)) {
      currentSection = "ttd";
      if (/^(?:malang|sidoarjo|surabaya|jakarta),\s*\d+/i.test(line) || /\b\d{1,2}\s+[a-z]+\s+\d{4}\b/i.test(line)) {
        signatureKotaTanggal = line;
      } else if (lower.includes("direktur") || lower.includes("pimpinan") || lower.includes("kepala")) {
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

  // Detect company entity from content or signature
  const fullContentLower = text.toLowerCase();
  let entityCompany: "tamma" | "trikarsa" | "custom" = "tamma";
  if (fullContentLower.includes("tamma") || fullContentLower.includes("malang") || fullContentLower.includes("u.493")) {
    entityCompany = "tamma";
    signatureInstansi = "PT. VAUZA TAMMA ABADI";
  } else if (fullContentLower.includes("trikarsa") || fullContentLower.includes("sidoarjo") || fullContentLower.includes("u.400")) {
    entityCompany = "trikarsa";
    signatureInstansi = "PT. VAUZA TRIKARSA UTAMA";
  }

  // Fallback defaults for missing sections
  if (!paragrafPembuka && pihakPertama.length > 0) {
    paragrafPembuka = "Dengan hormat, kami yang bertanda tangan di bawah ini:";
  }
  if (!keteranganAntara && dataJamaah.length > 0) {
    keteranganAntara = "Menerangkan dengan sebenarnya bahwa nama yang tertera di bawah ini:";
  }
  if (!penutup && paragraphs.length > 0) {
    penutup = "Demikian Surat Rekomendasi ini kami buat untuk dipergunakan sebagaimana mestinya, atas kerjasamanya kami ucapkan terima kasih.";
  }

  const tanggalParts = signatureKotaTanggal.split(",");
  const parsedTanggalMasehi = tanggalParts.length > 1 && tanggalParts[1] ? tanggalParts[1].trim() : todayInfo.masehi;

  return {
    nomorSurat,
    lampiran,
    perihal,
    tanggalMasehi: parsedTanggalMasehi,
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
      tandaTanganUrl: "/images/signature-faisal.png",
    },
    entityCompany,
  };
}

export default function OfficialLetterPreview({
  template,
  rawText,
  computedNomorSurat,
  renderedPerihal,
  renderedTujuan,
  renderedKotaTujuan,
  customLampiran,
  todayInfo,
  effectiveShowBarcode,
  verificationUrl,
  selectedDocIndex,
}: OfficialLetterPreviewProps) {
  // 1. Split raw text into documents if template has multiple sub-letters
  const subDocs = useMemo(() => {
    return splitMultipleDocuments(rawText);
  }, [rawText]);

  // Active document text based on selectedDocIndex
  const activeDocText = useMemo(() => {
    return subDocs[selectedDocIndex] || subDocs[0] || rawText;
  }, [subDocs, selectedDocIndex, rawText]);

  // 2. Parse active document text into structured format
  const parsed = useMemo(() => {
    return parseLetter(
      activeDocText,
      computedNomorSurat,
      renderedPerihal,
      renderedTujuan,
      renderedKotaTujuan,
      customLampiran || "-",
      todayInfo,
      template
    );
  }, [
    activeDocText,
    computedNomorSurat,
    renderedPerihal,
    renderedTujuan,
    renderedKotaTujuan,
    customLampiran,
    todayInfo,
    template,
  ]);

  const isTamma = parsed.entityCompany === "tamma";

  const [qrSrc, setQrSrc] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    if (effectiveShowBarcode && verificationUrl) {
      QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 300,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then((url) => {
          if (isMounted) setQrSrc(url);
        })
        .catch(() => {});
    } else {
      setQrSrc("");
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveShowBarcode, verificationUrl]);

  return (
    <div className="bg-white text-stone-950 p-8 sm:p-12 rounded-2xl shadow-xl border border-stone-300 font-serif text-[13px] leading-relaxed max-w-2xl mx-auto space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none min-h-[842px]">
      {/* ── 1. OFFICIAL LETTERHEAD (KOP SURAT PPIU RESMI) ── */}
      <div className="border-b-[3px] border-double border-stone-900 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <img
            src="/images/vauza-tamma-logo-full.png"
            alt="Logo Resmi PT Vauza Tamma Abadi"
            className="h-16 sm:h-18 w-auto object-contain shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-emerald-950 dark:text-emerald-900 font-sans uppercase">
              PT. VAUZA TAMMA ABADI
            </h2>
            <p className="text-[11px] sm:text-[11.5px] font-bold text-stone-800 font-sans tracking-wide">
              Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021 / No. 805 Tahun 2019
            </p>
            <p className="text-[9.5px] sm:text-[10px] text-stone-600 font-sans mt-0.5 leading-tight">
              Kantor Pusat: Jl. Kauman No. 21, Kauman, Klojen, Kota Malang • Telp: (0341) 399059 • Email: info@vauzatamma.co.id
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-right shrink-0">
          <span className="text-[8.5px] font-black font-sans px-2 py-0.5 bg-stone-950 text-amber-300 rounded tracking-wider shadow-2xs">
            PPIU RESMI
          </span>
          <span className="text-[9px] text-stone-500 font-sans mt-1 font-semibold">Akreditasi A</span>
        </div>
      </div>

      {/* ── 2. METADATA SECTION (NOMOR, LAMPIRAN, HAL & TANGGAL) ── */}
      <div className="flex items-start justify-between text-xs font-sans text-stone-900 border-b border-stone-100 pb-2">
        <table className="text-xs">
          <tbody>
            <tr>
              <td className="font-bold pr-2 py-0.5 w-16 text-stone-700">Nomor</td>
              <td className="pr-2 py-0.5 font-bold">:</td>
              <td className="font-mono font-bold py-0.5 text-stone-950">{parsed.nomorSurat}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2 py-0.5 text-stone-700">Lamp</td>
              <td className="pr-2 py-0.5 font-bold">:</td>
              <td className="py-0.5 text-stone-800">{parsed.lampiran}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2 py-0.5 text-stone-700">Perihal</td>
              <td className="pr-2 py-0.5 font-bold">:</td>
              <td className="font-bold py-0.5 text-stone-950">{parsed.perihal}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-right font-sans text-xs shrink-0 pl-2">
          <p className="font-bold text-stone-950">{parsed.signature.kotaTanggal || `Malang, ${todayInfo.masehi}`}</p>
          <p className="text-[10.5px] text-stone-500 font-medium">{todayInfo.hijriyah}</p>
        </div>
      </div>

      {/* ── 3. DESTINATION (KEPADA YTH) ── */}
      <div className="text-xs font-sans space-y-0.5 text-stone-900 pt-1">
        <p className="text-stone-700">Kepada</p>
        <p className="font-bold text-stone-950 text-[13px]">{parsed.tujuanKepada}</p>
        <p className="text-stone-700">
          di - <span className="font-semibold text-stone-900">{parsed.kotaTujuan || "Tempat"}</span>
        </p>
      </div>

      {/* ── 4. SALAM PEMBUKA & PARAGRAF PEMBUKA ── */}
      <div className="space-y-2 pt-1">
        <p className="text-xs font-serif italic text-stone-950 font-medium">
          {parsed.salamPembuka}
        </p>
        {parsed.paragrafPembuka && (
          <p className="text-xs font-sans leading-relaxed text-stone-900 text-justify">
            {parsed.paragrafPembuka}
          </p>
        )}
      </div>

      {/* ── 5. TABEL IDENTITAS PIHAK PERTAMA (PIMPINAN / TRAVEL) ── */}
      {parsed.pihakPertama.length > 0 && (
        <div className="pl-3 sm:pl-6 my-2">
          <table className="text-xs font-sans w-full max-w-xl">
            <tbody>
              {parsed.pihakPertama.map((row, idx) => (
                <tr key={row.label + idx} className="align-top">
                  <td className="w-28 sm:w-32 py-0.5 text-stone-700 font-medium">{row.label}</td>
                  <td className="w-4 py-0.5 text-center font-bold">:</td>
                  <td className="py-0.5 font-semibold text-stone-950">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 6. KETERANGAN ANTARA ── */}
      {parsed.keteranganAntara && (
        <p className="text-xs font-sans leading-relaxed text-stone-900 text-justify">
          {parsed.keteranganAntara}
        </p>
      )}

      {/* ── 7. TABEL IDENTITAS CALON JAMAAH (TERSTRUKTUR RAPI) ── */}
      {parsed.dataJamaah.length > 0 && (
        <div className="pl-3 sm:pl-6 my-2.5 bg-stone-50/90 p-3 sm:p-3.5 rounded-xl border border-stone-200 shadow-2xs">
          <table className="text-xs font-sans w-full">
            <tbody>
              {parsed.dataJamaah.map((row, idx) => (
                <tr key={row.label + idx} className="align-top border-b border-stone-200/50 last:border-none">
                  <td className="w-32 sm:w-36 py-1 text-stone-700 font-medium">{row.label}</td>
                  <td className="w-4 py-1 text-center font-bold text-stone-800">:</td>
                  <td className="py-1 font-bold text-stone-950">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 8. PARAGRAF ISI & JAMINAN ── */}
      {parsed.paragraphs.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {parsed.paragraphs.map((p, idx) => (
            <p key={idx} className="text-xs font-sans leading-relaxed text-justify text-stone-900 indent-4">
              {p}
            </p>
          ))}
        </div>
      )}

      {/* ── 9. PARAGRAF PENUTUP & SALAM PENUTUP ── */}
      <div className="space-y-2 pt-1">
        {parsed.penutup && (
          <p className="text-xs font-sans leading-relaxed text-stone-900 text-justify">
            {parsed.penutup}
          </p>
        )}
        <p className="text-xs font-serif italic text-stone-950 font-medium">
          {parsed.salamPenutup}
        </p>
      </div>

      {/* ── 10. SIGNATURE BLOCK & QR CODE VERIFIKASI ── */}
      <div className="pt-6 sm:pt-8 flex items-end justify-between font-sans text-xs gap-4 border-t border-stone-100">
        {/* QR Code Barcode Verification */}
        {effectiveShowBarcode && (
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-stone-300 rounded-xl flex items-center gap-2.5 bg-stone-50/90 max-w-[260px] shadow-2xs hover:bg-stone-100 transition-colors group cursor-pointer"
            title="Klik untuk membuka verifikasi keabsahan surat"
          >
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR Code Verifikasi"
                className="h-11 w-11 shrink-0 rounded bg-white p-0.5 border border-stone-200 group-hover:scale-105 transition-transform"
              />
            ) : (
              <QrCode className="h-11 w-11 text-stone-900 shrink-0 group-hover:scale-105 transition-transform" />
            )}
            <div className="text-[9px] text-stone-700 leading-tight">
              <p className="font-bold text-stone-950 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 inline" />
                VERIFIKASI KEABSAHAN
                <ExternalLink className="h-2 w-2 opacity-50 ml-0.5" />
              </p>
              <p className="mt-0.5 text-stone-600 font-mono text-[8px] break-all">{parsed.nomorSurat}</p>
              <p className="text-[7.5px] text-stone-500 mt-0.5">Scan QR Code untuk verifikasi portal resmi VTU</p>
            </div>
          </a>
        )}

        {/* Signature Block (Right Aligned) */}
        <div className="text-center min-w-[210px] ml-auto space-y-1">
          <p className="text-xs font-medium text-stone-800">
            {parsed.signature.kotaTanggal || `Malang, ${todayInfo.masehi}`}
          </p>
          <p className="text-xs font-bold text-stone-950">{parsed.signature.jabatan}</p>
          <p className="text-xs font-black tracking-wide text-stone-950">{parsed.signature.instansi}</p>

          {selectedDocIndex === 1 && (template.attachedFiles?.length || 0) > 1 ? (
            <div className="h-20 flex flex-col items-center justify-center relative my-1 border border-dashed border-stone-300 rounded-lg bg-stone-50/40 p-2 text-center">
              <span className="text-[10px] text-stone-500 font-sans italic">
                (Ruang Tanda Tangan Fisik &amp; Cap Basah)
              </span>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center relative my-1">
              {/* Real Signature Image */}
              <img
                src="/images/signature-faisal.png"
                alt="Tanda Tangan Pimpinan"
                className="h-16 w-auto object-contain z-10 opacity-90"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />

              {/* Official Stempel */}
              {template.penandatangan?.showStempel && (
                <div className="absolute inset-0 flex items-center justify-center opacity-75 pointer-events-none z-20">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-600 flex flex-col items-center justify-center text-[7.5px] font-black text-red-600 rotate-[-12deg] bg-red-500/5 shadow-2xs">
                    <span>PT. VAUZA</span>
                    <span>{isTamma ? "TAMMA ABADI" : "TRIKARSA UTAMA"}</span>
                    <span className="text-[6px] tracking-widest mt-0.5">{isTamma ? "MALANG" : "SIDOARJO"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="font-bold underline uppercase text-stone-950 tracking-wider text-xs">
            {parsed.signature.nama}
          </p>
          <p className="text-[10.5px] text-stone-600 font-medium">{parsed.signature.jabatan}</p>
        </div>
      </div>
    </div>
  );
}
