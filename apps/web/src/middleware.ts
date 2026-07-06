import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const dashboardRoutes = ['/dashboard', '/residents', '/properties', '/payments', '/complaints', '/iot', '/food', '/room-mapping', '/onboarding'];
const tenantRoutes = ['/tenant'];
const staffRoutes = ['/staff'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('opsora_token')?.value;
  const role = request.cookies.get('opsora_role')?.value;

  // Public routes
  if (pathname === '/' || pathname === '/login') {
    if (token && pathname === '/login') {
      if (role === 'owner' || role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === 'tenant') return NextResponse.redirect(new URL('/tenant', request.url));
      if (role === 'staff') return NextResponse.redirect(new URL('/staff', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes require auth
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isDashboard = dashboardRoutes.some(r => pathname.startsWith(r));
  const isTenant = tenantRoutes.some(r => pathname.startsWith(r));
  const isStaff = staffRoutes.some(r => pathname.startsWith(r));

  if (isDashboard && role !== 'owner' && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isTenant && role !== 'tenant') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isStaff && role !== 'staff') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
