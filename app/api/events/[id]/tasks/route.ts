import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const task = await db.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || 'TODO',
      priority: body.priority || 'MEDIUM',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignee: body.assignee,
      eventId: params.id,
    },
  });
  return NextResponse.json(task);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const task = await db.task.update({
    where: { id: body.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.title && { title: body.title }),
      ...(body.priority && { priority: body.priority }),
    },
  });
  return NextResponse.json(task);
}
