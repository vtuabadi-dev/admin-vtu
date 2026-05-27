import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health", "/_next"];

// API routes accessible to jamaah (own data + notifications + uploads)
const JAMAAH_API_PREFIXES = [
  "/api/notifications",
  "/api/jamaah",
  "/api/dokumen/upload",
  "/api/notifications",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isJamaahAllowedApi(pathname: string): boolean {
  return JAMAAH_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public paths and static assets
  if (isPublic(pathname) || pathname.match(/\.(ico|png|svg|jpg|jpeg)$/)) {
    return NextResponse.next();
  }

  // Unauthenticated → redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  // Jamaah role cannot access admin page routes
  if (pathname.startsWith("/admin") && role === "jamaah") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
  }

  // Jamaah role cannot access API routes except allowed ones
  if (pathname.startsWith("/api/") && role === "jamaah" && !isJamaahAllowedApi(pathname)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
