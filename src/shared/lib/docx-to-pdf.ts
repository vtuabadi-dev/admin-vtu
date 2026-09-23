import JSZip from "jszip";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { mergeDocxPlaceholders } from "./docx-mail-merge";

/**
 * Maps Word XML align attribute values to CSS text-align.
 */
function mapWordAlignToCss(val?: string | null): string {
  if (!val) return "left";
  switch (val.toLowerCase()) {
    case "center":
      return "center";
    case "right":
      return "right";
    case "both":
    case "justify":
      return "justify";
    default:
      return "left";
  }
}

/**
 * Decodes XML entities.
 */
function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extracts all media relationships (rId -> data URI) from relationship XML files.
 */
async function extractMediaMap(zip: JSZip): Promise<Record<string, string>> {
  const mediaMap: Record<string, string> = {};

  // Find all .rels files in word/_rels/
  const relFiles = Object.keys(zip.files).filter(
    (p) => p.startsWith("word/_rels/") && p.endsWith(".rels")
  );

  for (const relPath of relFiles) {
    const file = zip.file(relPath);
    if (!file) continue;
    const relsXml = await file.async("string");

    // Match <Relationship Id="rId1" Type="...image" Target="media/image1.jpeg"/>
    const relRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]+)"/gi;
    let match: RegExpExecArray | null;

    while ((match = relRegex.exec(relsXml)) !== null) {
      const rId = match[1];
      let target = match[2];
      if (!rId || !target) continue;

      // Normalize target path
      target = target.replace(/^[./\\]+/, "");
      if (!target.startsWith("word/")) {
        target = `word/${target}`;
      }

      const imgFile = zip.file(target);
      if (imgFile) {
        const ext = target.split(".").pop()?.toLowerCase() || "jpeg";
        const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        const base64 = await imgFile.async("base64");
        mediaMap[rId] = `data:${mime};base64,${base64}`;
      }
    }
  }

  return mediaMap;
}

/**
 * Parses run properties (<w:rPr>) to CSS style string.
 */
function parseRunStyles(rPrXml: string): string {
  const styles: string[] = [];

  if (/<w:b(?:\s|\/|>)/i.test(rPrXml) && !/<w:b\s+w:val="(?:0|false)"/i.test(rPrXml)) {
    styles.push("font-weight: bold");
  }
  if (/<w:i(?:\s|\/|>)/i.test(rPrXml) && !/<w:i\s+w:val="(?:0|false)"/i.test(rPrXml)) {
    styles.push("font-style: italic");
  }
  if (/<w:u(?:\s|\/|>)/i.test(rPrXml) && !/<w:u\s+w:val="(?:none)"/i.test(rPrXml)) {
    styles.push("text-decoration: underline");
  }

  const szMatch = rPrXml.match(/<w:sz\s+w:val="(\d+)"/i);
  if (szMatch && szMatch[1]) {
    const pt = parseInt(szMatch[1], 10) / 2;
    styles.push(`font-size: ${pt}pt`);
  }

  const colorMatch = rPrXml.match(/<w:color\s+w:val="([0-9a-fA-F]{6})"/i);
  if (colorMatch && colorMatch[1]) {
    styles.push(`color: #${colorMatch[1]}`);
  }

  const fontMatch = rPrXml.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/i);
  if (fontMatch && fontMatch[1]) {
    styles.push(`font-family: "${fontMatch[1]}", "Times New Roman", serif`);
  }

  return styles.join("; ");
}

/**
 * Parses paragraph properties (<w:pPr>) to CSS style string.
 */
