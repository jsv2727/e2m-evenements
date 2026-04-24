import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const expense = await db.expense.create({
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category,
      date: new Date(body.date),
      vendor: body.vendor,
      notes: body.notes,
      eventId: params.id,
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
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get('expenseId');
  if (!expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 });
  await db.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ success: true });
}
