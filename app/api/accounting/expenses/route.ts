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
