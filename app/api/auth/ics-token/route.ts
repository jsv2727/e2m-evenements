import { NextResponse } from 'next/server';
import { calendarFeedToken, readAuthConfig } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Jeton d'abonnement iCal (route protégée par le middleware : session requise). */
export async function GET() {
  const config = readAuthConfig();
  if (!config) return NextResponse.json({ error: 'Connexion non configurée' }, { status: 503 });
  return NextResponse.json({ token: await calendarFeedToken(config) });
}
