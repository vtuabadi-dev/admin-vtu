/**
 * Pure billing and package-inclusion helpers shared between Manifest Pembayaran
 * calculations and unit regression tests.
 */

export interface PackageInclusionResult {
  matchedVariant: any;
  pkgIncludesThoif: boolean;
  pkgIncludesKereta: boolean;
  shouldChargeDefaultThoif: boolean;
  shouldChargeDefaultKereta: boolean;
}

export function resolvePackageInclusionFlags(params: {
  activePackage: any;
  group?: any;
  jamaah?: any;
}): PackageInclusionResult {
  const { activePackage, group, jamaah } = params;
  const hotelOpts: any[] = Array.isArray(activePackage?.hotelOptions)
    ? activePackage.hotelOptions
    : [];

  const rawGroupCluster = `${group?.hotelUpgrade || ""} ${group?.cluster || ""}`
    .trim()
    .toLowerCase();
  const rawMemberCluster = `${rawGroupCluster} ${jamaah?.hotelUpgrade || ""} ${jamaah?.cluster || ""}`
    .trim()
    .toLowerCase();

  const matchedVariant = hotelOpts.find(
    (o: any) =>
      rawMemberCluster &&
      ((o.clusterName && o.clusterName.toLowerCase() === rawMemberCluster) ||
        (o.variantName && o.variantName.toLowerCase() === rawMemberCluster) ||
        (o.variantName && rawMemberCluster.includes(o.variantName.toLowerCase())))
  );

  const pkgIncludesThoif =
    matchedVariant?.isAdaThoif !== undefined || matchedVariant?.thoif !== undefined
      ? Boolean(
          matchedVariant.isAdaThoif === "ya" ||
            matchedVariant.isAdaThoif === true ||
            matchedVariant.thoif === "INCLUDE"
        )
      : Boolean(
          (Array.isArray(activePackage?.include) &&
            activePackage.include.some((inc: string) => /th[ao]'?if|ta'?if|toif/i.test(inc))) ||
            activePackage?.isAdaThoif === "ya" ||
            /th[ao]'?if|ta'?if|toif/i.test(activePackage?.namaPaket || "") ||
            /th[ao]'?if|ta'?if|toif/i.test(activePackage?.kode || "") ||
            /JED\.TH/i.test(activePackage?.kode || "")
        );

  const pkgIncludesKereta =
    matchedVariant?.isAdaKeretaCepat !== undefined || matchedVariant?.keretaCepat !== undefined
      ? Boolean(
          matchedVariant.isAdaKeretaCepat === "ya" ||
            matchedVariant.isAdaKeretaCepat === true ||
            matchedVariant.keretaCepat === "INCLUDE"
        )
      : Boolean(
          (Array.isArray(activePackage?.include) &&
            activePackage.include.some((inc: string) => /kereta|fast train|haramain/i.test(inc))) ||
            activePackage?.isAdaKeretaCepat === "ya" ||
            /kereta|fast train|haramain/i.test(activePackage?.namaPaket || "") ||
            /kereta|fast train|haramain/i.test(activePackage?.kode || "")
        );

  const hasThoifFlag = Boolean(group?.isCityTourThoif || jamaah?.isCityTourThoif);
  const hasKeretaFlag = Boolean(group?.isKeretaCepat || jamaah?.isKeretaCepat);

  return {
    matchedVariant,
    pkgIncludesThoif,
    pkgIncludesKereta,
    shouldChargeDefaultThoif: !pkgIncludesThoif && hasThoifFlag,
    shouldChargeDefaultKereta: !pkgIncludesKereta && hasKeretaFlag,
  };
}

