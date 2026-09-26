import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privatliv — Pladeplan',
  description: 'Sådan behandler Pladeplan kontooplysninger og gemte skæresedler.',
};

function contactEmail(): string | null {
  const value = process.env.PLADEPLAN_CONTACT_EMAIL?.trim() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export default function PrivacyPage() {
  const email = contactEmail();

  return (
    <div className="authpage">
      <SiteHeader />
      <main className="account prose">
        <h1>Privatliv</h1>
        <p className="lead">
          Denne side fortæller, hvilke oplysninger Pladeplan behandler, hvorfor, og hvordan du kan få dem udleveret
          eller slettet. Pro er ikke til salg, og der behandles ingen betalingsoplysninger.
        </p>

        <section className="card pad">
          <h2>Dataansvarlig</h2>
          <p>
            Pladeplan drives af Peter Price. Tjenesten er skæreplanlæggeren på dette website.
          </p>
          <p>
            Kontakt:{' '}
            {email ? (
              <a href={`mailto:${email}`}>{email}</a>
            ) : (
              <a href="https://github.com/pcp183/pladeplan">github.com/pcp183/pladeplan</a>
            )}
            {email ? (
              <>
                {' '}
                eller via <a href="https://github.com/pcp183/pladeplan">GitHub-projektet</a>
              </>
            ) : null}
            .
          </p>
        </section>

        <section className="card pad">
          <h2>Hvilke oplysninger</h2>
          <ul>
            <li>
              <strong>Konto:</strong> e-mail, navn og login håndteres af Clerk. Pladeplan gemmer ikke din adgangskode.
            </li>
            <li>
              <strong>Skæresedler:</strong> når du er logget ind og trykker Gem, gemmes projektnavn, plademål, emner,
              savindstillinger og tidspunkt sammen med dit Clerk-bruger-id. Det sker kun, hvis databasen er sat op.
            </li>
            <li>
              <strong>Kladde på enheden:</strong> browseren kan gemme den aktuelle plan og lokale skæresedler i
              localStorage. De sendes ikke til serveren, før du gemmer dem på kontoen.
            </li>
            <li>
              <strong>Drift:</strong> Clerk og værten (Vercel) kan kortvarigt logge tekniske oplysninger som tidspunkt
              og IP-adresse for at drive login og hosting. Pladeplan bruger det ikke til reklame.
            </li>
          </ul>
          <p>Der er ingen betalingsdata, ingen nyhedsbrevsliste og ingen salg af oplysninger.</p>
        </section>

        <section className="card pad">
          <h2>Formål</h2>
          <ul>
            <li>At vise og beregne skæreplanen.</li>
            <li>At lade dig gemme skæresedler på kontoen og åbne dem igen.</li>
            <li>At holde styr på login, så kun du kan se og slette dine gemte skæresedler.</li>
          </ul>
        </section>

        <section className="card pad">
          <h2>Retsgrundlag</h2>
          <p>
            Når du opretter en konto og gemmer skæresedler, sker det for at levere den tjeneste, du har bedt om
            (databeskyttelsesforordningens artikel 6, stk. 1, litra b).
          </p>
          <p>
            Kortvarige tekniske logs hos login- og hosting-leverandøren bruges til at holde tjenesten sikker og kørende
            (artikel 6, stk. 1, litra f).
          </p>
        </section>

        <section className="card pad">
          <h2>Modtagere</h2>
          <ul>
            <li>Clerk — login og konto.</li>
            <li>Neon Postgres via Vercel — gemte skæresedler, når databasen er sat op.</li>
            <li>Vercel — hosting af appen.</li>
          </ul>
          <p>
            Leverandørerne kan behandle data uden for EU. De beskriver selv overførselsgrundlaget i deres
            databehandleraftaler. Pladeplan sælger ikke oplysningerne og deler dem ikke med annoncører.
          </p>
        </section>

        <section className="card pad">
          <h2>Opbevaring og sletning</h2>
          <p>
            Gemte skæresedler bliver liggende, indtil du sletter den enkelte skæreseddel eller sletter kontoen. Ved
            «Slet konto» slettes alle rækker for dit bruger-id med det samme. Der skrives ingen arkivkopi, papirkurv
            eller sikkerhedskopi i Pladeplan.
          </p>
          <p>
            Derefter slettes selve brugeren hos Clerk, inklusive sessioner. Pladeplan beholder ikke e-mail eller profil
            bagefter.
          </p>
          <p>
            I den browser, hvor du sletter kontoen, fjernes også den lokale kladde og lokale skæresedler. En anden
            enhed kan stadig have en lokal kladde, indtil den ryddes der. Uden database har serveren ingen skæresedler
            at gemme.
          </p>
        </section>

        <section className="card pad">
          <h2>Dine rettigheder</h2>
          <ul>
            <li>
              <strong>Indsigt og dataportabilitet:</strong> «Hent mine data (JSON)» på <a href="/konto">kontoen</a>{' '}
              henter profil og gemte skæresedler.
            </li>
            <li>
              <strong>Berigtigelse:</strong> ret navn via brugermenuen, og ret eller slet skæresedler i planlæggeren.
            </li>
            <li>
              <strong>Sletning:</strong> «Slet konto» på kontosiden. Du skal skrive din e-mail for at bekræfte.
            </li>
            <li>
              <strong>Klage:</strong> du kan klage til Datatilsynet,{' '}
              <a href="https://www.datatilsynet.dk">datatilsynet.dk</a>.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
