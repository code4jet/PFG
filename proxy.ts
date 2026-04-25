import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and auth API through always
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/auth')
  ) {
    return NextResponse.next();
  }

  // Protect all other /admin routes
  if (pathname.startsWith('/admin')) {
    const auth = req.cookies.get('admin_session');
    
    if (!auth || auth.value !== 'true') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
