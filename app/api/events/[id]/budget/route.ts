import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const items = await db.eventBudget.findMany({
    where: { eventId: params.id },
    orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (Array.isArray(body.items)) {
    const created = [];
    for (const [i, it] of body.items.entries()) {
      if (!it.category) continue;
      const amount = parseFloat(it.amount) || 0;
      const existing = await db.eventBudget.findUnique({
        where: { eventId_category: { eventId: params.id, category: it.category } },
      });
      if (existing) {
        const updated = await db.eventBudget.update({
          where: { id: existing.id },
          data: { amount, notes: it.notes || null, sortOrder: i },
        });
        created.push(updated);
      } else {
        const newItem = await db.eventBudget.create({
          data: {
            eventId: params.id,
            category: it.category,
            amount,
            notes: it.notes || null,
            sortOrder: i,
          },
        });
        created.push(newItem);
      }
    }
    return NextResponse.json({ count: created.length, items: created });
  }
  const item = await db.eventBudget.create({
    data: {
      eventId: params.id,
      category: body.category,
      amount: parseFloat(body.amount) || 0,
      notes: body.notes || null,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const item = await db.eventBudget.update({
    where: { id: body.id },
    data: {
      ...(body.category && { category: body.category }),
      ...(body.amount !== undefined && { amount: parseFloat(body.amount) || 0 }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  await db.eventBudget.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
