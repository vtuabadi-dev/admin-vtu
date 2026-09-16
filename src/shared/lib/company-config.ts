/**
 * Shared Company & Travel Profile Configuration
 * Single source of truth for company legal entity, brand, licenses, and office details.
 */

export interface CompanyProfile {
  companyName: string; // e.g. "PT. VAUZA TAMMA ABADI"
  companyBrand: string; // e.g. "VTU ABADI Travel"
  companyLicense: string; // e.g. "Izin PPIU Kemenag RI No. U.400 Tahun 2021" / "No. 805 Tahun 2019"
  companyAddress: string; // e.g. "Ruko Gateway Blok C-12, Waru, Sidoarjo - Jawa Timur"
  companyPhone: string; // e.g. "(031) 854-4455"
  companyEmail: string; // e.g. "info@vauzatamma.co.id"
  companyWebsite: string; // e.g. "https://vtuabadi.com"
  companyDirector: string; // e.g. "H. FAISAL WAHYUDI"
  companyDirectorTitle: string; // e.g. "Direktur Utama"
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: "PT. VAUZA TAMMA ABADI",
  companyBrand: "VTU ABADI Travel",
  companyLicense: "Penyelenggara Perjalanan Ibadah Umroh (PPIU) Resmi Kemenag RI No. U.400 Tahun 2021",
  companyAddress: "Ruko Gateway Blok C-12, Waru, Sidoarjo - Jawa Timur",
  companyPhone: "(031) 854-4455",
  companyEmail: "info@vauzatamma.co.id",
  companyWebsite: "https://vtuabadi.com",
  companyDirector: "H. FAISAL WAHYUDI",
  companyDirectorTitle: "Direktur Utama",
};

export const COMPANY_STORAGE_KEY = "vtu_company_config";

/**
 * Returns current company profile from localStorage with fallback to default.
 */
export function getCompanyProfile(): CompanyProfile {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_COMPANY_PROFILE,
          ...parsed,
          // Ensure company name is never empty or wrong default
          companyName: parsed.companyName || DEFAULT_COMPANY_PROFILE.companyName,
        };
      }
    } catch (e) {
      console.warn("Failed to load company profile from localStorage", e);
    }
  }
  return DEFAULT_COMPANY_PROFILE;
}

/**
 * Saves company profile updates to localStorage and broadcasts update event.
 */
export function saveCompanyProfile(profile: Partial<CompanyProfile>): CompanyProfile {
  const current = getCompanyProfile();
  const updated: CompanyProfile = {
    ...current,
    ...profile,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("vtu_company_updated", { detail: updated }));
    } catch (e) {
      console.warn("Failed to save company profile to localStorage", e);
    }
  }
  return updated;
}
