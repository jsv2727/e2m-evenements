import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonths,
  calendarRangeSchema,
  diffDays,
  isDateKey,
  monthGrid,
  offsetLabel,
  startOfWeek,
  taskCreateSchema,
  templateSchema,
  toDateKey,
} from './calendar';

test('isDateKey rejette les dates impossibles', () => {
  assert.equal(isDateKey('2026-13-01'), false);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('2026-1-01'), false);
  assert.equal(isDateKey('2028-02-29'), true);
});

test('arithmétique de dates indépendante du fuseau et de l\'heure d\'été', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-01');
  assert.equal(diffDays('2026-12-05', '2026-11-06'), 29);
  assert.equal(toDateKey(new Date('2026-05-01')), '2026-05-01');
});

test('grille mensuelle : 6 semaines commençant le dimanche', () => {
  const grid = monthGrid('2026-11-15');
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2026-11-01');
  assert.equal(startOfWeek('2026-11-06'), '2026-11-01');
});

test('libellés de rétroplanning', () => {
  assert.equal(offsetLabel(-75), 'J-75');
  assert.equal(offsetLabel(0), 'Jour J');
  assert.equal(offsetLabel(7), 'J+7');
});

test('validation des entrées API', () => {
  assert.equal(calendarRangeSchema.safeParse({ from: '2026-01-01', to: '2027-12-31' }).success, false);
  assert.equal(calendarRangeSchema.safeParse({ from: '2026-12-01', to: '2026-11-01' }).success, false);
  assert.equal(calendarRangeSchema.safeParse({ from: '2026-11-01', to: '2026-12-12' }).success, true);

  const task = taskCreateSchema.parse({ eventId: 'e1', title: '  Envoyer invitations  ', assignee: '' });
  assert.equal(task.title, 'Envoyer invitations');
  assert.equal(task.assignee, null);
  assert.equal(task.status, 'TODO');
  assert.equal(taskCreateSchema.safeParse({ eventId: 'e1', title: '' }).success, false);
  assert.equal(taskCreateSchema.safeParse({ eventId: 'e1', title: 'x', priority: 'CRITICAL' }).success, false);

  assert.equal(templateSchema.safeParse({ name: 'X', items: [{ title: 'a', offsetDays: 1.5 }] }).success, false);
});
