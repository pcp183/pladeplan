import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { DatabaseNotConfiguredError } from '@/lib/db';
import { confirmationMatches } from '@/lib/confirm';
import { clerkConfigured } from '@/lib/env';
import { deleteAllProjects, listProjects } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function problem(message: string, code: string, status: number) {
  return Response.json({ error: message, code }, { status });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function requireUser(): Promise<{ userId: string } | Response> {
  if (!clerkConfigured()) return problem('Login er ikke sat op endnu.', 'no_auth', 503);
  const { userId } = await auth();
  if (!userId) return problem('Log ind for at bruge din konto.', 'unauthorized', 401);
  return { userId };
}

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof Response) return gate;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || null;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null;
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let storage: 'database' | 'not_configured' = 'database';
  try {
    projects = await listProjects(gate.userId);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) storage = 'not_configured';
    else {
      console.error('account export failed', error instanceof Error ? error.name : 'unknown');
      return problem('Kunne ikke hente dine data.', 'server', 500);
    }
  }
  const body = {
    exportedAt: new Date().toISOString(),
    storage,
    account: { id: gate.userId, name, email },
    projects,
    note:
      storage === 'not_configured'
        ? 'Databasen er ikke konfigureret, så der ligger ingen skæresedler på serveren.'
        : 'Dette er alle skæresedler, Pladeplan har gemt for kontoen. Der findes ingen separat arkivkopi.',
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="pladeplan-data.json"',
      'cache-control': 'no-store',
    },
  });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return problem('Forespørgslen blev afvist.', 'bad_origin', 403);
  const gate = await requireUser();
  if (gate instanceof Response) return gate;
  let text = '';
  try {
    text = await request.text();
  } catch {
    return problem('Ugyldig forespørgsel.', 'bad_request', 400);
  }
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return problem('Ugyldig JSON.', 'bad_request', 400);
  }
  const typed = body && typeof body === 'object' && 'email' in body ? String((body as { email: unknown }).email ?? '') : '';
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || null;
  if (!confirmationMatches(email, typed)) {
    return problem('Bekræftelsen matcher ikke din e-mail.', 'confirmation', 400);
  }

  let removed = 0;
  let storage: 'database' | 'not_configured' = 'database';
  try {
    removed = await deleteAllProjects(gate.userId);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) storage = 'not_configured';
    else {
      console.error('account project delete failed', error instanceof Error ? error.name : 'unknown');
      return problem('Skæresedlerne kunne ikke slettes. Kontoen er ikke slettet.', 'projects', 500);
    }
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(gate.userId);
  } catch (error) {
    console.error('clerk user delete failed', error instanceof Error ? error.name : 'unknown');
    return problem(
      storage === 'database'
        ? 'Skæresedlerne er slettet, men kontoen hos login-tjenesten kunne ikke slettes. Prøv igen.'
        : 'Kontoen kunne ikke slettes. Prøv igen.',
      'clerk',
      500,
    );
  }

  return Response.json({
    ok: true,
    storage,
    projectsRemoved: removed,
  });
}