function parseParagraphStyles(pPrXml: string): string {
  const styles: string[] = [
    "margin: 0",
    "padding: 0",
    "line-height: 1.35",
    "min-height: 1em",
  ];

  const jcMatch = pPrXml.match(/<w:jc\s+w:val="([^"]+)"/i);
  if (jcMatch && jcMatch[1]) {
    styles.push(`text-align: ${mapWordAlignToCss(jcMatch[1])}`);
  }

  const spacingMatch = pPrXml.match(/<w:spacing\b([^>]*)\/?>/i);
  if (spacingMatch && spacingMatch[1]) {
    const beforeMatch = spacingMatch[1].match(/w:before="(\d+)"/i);
    const afterMatch = spacingMatch[1].match(/w:after="(\d+)"/i);
    const lineMatch = spacingMatch[1].match(/w:line="(\d+)"/i);

    if (beforeMatch && beforeMatch[1]) {
      const ptBefore = Math.round(parseInt(beforeMatch[1], 10) / 20);
      styles.push(`margin-top: ${ptBefore}pt`);
    }
    if (afterMatch && afterMatch[1]) {
      const ptAfter = Math.round(parseInt(afterMatch[1], 10) / 20);
      styles.push(`margin-bottom: ${ptAfter}pt`);
    }
    if (lineMatch && lineMatch[1]) {
      const lineVal = parseInt(lineMatch[1], 10);
      if (lineVal >= 200) {
        styles.push(`line-height: ${(lineVal / 240).toFixed(2)}`);
      }
    }
  }

  const indMatch = pPrXml.match(/<w:ind\b([^>]*)\/?>/i);
  if (indMatch && indMatch[1]) {
    const firstLineMatch = indMatch[1].match(/w:firstLine="(\d+)"/i);
    const leftMatch = indMatch[1].match(/w:left="(\d+)"/i);
    if (firstLineMatch && firstLineMatch[1]) {
      const pt = Math.round(parseInt(firstLineMatch[1], 10) / 20);
      styles.push(`text-indent: ${pt}pt`);
    }
    if (leftMatch && leftMatch[1]) {
      const pt = Math.round(parseInt(leftMatch[1], 10) / 20);
      styles.push(`padding-left: ${pt}pt`);
    }
  }

  return styles.join("; ");
}

/**
 * Tries to parse a paragraph containing tabs and colons into an aligned form row.
 * E.g. "No : ...", "Hal : ...", "Nama : ...", "Jabatan : ...", "Alamat : ...", "TTL : ..."
 */
function tryParseKeyValueRow(pXml: string): { label: string; value: string; isIndented: boolean } | null {
  const rMatches = pXml.match(/<w:r\b[\s\S]*?<\/w:r>/gi) || [];
  let fullText = "";
  let hasTab = false;

  for (const r of rMatches) {
    if (r.includes("<w:tab")) {
      fullText += "\t";
      hasTab = true;
    }
    const tMatches = r.match(/<w:t(?:\s+[^>]*?)?>([\s\S]*?)<\/w:t>/gi) || [];
    for (const t of tMatches) {
      fullText += t.replace(/<[^>]+>/g, "");
    }
  }

  const colonIdx = fullText.indexOf(":");
  if (colonIdx === -1) return null;

  const beforeColon = fullText.substring(0, colonIdx);
  const afterColon = fullText.substring(colonIdx + 1);
  const cleanLabel = beforeColon.replace(/\t/g, "").trim();
  const cleanValue = afterColon.replace(/^\t+/, "").trim();

  const knownLabels = ["no", "hal", "nama", "jabatan", "alamat", "ttl", "nomor sk"];
  const isKnown = knownLabels.includes(cleanLabel.toLowerCase());

  if (isKnown || (hasTab && cleanLabel.length > 0 && cleanLabel.length <= 22 && !cleanLabel.includes("."))) {
    const isIndented =
      beforeColon.startsWith("\t") ||
      /<w:ind\b[^>]*w:firstLine/i.test(pXml) ||
      /<w:ind\b[^>]*w:left/i.test(pXml) ||
      ["nama", "jabatan", "alamat", "ttl", "nomor sk"].includes(cleanLabel.toLowerCase());
    return { label: cleanLabel, value: cleanValue, isIndented };
  }

  return null;
}

/**
 * Parses XML paragraph (<w:p>) to HTML string.
 * Supports tabs/colons alignment, list numbering, and inline/floating drawings.
 */
