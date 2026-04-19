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
