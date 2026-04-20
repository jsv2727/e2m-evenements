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

export async function PATCH(req: Request) {
  const body = await req.json();
  const guest = await db.guest.update({
    where: { id: body.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.email && { email: body.email }),
    },
  });
  return NextResponse.json(guest);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.guest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