function parseParagraphXmlToHtml(
  pXml: string,
  mediaMap: Record<string, string>,
  numCounters?: Record<string, number>
): string {
  // 1. Check for pure floating drawing paragraph (e.g. signature image anchored above date)
  const isPureFloatingDrawing =
    pXml.includes("<w:drawing") &&
    !pXml.replace(/<[^>]+>/g, "").replace(/-?\d+\s+-?\d+\s+0\s+0/g, "").trim();

  if (isPureFloatingDrawing) {
    return ""; // Will be rendered in the signature section
  }

  // 2. Check for List Paragraph (<w:numPr>)
  const numPrMatch = pXml.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/i);
  let listPrefix = "";
  if (numPrMatch && numCounters) {
    const numIdMatch = numPrMatch[0].match(/<w:numId\s+w:val="(\d+)"/i);
    const ilvlMatch = numPrMatch[0].match(/<w:ilvl\s+w:val="(\d+)"/i);
    const numId = numIdMatch ? numIdMatch[1] : "1";
    const ilvl = ilvlMatch ? ilvlMatch[1] : "0";
    const key = `${numId}_${ilvl}`;
    numCounters[key] = (numCounters[key] || 0) + 1;
    listPrefix = `${numCounters[key]}.`;
  }

  // 3. Check for Key-Value Metadata row (Tabs / Colon alignment)
  const kv = tryParseKeyValueRow(pXml);
  if (kv) {
    const isHeaderMeta = kv.label.toLowerCase() === "no" || kv.label.toLowerCase() === "hal";
    const labelWidth = isHeaderMeta ? "45px" : "80px";
    const indentPx = isHeaderMeta ? "0px" : kv.isIndented ? "24px" : "0px";
    const isBold = isHeaderMeta;

    return `<div style="display: flex; align-items: baseline; line-height: 1.3; margin: 1.5pt 0; padding-left: ${indentPx}; font-family: 'Times New Roman', serif;">
      <div style="width: ${labelWidth}; flex-shrink: 0; ${isBold ? "font-weight: bold;" : ""}">${kv.label}</div>
      <div style="width: 14px; flex-shrink: 0; text-align: center; ${isBold ? "font-weight: bold;" : ""}">:</div>
      <div style="flex: 1; text-align: left; ${isBold ? "font-weight: bold;" : ""}">${kv.value}</div>
    </div>`;
  }

  // 4. Check for List Item rendering with prefix
  if (listPrefix) {
    const textMatches = Array.from(pXml.matchAll(/<w:t(?:\s+[^>]*?)?>([\s\S]*?)<\/w:t>/gi))
      .map((m) => decodeXml(m[1] || ""))
      .join("");

    return `<div style="display: flex; align-items: baseline; gap: 8px; margin: 3pt 0; text-align: justify; line-height: 1.35; font-family: 'Times New Roman', serif;">
      <span style="min-width: 18px; font-weight: 500;">${listPrefix}</span>
      <div style="flex: 1;">${textMatches}</div>
    </div>`;
  }

  const pPrMatch = pXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/i);
  const pStyles = pPrMatch ? parseParagraphStyles(pPrMatch[0]) : "margin: 0; padding: 0; line-height: 1.35; min-height: 1em;";

  let innerHtml = "";

  // Find all runs and drawings in document order
  const elementRegex = /<w:r\b[\s\S]*?<\/w:r>|<w:drawing\b[\s\S]*?<\/w:drawing>/gi;
  let elemMatch: RegExpExecArray | null;

  while ((elemMatch = elementRegex.exec(pXml)) !== null) {
    const rawElem = elemMatch[0];

    if (rawElem.startsWith("<w:drawing")) {
      // Check if it's behindDoc (watermark or background) - ignore if full page, or render as watermark
      const isBehind = /behindDoc="1"/i.test(rawElem);
      const extentMatch = rawElem.match(/<wp:extent\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
      const cx = extentMatch ? parseInt(extentMatch[1] || "0", 10) : 0;
      const cy = extentMatch ? parseInt(extentMatch[2] || "0", 10) : 0;
      const isFullPage = isBehind || (cx > 5000000 && cy > 8000000);

      const blipMatch = rawElem.match(/<a:blip\b[^>]*r:embed="([^"]+)"/i);
      const rId = blipMatch ? blipMatch[1] : null;

      // Note: Floating signatures/stamps attached to PT VAUZA TAMMA ABADI are handled separately
      if (rId && mediaMap[rId] && !isFullPage && !/PT\s*\.?\s*VAUZA\s+TAMMA\s+ABADI/i.test(pXml)) {
        innerHtml += `<img src="${mediaMap[rId]}" style="max-height: 80px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; margin: 2px 4px;" />`;
      }
      continue;
    }

    // Run <w:r>
    const rPrMatch = rawElem.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i);
    const rStyles = rPrMatch ? parseRunStyles(rPrMatch[0]) : "";

    // Check for drawing inside run
    const insideDrawingMatch = rawElem.match(/<a:blip\b[^>]*r:embed="([^"]+)"/i) || rawElem.match(/<v:imagedata\b[^>]*r:id="([^"]+)"/i);
    if (insideDrawingMatch && insideDrawingMatch[1]) {
      const isBehind = /behindDoc="1"/i.test(rawElem);
      const extentMatch = rawElem.match(/<wp:extent\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
      const cx = extentMatch ? parseInt(extentMatch[1] || "0", 10) : 0;
      const cy = extentMatch ? parseInt(extentMatch[2] || "0", 10) : 0;
      const isFullPage = isBehind || (cx > 5000000 && cy > 8000000);

      const rId = insideDrawingMatch[1];
      if (mediaMap[rId] && !isFullPage && !/PT\s*\.?\s*VAUZA\s+TAMMA\s+ABADI/i.test(pXml)) {
        innerHtml += `<img src="${mediaMap[rId]}" style="max-height: 80px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; margin: 2px 4px;" />`;
      }
    }

    // Check for breaks
    if (/<w:br\b/i.test(rawElem) || /<w:cr\b/i.test(rawElem)) {
      innerHtml += "<br/>";
    }

    // Extract text <w:t>
    const textMatches = rawElem.match(/<w:t(?:\s+xml:space="preserve")?>([\s\S]*?)<\/w:t>/gi);
    if (textMatches) {
      for (const tTag of textMatches) {
        const textContent = tTag.replace(/<[^>]+>/g, "");
        const cleanText = decodeXml(textContent);
        if (rStyles) {
          innerHtml += `<span style="${rStyles}">${cleanText}</span>`;
        } else {
          innerHtml += cleanText;
        }
      }
    }
  }

  // Preserve empty paragraph height
  if (!innerHtml.trim()) {
    innerHtml = "&nbsp;";
  }

  return `<p style="${pStyles}">${innerHtml}</p>`;
}

