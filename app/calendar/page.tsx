import { Suspense } from 'react';
import CalendarApp from '@/components/calendar/CalendarApp';

export const metadata = { title: 'Calendrier des activités — E2M' };

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="m-6 h-[720px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />}>
      <CalendarApp />
    </Suspense>
  );
}
