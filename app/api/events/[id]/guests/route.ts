import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const guest = await db.guest.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      company: body.company,
      title: body.title,
      status: body.status || 'INVITED',
      dietary: body.dietary,
      eventId: params.id,
    },
  });
  return NextResponse.json(guest);
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
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.company !== undefined && { company: body.company }),
    },
  });
  return NextResponse.json(guest);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const guestId = searchParams.get('guestId');
  if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });
  await db.guest.delete({ where: { id: guestId } });
  return NextResponse.json({ success: true });
}