/**
 * Parses XML table (<w:tbl>) to HTML string.
 */
function parseTableXmlToHtml(tblXml: string, mediaMap: Record<string, string>): string {
  const trMatches = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/gi);
  if (!trMatches || trMatches.length === 0) return "";

  let tableRowsHtml = "";

  for (const trXml of trMatches) {
    const tcMatches = trXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/gi);
    if (!tcMatches) continue;

    let cellsHtml = "";
    for (const tcXml of tcMatches) {
      // Cell width
      const wMatch = tcXml.match(/<w:tcW\b[^>]*w:w="(\d+)"/i);
      const widthDxa = wMatch && wMatch[1] ? parseInt(wMatch[1], 10) : 0;
      const widthStyle = widthDxa > 0 ? `width: ${Math.round(widthDxa / 20)}pt;` : "";

      // Shading / background
      const shdMatch = tcXml.match(/<w:shd\b[^>]*w:fill="([0-9a-fA-F]{6})"/i);
      const bgStyle = shdMatch && shdMatch[1] && shdMatch[1] !== "auto" ? `background-color: #${shdMatch[1]};` : "";

      // Borders
      const hasBorders = /<w:tcBorders\b[\s\S]*?<w:(?:top|bottom|left|right)\s+w:val="(?!none)/i.test(tcXml);
      const borderStyle = hasBorders ? "border: 1px solid #94a3b8;" : "border: none;";

      // Parse inner paragraphs
      const pMatches = tcXml.match(/<w:p\b[\s\S]*?<\/w:p>/gi) || [];
      let cellInnerHtml = "";
      for (const pXml of pMatches) {
        cellInnerHtml += parseParagraphXmlToHtml(pXml, mediaMap);
      }

      cellsHtml += `<td style="padding: 2.5pt 4pt; vertical-align: top; ${widthStyle} ${bgStyle} ${borderStyle}">${cellInnerHtml || "&nbsp;"}</td>`;
    }

    tableRowsHtml += `<tr>${cellsHtml}</tr>`;
  }

  return `<table style="width: 100%; border-collapse: collapse; margin: 4pt 0; table-layout: fixed;"><tbody>${tableRowsHtml}</tbody></table>`;
}

/**
 * Extracts the background letterhead/watermark image from header XML files.
 * Word documents put full-page letterheads in header with behindDoc="1" or large EMU bounds.
 */
