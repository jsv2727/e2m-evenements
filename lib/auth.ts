/**
 * Authentification par mot de passe d'équipe.
 *
 * - Session : cookie httpOnly signé HMAC-SHA256 « <expiration>.<signature> ».
 * - Clé de signature dérivée de AUTH_SECRET + TEAM_PASSWORD : changer le mot de
 *   passe invalide immédiatement toutes les sessions existantes.
 * - Web Crypto uniquement : utilisable dans le middleware (Edge) et en Node.
 */

export const SESSION_COOKIE = 'e2m_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours
const MIN_SECRET_LENGTH = 32;

type AuthConfig = { secret: string; password: string };

export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const secret = env.AUTH_SECRET ?? '';
  const password = env.TEAM_PASSWORD ?? '';
  if (secret.length < MIN_SECRET_LENGTH || password.length === 0) return null;
  return { secret, password };
}

const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function signingKey({ secret, password }: AuthConfig): Promise<CryptoKey> {
  const material = `${secret}\u0000${password}`;
  let key = keyCache.get(material);
  if (!key) {
    key = crypto.subtle.importKey('raw', encoder.encode(material), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keyCache.clear();
    keyCache.set(material, key);
  }
  return key;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(config: AuthConfig, message: string): Promise<string> {
  return toBase64Url(await crypto.subtle.sign('HMAC', await signingKey(config), encoder.encode(message)));
}

/** Comparaison à temps constant (longueur comprise). */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function verifyPassword(config: AuthConfig, candidate: string): Promise<boolean> {
  const [given, expected] = await Promise.all([hmac(config, `pw:${candidate}`), hmac(config, `pw:${config.password}`)]);
  return safeEqual(given, expected);
}

export async function createSessionToken(config: AuthConfig, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(config, `session:${exp}`)}`;
}

export async function verifySessionToken(config: AuthConfig, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp * 1000 <= now) return false;
  return safeEqual(sig, await hmac(config, `session:${exp}`));
}

/** Jeton du flux iCalendar (les agendas externes ne transmettent pas de cookie). */
export function calendarFeedToken(config: AuthConfig): Promise<string> {
  return hmac(config, 'ics-feed');
}

export async function verifyCalendarFeedToken(config: AuthConfig, token: string | null): Promise<boolean> {
  return !!token && safeEqual(token, await calendarFeedToken(config));
}

/** N'autorise que des redirections internes (anti open-redirect). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) return '/';
  return next;
}
