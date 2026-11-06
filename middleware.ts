import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readAuthConfig, verifyCalendarFeedToken, verifySessionToken } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/health']);

/** Toute l'application est réservée à l'équipe 2M (session valide requise). */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const config = readAuthConfig();
  const isApi = pathname.startsWith('/api/');

  if (config) {
    if (await verifySessionToken(config, req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
    if (pathname === '/api/calendar/ics' && (await verifyCalendarFeedToken(config, req.nextUrl.searchParams.get('token')))) {
      return NextResponse.next();
    }
  }

  // Configuration absente : accès refusé (fermé par défaut).
  if (isApi) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  const login = new URL('/login', req.url);
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
