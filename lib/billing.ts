/** Pure billing rules. No Stripe SDK and no network. */

const ZERO_DECIMAL = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

const PRO_STATUSES = new Set(['active', 'trialing', 'past_due']);
const OPEN_CHECKOUT_BLOCK = new Set(['active', 'trialing', 'past_due', 'incomplete', 'paused']);

export type PlanName = 'free' | 'pro';

export type PlanSnapshot = {
  plan: PlanName;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastEventCreated: number;
};

export type SubscriptionLike = {
  status?: string | null;
  customer?: string | { id?: string | null } | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
      price?: string | { id?: string | null } | null;
    }> | null;
  } | null;
};

export type BillingInterval = 'month' | 'year';

function trimmed(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function stripeSecretKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = trimmed(env, 'STRIPE_SECRET_KEY');
  if ((secret.startsWith('sk_test_') || secret.startsWith('sk_live_')) && secret.length >= 24) return secret;
  return null;
}

export function billingConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = stripeSecretKey(env);
  const publishable = trimmed(env, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  const webhook = trimmed(env, 'STRIPE_WEBHOOK_SECRET');
  if (!secret) return false;
  if (!(publishable.startsWith('pk_test_') || publishable.startsWith('pk_live_')) || publishable.length < 24) return false;
  if (!webhook.startsWith('whsec_') || webhook.length < 16) return false;
  const secretMode = secret.startsWith('sk_test_') ? 'test' : 'live';
  const publishableMode = publishable.startsWith('pk_test_') ? 'test' : 'live';
  if (secretMode !== publishableMode) return false;
  return priceIdForInterval('month', env) !== null || priceIdForInterval('year', env) !== null;
}

export function stripeKeyMode(env: NodeJS.ProcessEnv = process.env): 'test' | 'live' | null {
  if (!billingConfigured(env)) return null;
  return stripeSecretKey(env)?.startsWith('sk_test_') ? 'test' : 'live';
}

export function priceIdForInterval(interval: BillingInterval, env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = trimmed(env, interval === 'month' ? 'STRIPE_PRICE_PRO_MONTHLY' : 'STRIPE_PRICE_PRO_YEARLY');
  if (!/^price_[A-Za-z0-9]+$/.test(raw)) return null;
  return raw;
}

export function checkoutInterval(value: unknown): BillingInterval | null {
  return value === 'month' || value === 'year' ? value : null;
}

export function offerTitle(interval: string | null, slot: BillingInterval): string {
  const cycle = interval ?? slot;
  if (cycle === 'year') return 'Pro årligt';
  if (cycle === 'month') return 'Pro månedligt';
  if (cycle === 'week') return 'Pro ugentligt';
  if (cycle === 'day') return 'Pro dagligt';
  return 'Pro';
}

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_(test|live)_[A-Za-z0-9]+$/.test(value) && value.length <= 255;
}

export function isStripeRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'checkout.stripe.com' || parsed.hostname === 'billing.stripe.com');
  } catch {
    return false;
  }
}

export function isProStatus(status: string | null | undefined): boolean {
  return PRO_STATUSES.has(status ?? '');
}

export function blocksNewCheckout(status: string | null | undefined): boolean {
  return OPEN_CHECKOUT_BLOCK.has(status ?? '');
}

export function hasProAccess(snapshot: PlanSnapshot): boolean {
  return isProStatus(snapshot.status);
}

/** Saved skæresedler on the free plan, once Stripe is configured. */
export const FREE_SAVED_PROJECTS = 3;

export const FREE_LIMIT_MESSAGE =
  'Den gratis plan kan gemme 3 skæresedler. Opgrader til Pro for ubegrænset antal.';

/**
 * null means unlimited. The cap stays off until billing is configured, and Pro
 * (active, trialing, past_due) is never capped.
 */
export function savedProjectLimit(pro: boolean, env: NodeJS.ProcessEnv = process.env): number | null {
  if (!billingConfigured(env)) return null;
  if (pro) return null;
  return FREE_SAVED_PROJECTS;
}

