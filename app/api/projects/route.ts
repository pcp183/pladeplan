import { auth } from '@clerk/nextjs/server';
import { DatabaseNotConfiguredError } from '@/lib/db';
import { clerkConfigured } from '@/lib/env';
import { listProjects, parseProjectList, replaceProjects } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function problem(message: string, code: string, status: number) {
  return Response.json({ error: message, code }, { status });
}

async function requireUser(): Promise<{ userId: string } | Response> {
  if (!clerkConfigured()) {
    return problem('Login er ikke sat op endnu.', 'no_auth', 503);
  }
  const { userId } = await auth();
  if (!userId) return problem('Log ind for at bruge skæresedler på din konto.', 'unauthorized', 401);
  return { userId };
}

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof Response) return gate;
  try {
    const projects = await listProjects(gate.userId);
    return Response.json({ projects });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return problem('Database er ikke konfigureret.', 'no_database', 503);
    }
    console.error(error);
    return problem('Kunne ikke hente skæresedler.', 'server', 500);
  }
}

export async function PUT(request: Request) {
  const gate = await requireUser();
  if (gate instanceof Response) return gate;
  let text = '';
  try {
    text = await request.text();
  } catch {
    return problem('Ugyldig forespørgsel.', 'bad_request', 400);
  }
  if (text.length > 1_500_000) return problem('Listen er for stor.', 'too_large', 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem('Ugyldig JSON.', 'bad_request', 400);
  }
  const parsed = parseProjectList(body);
  if ('error' in parsed) return problem(parsed.error, 'bad_request', 400);
  try {
    await replaceProjects(gate.userId, parsed.projects);
    return Response.json({ projects: parsed.projects });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return problem('Database er ikke konfigureret.', 'no_database', 503);
    }
    console.error(error);
    return problem('Kunne ikke gemme skæresedler.', 'server', 500);
  }
}
