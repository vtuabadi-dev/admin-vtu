export type OperationalFieldType =
  | "name"
  | "nik"
  | "passport"
  | "hotel"
  | "invoice_label"
  | "kode"
  | "text";

export function normalizeOperationalInput(
  value: string,
  fieldType: OperationalFieldType
): string {
  switch (fieldType) {
    case "name":
      return value
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    case "nik":
      return value.replace(/\D/g, "").slice(0, 16);
    case "passport":
      return value.replace(/\s/g, "").toUpperCase().slice(0, 9);
    case "hotel":
      return value
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    case "invoice_label":
      return value.trim().toUpperCase();
    case "kode":
      return value.replace(/\s/g, "").toUpperCase();
    case "text":
    default:
      return value.trim();
  }
}

export function useStandardizedInput(): {
  normalize: (value: string, fieldType: OperationalFieldType) => string;
} {
  return { normalize: normalizeOperationalInput };
}
