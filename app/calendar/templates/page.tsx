'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Layers3, Plus, Save, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { cn } from '@/lib/utils';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  offsetLabel,
  type TemplateDTO,
  type TemplateInput,
} from '@/lib/calendar';
import { EVENT_TYPES } from '@/lib/event-types';
import { PRIORITY_META } from '@/components/calendar/ui';
import { inputCls, labelCls } from '@/components/calendar/TaskDrawer';
import { requestJson } from '@/components/calendar/useCalendarData';

type DraftItem = { key: string; title: string; offsetDays: number; priority: string; category: string; assignee: string; description: string };
type Draft = { id: string | null; name: string; eventType: string; description: string; items: DraftItem[] };

let seq = 0;
const newKey = () => `item-${++seq}`;

const toDraft = (t: TemplateDTO): Draft => ({
  id: t.id,
  name: t.name,
  eventType: t.eventType ?? '',
  description: t.description ?? '',
  items: t.items.map((i) => ({
    key: newKey(),
    title: i.title,
    offsetDays: i.offsetDays,
    priority: i.priority,
    category: i.category ?? '',
    assignee: i.assignee ?? '',
    description: i.description ?? '',
  })),
});

const blankItem = (offsetDays = -7): DraftItem => ({ key: newKey(), title: '', offsetDays, priority: 'MEDIUM', category: '', assignee: '', description: '' });

function toPayload(d: Draft): TemplateInput {
  return {
    name: d.name,
    eventType: d.eventType || null,
    description: d.description || null,
    items: d.items
      .filter((i) => i.title.trim())
      .map((i) => ({
        title: i.title,
        offsetDays: i.offsetDays,
        priority: i.priority as TemplateInput['items'][number]['priority'],
        category: i.category || null,
        assignee: i.assignee || null,
        description: i.description || null,
      })),
  };
}

