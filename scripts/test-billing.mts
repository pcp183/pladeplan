import assert from 'node:assert/strict';
import {
  billingConfigured,
  blocksNewCheckout,
  formatDanishDate,
  formatStripeAmount,
  freePlan,
  hasProAccess,
  isCheckoutSessionId,
  isProStatus,
  isStripeRedirect,
  offerTitle,
  periodSentence,
  planPill,
  priceIdForInterval,
  proBadge,
  shouldApplyEvent,
  snapshotFromMetadata,
  snapshotFromSubscription,
  statusLabel,
  subscriptionExport,
  withSubscriptionId,
} from '../lib/billing.ts';
import { applyPlanPill } from '../lib/plan-pill.ts';
import { PLANNER_MARKUP } from '../lib/planner-markup.ts';

const secret = `sk_test_${'a'.repeat(24)}`;
const publishable = `pk_test_${'b'.repeat(24)}`;
const webhook = `whsec_${'c'.repeat(16)}`;
const ready = {
  STRIPE_SECRET_KEY: secret,
  STRIPE_WEBHOOK_SECRET: webhook,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: publishable,
  STRIPE_PRICE_PRO_MONTHLY: 'price_monthly123',
  STRIPE_PRICE_PRO_YEARLY: '',
} as NodeJS.ProcessEnv;

assert.equal(billingConfigured({} as NodeJS.ProcessEnv), false);
assert.equal(billingConfigured(ready), true);
assert.equal(
  billingConfigured({ ...ready, STRIPE_PRICE_PRO_MONTHLY: '', STRIPE_PRICE_PRO_YEARLY: 'price_year123' }),
  true,
);
assert.equal(billingConfigured({ ...ready, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: `pk_live_${'b'.repeat(24)}` }), false);
assert.equal(billingConfigured({ ...ready, STRIPE_WEBHOOK_SECRET: '' }), false);
assert.equal(billingConfigured({ ...ready, STRIPE_PRICE_PRO_MONTHLY: 'not-a-price' }), false);
assert.equal(priceIdForInterval('month', ready), 'price_monthly123');
assert.equal(priceIdForInterval('year', ready), null);

assert.equal(isProStatus('active'), true);
assert.equal(isProStatus('trialing'), true);
assert.equal(isProStatus('past_due'), true);
assert.equal(isProStatus('canceled'), false);
assert.equal(isProStatus('unpaid'), false);
assert.equal(isProStatus('incomplete'), false);
assert.equal(blocksNewCheckout('incomplete'), true);
assert.equal(blocksNewCheckout('paused'), true);
assert.equal(blocksNewCheckout('canceled'), false);
assert.equal(shouldApplyEvent(null, 10), true);
assert.equal(shouldApplyEvent(10, 10), true);
assert.equal(shouldApplyEvent(11, 10), false);

const active = withSubscriptionId(
  snapshotFromSubscription(
    {
      status: 'active',
      customer: 'cus_123',
      cancel_at_period_end: false,
      current_period_end: 1,
      items: { data: [{ current_period_end: 1_780_000_000, price: { id: 'price_monthly123' } }] },
    },
    50,
  ),
  'sub_123',
);
assert.equal(active.plan, 'pro');
assert.equal(active.priceId, 'price_monthly123');
assert.equal(active.stripeSubscriptionId, 'sub_123');
assert.equal(active.currentPeriodEnd, new Date(1_780_000_000 * 1000).toISOString());
assert.equal(hasProAccess(active), true);
assert.equal(statusLabel('active', true), 'Opsiges ved periodens udløb');
assert.equal(proBadge(freePlan(), false), 'Kommer snart');
assert.equal(proBadge(freePlan(), true), 'Ikke aktivt');
assert.match(periodSentence(active) ?? '', /^Næste betaling /);

const fromMeta = snapshotFromMetadata({
  stripeStatus: 'past_due',
  stripeCustomerId: 'cus_123',
  stripeSubscriptionId: 'sub_123',
  stripeCancelAtPeriodEnd: false,
  stripeEventCreated: 9,
});
assert.ok(fromMeta);
assert.equal(fromMeta.plan, 'pro');
assert.equal(snapshotFromMetadata({ unrelated: true }), null);
assert.equal(subscriptionExport(freePlan()).note.includes('ikke registreret'), true);

const amount = formatStripeAmount(4900, 'dkk', 'month');
assert.ok(amount);
assert.equal(amount.replace(/\s/g, ' '), '49,00 kr. / md.');
const yen = formatStripeAmount(4900, 'jpy', 'year');
assert.ok(yen);
assert.equal(yen.replace(/\s/g, ' ').startsWith('4.900'), true);
assert.equal(yen.endsWith(' / år'), true);
assert.equal(formatStripeAmount(null, 'dkk', 'month'), null);
assert.equal(offerTitle('year', 'month'), 'Pro årligt');
assert.equal(formatDanishDate('2026-10-27T00:00:00.000Z'), '27. oktober 2026');

assert.equal(isStripeRedirect('https://checkout.stripe.com/c/pay/cs_test_abc'), true);
assert.equal(isStripeRedirect('https://billing.stripe.com/p/session/abc'), true);
assert.equal(isStripeRedirect('https://evil.example/checkout.stripe.com'), false);
assert.equal(isStripeRedirect('http://checkout.stripe.com/c/pay/cs_test_abc'), false);
assert.equal(isCheckoutSessionId('cs_test_abc123'), true);
assert.equal(isCheckoutSessionId('cs_live_abc123'), true);
assert.equal(isCheckoutSessionId('sub_123'), false);

assert.deepEqual(planPill({ billingReady: false, pro: false }).text, 'Gratis · Pro kommer snart');
assert.equal(planPill({ billingReady: true, pro: false }).text, 'Gratis · Opgrader');
assert.equal(planPill({ billingReady: true, pro: true }).pro, true);

const upgraded = applyPlanPill(PLANNER_MARKUP, planPill({ billingReady: true, pro: true }));
assert.match(upgraded, /class="planpill pro"/);
assert.match(upgraded, />Pro<\/a>/);
assert.equal(upgraded.includes('Gratis · Pro kommer snart'), false);
assert.equal(upgraded.includes('function pack'), false);
const escaped = applyPlanPill(PLANNER_MARKUP, { text: '<b>', title: 'a"b', pro: false });
assert.match(escaped, /title="a&quot;b"/);
assert.match(escaped, />&lt;b&gt;<\/a>/);

console.log('billing tests ok');
