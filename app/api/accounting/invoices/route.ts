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
    },
  });
  return NextResponse.json(invoice);
}
