import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkConfigured } from '@/lib/env';
import { isMissingStripeResource, startCheckout } from '@/lib/billing-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function problem(message: string, code: string, status: number) {
  return Response.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  if (!clerkConfigured()) return problem('Login er ikke sat op endnu.', 'no_auth', 503);
  const { userId } = await auth();
  if (!userId) return problem('Log ind for at tegne Pro.', 'unauthorized', 401);

  let interval: unknown = null;
  try {
    const text = await request.text();
    const body = text ? (JSON.parse(text) as unknown) : {};
    interval = body && typeof body === 'object' && 'interval' in body ? (body as { interval: unknown }).interval : null;
  } catch {
    return problem('Ugyldig JSON.', 'bad_request', 400);
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || null;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null;

  try {
    const result = await startCheckout({
      request,
      userId,
      email,
      name,
      metadata: user?.publicMetadata,
      interval,
    });
    if ('error' in result) return problem(result.error, result.code, result.status);
    return Response.json({ url: result.url });
  } catch (error) {
    console.error('checkout failed', error instanceof Error ? error.name : 'unknown');
    if (isMissingStripeResource(error)) return problem('Prisen findes ikke i Stripe.', 'no_price', 400);
    return problem('Kassen kunne ikke åbnes. Prøv igen.', 'stripe', 502);
  }
}
