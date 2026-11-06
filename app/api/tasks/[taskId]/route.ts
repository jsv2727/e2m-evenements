import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api';
import { completionPatch, serializeTask, taskEventSelect } from '@/lib/task-service';
import { fromDateKey, taskUpdateSchema } from '@/lib/calendar';

type Ctx = { params: { taskId: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { dueDate, status, ...rest } = taskUpdateSchema.parse(await req.json());
    const task = await db.task.update({
      where: { id: params.taskId },
      data: {
        ...rest,
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? fromDateKey(dueDate) : null }),
        ...completionPatch(status),
      },
      include: { event: taskEventSelect },
    });
    return NextResponse.json(serializeTask(task));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await db.task.delete({ where: { id: params.taskId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
