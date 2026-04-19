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
