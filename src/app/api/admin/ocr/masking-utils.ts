import type { Session } from "next-auth";

export function isAuthorizedOcrAdmin(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const secondaryRoles = (session.user.secondaryRoles || []) as string[];
  return (
    role === "super_admin" ||
    role === "admin_operasional" ||
    secondaryRoles.includes("super_admin") ||
    secondaryRoles.includes("admin_operasional")
  );
}

export function isSuperAdminUser(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const secondaryRoles = (session.user.secondaryRoles || []) as string[];
  return role === "super_admin" || secondaryRoles.includes("super_admin");
}

export function maskOcrApiKey(apiKey?: string | null): string {
  if (!apiKey) return "••••";
  if (apiKey.length <= 4) return "••••" + apiKey;
  return "••••" + apiKey.slice(-4);
}

export function maskProviderRecord<T extends { apiKey?: string; [key: string]: any }>(provider: T | null | undefined) {
  if (!provider) return provider;
  const { apiKey, ...rest } = provider;
  return {
    ...rest,
    apiKeyMasked: maskOcrApiKey(apiKey),
  };
}
