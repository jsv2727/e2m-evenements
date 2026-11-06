import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api';
import { templateSchema } from '@/lib/calendar';
import { templateInclude } from '@/lib/task-service';

type Ctx = { params: { id: string } };

/** Remplace intégralement le modèle et ses étapes (transactionnel). */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { items, ...data } = templateSchema.parse(await req.json());
    const template = await db.$transaction(async (tx) => {
      await tx.taskTemplate.update({ where: { id: params.id }, data });
      await tx.taskTemplateItem.deleteMany({ where: { templateId: params.id } });
      await tx.taskTemplateItem.createMany({
        data: items.map((item, sortOrder) => ({ ...item, sortOrder, templateId: params.id })),
      });
      return tx.taskTemplate.findUniqueOrThrow({ where: { id: params.id }, include: templateInclude });
    });
    return NextResponse.json(template);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await db.taskTemplate.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
