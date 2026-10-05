/** Adgang til foto til skæreseddel. Ingen netværkskald. */

export type PhotoAccessCode = 'ok' | 'unauthorized' | 'pro_required' | 'ai_not_configured';

function trimmed(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isPhotoAllowlisted(userId: string, emails: string[], allowlist: string[]): boolean {
  if (!userId || allowlist.length === 0) return false;
  if (allowlist.includes(userId)) return true;
  const emailsLower = new Set(allowlist.map((item) => item.toLowerCase()));
  return emails.some((email) => emailsLower.has(email.trim().toLowerCase()));
}

/**
 * Allowlisten gælder altid. Pro gælder kun, når betaling er sat op.
 * Uden begge dele er funktionen en Pro-forhåndsvisning.
 */
export function canUsePhotoCabinet(input: { billingReady: boolean; pro: boolean; allowlisted: boolean }): boolean {
  if (input.allowlisted) return true;
  return input.billingReady && input.pro;
}

export function photoAiConfigured(env: NodeJS.ProcessEnv = process.env, headerToken?: string | null): boolean {
  if (trimmed(env, 'AI_GATEWAY_API_KEY')) return true;
  if (trimmed(env, 'VERCEL_OIDC_TOKEN')) return true;
  return Boolean(headerToken && headerToken.trim());
}

export const DEFAULT_PHOTO_MODEL = 'google/gemini-3.8-flash';

export function photoModel(env: NodeJS.ProcessEnv = process.env): string {
  const raw = trimmed(env, 'PHOTO_CABINET_MODEL');
  if (/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i.test(raw)) return raw;
  return DEFAULT_PHOTO_MODEL;
}

const PRICE_NOTE = /kr\b|dkk|pris|euro|\$|£|€/i;

export function safeCabinetNote(note: unknown): string {
  const fallback = 'Forslag ud fra fotoet. Kontrollér målene, før du skærer.';
  if (typeof note !== 'string') return fallback;
  const text = note.replace(/\s+/g, ' ').trim();
  if (!text || PRICE_NOTE.test(text)) return fallback;
  return text.slice(0, 180);
}
