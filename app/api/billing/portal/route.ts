import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkConfigured } from '@/lib/env';
import { isMissingStripeResource, startPortal } from '@/lib/billing-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function problem(message: string, code: string, status: number) {
  return Response.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  if (!clerkConfigured()) return problem('Login er ikke sat op endnu.', 'no_auth', 503);
  const { userId } = await auth();
  if (!userId) return problem('Log ind for at administrere abonnementet.', 'unauthorized', 401);
  const user = await currentUser();

  try {
    const result = await startPortal({
      request,
      userId,
      metadata: user?.publicMetadata,
    });
    if ('error' in result) return problem(result.error, result.code, result.status);
    return Response.json({ url: result.url });
  } catch (error) {
    console.error('portal failed', error instanceof Error ? error.name : 'unknown');
    if (isMissingStripeResource(error)) {
      return problem('Der er ikke noget abonnement at administrere endnu.', 'no_customer', 404);
    }
    return problem('Kundeportalen kunne ikke åbnes. Prøv igen.', 'stripe', 502);
  }
}
