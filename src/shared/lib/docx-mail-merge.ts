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
  const result: Record<string, string> = {};

  // 1. Filter out internal keys and populate initial fields with quote variations
  for (const [key, val] of Object.entries(fieldValues)) {
    if (val === undefined || val === null) continue;
    if (key.startsWith("_raw") || key === "_rawNamaJamaah" || key.toLowerCase() === "_rawnamajamaah") continue;
    const strVal = String(val).trim() === "" ? "-" : String(val);
    result[key] = strVal;

    // Quote variations
    const curlyKey = key.replace(/'/g, "’");
    const straightKey = key.replace(/[’‘]/g, "'");
    result[curlyKey] = strVal;
    result[straightKey] = strVal;
  }

  const isValValid = (v: any): boolean => typeof v === "string" && v.trim() !== "" && v.trim() !== "-";

  // 2. Canonical Person Name Resolution (SSOT Enforced)
  // Prioritize specific user-verified keys from form over generic aliases
  const canonicalName =
    (isValValid(fieldValues["Nama Jama’ah"]) && fieldValues["Nama Jama’ah"]) ||
    (isValValid(fieldValues["Nama Jama'ah"]) && fieldValues["Nama Jama'ah"]) ||
    (isValValid(fieldValues["nama_jama’ah"]) && fieldValues["nama_jama’ah"]) ||
    (isValValid(fieldValues["nama_jama'ah"]) && fieldValues["nama_jama'ah"]) ||
    (isValValid(fieldValues["Nama Lengkap"]) && fieldValues["Nama Lengkap"]) ||
    (isValValid(fieldValues["nama_lengkap"]) && fieldValues["nama_lengkap"]) ||
    (isValValid(fieldValues["Nama Pemohon"]) && fieldValues["Nama Pemohon"]) ||
    (isValValid(fieldValues["namapemohon"]) && fieldValues["namapemohon"]) ||
    (isValValid(fieldValues["nama_pemohon"]) && fieldValues["nama_pemohon"]) ||
    (isValValid(fieldValues["Nama Yang Cuti"]) && fieldValues["Nama Yang Cuti"]) ||
    (isValValid(fieldValues["nama_yang_cuti"]) && fieldValues["nama_yang_cuti"]) ||
    (isValValid(fieldValues["Nama Peserta"]) && fieldValues["Nama Peserta"]) ||
    (isValValid(fieldValues["nama_peserta"]) && fieldValues["nama_peserta"]) ||
    (isValValid(fieldValues["Nama Karyawan"]) && fieldValues["Nama Karyawan"]) ||
    (isValValid(fieldValues["nama_karyawan"]) && fieldValues["nama_karyawan"]) ||
    (isValValid(fieldValues["Nama Pegawai"]) && fieldValues["Nama Pegawai"]) ||
    (isValValid(fieldValues["nama_pegawai"]) && fieldValues["nama_pegawai"]) ||
    (isValValid(fieldValues["Nama Jamaah"]) && fieldValues["Nama Jamaah"]) ||
    (isValValid(fieldValues["nama_jamaah"]) && fieldValues["nama_jamaah"]) ||
    (isValValid(fieldValues["Nama"]) && fieldValues["Nama"]) ||
    (isValValid(fieldValues["nama"]) && fieldValues["nama"]);

  if (canonicalName) {
    const finalName = String(canonicalName).trim();
    const nameAliases = [
      "Nama", "nama", "Nama Lengkap", "nama_lengkap", "namalengkap", "Nama Jamaah", "nama_jamaah", "namajamaah",
      "Nama Jama'ah", "nama_jama'ah", "Nama Jama’ah", "nama_jama’ah",
      "Nama Pemohon", "nama_pemohon", "namapemohon",
      "Nama Peserta", "nama_peserta", "namapeserta",
      "Nama Yang Cuti", "nama_yang_cuti", "namayangcuti",
      "Nama Yang Bersangkutan", "nama_yang_bersangkutan", "namayangbersangkutan",
      "Nama Karyawan", "nama_karyawan", "namakaryawan",
      "Nama Pegawai", "nama_pegawai", "namapegawai"
    ];
    nameAliases.forEach((alias) => {
      result[alias] = finalName;
      result[alias.replace(/'/g, "’")] = finalName;
      result[alias.replace(/[’‘]/g, "'")] = finalName;
    });
  }

  // 3. Canonical Tanggal Lahir Resolution
  const canonicalTglLahir =
    (isValValid(fieldValues["Tanggal Lahir"]) && fieldValues["Tanggal Lahir"]) ||
    (isValValid(fieldValues["Ta nggal Lahir"]) && fieldValues["Ta nggal Lahir"]) ||
    (isValValid(fieldValues["tanggal_lahir"]) && fieldValues["tanggal_lahir"]) ||
    (isValValid(fieldValues["tanggallahir"]) && fieldValues["tanggallahir"]) ||
    (isValValid(fieldValues["Tgl Lahir"]) && fieldValues["Tgl Lahir"]) ||
    (isValValid(fieldValues["tgl_lahir"]) && fieldValues["tgl_lahir"]);

  if (canonicalTglLahir) {
    const finalTgl = String(canonicalTglLahir).trim();
    result["Tanggal Lahir"] = finalTgl;
    result["Ta nggal Lahir"] = finalTgl;
    result["ta nggal lahir"] = finalTgl;
    result["tanggal_lahir"] = finalTgl;
    result["tanggallahir"] = finalTgl;
    result["Tgl Lahir"] = finalTgl;
    result["tgl_lahir"] = finalTgl;
  }

  // 4. Canonical Tempat Lahir Resolution
  const canonicalTempatLahir =
    (isValValid(fieldValues["Tempat Lahir"]) && fieldValues["Tempat Lahir"]) ||
    (isValValid(fieldValues["tempat_lahir"]) && fieldValues["tempat_lahir"]) ||
    (isValValid(fieldValues["tempatlahir"]) && fieldValues["tempatlahir"]) ||
    (isValValid(fieldValues["kota_lahir"]) && fieldValues["kota_lahir"]) ||
    (isValValid(fieldValues["kotalahir"]) && fieldValues["kotalahir"]);

  if (canonicalTempatLahir) {
    const finalTempat = String(canonicalTempatLahir).trim();
    result["Tempat Lahir"] = finalTempat;
    result["tempat_lahir"] = finalTempat;
    result["tempatlahir"] = finalTempat;
    result["kota_lahir"] = finalTempat;
    result["kotalahir"] = finalTempat;
  }

  // 5. Canonical NIK / No Identitas Resolution
  const canonicalNik =
    (isValValid(fieldValues["NIK"]) && fieldValues["NIK"]) ||
    (isValValid(fieldValues["nik"]) && fieldValues["nik"]) ||
    (isValValid(fieldValues["No Identitas"]) && fieldValues["No Identitas"]) ||
    (isValValid(fieldValues["no_identitas"]) && fieldValues["no_identitas"]) ||
    (isValValid(fieldValues["Nomor Identitas"]) && fieldValues["Nomor Identitas"]) ||
    (isValValid(fieldValues["nomor_identitas"]) && fieldValues["nomor_identitas"]) ||
    (isValValid(fieldValues["No KTP"]) && fieldValues["No KTP"]) ||
    (isValValid(fieldValues["no_ktp"]) && fieldValues["no_ktp"]) ||
    (isValValid(fieldValues["noktp"]) && fieldValues["noktp"]);

  if (canonicalNik) {
    const finalNik = String(canonicalNik).trim();
    result["NIK"] = finalNik;
    result["nik"] = finalNik;
    result["No Identitas"] = finalNik;
    result["no_identitas"] = finalNik;
    result["Nomor Identitas"] = finalNik;
    result["nomor_identitas"] = finalNik;
    result["No KTP"] = finalNik;
    result["no_ktp"] = finalNik;
  }

  // 6. Canonical Alamat Resolution
  const canonicalAlamat =
    (isValValid(fieldValues["Alamat"]) && fieldValues["Alamat"]) ||
    (isValValid(fieldValues["alamat"]) && fieldValues["alamat"]) ||
    (isValValid(fieldValues["Alamat Lengkap"]) && fieldValues["Alamat Lengkap"]) ||
    (isValValid(fieldValues["alamat_lengkap"]) && fieldValues["alamat_lengkap"]);

  if (canonicalAlamat) {
    const finalAlamat = String(canonicalAlamat).trim();
    result["Alamat"] = finalAlamat;
    result["alamat"] = finalAlamat;
    result["Alamat Lengkap"] = finalAlamat;
    result["alamat_lengkap"] = finalAlamat;
  }

  // 7. Canonical Paspor Resolution
  const canonicalPaspor =
    (isValValid(fieldValues["Nomor Paspor"]) && fieldValues["Nomor Paspor"]) ||
    (isValValid(fieldValues["nomor_paspor"]) && fieldValues["nomor_paspor"]) ||
    (isValValid(fieldValues["No Paspor"]) && fieldValues["No Paspor"]) ||
    (isValValid(fieldValues["no_paspor"]) && fieldValues["no_paspor"]) ||
    (isValValid(fieldValues["Paspor"]) && fieldValues["Paspor"]) ||
    (isValValid(fieldValues["paspor"]) && fieldValues["paspor"]);

  if (canonicalPaspor) {
    const finalPaspor = String(canonicalPaspor).trim();
    result["Nomor Paspor"] = finalPaspor;
    result["nomor_paspor"] = finalPaspor;
    result["No Paspor"] = finalPaspor;
    result["no_paspor"] = finalPaspor;
    result["Paspor"] = finalPaspor;
    result["paspor"] = finalPaspor;
  }

  // 8. Canonical Nama Ayah Resolution
  const canonicalAyah =
    (isValValid(fieldValues["Nama Ayah"]) && fieldValues["Nama Ayah"]) ||
    (isValValid(fieldValues["nama_ayah"]) && fieldValues["nama_ayah"]) ||
    (isValValid(fieldValues["namaAyah"]) && fieldValues["namaAyah"]) ||
    (isValValid(fieldValues["ayah"]) && fieldValues["ayah"]) ||
    (isValValid(fieldValues["nama_ayah_kandung"]) && fieldValues["nama_ayah_kandung"]);

  if (canonicalAyah) {
    const finalAyah = String(canonicalAyah).trim();
    result["Nama Ayah"] = finalAyah;
    result["nama_ayah"] = finalAyah;
    result["namaAyah"] = finalAyah;
    result["ayah"] = finalAyah;
    result["nama_ayah_kandung"] = finalAyah;
  }

  // 9. Standard other field expansions
  for (const [key, val] of Object.entries(fieldValues)) {
    if (val === undefined || val === null) continue;
    if (key.startsWith("_raw")) continue;
    const strVal = String(val).trim() === "" ? "-" : String(val);

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

    if (key.toLowerCase().includes("telepon") || key.toLowerCase().includes("nohp") || key.toLowerCase().includes("no_hp") || key.toLowerCase().includes("phone")) {
      result["Nomor Telepon"] = strVal;
      result["nomor_telepon"] = strVal;
      result["No HP"] = strVal;
      result["no_hp"] = strVal;
      result["Telepon"] = strVal;
      result["telepon"] = strVal;
    }

    if (key.toLowerCase().includes("jenis kelamin") || key.toLowerCase() === "jenis_kelamin" || key.toLowerCase() === "gender") {
      result["Jenis Kelamin"] = strVal;
      result["jenis_kelamin"] = strVal;
    }

    if (key.toLowerCase().includes("nama paket") || key.toLowerCase() === "nama_paket" || key.toLowerCase() === "paket") {
      result["Nama Paket"] = strVal;
      result["nama_paket"] = strVal;
      result["Paket"] = strVal;
      result["paket"] = strVal;
    }

    if (key.toLowerCase().includes("tanggal berangkat") || key.toLowerCase() === "tanggal_berangkat") {
      result["Tanggal Berangkat"] = strVal;
      result["tanggal_berangkat"] = strVal;
    }
    if (key.toLowerCase().includes("tanggal pulang") || key.toLowerCase() === "tanggal_pulang" || key.toLowerCase().includes("tanggal kembali")) {
      result["Tanggal Pulang"] = strVal;
      result["tanggal_pulang"] = strVal;
      result["Tanggal Kembali"] = strVal;
      result["tanggal_kembali"] = strVal;
    }

    if (key.toLowerCase() === "hal" || key.toLowerCase() === "perihal") {
      result["Hal"] = strVal;
      result["Perihal"] = strVal;
    }

    if (
      (key.toLowerCase().includes("kanim") || key.toLowerCase().includes("kantor imigrasi") || key.toLowerCase().includes("kantor_imigrasi")) &&
      !key.toLowerCase().includes("kota")
    ) {
      result["Kantor Imigrasi"] = strVal;
      result["kantor_imigrasi"] = strVal;
      result["Kanim"] = strVal;
      result["kanim"] = strVal;
    }

    if (
      key.toLowerCase().includes("kota kanim") ||
      key.toLowerCase().includes("kota_kanim") ||
      key.toLowerCase().includes("kota kantor imigrasi") ||
      key.toLowerCase().includes("kota_kantor_imigrasi") ||
      key.toLowerCase().includes("kotakanim") ||
      key.toLowerCase().includes("kotakantorimigrasi")
    ) {
      result["Kota Kantor Imigrasi"] = strVal;
      result["Kota Kanim"] = strVal;
      result["Kota Imigrasi"] = strVal;
      result["kota_kantor_imigrasi"] = strVal;
      result["kota_kanim"] = strVal;
    }
  }

  // Ensure internal raw keys are purged completely from output
  delete (result as any)["_rawNamaJamaah"];
  delete (result as any)["_rawnamajamaah"];

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
 * This function detects split tags inside <w:p> paragraphs and replaces only the matched character spans,
 * strictly preserving preceding and following runs (such as labels, tab stops <w:tab/>, and colons).
 */
function resolveSplitRunsInParagraphs(xmlContent: string, fieldValues: Record<string, string>): string {
  // Regex to match paragraph content: <w:p ...>...</w:p>
  return xmlContent.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, (paragraphMatch) => {
    // Check if paragraph contains opening bracket or curly
    if (
      !paragraphMatch.includes("{") &&
      !paragraphMatch.includes("&lt;&lt;") &&
      !paragraphMatch.includes("«") &&
      !paragraphMatch.includes("[")
    ) {
      return paragraphMatch;
    }

    // Extract all text nodes <w:t ...>text</w:t>
    const textNodeRegex = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    const matches: {
      fullMatch: string;
      prefix: string;
      text: string;
      suffix: string;
      start: number;
      end: number;
    }[] = [];
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

    // Track segments and their current text
    const segs: { text: string }[] = matches.map((m) => ({ text: m.text }));

    // Find all placeholder replacements to apply across segments
    for (const [key, rawValue] of Object.entries(fieldValues)) {
      if (rawValue === undefined || rawValue === null) continue;
      const escapedValue = escapeXml(String(rawValue));
      const patterns = buildRegexPatternsForKey(key);

      for (const pattern of patterns) {
        let combined = "";
        const boundaries: { segIdx: number; startInCombined: number; endInCombined: number }[] = [];
        let currOffset = 0;
        for (let i = 0; i < segs.length; i++) {
          const segText = segs[i]!.text;
          const start = currOffset;
          const end = currOffset + segText.length;
          boundaries.push({ segIdx: i, startInCombined: start, endInCombined: end });
          combined += segText;
          currOffset = end;
        }

        // Collect all occurrences for this pattern
        const occurrences: { matchStart: number; matchEnd: number }[] = [];
        let pMatch: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((pMatch = pattern.exec(combined)) !== null) {
          occurrences.push({
            matchStart: pMatch.index,
            matchEnd: pMatch.index + pMatch[0].length,
          });
          if (!pattern.global) break;
        }

        // Apply occurrences in reverse order so character offsets in earlier parts of combined don't shift
        for (let oIdx = occurrences.length - 1; oIdx >= 0; oIdx--) {
          const occ = occurrences[oIdx]!;
          const mStart = occ.matchStart;
          const mEnd = occ.matchEnd;

          let firstSeg = -1;
          let lastSeg = -1;

          for (const b of boundaries) {
            if (mStart < b.endInCombined && mEnd > b.startInCombined) {
              if (firstSeg === -1) firstSeg = b.segIdx;
              lastSeg = b.segIdx;
            }
          }

          if (firstSeg !== -1 && lastSeg !== -1) {
            if (firstSeg === lastSeg) {
              // Entire placeholder is within a single segment
              const b = boundaries[firstSeg]!;
              const relStart = mStart - b.startInCombined;
              const relEnd = mEnd - b.startInCombined;
              const orig = segs[firstSeg]!.text;
              segs[firstSeg]!.text = orig.slice(0, relStart) + escapedValue + orig.slice(relEnd);
            } else {
              // Placeholder spans multiple segments (split run)
              const bFirst = boundaries[firstSeg]!;
              const bLast = boundaries[lastSeg]!;

              const relStart = mStart - bFirst.startInCombined;
              const relEnd = mEnd - bLast.startInCombined;

              // Put replacement in first segment
              segs[firstSeg]!.text = segs[firstSeg]!.text.slice(0, relStart) + escapedValue;

              // Clear middle segments that fall completely inside the placeholder
              for (let mid = firstSeg + 1; mid < lastSeg; mid++) {
                segs[mid]!.text = "";
              }

              // Remove matching prefix from last segment
              segs[lastSeg]!.text = segs[lastSeg]!.text.slice(relEnd);
            }
          }
        }
      }
    }

    // Now reconstruct paragraphMatch replacing only modified segments
    let newParagraph = paragraphMatch;
    let offset = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]!;
      const newText = segs[i]!.text;
      if (newText !== m.text) {
        const actualStart = m.start + offset;
        const actualEnd = m.end + offset;
        const preserveAttr = newText.startsWith(" ") || newText.endsWith(" ") ? ' xml:space="preserve"' : "";
        const replacement = `<w:t${preserveAttr}>${newText}</w:t>`;
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
