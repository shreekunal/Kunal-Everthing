import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, TOKEN_COOKIE_NAME } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets, SVGs, images, and internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/.well-known/") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/BrandLogo.png" ||
    pathname === "/BrandLogo.svg" ||
    pathname === "/male-avatar.png" ||
    pathname === "/female-avatar.png" ||
    pathname.startsWith("/icons/") ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    const session = await verifySessionToken(token);
    isAuthenticated = !!session?.userId;
  }

  // 2. If authenticated and on login page, redirect to home
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. If unauthenticated and on protected page or API
  if (!isAuthenticated) {
    // Return 401 for API requests
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Vault locked." },
        { status: 401 }
      );
    }

    // Redirect to login page for browser navigation
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
