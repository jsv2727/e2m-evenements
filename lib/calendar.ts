/**
 * Utilitaires calendrier partagés client/serveur.
 *
 * Convention de l'application : les dates sont stockées en « heure murale »
 * exprimée en UTC (ex. un événement à 18h00 est stocké 18:00Z, une échéance
 * de tâche le 2026-05-01 est stockée 2026-05-01T00:00Z). Toutes les clés de
 * jour (YYYY-MM-DD) et tous les formats d'affichage sont donc calculés en UTC
 * pour éviter tout décalage d'un jour selon le fuseau du navigateur.
 */
import { z } from 'zod';

export type DateKey = string; // YYYY-MM-DD

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Semaine commençant le dimanche (convention fr-CA / CLDR). */
export const WEEK_STARTS_ON = 0;

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_CATEGORIES = [
  'Communications',
  'Inscriptions',
  'Logistique',
  'Fournisseurs',
  'Juridique',
  'Sécurité',
  'Finances',
  'Opérations',
  'Autre',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const date = fromDateKey(value);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

export function toDateKey(date: Date | string): DateKey {
  return new Date(date).toISOString().slice(0, 10);
}

export function fromDateKey(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: DateKey, days: number): DateKey {
  return toDateKey(new Date(fromDateKey(key).getTime() + days * DAY_MS));
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = fromDateKey(key);
  return toDateKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromDateKey(a).getTime() - fromDateKey(b).getTime()) / DAY_MS);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: DateKey): DateKey {
  return addDays(addMonths(startOfMonth(key), 1), -1);
}

export function startOfWeek(key: DateKey): DateKey {
  const dow = fromDateKey(key).getUTCDay();
  return addDays(key, -((dow - WEEK_STARTS_ON + 7) % 7));
}

export function dayOfWeek(key: DateKey): number {
  return fromDateKey(key).getUTCDay();
}

export function isWeekend(key: DateKey): boolean {
  const d = dayOfWeek(key);
  return d === 0 || d === 6;
}

/** Jour courant selon le fuseau local de l'utilisateur. */
export function todayKey(): DateKey {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Grille de 6 semaines couvrant le mois de `key`. */
export function monthGrid(key: DateKey): DateKey[] {
  const first = startOfWeek(startOfMonth(key));
  return rangeKeys(first, addDays(first, 41));
}

export function formatKey(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC', ...options }).format(fromDateKey(key));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

/** Libellé relatif J-x / J+x par rapport à l'activité. */
export function offsetLabel(offset: number): string {
  if (offset === 0) return 'Jour J';
  return offset < 0 ? `J-${Math.abs(offset)}` : `J+${offset}`;
}

/** Palette d'identification des activités (contraste validé sur fond sombre). */
const ACTIVITY_PALETTE = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#ef4444',
] as const;

export function activityColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACTIVITY_PALETTE[h % ACTIVITY_PALETTE.length];
}

export const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// ---------------------------------------------------------------------------
// Schémas de validation (API)
// ---------------------------------------------------------------------------

const dateKeySchema = z.string().refine(isDateKey, 'Date invalide (format attendu AAAA-MM-JJ)');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const taskCreateSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: optionalText(2000),
  status: z.enum(TASK_STATUSES).default('TODO'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  category: optionalText(60),
  assignee: optionalText(120),
  dueDate: dateKeySchema.nullish(),
});

export const taskUpdateSchema = taskCreateSchema
  .omit({ eventId: true })
  .partial()
  .extend({ eventId: z.string().min(1).optional() });

export const templateItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(2000),
  offsetDays: z.number().int().min(-730).max(365),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  category: optionalText(60),
  assignee: optionalText(120),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  eventType: optionalText(60),
  description: optionalText(1000),
  items: z.array(templateItemSchema).max(200),
});

export const calendarRangeSchema = z
  .object({ from: dateKeySchema, to: dateKeySchema })
  .refine((r) => r.from <= r.to && diffDays(r.to, r.from) <= 400, 'Plage de dates invalide (max. 400 jours)');

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type TemplateItemInput = z.infer<typeof templateItemSchema>;
/** Forme d'entrée (champs optionnels non normalisés), utilisée pour les définitions statiques. */
export type TemplateDefinition = z.input<typeof templateSchema>;

// ---------------------------------------------------------------------------
// DTO renvoyés par /api/calendar
// ---------------------------------------------------------------------------

export type CalendarActivity = {
  id: string;
  name: string;
  type: string | null;
  status: string;
  venue: string | null;
  city: string | null;
  clientName: string | null;
  startDate: string;
  endDate: string;
  color: string;
  taskTotal: number;
  taskDone: number;
};

export type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  assignee: string | null;
  dueDate: DateKey | null;
  completedAt: string | null;
  eventId: string;
  eventName: string;
  eventStart: DateKey;
  color: string;
};

export type CalendarPayload = {
  activities: CalendarActivity[];
  tasks: CalendarTask[];
  overdue: CalendarTask[];
};

export type TemplateDTO = {
  id: string;
  name: string;
  eventType: string | null;
  description: string | null;
  items: (TemplateItemInput & { id: string; sortOrder: number })[];
};
