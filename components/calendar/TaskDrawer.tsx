'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  diffDays,
  formatKey,
  offsetLabel,
  type CalendarTask,
  type DateKey,
  type TaskUpdateInput,
} from '@/lib/calendar';
import { PRIORITY_META, STATUS_META, isOverdue } from './ui';

export const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
export const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500';

type Draft = { title: string; description: string; dueDate: string; priority: string; category: string; assignee: string };

const toDraft = (t: CalendarTask): Draft => ({
  title: t.title,
  description: t.description ?? '',
  dueDate: t.dueDate ?? '',
  priority: t.priority,
  category: t.category ?? '',
  assignee: t.assignee ?? '',
});

export default function TaskDrawer({
  task,
  today,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: CalendarTask | null;
  today: DateKey;
  onClose: () => void;
  onUpdate: (task: CalendarTask, patch: TaskUpdateInput) => Promise<void>;
  onDelete: (task: CalendarTask) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(task ? toDraft(task) : null);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [task, onClose]);

  const open = !!task && !!draft;
  const dirty = open && JSON.stringify(toDraft(task)) !== JSON.stringify(draft);

  const save = async () => {
    if (!task || !draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      await onUpdate(task, {
        title: draft.title,
        description: draft.description,
        dueDate: draft.dueDate || null,
        priority: draft.priority as TaskUpdateInput['priority'],
        category: draft.category,
        assignee: draft.assignee,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Détail de la tâche"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {open && (
          <>
            <header className="border-b border-slate-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/events/${task.eventId}`}
                  className="group inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-700 py-1 pl-2 pr-3 text-xs text-slate-300 hover:border-slate-600 hover:text-white"
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: task.color }} />
                  <span className="truncate">{task.eventName}</span>
                  <ArrowUpRight size={12} className="flex-shrink-0 opacity-60 group-hover:opacity-100" />
                </Link>
                <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                rows={2}
                maxLength={200}
                aria-label="Titre"
                className="mt-4 w-full resize-none bg-transparent text-xl font-semibold leading-snug text-white focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {task.dueDate && (
                  <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1', isOverdue(task, today) ? 'bg-rose-500/15 text-rose-300' : 'bg-slate-800 text-slate-300')}>
                    <CalendarClock size={12} />
                    {formatKey(task.dueDate, { weekday: 'short', day: 'numeric', month: 'long' })}
                    {isOverdue(task, today) && ` · ${diffDays(today, task.dueDate)} j de retard`}
                  </span>
                )}
                {task.dueDate && (
                  <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-slate-400" title="Position par rapport au début de l'activité">
                    {offsetLabel(diffDays(task.dueDate, task.eventStart))}
                  </span>
                )}
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <span className={labelCls}>Statut</span>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-slate-950/40 p-1">
                  {TASK_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => s !== task.status && onUpdate(task, { status: s })}
                      className={cn(
                        'rounded-md py-1.5 text-xs font-medium transition-all',
                        task.status === s ? STATUS_META[s].cls + ' shadow-sm ring-1 ring-inset ring-white/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                      )}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className={labelCls}>Échéance</span>
                  <input type="date" className={inputCls} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                </label>
                <label className="block">
                  <span className={labelCls}>Priorité</span>
                  <select className={inputCls} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Catégorie</span>
                  <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    <option value="">—</option>
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Responsable</span>
                  <input className={inputCls} value={draft.assignee} placeholder="Non assignée" maxLength={120} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
                </label>
              </div>

              <label className="block">
                <span className={labelCls}>Notes</span>
                <textarea
                  className={cn(inputCls, 'min-h-[120px] resize-y')}
                  value={draft.description}
                  maxLength={2000}
                  placeholder="Détails, contacts, liens…"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>

              {task.completedAt && (
                <p className="text-xs text-emerald-400/80">
                  Terminée le {new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(task.completedAt))}
                </p>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-800 p-4">
              <button
                type="button"
                onClick={() => confirm(`Supprimer la tâche « ${task.title} » ?`) && onDelete(task)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 size={15} />
                Supprimer
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving || !draft.title.trim()}
                  onClick={save}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
