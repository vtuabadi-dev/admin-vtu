import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";

const PUBLIC_PATHS = ["/login", "/register", "/track", "/reset-password", "/api/auth", "/api/health", "/api/track", "/_next", "/api/register", "/api/keberangkatan"];

// API routes accessible to jamaah (own data + notifications + uploads)
const JAMAAH_API_PREFIXES = [
  "/api/notifications",
  "/api/jamaah",
  "/api/dokumen/upload",
  "/api/reset-password",
];

// SUPER_ADMIN-only routes (internal system infrastructure)
const SUPER_ADMIN_ONLY_PREFIXES = [
  "/admin/audit-log",
  "/api/audit",
  "/admin/kesehatan-sistem",
  "/admin/maintenance",
  "/api/admin/system-health",
  "/api/admin/simulate",
  "/api/admin/backup",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isJamaahAllowedApi(pathname: string): boolean {
  return JAMAAH_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function validateCsrf(req: Request): boolean {
  // Skip CSRF check for non-mutating methods
  if (!STATE_CHANGING_METHODS.includes(req.method)) return true;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host") ?? "";

  // For same-origin requests from the browser, validate origin
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch { /* invalid origin URL */ }
  }

  // If no origin (e.g., server-to-server), check referer
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) return true;
    } catch { /* invalid referer URL */ }
  }

  // Allow if no origin/referer (non-browser clients, API calls)
  if (!origin && !referer) return true;

  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Rate limit auth POST (login) attempts
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const rlKey = rateLimitKey(req);
    const rl = checkRateLimit(rlKey, getRateLimitConfig("auth"));
    if (!rl.allowed) {
      return addSecurityHeaders(
        NextResponse.json({ success: false, message: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } })
      );
    }
  }

  // CSRF validation for state-changing API requests
  if (pathname.startsWith("/api/") && !validateCsrf(req)) {
    return addSecurityHeaders(
      NextResponse.json({ success: false, message: "Invalid origin" }, { status: 403 })
    );
  }

  // Allow public paths and static assets
  if (isPublic(pathname) || pathname.match(/\.(ico|png|svg|jpg|jpeg)$/)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Unauthenticated → redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const role = session.user.role;

  // Enforce mustChangePassword redirect for all roles
  const mustChangePassword = session.user.mustChangePassword as boolean | undefined;
  if (mustChangePassword && !pathname.startsWith("/reset-password") && !pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/reset-password", req.url)));
  }

  // Jamaah role cannot access admin page routes
  if (pathname.startsWith("/admin") && role === "jamaah") {
    return addSecurityHeaders(NextResponse.redirect(new URL("/login?error=unauthorized", req.url)));
  }

  // Jamaah role cannot access API routes except allowed ones
  if (pathname.startsWith("/api/") && role === "jamaah" && !isJamaahAllowedApi(pathname)) {
    return addSecurityHeaders(NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }));
  }

  // SUPER_ADMIN-only routes — block non-super-admin
  const isSuperAdminRoute = SUPER_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isSuperAdminRoute && role !== "super_admin") {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }));
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/admin/dashboard?error=access_denied", req.url)));
  }

  return addSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
