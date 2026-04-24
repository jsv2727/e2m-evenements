import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] },
      guests: { orderBy: { lastName: 'asc' } },
      expenses: { orderBy: { date: 'desc' } },
      suppliers: { include: { supplier: true } },
      contracts: { include: { supplier: true } },
    },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const event = await db.event.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status && { status: body.status }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.budget !== undefined && { budget: body.budget }),
      ...(body.capacity !== undefined && { capacity: body.capacity }),
      ...(body.venue !== undefined && { venue: body.venue }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.clientName !== undefined && { clientName: body.clientName }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail }),
      ...(body.clientPhone !== undefined && { clientPhone: body.clientPhone }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate && { endDate: new Date(body.endDate) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await db.event.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
