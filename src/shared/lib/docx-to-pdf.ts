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
 * Parses XML paragraph (<w:p>) to HTML string.
 * Special handling for inline signatures and stamps vs background drawings.
 */
function parseParagraphXmlToHtml(pXml: string, mediaMap: Record<string, string>): string {
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

      if (rId && mediaMap[rId] && !isFullPage) {
        // Inline drawing (Signature, Stamp, QR Code, Logo)
        innerHtml += `<img src="${mediaMap[rId]}" style="max-height: 85px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; margin: 2px 4px;" />`;
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
      if (mediaMap[rId] && !isFullPage) {
        innerHtml += `<img src="${mediaMap[rId]}" style="max-height: 85px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; margin: 2px 4px;" />`;
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
  let currentPageBlocks: string[] = [];

  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const docXml = await docFile.async("string");
    const bodyMatch = docXml.match(/<w:body\b[\s\S]*?<\/w:body>/i);
    const bodyContent = bodyMatch ? bodyMatch[0] : docXml;

    const blockRegex = /<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/gi;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockRegex.exec(bodyContent)) !== null) {
      const rawBlock = blockMatch[0];

      // Detect section break or explicit author page break
      // CRITICAL: DO NOT use <w:lastRenderedPageBreak> because Word generates that dynamically for pagination caches, causing ghost pages!
      const sectPrMatch = rawBlock.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i);
      const hasExplicitBreak =
        /<w:br\b[^>]*w:type="page"/i.test(rawBlock) ||
        /<w:pageBreakBefore(?:\s|\/|>)/i.test(rawBlock);

      let parsedHtml = "";
      if (rawBlock.startsWith("<w:tbl")) {
        parsedHtml = parseTableXmlToHtml(rawBlock, mediaMap);
      } else {
        parsedHtml = parseParagraphXmlToHtml(rawBlock, mediaMap);
      }

      currentPageBlocks.push(parsedHtml);

      if (sectPrMatch || hasExplicitBreak) {
        let topDxa = 3544; // default ~62.5mm if letterhead present
        let leftDxa = 993;
        let rightDxa = 851;
        let bottomDxa = 567;

        if (sectPrMatch) {
          const tM = sectPrMatch[0].match(/w:top="(\d+)"/i);
          const lM = sectPrMatch[0].match(/w:left="(\d+)"/i);
          const rM = sectPrMatch[0].match(/w:right="(\d+)"/i);
          const bM = sectPrMatch[0].match(/w:bottom="(\d+)"/i);
          if (tM && tM[1]) topDxa = parseInt(tM[1], 10);
          if (lM && lM[1]) leftDxa = parseInt(lM[1], 10);
          if (rM && rM[1]) rightDxa = parseInt(rM[1], 10);
          if (bM && bM[1]) bottomDxa = parseInt(bM[1], 10);
        }

        pages.push({
          blocks: currentPageBlocks,
          topMarginPx: Math.max(Math.round(topDxa / 15), backgroundLetterhead ? 220 : 40),
          leftMarginPx: Math.round(leftDxa / 15),
          rightMarginPx: Math.round(rightDxa / 15),
          bottomMarginPx: Math.round(bottomDxa / 15),
          pageLetterhead: backgroundLetterhead,
        });
        currentPageBlocks = [];
      }
    }

    if (currentPageBlocks.length > 0) {
      const finalSectPr = bodyContent.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>(?:\s*<\/w:body>)?$/i);
      let topDxa = 3544;
      let leftDxa = 993;
      let rightDxa = 851;
      let bottomDxa = 567;
      if (finalSectPr) {
        const tM = finalSectPr[0].match(/w:top="(\d+)"/i);
        const lM = finalSectPr[0].match(/w:left="(\d+)"/i);
        const rM = finalSectPr[0].match(/w:right="(\d+)"/i);
        const bM = finalSectPr[0].match(/w:bottom="(\d+)"/i);
        if (tM && tM[1]) topDxa = parseInt(tM[1], 10);
        if (lM && lM[1]) leftDxa = parseInt(lM[1], 10);
        if (rM && rM[1]) rightDxa = parseInt(rM[1], 10);
        if (bM && bM[1]) bottomDxa = parseInt(bM[1], 10);
      }

      // Filter out trailing empty page if it contains no meaningful text or content
      const rawText = currentPageBlocks
        .join("")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, "")
        .trim();
      const hasImages = currentPageBlocks.join("").includes("<img");

      if (rawText.length > 20 || (hasImages && rawText.length > 5)) {
        pages.push({
          blocks: currentPageBlocks,
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
