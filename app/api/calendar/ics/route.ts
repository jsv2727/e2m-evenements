import { db } from '@/lib/db';
import { addDays, fromDateKey, todayKey, toDateKey } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

/** Échappement TEXT selon RFC 5545 §3.3.11. */
function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Pliage des lignes à 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = out.length === 0 ? 75 : 74;
    if (bytes.encode(current + char).length > limit) {
      out.push(current);
      current = '';
    }
    current += char;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** Heure « murale » (stockée en UTC) exportée en heure flottante. */
function floating(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/[-:]/g, '');
}

const dateValue = (key: string) => key.replace(/-/g, '');

/**
 * GET /api/calendar/ics — flux iCalendar (abonnement Google Agenda / Outlook / Apple).
 * Contient les activités et les tâches ouvertes de J-30 à J+365.
 */
export async function GET() {
  const today = todayKey();
  const from = fromDateKey(addDays(today, -30));
  const to = fromDateKey(addDays(today, 365));

  const [events, tasks] = await Promise.all([
    db.event.findMany({ where: { endDate: { gte: from }, startDate: { lte: to } } }),
    db.task.findMany({
      where: { dueDate: { gte: from, lte: to }, status: { not: 'DONE' } },
      include: { event: { select: { name: true } } },
    }),
  ]);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Evenements 2M//Calendrier E2M//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:E2M — Activités et échéances',
  ];

  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:event-${e.id}@e2m`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${floating(e.startDate)}`,
      `DTEND:${floating(e.endDate)}`,
      `SUMMARY:${esc(e.name)}`,
      ...(e.venue || e.city ? [`LOCATION:${esc([e.venue, e.city].filter(Boolean).join(', '))}`] : []),
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      `STATUS:${e.status === 'CANCELLED' ? 'CANCELLED' : e.status === 'PLANNING' ? 'TENTATIVE' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  }

  for (const t of tasks) {
    const due = toDateKey(t.dueDate!);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${t.id}@e2m`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(due)}`,
      `DTEND;VALUE=DATE:${dateValue(addDays(due, 1))}`,
      `SUMMARY:${esc(`☐ ${t.title} — ${t.event.name}`)}`,
      `DESCRIPTION:${esc([t.assignee && `Responsable : ${t.assignee}`, t.category && `Catégorie : ${t.category}`, t.description].filter(Boolean).join('\n'))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="e2m-calendrier.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
