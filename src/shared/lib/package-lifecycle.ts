/**
 * Package Lifecycle & Catalog Eligibility Module
 * Standardized per ADR-0031:
 * 1. Archived package: tanggalPulang has passed (< today 00:00:00) or status is completed.
 * 2. In-Progress package: tanggalBerangkat <= today <= tanggalPulang.
 * 3. Upcoming package: tanggalBerangkat > today.
 * 4. Catalog Eligibility (3 Strict Requirements):
 *    - Upcoming package (belum berangkat)
 *    - Seat not full (belum penuh seatnya)
 *    - Catalog switch is ON (saklar penampilan di katalog aktif)
 */

export interface PackageLifecycleDates {
  tanggalBerangkat?: string | Date | null;
  tanggalPulang?: string | Date | null;
  status?: string | null;
  terisi?: number | null;
  kuota?: number | null;
  maxSeat?: number | null;
  isPublishedKatalog?: boolean | null;
  driveFolderIds?: any;
}

/**
 * Normalizes any Date or ISO string into a local Date with time set to 00:00:00
 */
function toMidnightDate(input: string | Date): Date {
  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Gets start of today at 00:00:00 local time.
 */
export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Memeriksa apakah agenda perjalanan paket sudah selesai (masuk Paket Arsip).
 * Telah lewatnya sebuah paket dihitung dari kepulangan sebuah paket (tanggalPulang < hari ini).
 */
export function isPackageArchived(pkg: PackageLifecycleDates): boolean {
  if (!pkg) return false;
  const statusLower = (pkg.status || "").toLowerCase().trim();
  if (statusLower === "completed" || statusLower === "selesai") {
    return true;
  }

  // Jika tanggalPulang tersedia, periksa apakah kepulangan sudah terlewat
  if (pkg.tanggalPulang) {
    const returnDate = new Date(pkg.tanggalPulang);
    if (!isNaN(returnDate.getTime())) {
      const returnMidnight = toMidnightDate(returnDate);
      const today = getStartOfToday();
      return returnMidnight.getTime() < today.getTime();
    }
  }

  // Fallback jika tanggalPulang tidak terisi tetapi tanggalBerangkat terisi
  if (pkg.tanggalBerangkat) {
    const depDate = new Date(pkg.tanggalBerangkat);
    if (!isNaN(depDate.getTime())) {
      const depMidnight = toMidnightDate(depDate);
      const today = getStartOfToday();
      // Jika status departed dan tanggalBerangkat sudah lewat lebih dari durasi wajar (misal 30 hari), fallback
      if (statusLower === "departed") {
        return depMidnight.getTime() < today.getTime();
      }
    }
  }

  return false;
}

/**
 * Memeriksa apakah paket sedang berjalan (In-Trip / Sedang di Tanah Suci).
 * Jamaah sudah berangkat (tanggalBerangkat <= hari ini) dan belum pulang (tanggalPulang >= hari ini).
 */
export function isPackageInProgress(pkg: PackageLifecycleDates): boolean {
  if (!pkg) return false;
  if (isPackageArchived(pkg)) return false;

  const statusLower = (pkg.status || "").toLowerCase().trim();
  if (statusLower === "departed" || statusLower === "berjalan") {
    return true;
  }

  if (!pkg.tanggalBerangkat) return false;
  const depDate = new Date(pkg.tanggalBerangkat);
  if (isNaN(depDate.getTime())) return false;

  const depMidnight = toMidnightDate(depDate);
  const today = getStartOfToday();

  // Tanggal berangkat sudah tiba atau telah lewat (<= hari ini)
  const hasDeparted = depMidnight.getTime() <= today.getTime();

  // Dan belum lewat kepulangan (karena jika sudah lewat kepulangan, isPackageArchived bernilai true)
  return hasDeparted;
}

/**
 * Memeriksa apakah paket aktif yang belum berangkat (Akan Berangkat / Upcoming).
 * Tanggal keberangkatan masih di masa depan (> hari ini).
 */
export function isPackageUpcoming(pkg: PackageLifecycleDates): boolean {
  if (!pkg) return false;
  if (isPackageArchived(pkg)) return false;
  if (isPackageInProgress(pkg)) return false;

  if (!pkg.tanggalBerangkat) return true; // Belum ditentukan jadwalnya, masih persiapan
  const depDate = new Date(pkg.tanggalBerangkat);
  if (isNaN(depDate.getTime())) return true;

  const depMidnight = toMidnightDate(depDate);
  const today = getStartOfToday();

  return depMidnight.getTime() > today.getTime();
}

/**
 * Memeriksa apakah kuota/seat paket sudah penuh.
 */
export function isPackageSeatFull(pkg: { terisi?: number | null; kuota?: number | null; maxSeat?: number | null }): boolean {
  if (!pkg) return false;
  const max = pkg.maxSeat || pkg.kuota || 0;
  if (max <= 0) return false; // Kuota belum ditentukan / tidak dibatasi
  const filled = pkg.terisi || 0;
  return filled >= max;
}

/**
 * Memeriksa apakah saklar publikasi katalog aktif.
 */
export function isPackageCatalogSwitchOn(pkg: { isPublishedKatalog?: boolean | null; driveFolderIds?: any }): boolean {
  if (!pkg) return false;
  if (pkg.isPublishedKatalog !== undefined && pkg.isPublishedKatalog !== null) {
    return pkg.isPublishedKatalog === true;
  }
  const meta = typeof pkg.driveFolderIds === "object" ? pkg.driveFolderIds : null;
  return meta?.isPublishedKatalog === true;
}

/**
 * TIGA SYARAT MUTLAK TAMPIL DI KATALOG (ADR-0031):
 * 1. Paket Aktif yang BELUM BERANGKAT (Upcoming).
 * 2. Seat BELUM PENUH (terisi < maxSeat/kuota).
 * 3. Saklar penampilan di katalog DIAKTIFKAN.
 *
 * Jika salah satu dari ketiga syarat ini tidak terpenuhi, maka paket TIDAK AKAN TAMPIL di katalog.
 */
export function isEligibleForKatalog(pkg: PackageLifecycleDates): boolean {
  if (!pkg) return false;

  // Syarat 1: Paket aktif yang belum berangkat
  if (!isPackageUpcoming(pkg)) {
    return false;
  }

  // Syarat 2: Belum penuh seatnya
  if (isPackageSeatFull(pkg)) {
    return false;
  }

  // Syarat 3: Saklar penampilan katalog aktif
  if (!isPackageCatalogSwitchOn(pkg)) {
    return false;
  }

  return true;
}

