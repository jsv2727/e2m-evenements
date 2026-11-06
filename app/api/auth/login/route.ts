import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, readAuthConfig, verifyPassword } from '@/lib/auth';

const bodySchema = z.object({ password: z.string().min(1).max(256) });

// Limitation des tentatives par IP (mémoire du processus : suffisant pour une instance unique).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string, now: number): boolean {
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  const entry = attempts.get(ip);
  return !!entry && entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string, now: number) {
  const entry = attempts.get(ip);
  if (entry) entry.count++;
  else attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
}

export async function POST(req: Request) {
  const config = readAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Connexion non configurée : définir TEAM_PASSWORD et AUTH_SECRET (32 caractères min.) sur le serveur." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const now = Date.now();
  if (isRateLimited(ip, now)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await verifyPassword(config, parsed.data.password))) {
    recordFailure(ip, now);
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