async function extractLetterheadBackground(
  zip: JSZip,
  mediaMap: Record<string, string>
): Promise<{ backgroundLetterhead: string | null; headerBannerHtml: string }> {
  let backgroundLetterhead: string | null = null;
  let headerBannerHtml = "";

  const headerFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith("word/header") && f.endsWith(".xml")
  );
  headerFiles.sort();

  for (const hPath of headerFiles) {
    const hFile = zip.file(hPath);
    if (!hFile) continue;
    const hXml = await hFile.async("string");

    // Check for drawings in header
    const drawingRegex = /<w:drawing\b[\s\S]*?<\/w:drawing>/gi;
    let dMatch: RegExpExecArray | null;

    while ((dMatch = drawingRegex.exec(hXml)) !== null) {
      const drawXml = dMatch[0];
      const isBehind = /behindDoc="1"/i.test(drawXml);
      const blipMatch = drawXml.match(/<a:blip\b[^>]*r:embed="([^"]+)"/i);
      const rId = blipMatch ? blipMatch[1] : null;

      if (rId && mediaMap[rId]) {
        // Check extent size in EMUs
        const extentMatch = drawXml.match(/<wp:extent\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
        const cx = extentMatch ? parseInt(extentMatch[1] || "0", 10) : 0;
        const cy = extentMatch ? parseInt(extentMatch[2] || "0", 10) : 0;

        // If behindDoc or large full-sheet dimensions (> 5,000,000 EMUs)
        if (isBehind || (cx > 5000000 && cy > 8000000)) {
          if (!backgroundLetterhead) {
            backgroundLetterhead = mediaMap[rId];
          }
        } else {
          // Top banner kop surat
          headerBannerHtml += `<div style="text-align: center; margin-bottom: 8pt;"><img src="${mediaMap[rId]}" style="max-width: 100%; max-height: 110px; object-fit: contain;" /></div>`;
        }
      }
    }

    // Check for plain paragraphs in header if not drawings
    if (!backgroundLetterhead && !headerBannerHtml) {
      const pMatches = hXml.match(/<w:p\b[\s\S]*?<\/w:p>/gi) || [];
      for (const pXml of pMatches) {
        const textContent = pXml.replace(/<[^>]+>/g, "").trim();
        if (textContent) {
          headerBannerHtml += parseParagraphXmlToHtml(pXml, mediaMap);
        }
      }
    }
  }

  return { backgroundLetterhead, headerBannerHtml };
}

/**
 * Converts a merged DOCX document into a clean, printable HTML string with discrete A4 pages.
 */
