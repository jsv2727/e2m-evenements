import type { Prisma, Task } from '@prisma/client';
import { db } from './db';
import {
  activityColor,
  addDays,
  fromDateKey,
  toDateKey,
  type CalendarTask,
  type TaskPriority,
  type TaskStatus,
} from './calendar';

type TaskWithEvent = Task & { event: { id: string; name: string; startDate: Date } };

export const taskEventSelect = { select: { id: true, name: true, startDate: true } } as const;

export const templateInclude = {
  items: { orderBy: [{ offsetDays: 'asc' as const }, { sortOrder: 'asc' as const }] },
};

export function serializeTask(task: TaskWithEvent): CalendarTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    category: task.category,
    assignee: task.assignee,
    dueDate: task.dueDate ? toDateKey(task.dueDate) : null,
    completedAt: task.completedAt?.toISOString() ?? null,
    eventId: task.eventId,
    eventName: task.event.name,
    eventStart: toDateKey(task.event.startDate),
    color: activityColor(task.eventId),
  };
}

/** Maintient `completedAt` cohérent avec le statut. */
export function completionPatch(status: string | undefined): Pick<Prisma.TaskUpdateInput, 'completedAt'> {
  if (status === undefined) return {};
  return { completedAt: status === 'DONE' ? new Date() : null };
}

export class NotFoundError extends Error {}

/**
 * Génère les tâches d'un rétroplanning pour une activité.
 * Idempotent : une tâche dont le titre existe déjà pour l'activité est ignorée.
 */
export async function applyTemplateToEvent(eventId: string, templateId: string) {
  return db.$transaction(async (tx) => {
    const [event, template] = await Promise.all([
      tx.event.findUnique({ where: { id: eventId }, select: { id: true, startDate: true } }),
      tx.taskTemplate.findUnique({ where: { id: templateId }, include: { items: { orderBy: [{ offsetDays: 'asc' }, { sortOrder: 'asc' }] } } }),
    ]);
    if (!event) throw new NotFoundError('Activité introuvable');
    if (!template) throw new NotFoundError('Modèle introuvable');

    const existing = await tx.task.findMany({ where: { eventId }, select: { title: true } });
    const known = new Set(existing.map((t) => t.title.trim().toLowerCase()));
    const startKey = toDateKey(event.startDate);

    const data: Prisma.TaskCreateManyInput[] = [];
    for (const item of template.items) {
      const key = item.title.trim().toLowerCase();
      if (known.has(key)) continue;
      known.add(key);
      data.push({
        eventId,
        title: item.title,
        description: item.description,
        priority: item.priority,
        category: item.category,
        assignee: item.assignee,
        status: 'TODO',
        dueDate: fromDateKey(addDays(startKey, item.offsetDays)),
      });
    }
    if (data.length) await tx.task.createMany({ data });
    return { created: data.length, skipped: template.items.length - data.length };
  });
}
