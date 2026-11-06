import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyTemplateToEvent } from '@/lib/task-service';

export async function GET() {
  const events = await db.event.findMany({
    orderBy: { startDate: 'asc' },
    include: {
      expenses: { select: { amount: true } },
      _count: { select: { guests: true, tasks: true } },
    },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = await db.event.create({
    data: {
      name: body.name,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      venue: body.venue,
      city: body.city,
      status: body.status || 'PLANNING',
      budget: body.budget || 0,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      type: body.type,
      capacity: body.capacity,
      notes: body.notes,
    },
  });
  // Rétroplanning optionnel : génère automatiquement les tâches du modèle choisi.
  const templateId = typeof body.templateId === 'string' && body.templateId ? body.templateId : null;
  const generated = templateId ? await applyTemplateToEvent(event.id, templateId) : null;
  return NextResponse.json({ ...event, generated });
}