export async function convertDocxToA4Html(
  docxData: string | Uint8Array | ArrayBuffer | Blob
): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (typeof docxData === "string") {
    const clean = docxData.includes("base64,") ? docxData.split("base64,")[1] || "" : docxData;
    const binary = atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    arrayBuffer = bytes.buffer as ArrayBuffer;
  } else if (docxData instanceof Blob) {
    arrayBuffer = await docxData.arrayBuffer();
  } else if (docxData instanceof Uint8Array) {
    const copy = new Uint8Array(docxData.byteLength);
    copy.set(docxData);
    arrayBuffer = copy.buffer as ArrayBuffer;
  } else {
    arrayBuffer = docxData;
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const mediaMap = await extractMediaMap(zip);
  const { backgroundLetterhead, headerBannerHtml } = await extractLetterheadBackground(zip, mediaMap);

  interface PageData {
    blocks: string[];
    topMarginPx: number;
    leftMarginPx: number;
    rightMarginPx: number;
    bottomMarginPx: number;
    pageLetterhead: string | null;
  }

  const pages: PageData[] = [];

  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const docXml = await docFile.async("string");
    const bodyMatch = docXml.match(/<w:body\b[\s\S]*?<\/w:body>/i);
    const bodyContent = bodyMatch ? bodyMatch[0] : docXml;

    const blockRegex = /<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/gi;
    let blockMatch: RegExpExecArray | null;

    // Collect raw blocks grouped by discrete pages
    interface RawPageInfo {
      rawBlocks: string[];
      sectPr: string | null;
    }
    const rawPages: RawPageInfo[] = [];
    let currentRawBlocks: string[] = [];

    while ((blockMatch = blockRegex.exec(bodyContent)) !== null) {
      const rawBlock = blockMatch[0];

      const sectPrMatch = rawBlock.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i);
      const hasExplicitBreak =
        /<w:br\b[^>]*w:type="page"/i.test(rawBlock) ||
        /<w:pageBreakBefore(?:\s|\/|>)/i.test(rawBlock);

      currentRawBlocks.push(rawBlock);

      if (sectPrMatch || hasExplicitBreak) {
        rawPages.push({
          rawBlocks: currentRawBlocks,
          sectPr: sectPrMatch ? sectPrMatch[0] : null,
        });
        currentRawBlocks = [];
      }
    }

    if (currentRawBlocks.length > 0) {
      const finalSectPr = bodyContent.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>(?:\s*<\/w:body>)?$/i);
      rawPages.push({
        rawBlocks: currentRawBlocks,
        sectPr: finalSectPr ? finalSectPr[0] : null,
      });
    }

    // Numbering counters across the whole document
    const numCounters: Record<string, number> = {};

    for (const rawPage of rawPages) {
      const { rawBlocks, sectPr } = rawPage;

      // Detect floating signature drawing for this page
      let pageSignatureImg: string | null = null;
      for (const b of rawBlocks) {
        if (!b) continue;
        const blipMatches = Array.from(b.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/gi));
        for (const m of blipMatches) {
          const rId = m[1];
          if (rId && mediaMap[rId]) {
            const extentMatch = b.match(/<wp:extent\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
            const cx = extentMatch ? parseInt(extentMatch[1] || "0", 10) : 0;
            const cy = extentMatch ? parseInt(extentMatch[2] || "0", 10) : 0;
            const isBehind = /behindDoc="1"/i.test(b);
            if (!isBehind && cx < 5000000 && cy < 8000000) {
              pageSignatureImg = mediaMap[rId];
            }
          }
        }
      }

      const pageBlocks: string[] = [];
      let inSignatureSpace = false;

      for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
        const b = rawBlocks[bIdx];
        if (!b) continue;
        const cleanRawText = b.replace(/<[^>]+>/g, "").trim();

        // 1. Signature marker: PT. VAUZA TAMMA ABADI
        if (
          /PT\s*\.?\s*VAUZA\s+TAMMA\s+ABADI/i.test(cleanRawText) &&
          (b.includes("Direktur") || rawBlocks.slice(Math.max(0, bIdx - 3), bIdx).some((x) => x && x.includes("Direktur")))
        ) {
          pageBlocks.push(
            `<p style="margin: 0; padding: 0; line-height: 1.35; font-family: 'Times New Roman', serif;">PT. VAUZA TAMMA ABADI</p>`
          );
          if (pageSignatureImg) {
            pageBlocks.push(
              `<div style="height: 72px; margin: 3px 0; display: flex; align-items: center;">
                <img src="${pageSignatureImg}" style="max-height: 75px; max-width: 220px; object-fit: contain;" />
              </div>`
            );
          } else {
            pageBlocks.push(`<div style="height: 55px;"></div>`);
          }
          inSignatureSpace = true;
          continue;
        }

        // 2. In signature space: wait for signer name, skip empty paragraphs
        if (inSignatureSpace) {
          if (/H\.\s*Faisal\s+Wahyudi/i.test(cleanRawText)) {
            pageBlocks.push(
              `<p style="margin: 0; padding: 0; line-height: 1.35; font-weight: bold; font-family: 'Times New Roman', serif;">H. Faisal Wahyudi</p>`
            );
            inSignatureSpace = false;
            continue;
          } else if (!cleanRawText) {
            // Skip empty spacer paragraphs between PT VAUZA TAMMA and H. Faisal Wahyudi
            continue;
          }
        }

        // 3. Normal paragraph or table
        let parsedHtml = "";
        if (b.startsWith("<w:tbl")) {
          parsedHtml = parseTableXmlToHtml(b, mediaMap);
        } else {
          parsedHtml = parseParagraphXmlToHtml(b, mediaMap, numCounters);
        }

        if (parsedHtml.trim()) {
          pageBlocks.push(parsedHtml);
        }
      }

      // Check if page contains real content (filter empty trailing page)
      const rawText = pageBlocks
        .join("")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, "")
        .trim();
      const hasImages = pageBlocks.join("").includes("<img");

      if (rawText.length > 20 || (hasImages && rawText.length > 5)) {
        let topDxa = 3544; // default ~62.5mm if letterhead present
        let leftDxa = 993;
        let rightDxa = 851;
        let bottomDxa = 567;

        if (sectPr) {
          const tM = sectPr.match(/w:top="(\d+)"/i);
          const lM = sectPr.match(/w:left="(\d+)"/i);
          const rM = sectPr.match(/w:right="(\d+)"/i);
          const bM = sectPr.match(/w:bottom="(\d+)"/i);
          if (tM && tM[1]) topDxa = parseInt(tM[1], 10);
          if (lM && lM[1]) leftDxa = parseInt(lM[1], 10);
          if (rM && rM[1]) rightDxa = parseInt(rM[1], 10);
          if (bM && bM[1]) bottomDxa = parseInt(bM[1], 10);
        }

        pages.push({
          blocks: pageBlocks,
          topMarginPx: Math.max(Math.round(topDxa / 15), backgroundLetterhead ? 220 : 40),
          leftMarginPx: Math.round(leftDxa / 15),
          rightMarginPx: Math.round(rightDxa / 15),
          bottomMarginPx: Math.round(bottomDxa / 15),
          pageLetterhead: backgroundLetterhead,
        });
      }
    }
  }

  if (pages.length === 0) {
    pages.push({
      blocks: ["<p>&nbsp;</p>"],
      topMarginPx: 40,
      leftMarginPx: 48,
      rightMarginPx: 48,
      bottomMarginPx: 40,
      pageLetterhead: backgroundLetterhead,
    });
  }

  // Construct discrete A4 page cards with per-page accurate top/left/right/bottom margins
  const pagesHtml = pages
    .map(
      (pageData, idx) => `
      <div class="docx-a4-page" data-page="${idx + 1}" style="
        position: relative;
        width: 794px;
        height: 1123px;
        min-height: 1123px;
        max-height: 1123px;
        box-sizing: border-box;
        background-color: #ffffff;
        overflow: hidden;
        margin: 0 0 20px 0;
        page-break-after: always;
        break-after: page;
      ">
        ${
          pageData.pageLetterhead
            ? `
          <img src="${pageData.pageLetterhead}" alt="Kop & Watermark" style="
            position: absolute;
            top: 0;
            left: 0;
            width: 794px;
            height: 1123px;
            object-fit: fill;
            z-index: 0;
            pointer-events: none;
          " />
        `
            : ""
        }

        <div class="docx-page-content" style="
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          padding: ${pageData.topMarginPx}px ${pageData.rightMarginPx}px ${pageData.bottomMarginPx}px ${pageData.leftMarginPx}px;
          box-sizing: border-box;
          font-family: 'Times New Roman', 'Cambria', Georgia, serif;
          font-size: 11pt;
          line-height: 1.35;
          color: #0f172a;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        ">
          ${idx === 0 ? headerBannerHtml : ""}
          ${pageData.blocks.join("\n")}
        </div>
      </div>
    `
    )
    .join("\n");

  return `
    <div class="docx-pages-container" style="
      background-color: #f1f5f9;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      ${pagesHtml}
    </div>
  `;
}

