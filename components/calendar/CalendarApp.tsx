'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Loader2,
  Plus,
  Rss,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import {
  PRIORITY_RANK,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  addDays,
  addMonths,
  endOfMonth,
  formatKey,
  isDateKey,
  monthGrid,
  startOfMonth,
  startOfWeek,
  todayKey,
  toDateKey,
  type CalendarActivity,
  type CalendarTask,
  type DateKey,
  type TaskCreateInput,
  type TaskUpdateInput,
} from '@/lib/calendar';
import MonthView, { type ViewHandlers } from './MonthView';
import WeekView from './WeekView';
import AgendaView from './AgendaView';
import TimelineView from './TimelineView';
import SideRail from './SideRail';
import TaskDrawer, { inputCls } from './TaskDrawer';
import TaskFormModal, { type EventOption } from './TaskFormModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import { PRIORITY_META, Segmented, TaskChip } from './ui';
import { requestJson, useCalendarData } from './useCalendarData';

type View = 'month' | 'week' | 'agenda' | 'timeline';
const VIEWS: { value: View; label: string; hint: string }[] = [
  { value: 'month', label: 'Mois', hint: 'Raccourci : M' },
  { value: 'week', label: 'Semaine', hint: 'Raccourci : S' },
  { value: 'agenda', label: 'Agenda', hint: 'Raccourci : A' },
  { value: 'timeline', label: 'Rétroplanning', hint: 'Raccourci : R' },
];

type Filters = { eventId: string; category: string; assignee: string; priority: string; showDone: boolean; q: string };
const NO_FILTERS: Filters = { eventId: '', category: '', assignee: '', priority: '', showDone: true, q: '' };

function viewRange(view: View, anchor: DateKey): { from: DateKey; to: DateKey } {
  switch (view) {
    case 'month': {
      const g = monthGrid(anchor);
      return { from: g[0]!, to: g[g.length - 1]! };
    }
    case 'week': {
      const s = startOfWeek(anchor);
      return { from: s, to: addDays(s, 6) };
    }
    case 'agenda':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'timeline':
      return { from: startOfMonth(anchor), to: endOfMonth(addMonths(anchor, 2)) };
  }
}

function shift(view: View, anchor: DateKey, dir: 1 | -1): DateKey {
  return view === 'week' ? addDays(anchor, 7 * dir) : addMonths(anchor, dir);
}

