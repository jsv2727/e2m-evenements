import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api';
import { serializeTask, taskEventSelect } from '@/lib/task-service';
import {
  activityColor,
  addDays,
  calendarRangeSchema,
  fromDateKey,
  type CalendarActivity,
  type CalendarPayload,
} from '@/lib/calendar';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&today=YYYY-MM-DD]
 * Activités chevauchant la plage, tâches échues dans la plage,
 * et toutes les tâches ouvertes en retard (avant `today`).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { from, to } = calendarRangeSchema.parse({ from: searchParams.get('from'), to: searchParams.get('to') });
    const todayParam = searchParams.get('today');
    const today = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : new Date().toISOString().slice(0, 10);

    const rangeStart = fromDateKey(from);
    const rangeEnd = fromDateKey(addDays(to, 1));

    const [events, tasks, overdue] = await Promise.all([
      db.event.findMany({
        where: { startDate: { lt: rangeEnd }, endDate: { gte: rangeStart } },
        orderBy: { startDate: 'asc' },
        include: { tasks: { select: { status: true } } },
      }),
      db.task.findMany({
        where: { dueDate: { gte: rangeStart, lt: rangeEnd } },
        include: { event: taskEventSelect },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      db.task.findMany({
        where: { dueDate: { lt: fromDateKey(today) }, status: { not: 'DONE' } },
        include: { event: taskEventSelect },
        orderBy: { dueDate: 'asc' },
        take: 200,
      }),
    ]);

    const activities: CalendarActivity[] = events.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
      venue: e.venue,
      city: e.city,
      clientName: e.clientName,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
      color: activityColor(e.id),
      taskTotal: e.tasks.length,
      taskDone: e.tasks.filter((t) => t.status === 'DONE').length,
    }));

    const payload: CalendarPayload = {
      activities,
      tasks: tasks.map(serializeTask),
      overdue: overdue.map(serializeTask),
    };
    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error);
  }
}
