import Stripe from 'stripe';
import {
  billingConfigured,
  blocksNewCheckout,
  checkoutInterval,
  customerIdOf,
  formatStripeAmount,
  isStripeRedirect,
  portalSetupError,
  priceIdForInterval,
  snapshotFromSubscription,
  stripeSecretKey,
  withSubscriptionId,
  type BillingInterval,
  type PlanSnapshot,
} from './billing';
import { deleteBillingRow, findUserIdByCustomer, loadPlan, persistPlan, rememberCustomer } from './billing-store';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) throw new Error('STRIPE_NOT_CONFIGURED');
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function isMissingStripeResource(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing';
}

export type PriceOffer = {
  slot: BillingInterval;
  interval: string | null;
  amountLabel: string | null;
};

function appOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return null;
  try {
    const url = new URL(origin);
    if (url.host !== host) return null;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function existingCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer.id;
  } catch (error) {
    if (isMissingStripeResource(error)) return null;
    throw error;
  }
}

export async function ensureCustomer(
  userId: string,
  email: string | null,
  name: string | null,
  knownCustomerId: string | null,
): Promise<string> {
  if (knownCustomerId) {
    const existing = await existingCustomer(knownCustomerId);
    if (existing) return existing;
  }
  const created = await getStripe().customers.create(
    {
      email: email ?? undefined,
      name: name ?? undefined,
      metadata: { clerkUserId: userId },
    },
    { idempotencyKey: `pladeplan-customer-${userId}-${knownCustomerId ?? 'new'}` },
  );
  if (knownCustomerId && created.id === knownCustomerId) {
    const again = await getStripe().customers.create(
      {
        email: email ?? undefined,
        name: name ?? undefined,
        metadata: { clerkUserId: userId },
      },
      { idempotencyKey: `pladeplan-customer-${userId}-replaced-${created.id}` },
    );
    await rememberCustomer(userId, again.id);
    return again.id;
  }
  await rememberCustomer(userId, created.id);
  return created.id;
}

export async function portalUrl(customerId: string, origin: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/konto#abonnement`,
    locale: 'da',
  });
  if (!isStripeRedirect(session.url)) throw new Error('STRIPE_REDIRECT');
  return session.url;
}