/**
 * A longer list is allowed when every id is already saved (re-save, rename,
 * delete). A new id is allowed only when the result is still within the limit.
 * null limit always allows the replace.
 */
export function allowsProjectReplace(
  existingIds: readonly string[],
  nextIds: readonly string[],
  limit: number | null,
): boolean {
  if (limit == null || !Number.isFinite(limit)) return true;
  const existing = new Set(existingIds);
  const next: string[] = [];
  const seen = new Set<string>();
  for (const id of nextIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  if (next.length <= limit) return true;
  return next.every((id) => existing.has(id));
}

export function shouldApplyEvent(previous: number | null | undefined, incoming: number): boolean {
  if (previous == null || !Number.isFinite(previous)) return true;
  return incoming >= previous;
}

export function freePlan(): PlanSnapshot {
  return {
    plan: 'free',
    status: 'none',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lastEventCreated: 0,
  };
}

export function unixToIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

export function customerIdOf(customer: SubscriptionLike['customer']): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id ?? null;
}

export function periodEndUnix(subscription: SubscriptionLike): number | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (typeof itemEnd === 'number') return itemEnd;
  if (typeof subscription.current_period_end === 'number') return subscription.current_period_end;
  return null;
}

export function priceIdOf(subscription: SubscriptionLike): string | null {
  const price = subscription.items?.data?.[0]?.price;
  if (!price) return null;
  if (typeof price === 'string') return price;
  return price.id ?? null;
}

export function snapshotFromSubscription(subscription: SubscriptionLike, eventCreated: number): PlanSnapshot {
  const status = subscription.status || 'none';
  return {
    plan: isProStatus(status) ? 'pro' : 'free',
    status,
    stripeCustomerId: customerIdOf(subscription.customer),
    stripeSubscriptionId: null,
    priceId: priceIdOf(subscription),
    currentPeriodEnd: unixToIso(periodEndUnix(subscription)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    lastEventCreated: eventCreated,
  };
}

export function withSubscriptionId(snapshot: PlanSnapshot, subscriptionId: string | null): PlanSnapshot {
  return { ...snapshot, stripeSubscriptionId: subscriptionId };
}

export function snapshotFromMetadata(metadata: unknown): PlanSnapshot | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const meta = metadata as Record<string, unknown>;
  const known = [
    'plan',
    'stripeStatus',
    'stripeCustomerId',
    'stripeSubscriptionId',
    'stripePriceId',
    'stripeCurrentPeriodEnd',
    'stripeCancelAtPeriodEnd',
    'stripeEventCreated',
  ];
  if (!known.some((key) => meta[key] != null && meta[key] !== '')) return null;
  const status = typeof meta.stripeStatus === 'string' && meta.stripeStatus ? meta.stripeStatus : 'none';
  const eventRaw = typeof meta.stripeEventCreated === 'number' ? meta.stripeEventCreated : Number(meta.stripeEventCreated ?? 0);
  return {
    plan: isProStatus(status) ? 'pro' : 'free',
    status,
    stripeCustomerId: typeof meta.stripeCustomerId === 'string' && meta.stripeCustomerId ? meta.stripeCustomerId : null,
    stripeSubscriptionId:
      typeof meta.stripeSubscriptionId === 'string' && meta.stripeSubscriptionId ? meta.stripeSubscriptionId : null,
    priceId: typeof meta.stripePriceId === 'string' && meta.stripePriceId ? meta.stripePriceId : null,
    currentPeriodEnd: typeof meta.stripeCurrentPeriodEnd === 'string' && meta.stripeCurrentPeriodEnd ? meta.stripeCurrentPeriodEnd : null,
    cancelAtPeriodEnd: meta.stripeCancelAtPeriodEnd === true,
    lastEventCreated: Number.isFinite(eventRaw) ? eventRaw : 0,
  };
}

