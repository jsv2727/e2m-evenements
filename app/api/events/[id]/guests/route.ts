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
    data: { status: body.status },
  });
  return NextResponse.json(guest);
}
