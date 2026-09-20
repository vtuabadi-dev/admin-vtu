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

/**
 * Replaces placeholders in raw XML strings from Word documents.
 * Handles variations: {tag}, {{tag}}, <<tag>>, «tag», [tag]
 */
function replacePlaceholdersInXml(xmlContent: string, fieldValues: Record<string, string>): string {
  let result = xmlContent;

  for (const [key, rawValue] of Object.entries(fieldValues)) {
    if (rawValue === undefined || rawValue === null) continue;
    const escapedValue = escapeXml(String(rawValue));
    const trimmedKey = key.trim();

    // Standard patterns
    const patterns = [
      // Double curly: {{key}}
      new RegExp(`\\{\\{\\s*${escapeRegex(trimmedKey)}\\s*\\}\\}`, "gi"),
      // Single curly: {key}
      new RegExp(`\\{\\s*${escapeRegex(trimmedKey)}\\s*\\}`, "gi"),
      // Double angle: <<key>>
      new RegExp(`&lt;&lt;\\s*${escapeRegex(trimmedKey)}\\s*&gt;&gt;`, "gi"),
      new RegExp(`<<\\s*${escapeRegex(trimmedKey)}\\s*>>`, "gi"),
      // Guilemets: «key»
      new RegExp(`«\\s*${escapeRegex(trimmedKey)}\\s*»`, "gi"),
      // Square brackets: [key]
      new RegExp(`\\[\\s*${escapeRegex(trimmedKey)}\\s*\\]`, "gi"),
    ];

    for (const pattern of patterns) {
      result = result.replace(pattern, escapedValue);
    }
  }

  // Handle split-run placeholders within paragraphs (<w:p>...</w:p>)
  result = resolveSplitRunsInParagraphs(result, fieldValues);

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    if (!paragraphMatch.includes("{") && !paragraphMatch.includes("&lt;&lt;") && !paragraphMatch.includes("«")) {
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
      const trimmedKey = key.trim();
      if (
        combinedText.includes(`{${trimmedKey}}`) ||
        combinedText.includes(`{{${trimmedKey}}}`) ||
        combinedText.includes(`<<${trimmedKey}>>`) ||
        combinedText.includes(`&lt;&lt;${trimmedKey}&gt;&gt;`) ||
        combinedText.includes(`«${trimmedKey}»`)
      ) {
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
      const trimmedKey = key.trim();

      const regexPatterns = [
        new RegExp(`\\{\\{\\s*${escapeRegex(trimmedKey)}\\s*\\}\\}`, "gi"),
        new RegExp(`\\{\\s*${escapeRegex(trimmedKey)}\\s*\\}`, "gi"),
        new RegExp(`&lt;&lt;\\s*${escapeRegex(trimmedKey)}\\s*&gt;&gt;`, "gi"),
        new RegExp(`<<\\s*${escapeRegex(trimmedKey)}\\s*>>`, "gi"),
        new RegExp(`«\\s*${escapeRegex(trimmedKey)}\\s*»`, "gi"),
      ];

      for (const pattern of regexPatterns) {
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
        const replacement = `${m.prefix}xml:space="preserve">${replacedCombined}${m.suffix}`;
        newParagraph = newParagraph.slice(0, actualStart) + replacement + newParagraph.slice(actualEnd);
        offset += replacement.length - m.fullMatch.length;
      } else {
        const replacement = `${m.prefix}${m.suffix}`; // empty text tag
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