export function billingMetadata(snapshot: PlanSnapshot): Record<string, string | number | boolean | null> {
  return {
    plan: snapshot.plan,
    stripeStatus: snapshot.status,
    stripeCustomerId: snapshot.stripeCustomerId,
    stripeSubscriptionId: snapshot.stripeSubscriptionId,
    stripePriceId: snapshot.priceId,
    stripeCurrentPeriodEnd: snapshot.currentPeriodEnd,
    stripeCancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeEventCreated: snapshot.lastEventCreated,
  };
}

export function formatStripeAmount(
  unitAmount: number | null | undefined,
  currency: string | null | undefined,
  interval: string | null | undefined,
): string | null {
  if (unitAmount == null || !Number.isFinite(unitAmount) || !currency) return null;
  const code = currency.toLowerCase();
  const major = ZERO_DECIMAL.has(code) ? unitAmount : unitAmount / 100;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat('da-DK', { style: 'currency', currency: code.toUpperCase() }).format(major);
  } catch {
    return null;
  }
  const suffix =
    interval === 'month' ? ' / md.' : interval === 'year' ? ' / år' : interval === 'week' ? ' / uge' : interval === 'day' ? ' / dag' : '';
  return `${formatted}${suffix}`;
}

export function formatDanishDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('da-DK', { dateStyle: 'long', timeZone: 'Europe/Copenhagen' }).format(date);
}

export function statusLabel(status: string, cancelAtPeriodEnd: boolean): string {
  if (isProStatus(status) && cancelAtPeriodEnd) return 'Opsiges ved periodens udløb';
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'trialing':
      return 'Prøveperiode';
    case 'past_due':
      return 'Betaling mangler';
    case 'canceled':
      return 'Opsagt';
    case 'unpaid':
      return 'Ubetalt';
    case 'incomplete':
      return 'Afventer betaling';
    case 'incomplete_expired':
      return 'Udløbet';
    case 'paused':
      return 'Sat på pause';
    default:
      return 'Ikke aktivt';
  }
}

export function proBadge(snapshot: PlanSnapshot, configured: boolean): string {
  if (!configured && snapshot.status === 'none') return 'Kommer snart';
  if (snapshot.status === 'none') return 'Ikke aktivt';
  return statusLabel(snapshot.status, snapshot.cancelAtPeriodEnd);
}

export function periodSentence(snapshot: PlanSnapshot): string | null {
  const date = formatDanishDate(snapshot.currentPeriodEnd);
  if (!date || !hasProAccess(snapshot)) return null;
  if (snapshot.cancelAtPeriodEnd) return `Adgang til Pro fortsætter til ${date}.`;
  if (snapshot.status === 'past_due') return `Betalingen for perioden frem til ${date} er ikke gået igennem.`;
  if (snapshot.status === 'trialing') return `Prøveperioden slutter ${date}.`;
  return `Næste betaling ${date}.`;
}

export function planPill(input: { billingReady: boolean; pro: boolean }): { text: string; title: string; pro: boolean } {
  if (!input.billingReady) {
    return {
      text: 'Gratis · Pro kommer snart',
      title: 'Pro kommer snart og kan ikke købes endnu. Pro vil give ubegrænset gemte skæresedler.',
      pro: false,
    };
  }
  if (input.pro) {
    return {
      text: 'Pro',
      title: 'Du har Skæreseddel Pro med ubegrænset gemte skæresedler. Administrer abonnementet under Konto.',
      pro: true,
    };
  }
  return {
    text: 'Gratis · Opgrader',
    title: 'Gratisplanen gemmer op til 3 skæresedler. Pro giver ubegrænset.',
    pro: false,
  };
}

export function subscriptionExport(snapshot: PlanSnapshot): {
  plan: PlanName;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  note: string;
} {
  return {
    plan: snapshot.plan,
    status: snapshot.status,
    stripeCustomerId: snapshot.stripeCustomerId,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    note:
      snapshot.status === 'none'
        ? 'Der er ikke registreret et abonnement på kontoen.'
        : 'Kortnummer og kvitteringer ligger hos Stripe, ikke i dette udtræk. Dette udtræk viser kun status.',
  };
}

export function portalSetupError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /portal/i.test(message) && /config/i.test(message);
}