export async function startCheckout(input: {
  request: Request;
  userId: string;
  email: string | null;
  name: string | null;
  metadata: unknown;
  interval: unknown;
}): Promise<{ url: string } | { error: string; status: number; code: string }> {
  if (!billingConfigured()) {
    return { error: 'Pro er ikke sat op endnu.', status: 503, code: 'not_configured' };
  }
  const origin = appOrigin(input.request);
  if (!origin) return { error: 'Forespørgslen blev afvist.', status: 403, code: 'bad_origin' };
  const interval = checkoutInterval(input.interval);
  if (!interval) return { error: 'Vælg månedligt eller årligt.', status: 400, code: 'bad_interval' };
  const priceId = priceIdForInterval(interval);
  if (!priceId) return { error: 'Den periode er ikke sat op.', status: 400, code: 'no_price' };

  const plan = await loadPlan(input.userId, input.metadata);
  const customerId = await ensureCustomer(input.userId, input.email, input.name, plan.stripeCustomerId);

  if (blocksNewCheckout(plan.status)) {
    try {
      return { url: await portalUrl(customerId, origin) };
    } catch (error) {
      if (portalSetupError(error)) {
        return { error: 'Kundeportalen er ikke slået til i Stripe endnu. Se README.', status: 503, code: 'portal' };
      }
      throw error;
    }
  }

  const price = await getStripe().prices.retrieve(priceId);
  if (!price.active || price.type !== 'recurring') {
    return { error: 'Prisen er ikke aktiv i Stripe.', status: 503, code: 'inactive_price' };
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: input.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/konto?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/konto?betaling=annulleret`,
    locale: 'da',
    metadata: { clerkUserId: input.userId },
    subscription_data: {
      metadata: { clerkUserId: input.userId },
    },
    custom_text: {
      submit: {
        message: 'Abonnementet fortsætter, indtil du opsiger det. Kortoplysninger gemmes hos Stripe, ikke i Pladeplan.',
      },
    },
  });
  if (!session.url || !isStripeRedirect(session.url)) {
    return { error: 'Stripe svarede uden et gyldigt link.', status: 502, code: 'stripe' };
  }
  return { url: session.url };
}

export async function startPortal(input: {
  request: Request;
  userId: string;
  metadata: unknown;
}): Promise<{ url: string } | { error: string; status: number; code: string }> {
  if (!billingConfigured()) {
    return { error: 'Pro er ikke sat op endnu.', status: 503, code: 'not_configured' };
  }
  const origin = appOrigin(input.request);
  if (!origin) return { error: 'Forespørgslen blev afvist.', status: 403, code: 'bad_origin' };
  const plan = await loadPlan(input.userId, input.metadata);
  if (!plan.stripeCustomerId) {
    return { error: 'Der er ikke noget abonnement at administrere endnu.', status: 404, code: 'no_customer' };
  }
  const customerId = await existingCustomer(plan.stripeCustomerId);
  if (!customerId) {
    return { error: 'Der er ikke noget abonnement at administrere endnu.', status: 404, code: 'no_customer' };
  }
  try {
    return { url: await portalUrl(customerId, origin) };
  } catch (error) {
    if (portalSetupError(error)) {
      return { error: 'Kundeportalen er ikke slået til i Stripe endnu. Se README.', status: 503, code: 'portal' };
    }
    throw error;
  }
}

async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromSubscription = subscription.metadata?.clerkUserId?.trim();
  if (fromSubscription) return fromSubscription;
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return null;
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer.deleted) {
      const fromCustomer = customer.metadata?.clerkUserId?.trim();
      if (fromCustomer) return fromCustomer;
    }
  } catch (error) {
    if (!isMissingStripeResource(error)) throw error;
  }
  return findUserIdByCustomer(customerId);
}

export async function syncSubscription(
  subscription: Stripe.Subscription,
  eventCreated: number,
  metadata: unknown = null,
): Promise<PlanSnapshot | null> {
  const userId = await resolveUserId(subscription);
  if (!userId) {
    console.error('stripe subscription missing clerk user', subscription.id);
    return null;
  }
  const snapshot = withSubscriptionId(snapshotFromSubscription(subscription, eventCreated), subscription.id);
  const customerId = snapshot.stripeCustomerId ?? customerIdOf(subscription.customer);
  const next = customerId === snapshot.stripeCustomerId ? snapshot : { ...snapshot, stripeCustomerId: customerId };
  const applied = await persistPlan(userId, next);
  if (applied) return next;
  return loadPlan(userId, metadata);
}

export async function syncCheckoutSession(
  userId: string,
  sessionId: string,
  metadata: unknown = null,
): Promise<PlanSnapshot | null> {
  if (!stripeSecretKey()) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const owner = session.client_reference_id || session.metadata?.clerkUserId || null;
  if (owner !== userId) return null;
  const customerId = customerIdOf(session.customer);
  if (customerId) await rememberCustomer(userId, customerId);
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return loadPlan(userId, metadata);
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  if (!subscription.metadata?.clerkUserId) {
    subscription.metadata = { ...subscription.metadata, clerkUserId: userId };
  }
  return syncSubscription(subscription, Math.floor(Date.now() / 1000), metadata);
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') return;
      const userId = session.client_reference_id || session.metadata?.clerkUserId || null;
      const customerId = customerIdOf(session.customer);
      if (userId && customerId) await rememberCustomer(userId, customerId);
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!subscriptionId) return;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription, event.created);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object, event.created);
      return;
    default:
      return;
  }
}

export async function loadOffers(): Promise<PriceOffer[]> {
  if (!billingConfigured()) return [];
  const slots: BillingInterval[] = ['month', 'year'];
  const offers: PriceOffer[] = [];
  for (const slot of slots) {
    const priceId = priceIdForInterval(slot);
    if (!priceId) continue;
    try {
      const price = await getStripe().prices.retrieve(priceId);
      if (!price.active || price.type !== 'recurring') continue;
      offers.push({
        slot,
        interval: price.recurring?.interval ?? null,
        amountLabel: formatStripeAmount(price.unit_amount, price.currency, price.recurring?.interval ?? null),
      });
    } catch (error) {
      console.error('stripe price failed', error instanceof Error ? error.name : 'unknown');
      offers.push({ slot, interval: slot, amountLabel: null });
    }
  }
  return offers;
}

export async function purgeBilling(userId: string, metadata: unknown): Promise<void> {
  const plan = await loadPlan(userId, metadata);
  if (plan.stripeCustomerId && stripeSecretKey()) {
    try {
      await getStripe().customers.del(plan.stripeCustomerId);
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  } else if (plan.stripeCustomerId) {
    console.error('stripe customer left in place because STRIPE_SECRET_KEY is missing');
  }
  await deleteBillingRow(userId);
}
