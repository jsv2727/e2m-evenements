import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const body = await req.json();
  const invoice = await db.invoice.create({
    data: {
      number: body.number,
      issuer: body.issuer,
      recipient: body.recipient,
      amount: body.amount,
      tax: body.tax || 0,
      status: 'PENDING',
      type: body.type || 'RECEIVABLE',
      dueDate: new Date(body.dueDate),
      items: body.items ? JSON.stringify(body.items) : '[]',
      notes: body.notes,
      eventId: body.eventId || null,
      supplierId: body.supplierId || null,
    },
  });
  return NextResponse.json(invoice);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const invoice = await db.invoice.update({
    where: { id: body.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.paidDate && { paidDate: new Date(body.paidDate) }),
      ...(body.number && { number: body.number }),
      ...(body.issuer !== undefined && { issuer: body.issuer }),
      ...(body.recipient !== undefined && { recipient: body.recipient }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.tax !== undefined && { tax: body.tax }),
      ...(body.type && { type: body.type }),
      ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
      ...(body.eventId !== undefined && { eventId: body.eventId || null }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
