import JSZip from "jszip";

/**
 * Utility to replace placeholders inside a DOCX binary file.
 * Preserves 100% of formatting, margins, headers, footers, tables, fonts, and layout.
 */

// Escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Expands field values with fuzzy variations (quotes, spaces, casing, synonyms)
 */
export function buildExpandedFieldMap(fieldValues: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = { ...fieldValues };

  for (const [key, val] of Object.entries(fieldValues)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val);

    // Quote variations
    const curlyKey = key.replace(/'/g, "’");
    const straightKey = key.replace(/[’‘]/g, "'");
    result[curlyKey] = strVal;
    result[straightKey] = strVal;

    // Word-spaced variations (e.g., "Ta nggal Lahir" vs "Tanggal Lahir")
    if (key.toLowerCase().includes("tanggal lahir") || key.toLowerCase().includes("ta nggal lahir")) {
      result["Tanggal Lahir"] = strVal;
      result["Ta nggal Lahir"] = strVal;
      result["ta nggal lahir"] = strVal;
      result["tanggal_lahir"] = strVal;
    }

    if (key.toLowerCase().includes("nama") && (key.toLowerCase().includes("jamaah") || key.toLowerCase().includes("jama'ah") || key.toLowerCase().includes("jama’ah") || key.toLowerCase().includes("lengkap"))) {
      result["Nama Jama'ah"] = strVal;
      result["Nama Jama’ah"] = strVal;
      result["Nama Jamaah"] = strVal;
      result["nama_lengkap"] = strVal;
      result["nama_jamaah"] = strVal;
    }

    if (key.toLowerCase().includes("tempat lahir")) {
      result["Tempat Lahir"] = strVal;
      result["tempat_lahir"] = strVal;
    }

    if (key.toLowerCase().includes("bulan") && key.toLowerCase().includes("keberangkatan")) {
      result["Bulan Keberangkatan"] = strVal;
      result["bulan_keberangkatan"] = strVal;
    }

    if (key.toLowerCase().includes("tanggal") && (key.toLowerCase().includes("hari") || key.toLowerCase().includes("surat"))) {
      result["Tanggal Hari Ini"] = strVal;
      result["Tanggal Surat"] = strVal;
      result["tanggal_surat"] = strVal;
    }

    if (key.toLowerCase().includes("nomor surat 1") || key.toLowerCase() === "nomorsurat" || key.toLowerCase() === "nomor_surat") {
      result["Nomor Surat 1"] = strVal;
      result["Nomor Surat"] = strVal;
      result["No Surat 1"] = strVal;
      result["No Surat"] = strVal;
    }

    if (key.toLowerCase().includes("nomor surat 2") || key.toLowerCase() === "nomorsurat2" || key.toLowerCase() === "nomor_surat_2") {
      result["Nomor Surat 2"] = strVal;
      result["No Surat 2"] = strVal;
    }

    if (key.toLowerCase() === "hal" || key.toLowerCase() === "perihal") {
      result["Hal"] = strVal;
      result["Perihal"] = strVal;
    }

    if (key.toLowerCase().includes("kanim") && !key.toLowerCase().includes("kota")) {
      result["Kanim"] = strVal;
      result["Kantor Imigrasi"] = strVal;
    }

    if (key.toLowerCase().includes("kota kanim") || key.toLowerCase().includes("kota_kanim")) {
      result["Kota Kanim"] = strVal;
      result["Kota Imigrasi"] = strVal;
    }
  }

  return result;
}

/**
 * Builds regex patterns for a given placeholder key supporting various bracket styles and spacing.
 */
