import Stripe from 'stripe';
import { stripeSecretKey } from '@/lib/billing';
import { getStripe, handleStripeEvent } from '@/lib/billing-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
  if (!stripeSecretKey() || !secret.startsWith('whsec_')) {
    return Response.json({ error: 'Stripe er ikke sat op.' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Manglende signatur.' }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('stripe signature failed', error instanceof Error ? error.name : 'unknown');
    return Response.json({ error: 'Ugyldig signatur.' }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error('stripe webhook failed', event.type, error instanceof Error ? error.name : 'unknown');
    return Response.json({ error: 'Webhook kunne ikke behandles.' }, { status: 500 });
  }
  return Response.json({ received: true });
}
