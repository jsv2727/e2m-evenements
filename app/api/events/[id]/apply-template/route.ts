import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { applyTemplateToEvent } from '@/lib/task-service';

const bodySchema = z.object({ templateId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { templateId } = bodySchema.parse(await req.json());
    const result = await applyTemplateToEvent(params.id, templateId);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
