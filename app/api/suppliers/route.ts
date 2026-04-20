import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const suppliers = await db.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { events: true, contracts: true } } },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supplier = await db.supplier.create({
    data: {
      name: body.name,
      category: body.category,
      email: body.email,
      phone: body.phone,
      address: body.address,
      website: body.website,
      contactName: body.contactName,
      rating: body.rating,
      notes: body.notes,
    },
  });
  return NextResponse.json(supplier);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const supplier = await db.supplier.update({
    where: { id: body.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.category && { category: body.category }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
