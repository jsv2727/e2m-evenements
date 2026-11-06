import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api';
import { templateSchema } from '@/lib/calendar';
import { templateInclude } from '@/lib/task-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = await db.taskTemplate.findMany({ orderBy: { name: 'asc' }, include: templateInclude });
    return NextResponse.json(templates);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { items, ...data } = templateSchema.parse(await req.json());
    const template = await db.taskTemplate.create({
      data: { ...data, items: { create: items.map((item, sortOrder) => ({ ...item, sortOrder })) } },
      include: templateInclude,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
