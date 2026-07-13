import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access')?.value;
  const refresh = request.cookies.get('refresh')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  // Sem nenhum token → manda para o login
  if (!token && !refresh && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Tem algum token e está na página de login → manda para o dashboard
  if ((token || refresh) && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
