import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AccountData } from '@/components/AccountData';
import { SignOutControl } from '@/components/SignOutControl';
import { SiteHeader } from '@/components/SiteHeader';
import { SetupNotice } from '@/components/SetupNotice';
import { DatabaseNotConfiguredError } from '@/lib/db';
import { clerkConfigured } from '@/lib/env';
import { listProjects } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
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
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Pladeplan-bruger';
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || '—';

  let projectCount: number | null = null;
  let databaseReady = true;
  try {
    projectCount = (await listProjects(userId)).length;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) databaseReady = false;
    else throw error;
  }

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
          <section className="card pad">
            <h2>Abonnement</h2>
            <p>
              Nuværende plan: <span className="statuspill">Gratis</span>
            </p>
            <p>
              Pro: <span className="statuspill wait">Kommer snart</span>
            </p>
            <p>
              {`Alle nuværende funktioner er gratis, også gemte skæresedler på kontoen${
                projectCount !== null
                  ? ` (${projectCount} ${projectCount === 1 ? 'skæreseddel' : 'skæresedler'})`
                  : ''
              }. Pro kommer snart og kan ikke købes.`}
            </p>
            <div className="notice">
              <strong>Pro kommer snart.</strong> Der er intet kasseforløb, intet abonnement og ingen betaling knyttet
              til kontoen.
            </div>
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
