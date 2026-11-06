import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_TTL_SECONDS,
  calendarFeedToken,
  createSessionToken,
  readAuthConfig,
  safeNextPath,
  verifyCalendarFeedToken,
  verifyPassword,
  verifySessionToken,
} from './auth';

const config = { secret: 'x'.repeat(32), password: 'Bateaux-Dragon-2026' };

test('configuration incomplète → accès fermé', () => {
  assert.equal(readAuthConfig({}), null);
  assert.equal(readAuthConfig({ TEAM_PASSWORD: 'a', AUTH_SECRET: 'trop-court' }), null);
  assert.deepEqual(readAuthConfig({ TEAM_PASSWORD: 'a', AUTH_SECRET: 'y'.repeat(32) }), { password: 'a', secret: 'y'.repeat(32) });
});

test('vérification du mot de passe', async () => {
  assert.equal(await verifyPassword(config, 'Bateaux-Dragon-2026'), true);
  assert.equal(await verifyPassword(config, 'bateaux-dragon-2026'), false);
  assert.equal(await verifyPassword(config, ''), false);
});

test('jeton de session : valide, expiré, falsifié, mot de passe changé', async () => {
  const now = Date.now();
  const token = await createSessionToken(config, now);
  assert.equal(await verifySessionToken(config, token, now), true);
  assert.equal(await verifySessionToken(config, token, now + (SESSION_TTL_SECONDS + 1) * 1000), false);
  const [exp, sig] = token.split('.');
  assert.equal(await verifySessionToken(config, `${Number(exp) + 9999}.${sig}`, now), false);
  assert.equal(await verifySessionToken(config, `${exp}.${sig!.slice(0, -1)}A`, now), false);
  assert.equal(await verifySessionToken({ ...config, password: 'nouveau' }, token, now), false);
  assert.equal(await verifySessionToken(config, undefined, now), false);
  assert.equal(await verifySessionToken(config, 'n.importe.quoi', now), false);
});

test('jeton du flux iCal', async () => {
  const token = await calendarFeedToken(config);
  assert.equal(await verifyCalendarFeedToken(config, token), true);
  assert.equal(await verifyCalendarFeedToken(config, null), false);
  assert.equal(await verifyCalendarFeedToken({ ...config, password: 'autre' }, token), false);
});

test('redirection après connexion limitée aux chemins internes', () => {
  assert.equal(safeNextPath('/calendar?vue=week'), '/calendar?vue=week');
  assert.equal(safeNextPath('//evil.com'), '/');
  assert.equal(safeNextPath('/\\evil.com'), '/');
  assert.equal(safeNextPath('https://evil.com'), '/');
  assert.equal(safeNextPath('/login'), '/');
  assert.equal(safeNextPath(null), '/');
});
