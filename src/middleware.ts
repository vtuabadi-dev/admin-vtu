import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health", "/_next"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
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

  // Jamaah role cannot access admin routes
  if (pathname.startsWith("/admin") && session.user.role === "jamaah") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
