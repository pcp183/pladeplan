import { auth, currentUser } from '@clerk/nextjs/server';
import { parseKnownMeasures } from '@/lib/cabinet-parts';
import { billingConfigured, hasProAccess } from '@/lib/billing';
import { loadPlan } from '@/lib/billing-store';
import { clerkConfigured } from '@/lib/env';
import { decodePhotoPayload } from '@/lib/photo-image';
import {
  canUsePhotoCabinet,
  isPhotoAllowlisted,
  parseAllowlist,
  photoAiConfigured,
  type PhotoAccessCode,
} from '@/lib/photo-access';
import { takePhotoSlot } from '@/lib/photo-rate';
import { proposeCabinetFromPhoto } from '@/lib/photo-vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NOT_CONFIGURED = 'Foto-funktionen er ikke sat op endnu.';

function problem(message: string, code: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message, code }, { status, headers: { 'cache-control': 'no-store', ...headers } });
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

function userEmails(user: Awaited<ReturnType<typeof currentUser>>): string[] {
  if (!user) return [];
  const found = [user.primaryEmailAddress?.emailAddress, ...(user.emailAddresses ?? []).map((item) => item.emailAddress)];
  return found.filter((email): email is string => Boolean(email));
}

async function accessFor(userId: string | null, emails: string[], metadata: unknown, request: Request) {
  const aiReady = photoAiConfigured(process.env, request.headers.get('x-vercel-oidc-token'));
  if (!userId) {
    return { signedIn: false, allowed: false, aiReady, code: 'unauthorized' as PhotoAccessCode };
  }
  const allowlisted = isPhotoAllowlisted(userId, emails, parseAllowlist(process.env.PHOTO_CABINET_ALLOWLIST));
  let pro = false;
  if (!allowlisted && billingConfigured()) {
    const plan = await loadPlan(userId, metadata);
    pro = hasProAccess(plan);
  }
  const allowed = canUsePhotoCabinet({ billingReady: billingConfigured(), pro, allowlisted });
  return {
    signedIn: true,
    allowed,
    aiReady,
    code: (allowed ? 'ok' : 'pro_required') as PhotoAccessCode,
  };
}

async function signedInUser(): Promise<{ userId: string; emails: string[]; metadata: unknown } | null> {
  if (!clerkConfigured()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return { userId, emails: userEmails(user), metadata: user?.publicMetadata };
}

export async function GET(request: Request) {
  try {
    const session = await signedInUser();
    const access = await accessFor(session?.userId ?? null, session?.emails ?? [], session?.metadata, request);
    return Response.json(access, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('photo cabinet status failed', error instanceof Error ? error.name : 'unknown');
    return problem('Fotoet kunne ikke startes. Prøv igen.', 'server', 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem('Forespørgslen blev afvist.', 'bad_origin', 403);
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > 6_000_000) return problem('Billedet er for stort.', 'invalid_image', 413);

  let session: { userId: string; emails: string[]; metadata: unknown } | null;
  try {
    session = await signedInUser();
  } catch (error) {
    console.error('photo cabinet auth failed', error instanceof Error ? error.name : 'unknown');
    return problem('Log ind for at bruge foto til skæreseddel.', 'unauthorized', 401);
  }
  if (!session) return problem('Log ind for at bruge foto til skæreseddel.', 'unauthorized', 401);

  let access: Awaited<ReturnType<typeof accessFor>>;
  try {
    access = await accessFor(session.userId, session.emails, session.metadata, request);
  } catch (error) {
    console.error('photo cabinet access failed', error instanceof Error ? error.name : 'unknown');
    return problem('Fotoet kunne ikke startes. Prøv igen.', 'server', 500);
  }
  if (!access.allowed) {
    return problem('Foto til skæreseddel hører til Pro.', 'pro_required', 403);
  }
  if (!access.aiReady) return problem(NOT_CONFIGURED, 'ai_not_configured', 503);

  let body: { mediaType?: unknown; imageBase64?: unknown; widthMm?: unknown; heightMm?: unknown };
  try {
    const text = await request.text();
    if (text.length > 6_000_000) return problem('Billedet er for stort.', 'invalid_image', 413);
    body = JSON.parse(text) as typeof body;
  } catch {
    return problem('Billedet kunne ikke læses.', 'invalid_image', 400);
  }

  const measures = parseKnownMeasures({ widthMm: body.widthMm, heightMm: body.heightMm });
  if (!measures.ok) return problem(measures.error, 'invalid_measure', 400);
  const photo = decodePhotoPayload({ mediaType: body.mediaType, imageBase64: body.imageBase64 });
  if (!photo.ok) return problem(photo.error, 'invalid_image', 400);

  const slot = takePhotoSlot(session.userId);
  if (!slot.ok) {
    return problem('Der er brugt for mange foto lige nu. Vent et øjeblik, og prøv igen.', 'rate_limited', 429, {
      'retry-after': String(slot.retryAfterSec),
    });
  }

  const proposal = await proposeCabinetFromPhoto({
    bytes: photo.photo.bytes,
    mediaType: photo.photo.mediaType,
    widthMm: measures.widthMm,
    heightMm: measures.heightMm,
    abortSignal: request.signal,
  });
  if (!proposal.ok) {
    const message =
      proposal.code === 'invalid_cabinet'
        ? 'Forslaget kunne ikke bruges. Prøv igen.'
        : 'Fotoet kunne ikke læses. Prøv et andet billede.';
    return problem(message, proposal.code, proposal.code === 'invalid_cabinet' ? 422 : 502);
  }

  return Response.json(
    { cabinet: proposal.cabinet, note: proposal.note },
    { headers: { 'cache-control': 'no-store' } },
  );
}
