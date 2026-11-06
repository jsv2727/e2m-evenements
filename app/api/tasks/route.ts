import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api';
import { serializeTask, taskEventSelect } from '@/lib/task-service';
import { fromDateKey, taskCreateSchema } from '@/lib/calendar';

export async function POST(req: Request) {
  try {
    const input = taskCreateSchema.parse(await req.json());
    const task = await db.task.create({
      data: {
        ...input,
        dueDate: input.dueDate ? fromDateKey(input.dueDate) : null,
        completedAt: input.status === 'DONE' ? new Date() : null,
      },
      include: { event: taskEventSelect },
    });
    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