/**
 * Merges field values into DOCX template and downloads it directly as an accurate PDF file.
 * Preserves high fidelity letterhead background, watermark, and multi-page integrity.
 */
export async function downloadDocxAsPdf(
  docxData: string | Uint8Array | ArrayBuffer | Blob,
  fieldValues: Record<string, string>,
  fileName: string
): Promise<void> {
  // 1. Populate placeholders inside the DOCX
  const mergedBlob = await mergeDocxPlaceholders(docxData, fieldValues);

  // 2. Convert merged DOCX to A4 HTML layout
  const htmlContent = await convertDocxToA4Html(mergedBlob);

  // 3. Render HTML in an off-screen container in DOM
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = "794px";
  container.style.zIndex = "-99999";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Wait for all images (background letterhead, stamps, signatures) to fully load
    const images = Array.from(container.querySelectorAll("img"));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve(true);
              else {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(true);
              }
            })
        )
      );
    }

    // Small delay to allow CSS font rendering
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Find all discrete A4 page elements
    const pageElements = Array.from(
      container.querySelectorAll(".docx-a4-page")
    ) as HTMLElement[];

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    if (pageElements.length === 0) {
      // Fallback single canvas
      const targetElement = (container.firstElementChild as HTMLElement) || container;
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
    } else {
      // Discrete Page Rasterization: 1 Page DOM = 1 Page PDF
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        if (!pageEl) continue;

        if (i > 0) {
          pdf.addPage();
        }

        const canvas = await html2canvas(pageEl, {
          scale: 2, // 300 dpi equivalent for crisp print quality
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }
    }

    const cleanName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(cleanName);
  } finally {
    document.body.removeChild(container);
  }
}
