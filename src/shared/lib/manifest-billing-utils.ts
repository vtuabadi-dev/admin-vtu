import { resolvePackageBillingConfig } from "@/shared/lib/billing-ssot";

/**
 * Pure billing and package-inclusion helpers shared between Manifest Pembayaran
 * calculations and unit regression tests (ADR-0032).
 */

export interface PackageInclusionResult {
  matchedVariant: any;
  pkgIncludesThoif: boolean;
  pkgIncludesKereta: boolean;
  /** Deprecated under ADR-0032 Rule 2: always false because non-include add-ons require explicit InvoiceItems. */
  shouldChargeDefaultThoif: boolean;
  /** Deprecated under ADR-0032 Rule 2: always false because non-include add-ons require explicit InvoiceItems. */
  shouldChargeDefaultKereta: boolean;
}

export function resolvePackageInclusionFlags(params: {
  activePackage: any;
  group?: any;
  jamaah?: any;
}): PackageInclusionResult {
  const { activePackage, group, jamaah } = params;
  const cfg = resolvePackageBillingConfig({
    activePackage,
    group,
    member: jamaah,
  });

  return {
    matchedVariant: cfg.matchedVariant,
    pkgIncludesThoif: cfg.pkgIncludesThoif,
    pkgIncludesKereta: cfg.pkgIncludesKeretaCepat,
    // ADR-0032 Business Decision 2: Non-include items are NEVER billed without an explicit InvoiceItem
    shouldChargeDefaultThoif: false,
    shouldChargeDefaultKereta: false,
  };
}