function buildRegexPatternsForKey(key: string): RegExp[] {
  const trimmed = key.trim();
  // Allow optional spaces inside word characters, and match either straight or curly apostrophe
  const flexible = escapeRegex(trimmed)
    .replace(/['\u2018\u2019]/g, "['\\u2018\\u2019]")
    .replace(/\\\s\+/g, "\\s*")
    .replace(/\s+/g, "\\s*");

  return [
    // Double curly: {{key}}
    new RegExp(`\\{\\{\\s*${flexible}\\s*\\}\\}`, "gi"),
    // Single curly: {key}
    new RegExp(`\\{\\s*${flexible}\\s*\\}`, "gi"),
    // Double angle: <<key>> or &lt;&lt;key&gt;&gt;
    new RegExp(`&lt;&lt;\\s*${flexible}\\s*&gt;&gt;`, "gi"),
    new RegExp(`<<\\s*${flexible}\\s*>>`, "gi"),
    // Guilemets: «key»
    new RegExp(`«\\s*${flexible}\\s*»`, "gi"),
    // Square brackets: [key]
    new RegExp(`\\[\\s*${flexible}\\s*\\]`, "gi"),
  ];
}

/**
 * Replaces placeholders in raw XML strings from Word documents.
 */
function replacePlaceholdersInXml(xmlContent: string, fieldValues: Record<string, string>): string {
  const expandedFields = buildExpandedFieldMap(fieldValues);
  let result = xmlContent;

  for (const [key, rawValue] of Object.entries(expandedFields)) {
    if (rawValue === undefined || rawValue === null) continue;
    const escapedValue = escapeXml(String(rawValue));
    const patterns = buildRegexPatternsForKey(key);

    for (const pattern of patterns) {
      result = result.replace(pattern, escapedValue);
    }
  }

  // Handle split-run placeholders within paragraphs (<w:p>...</w:p>)
  result = resolveSplitRunsInParagraphs(result, expandedFields);

  return result;
}

/**
 * In Microsoft Word, a placeholder like "{nama_lengkap}" can be split across multiple
 * <w:r> (run) and <w:t> (text) tags due to spellchecking or revision marks.
 * This function detects split tags inside <w:p> paragraphs and replaces them cleanly.
 */
function resolveSplitRunsInParagraphs(xmlContent: string, fieldValues: Record<string, string>): string {
  // Regex to match paragraph content: <w:p ...>...</w:p>
  return xmlContent.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, (paragraphMatch) => {
    // Check if paragraph contains opening bracket or curly
    if (!paragraphMatch.includes("{") && !paragraphMatch.includes("&lt;&lt;") && !paragraphMatch.includes("«") && !paragraphMatch.includes("[")) {
      return paragraphMatch;
    }

    // Extract all text nodes <w:t ...>text</w:t>
    const textNodeRegex = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    const matches: { fullMatch: string; prefix: string; text: string; suffix: string; start: number; end: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = textNodeRegex.exec(paragraphMatch)) !== null) {
      if (match[0] && match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
        matches.push({
          fullMatch: match[0],
          prefix: match[1],
          text: match[2],
          suffix: match[3],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    if (matches.length <= 1) return paragraphMatch;

    // Build the concatenated paragraph text
    const combinedText = matches.map((m) => m.text).join("");

    // Check if any key exists in combined text
    let hasMatch = false;
    for (const key of Object.keys(fieldValues)) {
      const patterns = buildRegexPatternsForKey(key);
      if (patterns.some((p) => p.test(combinedText))) {
        hasMatch = true;
        break;
      }
    }

    if (!hasMatch) return paragraphMatch;

    // Apply replacements to the combined text
    let replacedCombined = combinedText;
    for (const [key, rawValue] of Object.entries(fieldValues)) {
      if (rawValue === undefined || rawValue === null) continue;
      const escapedValue = escapeXml(String(rawValue));
      const patterns = buildRegexPatternsForKey(key);

      for (const pattern of patterns) {
        replacedCombined = replacedCombined.replace(pattern, escapedValue);
      }
    }

    // Put all replaced text into the first <w:t> and clear the rest
    let newParagraph = paragraphMatch;
    let offset = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (!m) continue;
      const actualStart = m.start + offset;
      const actualEnd = m.end + offset;

      if (i === 0) {
        const replacement = `<w:t xml:space="preserve">${replacedCombined}</w:t>`;
        newParagraph = newParagraph.slice(0, actualStart) + replacement + newParagraph.slice(actualEnd);
        offset += replacement.length - m.fullMatch.length;
      } else {
        const replacement = `<w:t></w:t>`;
        newParagraph = newParagraph.slice(0, actualStart) + replacement + newParagraph.slice(actualEnd);
        offset += replacement.length - m.fullMatch.length;
      }
    }

    return newParagraph;
  });
}

/**
 * Merges placeholder values into a DOCX binary file.
 * Returns the modified DOCX as a Blob.
 *
 * @param docxData Base64 string, Uint8Array, or ArrayBuffer of the source DOCX template
 * @param fieldValues Key-value pairs of resolved placeholders (e.g. { "nama_lengkap": "Ahmad" })
 */
export async function mergeDocxPlaceholders(
  docxData: string | Uint8Array | ArrayBuffer | Blob,
  fieldValues: Record<string, string>
): Promise<Blob> {
  let arrayBuffer: ArrayBuffer;

  if (typeof docxData === "string") {
    // If data URL base64: "data:application/vnd.openxmlformats...;base64,..."
    const base64Clean = (docxData.includes("base64,") ? docxData.split("base64,")[1] : docxData) || "";
    const binaryString = atob(base64Clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
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

  // Load DOCX with JSZip
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find all relevant XML files in word/ directory
  const targetFiles = Object.keys(zip.files).filter(
    (fileName) =>
      fileName.startsWith("word/") &&
      fileName.endsWith(".xml") &&
      !fileName.includes("[Content_Types]") &&
      !fileName.endsWith(".xml.rels")
  );

  for (const filePath of targetFiles) {
    const file = zip.file(filePath);
    if (!file) continue;

    const originalXml = await file.async("string");
    const updatedXml = replacePlaceholdersInXml(originalXml, fieldValues);

    if (updatedXml !== originalXml) {
      zip.file(filePath, updatedXml);
    }
  }

  // Generate output DOCX Blob
  const outputBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return outputBlob;
}

/**
 * Triggers a browser download of the merged DOCX document.
 */
export async function downloadMergedDocx(
  docxData: string | Uint8Array | ArrayBuffer | Blob,
  fieldValues: Record<string, string>,
  fileName: string
): Promise<void> {
  const mergedBlob = await mergeDocxPlaceholders(docxData, fieldValues);
  const url = URL.createObjectURL(mergedBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
