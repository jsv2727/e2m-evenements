import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const contracts = await db.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });
  return NextResponse.json(contracts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const contract = await db.contract.create({
    data: {
      title: body.title,
      content: body.content || '',
      type: body.type || 'SERVICE',
      status: body.status || 'DRAFT',
      partyA: body.partyA,
      partyB: body.partyB,
      value: body.value,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      eventId: body.eventId || null,
      supplierId: body.supplierId || null,
      notes: body.notes,
    },
  });
  return NextResponse.json(contract);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const contract = await db.contract.update({
    where: { id: body.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.signedDate && { signedDate: new Date(body.signedDate) }),
      ...(body.aiReview !== undefined && { aiReview: body.aiReview }),
      ...(body.riskScore !== undefined && { riskScore: body.riskScore }),
      ...(body.content !== undefined && { content: body.content }),
    },
  });
  return NextResponse.json(contract);
}
