import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const expenses = await db.expense.findMany({
    orderBy: { date: 'desc' },
    include: { event: { select: { name: true } } },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const body = await req.json();
  const expense = await db.expense.create({
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category,
      date: new Date(body.date),
      vendor: body.vendor,
      notes: body.notes,
      eventId: body.eventId,
    },
  });
  return NextResponse.json(expense);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const expense = await db.expense.update({
    where: { id: body.id },
    data: {
      ...(body.description && { description: body.description }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.category && { category: body.category }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.vendor !== undefined && { vendor: body.vendor }),
      ...(body.approved !== undefined && { approved: body.approved }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
