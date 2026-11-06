import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Sonde de disponibilité publique (healthcheck Railway), sans donnée métier. */
export function GET() {
  return NextResponse.json({ status: 'ok' });
}
