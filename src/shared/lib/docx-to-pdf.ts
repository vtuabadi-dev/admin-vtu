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
      // Image in drawing
      const blipMatch = rawElem.match(/<a:blip\b[^>]*r:embed="([^"]+)"/i);
      const rId = blipMatch ? blipMatch[1] : null;
      if (rId && mediaMap[rId]) {
        innerHtml += `<img src="${mediaMap[rId]}" style="max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" />`;
      }
      continue;
    }

    // Run <w:r>
    const rPrMatch = rawElem.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i);
    const rStyles = rPrMatch ? parseRunStyles(rPrMatch[0]) : "";

    // Check for drawing inside run
    const insideDrawingMatch = rawElem.match(/<a:blip\b[^>]*r:embed="([^"]+)"/i) || rawElem.match(/<v:imagedata\b[^>]*r:id="([^"]+)"/i);
    if (insideDrawingMatch && insideDrawingMatch[1]) {
      const rId = insideDrawingMatch[1];
      if (mediaMap[rId]) {
        innerHtml += `<img src="${mediaMap[rId]}" style="max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" />`;
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
 * Converts a merged DOCX document into a clean, printable HTML string with A4 dimensions.
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

  let fullHtml = "";

  // 1. Process header XMLs (kop surat, logos)
  const headerFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/header") && f.endsWith(".xml"));
  headerFiles.sort();

  for (const hPath of headerFiles) {
    const hFile = zip.file(hPath);
    if (!hFile) continue;
    const hXml = await hFile.async("string");

    // Extract drawings or paragraphs from header
    const pMatches = hXml.match(/<w:p\b[\s\S]*?<\/w:p>/gi) || [];
    for (const pXml of pMatches) {
      fullHtml += parseParagraphXmlToHtml(pXml, mediaMap);
    }
  }

  // 2. Process document body
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const docXml = await docFile.async("string");

    // Match top-level paragraphs and tables in order of appearance
    const bodyMatch = docXml.match(/<w:body\b[\s\S]*?<\/w:body>/i);
    const bodyContent = bodyMatch ? bodyMatch[0] : docXml;

    const blockRegex = /<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/gi;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockRegex.exec(bodyContent)) !== null) {
      const rawBlock = blockMatch[0];
      if (rawBlock.startsWith("<w:tbl")) {
        fullHtml += parseTableXmlToHtml(rawBlock, mediaMap);
      } else {
        fullHtml += parseParagraphXmlToHtml(rawBlock, mediaMap);
      }
    }
  }

  return `
    <div class="docx-a4-container" style="
      width: 794px;
      min-height: 1123px;
      padding: 38px 48px;
      box-sizing: border-box;
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'Times New Roman', 'Cambria', Georgia, serif;
      font-size: 11.5pt;
      line-height: 1.35;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    ">
      ${fullHtml}
    </div>
  `;
}

/**
 * Merges field values into DOCX template and downloads it directly as an accurate PDF file.
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
    const targetElement = (container.firstElementChild as HTMLElement) || container;

    // Wait for images to load
    const images = Array.from(targetElement.querySelectorAll("img"));
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

    // Rasterize high-resolution canvas (scale: 2 = 300dpi equivalent)
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdfWidth = 210; // A4 mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight <= 297) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page slicing if letter exceeds 1 page
      let remainingHeight = pdfHeight;
      let yOffset = 0;

      while (remainingHeight > 0) {
        if (yOffset > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += 297;
        remainingHeight -= 297;
      }
    }

    const cleanName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(cleanName);
  } finally {
    document.body.removeChild(container);
  }
}