function Frise({ items }: { items: DraftItem[] }) {
  const valid = items.filter((i) => i.title.trim());
  if (!valid.length) return null;
  const min = Math.min(0, ...valid.map((i) => i.offsetDays));
  const max = Math.max(0, ...valid.map((i) => i.offsetDays));
  const span = Math.max(1, max - min);
  const pos = (o: number) => `${((o - min) / span) * 100}%`;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 pb-4 pt-8">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700" />
        <div className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-indigo-400" style={{ left: pos(0) }}>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-indigo-300">Jour J</span>
        </div>
        {valid.map((i) => (
          <span
            key={i.key}
            title={`${offsetLabel(i.offsetDays)} — ${i.title}`}
            className={cn('absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-slate-950', PRIORITY_META[i.priority]?.dot)}
            style={{ left: pos(i.offsetDays) }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{offsetLabel(min)}</span>
        <span>{offsetLabel(max)}</span>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async (selectId?: string) => {
    const list = await requestJson<TemplateDTO[]>('/api/task-templates');
    setTemplates(list);
    const pick = list.find((t) => t.id === selectId) ?? list[0];
    setDraft((d) => (selectId || !d ? (pick ? toDraft(pick) : null) : d));
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setMessage({ kind: 'error', text: e.message }));
  }, [load]);

  const original = useMemo(() => templates.find((t) => t.id === draft?.id), [templates, draft?.id]);
  const dirty = !!draft && (!original || JSON.stringify(toPayload(toDraft(original))) !== JSON.stringify(toPayload(draft)));
  const sortedItems = useMemo(() => (draft ? [...draft.items].sort((a, b) => a.offsetDays - b.offsetDays) : []), [draft]);

  const updateItem = (key: string, patch: Partial<DraftItem>) =>
    setDraft((d) => d && { ...d, items: d.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) });

  const select = (t: TemplateDTO) => {
    if (dirty && !confirm('Modifications non enregistrées. Continuer ?')) return;
    setDraft(toDraft(t));
    setMessage(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const body = JSON.stringify(toPayload(draft));
      const saved = draft.id
        ? await requestJson<TemplateDTO>(`/api/task-templates/${draft.id}`, { method: 'PUT', body })
        : await requestJson<TemplateDTO>('/api/task-templates', { method: 'POST', body });
      await load(saved.id);
      setMessage({ kind: 'ok', text: 'Modèle enregistré' });
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !confirm(`Supprimer le modèle « ${draft.name} » ? Les tâches déjà générées sont conservées.`)) return;
    try {
      await requestJson(`/api/task-templates/${draft.id}`, { method: 'DELETE' });
      setDraft(null);
      await load();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    }
  };

  return (
    <>
      <Header
        title="Modèles de rétroplanning"
        subtitle="Listes de tâches types, positionnées en J-x / J+x par rapport au début de l'activité"
        actions={
          <Link href="/calendar" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:text-white">
            <ArrowLeft size={14} /> Calendrier
          </Link>
        }
      />
      <div className="grid flex-1 grid-cols-1 gap-5 p-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <button
            onClick={() => {
              if (dirty && !confirm('Modifications non enregistrées. Continuer ?')) return;
              setDraft({ id: null, name: '', eventType: '', description: '', items: [blankItem(-30), blankItem(-7), blankItem(0)] });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus size={16} /> Nouveau modèle
          </button>
          <ul className="space-y-1 pt-2">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => select(t)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                    draft?.id === t.id ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-transparent hover:bg-slate-800/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layers3 size={14} className="text-slate-500" />
                    <span className="truncate text-sm font-medium text-slate-100">{t.name}</span>
                  </div>
                  <div className="mt-0.5 pl-6 text-[11px] text-slate-500">
                    {t.items.length} étapes{t.eventType ? ` · ${t.eventType}` : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {draft ? (
          <section className="min-w-0 space-y-5">
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Nom du modèle *</span>
                <input className={inputCls} value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex. Bateaux dragon" />
              </label>
              <label className="block">
                <span className={labelCls}>Type d&apos;activité associé</span>
                <select className={inputCls} value={draft.eventType} onChange={(e) => setDraft({ ...draft, eventType: e.target.value })}>
                  <option value="">Aucun (générique)</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Description</span>
                <input className={inputCls} value={draft.description} maxLength={1000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
            </div>

            <Frise items={draft.items} />

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="grid grid-cols-[20px_132px_minmax(0,1fr)_150px_120px_140px_36px] gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span />
                <span>Délai (jours)</span>
                <span>Tâche</span>
                <span>Catégorie</span>
                <span>Priorité</span>
                <span>Responsable</span>
                <span />
              </div>
              <ul className="divide-y divide-slate-800/70">
                {sortedItems.map((i) => (
                  <li key={i.key} className="grid grid-cols-[20px_132px_minmax(0,1fr)_150px_120px_140px_36px] items-center gap-2 px-3 py-2">
                    <span className={cn('mx-auto h-2 w-2 rotate-45 rounded-[1px]', PRIORITY_META[i.priority]?.dot)} aria-hidden />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        aria-label="Délai en jours (négatif = avant)"
                        className="w-16 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-right font-mono text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={i.offsetDays}
                        min={-730}
                        max={365}
                        onChange={(e) => updateItem(i.key, { offsetDays: Number.isFinite(e.target.valueAsNumber) ? Math.trunc(e.target.valueAsNumber) : 0 })}
                      />
                      <span className={cn('whitespace-nowrap font-mono text-[10px]', i.offsetDays === 0 ? 'text-indigo-300' : 'text-slate-500')}>{offsetLabel(i.offsetDays)}</span>
                    </div>
                    <input className={cn(inputCls, 'py-1.5 text-[13px]')} value={i.title} maxLength={200} placeholder="Intitulé de la tâche" onChange={(e) => updateItem(i.key, { title: e.target.value })} />
                    <select className={cn(inputCls, 'py-1.5 text-xs')} value={i.category} onChange={(e) => updateItem(i.key, { category: e.target.value })}>
                      <option value="">—</option>
                      {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className={cn(inputCls, 'py-1.5 text-xs')} value={i.priority} onChange={(e) => updateItem(i.key, { priority: e.target.value })}>
                      {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                    </select>
                    <input className={cn(inputCls, 'py-1.5 text-xs')} value={i.assignee} maxLength={120} placeholder="—" onChange={(e) => updateItem(i.key, { assignee: e.target.value })} />
                    <button
                      aria-label="Supprimer l'étape"
                      onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x.key !== i.key) })}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem()] })}
                className="flex w-full items-center gap-2 border-t border-slate-800 px-4 py-2.5 text-xs font-medium text-indigo-300 hover:bg-slate-800/40"
              >
                <Plus size={14} /> Ajouter une étape
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {draft.id && (
                  <>
                    <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-300">
                      <Trash2 size={15} /> Supprimer
                    </button>
                    <button
                      onClick={() => setDraft({ ...draft, id: null, name: `${draft.name} (copie)`, items: draft.items.map((i) => ({ ...i, key: newKey() })) })}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <Copy size={15} /> Dupliquer
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {message && <span className={cn('text-sm', message.kind === 'ok' ? 'text-emerald-400' : 'text-rose-300')}>{message.text}</span>}
                <button
                  onClick={save}
                  disabled={!dirty || saving || !draft.name.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 disabled:opacity-40 disabled:shadow-none"
                >
                  <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
            Sélectionnez ou créez un modèle.
          </div>
        )}
      </div>
    </>
  );
}
