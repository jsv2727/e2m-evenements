import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guests = await db.guest.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: { event: { select: { id: true, name: true } } },
  });
  return NextResponse.json(guests);
}
