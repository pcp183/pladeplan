import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountData } from '@/components/AccountData';
import { BillingPanel } from '@/components/BillingPanel';
import { SignOutControl } from '@/components/SignOutControl';
import { SiteHeader } from '@/components/SiteHeader';
import { SetupNotice } from '@/components/SetupNotice';
import {
  billingConfigured,
  blocksNewCheckout,
  hasProAccess,
  isCheckoutSessionId,
  offerTitle,
  periodSentence,
  proBadge,
  stripeKeyMode,
  type PlanSnapshot,
} from '@/lib/billing';
import { loadPlan } from '@/lib/billing-store';
import { loadOffers, syncCheckoutSession } from '@/lib/billing-server';
import { DatabaseNotConfiguredError } from '@/lib/db';
import { clerkConfigured } from '@/lib/env';
import { listProjects } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Konto',
};

type Flash = 'cancelled' | 'pending' | 'synced' | 'unknown' | null;

function badgeTone(snapshot: PlanSnapshot, configured: boolean): 'wait' | 'pro' | 'warn' | '' {
  if (!configured && snapshot.status === 'none') return 'wait';
  if (snapshot.status === 'past_due' || (hasProAccess(snapshot) && snapshot.cancelAtPeriodEnd)) return 'warn';
  if (hasProAccess(snapshot)) return 'pro';
  if (snapshot.status === 'none') return '';
  return 'wait';
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ betaling?: string; session_id?: string }>;
}) {
  if (!clerkConfigured()) {
    return (
      <div className="authpage">
        <SiteHeader />
        <main className="authmain">
          <SetupNotice />
        </main>
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const user = await currentUser();
  const query = await searchParams;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Skæreseddel-bruger';
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || '—';

  if (isCheckoutSessionId(query.session_id)) {
    let destination = '/konto?betaling=ukendt';
    try {
      const synced = await syncCheckoutSession(userId, query.session_id, user?.publicMetadata);
      if (synced && hasProAccess(synced)) destination = '/konto?betaling=aktiv';
      else if (synced) destination = '/konto?betaling=afventer';
    } catch (error) {
      console.error('checkout sync failed', error instanceof Error ? error.name : 'unknown');
      destination = '/konto?betaling=afventer';
    }
    redirect(destination);
  }

  let projectCount: number | null = null;
  let databaseReady = true;
  try {
    projectCount = (await listProjects(userId)).length;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) databaseReady = false;
    else throw error;
  }

  const configured = billingConfigured();
  const plan = await loadPlan(userId, user?.publicMetadata);
  const offers = configured && !blocksNewCheckout(plan.status) ? await loadOffers() : [];
  const flash: Flash =
    query.betaling === 'annulleret'
      ? 'cancelled'
      : query.betaling === 'aktiv'
        ? 'synced'
        : query.betaling === 'afventer'
          ? 'pending'
          : query.betaling === 'ukendt'
            ? 'unknown'
            : null;

  return (
    <div className="authpage">
      <SiteHeader trailing={<SignOutControl />} />
      <main className="account">
        <h1>Konto</h1>
        <p className="lead">Din profil og abonnementsstatus. Skæreplanen kan stadig bruges uden login.</p>
        <div className="stack">
          <section className="card pad">
            <h2>Profil</h2>
            <div className="kv">
              <span>Navn</span>
              <strong>{name}</strong>
              <span>E-mail</span>
              <strong>{email}</strong>
            </div>
            <div className="accountactions">
              <SignOutControl />
              <a className="btn primary" href="/">
                Åbn skæreplanen
              </a>
            </div>
          </section>
          <section className="card pad" id="abonnement">
            <h2>Abonnement</h2>
            <BillingPanel
              configured={configured}
              testMode={stripeKeyMode() === 'test'}
              planName={hasProAccess(plan) ? 'Pro' : 'Gratis'}
              badge={proBadge(plan, configured)}
              badgeTone={badgeTone(plan, configured)}
              periodText={periodSentence(plan)}
              projectCount={projectCount}
              offers={offers.map((offer) => ({
                slot: offer.slot,
                title: offerTitle(offer.interval, offer.slot),
                amountLabel: offer.amountLabel,
              }))}
              canManage={Boolean(plan.stripeSubscriptionId)}
              flash={flash}
            />
          </section>
          <section className="card pad">
            <h2>Skæresedler</h2>
            {databaseReady ? (
              <p>
                Når du er logget ind, gemmes skæresedler på din konto og kan åbnes fra andre enheder. En kladde, du
                ikke har trykket «Gem» på, bliver på denne enhed.
              </p>
            ) : (
              <div className="notice">
                Databasen er ikke konfigureret endnu. Skæresedler gemmes lokalt i browseren, indtil{' '}
                <span className="mono">DATABASE_URL</span> er sat. Se README.
              </div>
            )}
          </section>
          <AccountData email={email === '—' ? null : email} />
        </div>
      </main>
    </div>
  );
}
