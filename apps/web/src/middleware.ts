import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OWNER_ADMIN_ROUTES = ["/dashboard", "/residents", "/rooms", "/payments", "/complaints", "/iot", "/food", "/settings"];
const TENANT_ROUTES = ["/tenant"];
const STAFF_PORTAL_ROUTES = ["/staff-portal"];
const ALL_AUTHENTICATED = [...OWNER_ADMIN_ROUTES, ...TENANT_ROUTES, ...STAFF_PORTAL_ROUTES];

function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("opsora_token")?.value || null;
}

function getRoleFromRequest(request: NextRequest): string | null {
  return request.cookies.get("opsora_role")?.value || null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getTokenFromRequest(request);
  const role = getRoleFromRequest(request);

  // Allow login page and root redirect — but redirect logged-in users
  if (pathname === "/login" || pathname === "/") {
    if (token && role) {
      if (role === "resident") {
        return NextResponse.redirect(new URL("/tenant", request.url));
      } else if (role === "staff") {
        return NextResponse.redirect(new URL("/staff-portal", request.url));
      } else {
        // owner, admin
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // No token — redirect to login for protected routes
  if (!token) {
    const isProtected = ALL_AUTHENTICATED.some((route) => pathname.startsWith(route));
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Role-based route protection
  if (role === "resident") {
    // Residents can only access /tenant/* routes
    if (!pathname.startsWith("/tenant")) {
      return NextResponse.redirect(new URL("/tenant", request.url));
    }
  } else if (role === "staff") {
    // Staff can access /staff-portal/* routes
    if (!pathname.startsWith("/staff-portal")) {
      return NextResponse.redirect(new URL("/staff-portal", request.url));
    }
  }
  // owner/admin can access everything — no redirect needed

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