function viewTitle(view: View, anchor: DateKey, from: DateKey, to: DateKey): string {
  if (view === 'week') {
    const sameMonth = from.slice(0, 7) === to.slice(0, 7);
    return `${formatKey(from, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${formatKey(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (view === 'timeline') return `${formatKey(from, { month: 'short', year: 'numeric' })} – ${formatKey(to, { month: 'short', year: 'numeric' })}`;
  return formatKey(anchor, { month: 'long', year: 'numeric' });
}

const sortTasks = (a: CalendarTask, b: CalendarTask) =>
  Number(a.status === 'DONE') - Number(b.status === 'DONE') ||
  (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
  a.title.localeCompare(b.title, 'fr');

export default function CalendarApp() {
  const router = useRouter();
  const params = useSearchParams();

  const [today, setToday] = useState<DateKey | null>(null);
  const initialView = (VIEWS.some((v) => v.value === params.get('vue')) ? params.get('vue') : 'month') as View;
  const initialDate = params.get('date');
  const [view, setView] = useState<View>(initialView);
  const [anchor, setAnchor] = useState<DateKey | null>(initialDate && isDateKey(initialDate) ? initialDate : null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<CalendarTask | null>(null);
  const [createDate, setCreateDate] = useState<DateKey | null | undefined>(undefined);
  const [applyOpen, setApplyOpen] = useState(false);
  const [list, setList] = useState<{ title: string; tasks: CalendarTask[] } | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // `today` dépend du fuseau du navigateur : calculé après montage (pas de décalage SSR).
  useEffect(() => {
    const t = todayKey();
    setToday(t);
    setAnchor((a) => a ?? t);
  }, []);

  useEffect(() => {
    requestJson<EventOption[]>('/api/events')
      .then((list) => setEvents(list.map(({ id, name, startDate, type }) => ({ id, name, startDate, type }))))
      .catch(() => setEvents([]));
  }, [reloadToken]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(id);
  }, [toast]);

  // URL partageable (?vue=…&date=…)
  useEffect(() => {
    if (!anchor) return;
    const qs = new URLSearchParams({ vue: view, date: anchor });
    router.replace(`/calendar?${qs}`, { scroll: false });
  }, [view, anchor, router]);

  const safeToday = today ?? '1970-01-01';
  const safeAnchor = anchor ?? safeToday;
  const { from, to } = viewRange(view, safeAnchor);
  const main = useCalendarData(from, to, safeToday, reloadToken, !!today);
  const focus = useCalendarData(safeToday, addDays(safeToday, 30), safeToday, reloadToken, !!today);
  const patchMain = main.patchLocal;
  const patchFocus = focus.patchLocal;

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  const notifyError = useCallback(
    (e: unknown) => {
      setToast({ kind: 'error', text: (e as Error).message || 'Une erreur est survenue' });
      reload();
    },
    [reload],
  );

  // ---- Filtres ------------------------------------------------------------
  const matches = useCallback(
    (t: CalendarTask, ignoreDone = false) => {
      const q = filters.q.trim().toLowerCase();
      return (
        (!filters.eventId || t.eventId === filters.eventId) &&
        (!filters.category || t.category === filters.category) &&
        (!filters.assignee || t.assignee === filters.assignee) &&
        (!filters.priority || t.priority === filters.priority) &&
        (ignoreDone || filters.showDone || t.status !== 'DONE') &&
        (!q || t.title.toLowerCase().includes(q) || t.eventName.toLowerCase().includes(q) || (t.assignee ?? '').toLowerCase().includes(q))
      );
    },
    [filters],
  );

  const visibleTasks = useMemo(() => main.data.tasks.filter((t) => matches(t)), [main.data.tasks, matches]);
  const visibleActivities = useMemo(
    () => main.data.activities.filter((a) => !filters.eventId || a.id === filters.eventId),
    [main.data.activities, filters.eventId],
  );
  const tasksByDay = useMemo(() => {
    const map = new Map<DateKey, CalendarTask[]>();
    for (const t of visibleTasks) if (t.dueDate) map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    map.forEach((l) => l.sort(sortTasks));
    return map;
  }, [visibleTasks]);

  const overdue = useMemo(() => focus.data.overdue.filter((t) => matches(t, true)), [focus.data.overdue, matches]);
  const upcoming = useMemo(
    () => focus.data.tasks.filter((t) => t.status !== 'DONE' && t.dueDate! <= addDays(safeToday, 13) && matches(t, true)),
    [focus.data.tasks, matches, safeToday],
  );
  const assignees = useMemo(
    () => [...new Set([...main.data.tasks, ...focus.data.tasks].map((t) => t.assignee).filter((a): a is string => !!a))].sort(),
    [main.data.tasks, focus.data.tasks],
  );

  const kpis = useMemo(() => {
    const open = focus.data.tasks.filter((t) => t.status !== 'DONE' && matches(t, true));
    const inRange = main.data.tasks.filter((t) => matches(t, true));
    const done = inRange.filter((t) => t.status === 'DONE').length;
    return {
      overdue: overdue.length,
      today: open.filter((t) => t.dueDate === safeToday).length,
      week: open.filter((t) => t.dueDate! <= addDays(safeToday, 6)).length,
      activities: focus.data.activities.filter((a) => toDateKey(a.startDate) >= safeToday && a.status !== 'CANCELLED').length,
      completion: inRange.length ? Math.round((done / inRange.length) * 100) : null,
      done,
      total: inRange.length,
    };
  }, [focus.data, main.data.tasks, matches, overdue.length, safeToday]);

  // ---- Mutations ----------------------------------------------------------
  const patchEverywhere = useCallback(
    (id: string, patch: Partial<CalendarTask> | null) => {
      patchMain(id, patch);
      patchFocus(id, patch);
      setSelected((s) => (s?.id === id ? (patch ? { ...s, ...patch } : null) : s));
    },
    [patchMain, patchFocus],
  );

  const updateTask = useCallback(
    async (task: CalendarTask, patch: TaskUpdateInput) => {
      const optimistic: Partial<CalendarTask> = {};
      if (patch.status) optimistic.status = patch.status;
      if (patch.dueDate !== undefined) optimistic.dueDate = patch.dueDate ?? null;
      patchEverywhere(task.id, optimistic);
      try {
        const saved = await requestJson<CalendarTask>(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
        patchEverywhere(task.id, saved);
        if (patch.title !== undefined) setToast({ kind: 'ok', text: 'Tâche enregistrée' });
        reload(); // resynchronise compteurs, avancement et listes dérivées
      } catch (e) {
        notifyError(e);
      }
    },
    [patchEverywhere, notifyError, reload],
  );

  const toggleTask = useCallback(
    (task: CalendarTask) => updateTask(task, { status: task.status === 'DONE' ? 'TODO' : 'DONE' }),
    [updateTask],
  );

  const moveTask = useCallback(
    (taskId: string, date: DateKey) => {
      const task = main.data.tasks.find((t) => t.id === taskId);
      if (!task || task.dueDate === date) return;
      void updateTask(task, { dueDate: date });
      setToast({ kind: 'ok', text: `« ${task.title} » déplacée au ${formatKey(date, { day: 'numeric', month: 'long' })}` });
    },
    [main.data.tasks, updateTask],
  );

  const deleteTask = useCallback(
    async (task: CalendarTask) => {
      patchEverywhere(task.id, null);
      try {
        await requestJson(`/api/tasks/${task.id}`, { method: 'DELETE' });
        setToast({ kind: 'ok', text: 'Tâche supprimée' });
        reload();
      } catch (e) {
        notifyError(e);
      }
    },
    [patchEverywhere, notifyError, reload],
  );

  const createTask = useCallback(
    async (input: TaskCreateInput) => {
      await requestJson<CalendarTask>('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
      setCreateDate(undefined);
      setToast({ kind: 'ok', text: 'Tâche ajoutée' });
      reload();
    },
    [reload],
  );

  const openActivity = useCallback((a: CalendarActivity) => router.push(`/events/${a.id}`), [router]);
  const goToday = useCallback(() => today && setAnchor(today), [today]);

  // ---- Raccourcis clavier -------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (selected || createDate !== undefined || applyOpen || list) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft') setAnchor((a) => a && shift(view, a, -1));
      else if (k === 'arrowright') setAnchor((a) => a && shift(view, a, 1));
      else if (k === 't') goToday();
      else if (k === 'm') setView('month');
      else if (k === 's') setView('week');
      else if (k === 'a') setView('agenda');
      else if (k === 'r') setView('timeline');
      else if (k === 'n') setCreateDate(today);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selected, createDate, applyOpen, list, goToday, today]);

  const handlers: ViewHandlers = {
    today: safeToday,
    onOpenTask: setSelected,
    onToggleTask: toggleTask,
    onMoveTask: moveTask,
    onCreateTask: setCreateDate,
    onOpenActivity: openActivity,
    onShowList: (title, tasks) => setList({ title, tasks }),
  };

  const activeFilterCount = [filters.eventId, filters.category, filters.assignee, filters.priority, filters.q].filter(Boolean).length + (filters.showDone ? 0 : 1);
  const marked = useMemo(
    () => new Set([...main.data.tasks, ...focus.data.tasks].filter((t) => t.status !== 'DONE' && t.dueDate).map((t) => t.dueDate!)),
    [main.data.tasks, focus.data.tasks],
  );

  const selectCls = 'h-9 rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none';

  return (
    <>
      <Header
        title="Calendrier des activités"
        subtitle="Rétroplanning et échéances de toutes les activités 2M"
        actions={
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="/api/calendar/ics"
              title="Flux iCalendar — abonnement Google Agenda, Outlook ou Apple Calendrier"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white"
            >
              <Rss size={14} /> Export iCal
            </a>
            <Link href="/calendar/templates" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white">
              <Layers3 size={14} /> Modèles
            </Link>
            <button onClick={() => setApplyOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20">
              <Sparkles size={14} /> Appliquer un rétroplanning
            </button>
            <button onClick={() => setCreateDate(today)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-500">
              <Plus size={15} /> Tâche
            </button>
          </div>
        }
      />

      <div className="flex-1 space-y-5 p-6">
        {/* Indicateurs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'En retard', value: kpis.overdue, icon: AlertTriangle, tone: kpis.overdue ? 'text-rose-300' : 'text-slate-300', ring: kpis.overdue ? 'border-rose-500/30 bg-rose-500/[0.06]' : 'border-slate-800 bg-slate-900/40', onClick: () => setList({ title: 'Tâches en retard', tasks: overdue }) },
            { label: "Aujourd'hui", value: kpis.today, icon: Sun, tone: 'text-amber-300', ring: 'border-slate-800 bg-slate-900/40' },
            { label: '7 prochains jours', value: kpis.week, icon: CalendarDays, tone: 'text-sky-300', ring: 'border-slate-800 bg-slate-900/40' },
            { label: 'Activités (30 j)', value: kpis.activities, icon: CalendarPlus, tone: 'text-indigo-300', ring: 'border-slate-800 bg-slate-900/40' },
            { label: 'Avancement (période)', value: kpis.completion === null ? '—' : `${kpis.completion} %`, sub: `${kpis.done}/${kpis.total}`, icon: CheckCircle2, tone: 'text-emerald-300', ring: 'border-slate-800 bg-slate-900/40', progress: kpis.completion },
          ].map((k) => {
            const Comp = k.onClick ? 'button' : 'div';
            return (
              <Comp
                key={k.label}
                onClick={k.onClick}
                className={cn('relative overflow-hidden rounded-xl border p-4 text-left transition-colors', k.ring, k.onClick && 'hover:border-rose-500/50')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</span>
                  <k.icon size={15} className={k.tone} />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={cn('text-2xl font-semibold tabular-nums', k.tone)}>{today ? k.value : '—'}</span>
                  {'sub' in k && k.sub && <span className="text-xs text-slate-500">{k.sub}</span>}
                </div>
                {'progress' in k && typeof k.progress === 'number' && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${k.progress}%` }} />
                  </div>
                )}
              </Comp>
            );
          })}
        </div>

        {/* Barre d'outils */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={goToday} title="Raccourci : T" className="h-9 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-200 hover:bg-slate-800">
              Aujourd&apos;hui
            </button>
            <button aria-label="Période précédente" title="←" onClick={() => anchor && setAnchor(shift(view, anchor, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Période suivante" title="→" onClick={() => anchor && setAnchor(shift(view, anchor, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <ChevronRight size={18} />
            </button>
          </div>
          <h2 className="min-w-[200px] text-xl font-semibold tracking-tight text-white first-letter:uppercase">
            {anchor ? viewTitle(view, safeAnchor, from, to) : ''}
          </h2>
          {main.loading && <Loader2 size={16} className="animate-spin text-slate-500" aria-label="Chargement" />}
          <div className="ml-auto">
            <Segmented value={view} options={VIEWS} onChange={setView} />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Rechercher une tâche…"
              className={cn(inputCls, 'h-9 w-56 py-0 pl-8 text-xs')}
            />
          </div>
          <select aria-label="Activité" className={selectCls} value={filters.eventId} onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}>
            <option value="">Toutes les activités</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select aria-label="Catégorie" className={selectCls} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">Toutes catégories</option>
            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Responsable" className={selectCls} value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}>
            <option value="">Tous responsables</option>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Priorité" className={selectCls} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">Toutes priorités</option>
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
          <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-300">
            <input type="checkbox" className="accent-indigo-500" checked={filters.showDone} onChange={(e) => setFilters({ ...filters, showDone: e.target.checked })} />
            Afficher terminées
          </label>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters(NO_FILTERS)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white">
              <X size={13} /> Réinitialiser ({activeFilterCount})
            </button>
          )}
        </div>

        {main.error && (
          <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>Impossible de charger le calendrier : {main.error}</span>
            <button onClick={reload} className="font-medium underline">Réessayer</button>
          </div>
        )}

        <div className="flex gap-5">
          <div className="min-w-0 flex-1">
            {!today ? (
              <div className="h-[640px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
            ) : view === 'month' ? (
              <MonthView anchor={safeAnchor} activities={visibleActivities} tasksByDay={tasksByDay} handlers={handlers} />
            ) : view === 'week' ? (
              <WeekView anchor={safeAnchor} activities={visibleActivities} tasksByDay={tasksByDay} handlers={handlers} />
            ) : view === 'agenda' ? (
              <AgendaView from={from} to={to} activities={visibleActivities} tasksByDay={tasksByDay} handlers={handlers} />
            ) : (
              <TimelineView from={from} to={to} activities={visibleActivities} tasks={visibleTasks} handlers={handlers} />
            )}
            <p className="mt-3 text-[11px] text-slate-600">
              Glisser-déposer une tâche pour la replanifier · Double-clic sur un jour pour ajouter · Raccourcis : ← → T M S A R N
            </p>
          </div>
          {today && (
            <SideRail
              anchor={safeAnchor}
              today={today}
              overdue={overdue}
              upcoming={upcoming}
              marked={marked}
              onPick={(k) => setAnchor(k)}
              onOpen={setSelected}
              onToggle={toggleTask}
              onShowAllOverdue={() => setList({ title: 'Tâches en retard', tasks: overdue })}
            />
          )}
        </div>
      </div>

      <TaskDrawer task={selected} today={safeToday} onClose={() => setSelected(null)} onUpdate={updateTask} onDelete={deleteTask} />

      <TaskFormModal
        open={createDate !== undefined}
        initialDate={createDate ?? null}
        initialEventId={filters.eventId || undefined}
        events={events}
        onClose={() => setCreateDate(undefined)}
        onSubmit={createTask}
      />

      <ApplyTemplateModal
        open={applyOpen}
        events={events}
        fixedEventId={filters.eventId || undefined}
        onClose={() => setApplyOpen(false)}
        onApplied={({ created, skipped }) => {
          setApplyOpen(false);
          setToast({ kind: 'ok', text: `${created} tâche${created > 1 ? 's' : ''} générée${created > 1 ? 's' : ''}${skipped ? ` · ${skipped} déjà existante${skipped > 1 ? 's' : ''}` : ''}` });
          reload();
        }}
      />

      <Modal open={!!list} onClose={() => setList(null)} title={list?.title ?? ''} size="md">
        <div className="space-y-1.5">
          {list?.tasks.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucune tâche.</p>}
          {list?.tasks.map((t) => (
            <TaskChip
              key={t.id}
              task={t}
              today={safeToday}
              showActivity
              draggable={false}
              onOpen={(task) => { setList(null); setSelected(task); }}
              onToggle={(task) => {
                void toggleTask(task);
                setList((l) => l && { ...l, tasks: l.tasks.map((x) => (x.id === task.id ? { ...x, status: x.status === 'DONE' ? 'TODO' : 'DONE' } : x)) });
              }}
            />
          ))}
        </div>
      </Modal>

      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
        {toast && (
          <div className={cn('pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-2xl animate-fade-in', toast.kind === 'ok' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-rose-500/40 bg-rose-950 text-rose-100')}>
            {toast.kind === 'ok' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
            {toast.text}
          </div>
        )}
      </div>
    </>
  );
}
