# Skæreseddel

Dansk skæreplanlægger. Det offentlige produktnavn er **Skæreseddel**. Next.js-app med den eksisterende planlægger, Clerk-login og skæresedler gemt på kontoen.

Værtsnavne kan stadig sige pladeplan, indtil der kommer et eget domæne: Vercel-projektet `pladeplan`, `https://pladeplan.vercel.app` og GitHub-repoet [`pcp183/pladeplan`](https://github.com/pcp183/pladeplan). De navne er hosting, ikke brand.

Planlæggeren kan bruges uden login. Gemte skæresedler på serveren og kontosiden kræver login. Pro kan tegnes med Stripe Checkout, når nøglerne og mindst én pris er sat. Uden den opsætning står der **Pro kommer snart**, og der vises ingen pris og intet køb.

## Kør lokalt

```bash
npm install
cp .env.example .env.local
# udfyld nøglerne nedenfor
npm run dev
```

Åbn http://localhost:3000. Uden nøgler kan appen stadig bygges og planlæggeren bruges; login og kontolagring viser i stedet en opsætningsbesked.

```bash
npm test
npm run build
```

`npm test` tjekker pakkealgoritmen (ingen overlap, kantfraskær, fast standardplan) og validering af skæresedler.

## Miljøvariabler

| Variabel | Hvor | Formål |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API keys | Offentlig nøgle, `pk_test_` eller `pk_live_` |
| `CLERK_SECRET_KEY` | samme sted | Hemmelig nøgle, kun server. Må ikke i klientkode eller git |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Login-rute |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Opret-konto-rute |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` | Efter login |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` | Efter oprettelse |
| `DATABASE_URL` | Neon / Vercel Postgres | Skæresedler pr. Clerk-`userId`. Bruges også til abonnementsstatus, når den er sat |
| `POSTGRES_URL` | valgfri alias | Bruges kun hvis `DATABASE_URL` ikke er sat |
| `STRIPE_SECRET_KEY` | Stripe → API keys | `sk_test_` eller `sk_live_`. Kun server |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks | `whsec_…` for endpointet `/api/stripe/webhook` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys | `pk_test_` eller `pk_live_`, samme tilstand som secret |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe → Product → Price | `price_…` for et tilbagevendende månedsabonnement. Valgfri, hvis årlig er sat |
| `STRIPE_PRICE_PRO_YEARLY` | samme sted | `price_…` for et tilbagevendende årsabonnement. Valgfri, hvis månedlig er sat |

Se `.env.example`. Sæt variablerne i Vercel før deploy, og deploy igen hvis de ændres. Next.js indlejrer `NEXT_PUBLIC_*` ved build.

## Clerk

1. Opret eller genbrug en Clerk-applikation.
2. Læg publishable key og secret key i `.env.local` og i Vercel.
3. Under **Domains** i Clerk: `http://localhost:3000` og `https://pladeplan.vercel.app`.
4. Dansk tekst bruger `@clerk/localizations` (`daDK`) der, hvor oversættelsen findes.

`npx clerk@latest init` kan også skrive udviklingsnøgler til `.env.local`. Nøglerne claim’es senere med `npx clerk auth login`.

## Database

Skæresedler ligger i Neon Postgres (erstatning for det tidligere Vercel Postgres). Tabellen `pladeplan_projects` oprettes ved første kald.

På det linkede Vercel-projekt:

```bash
vercel integration add neon
```

Det sætter `DATABASE_URL`. Uden database svarer `/api/projects` med 503, og planlæggeren gemmer videre i `localStorage`.

## Deploy til Vercel-projektet `pladeplan`

1. Framework skal være **Next.js** (ikke statisk HTML eller et jsDelivr-redirect).
2. Root directory er repo-roden. Build-kommando: `npm run build`. Output håndteres af Next.js.
3. Environment Variables for Production (og Preview): Clerk-nøglerne, `DATABASE_URL` og Stripe-nøglerne fra afsnittet nedenfor. `NEXT_PUBLIC_*` kræver en ny deploy, når de ændres.
4. Clerk-domæne: `https://pladeplan.vercel.app`.
5. Deploy:

```bash
vercel link --project pladeplan
vercel env pull .env.local
vercel --prod
```

GitHub Pages kan ikke køre Clerk eller API-ruterne. Den tidligere statiske `index.html` / `dist/` er fjernet, så der kun er én app. Sæt det offentlige site til Vercel-deploymenten.

## Adfærd

- **Pladepris:** efter beregning slår Skæreseddel prisen op hos [10-4.dk](https://www.10-4.dk), [Silvan](https://www.silvan.dk), [XL-BYG](https://www.xl-byg.dk), [STARK](https://www.stark.dk), [Johannes Fog](https://www.johannesfog.dk), [Bauhaus](https://www.bauhaus.dk), [Davidsen](https://www.davidsen.dk), [Jem & Fix](https://www.jemogfix.dk) og [Bygma](https://www.bygma.dk) for de pladetyper og mål, butikkerne faktisk fører. Den billigste butik og det billigste format vises. En butik uden match udelades. Opslaget caches i op til 6 timer. Siden viser butik, varelink, hvornår prisen er hentet, og at den kan være forældet. Findes varen ikke, eller kan opslaget ikke gennemføres, vises ingen pris. Der er ikke et felt, hvor brugeren selv skriver prisen.
- **Uden login:** beregn, del via link, CSV, udskrift og lokale skæresedler som før.
- **Med login:** «Gem», omdøb, duplikér og slet skriver til kontoen. En kladde, der ikke er gemt, bliver i browseren.
- **Første login:** hvis enheden har lokale skæresedler, kan de flyttes til kontoen.
- **Konto** (`/konto`): profil, log ud, planstatus, opgrader eller administrer Pro når Stripe er sat op, hent data og slet konto.
- **Uden Stripe-nøgler:** samme kontoside viser «Pro kommer snart» og ingen pris.
- **Privatliv** (`/privatliv`): hvad der gemmes, formål, retsgrundlag, opbevaring og rettigheder. Link i sidefoden og på kontoen.

## GDPR og sletning

«Slet konto» kræver, at brugeren skriver sin e-mail. Serveren:

1. Sletter alle rækker i `pladeplan_projects` for Clerk-`userId` og tjekker, at ingen række er tilbage.
2. Sletter derefter Clerk-brugeren med `users.deleteUser`.

Der laves ingen arkivkopi, papirkurv eller soft-delete. Mislykkes sletningen af skæresedlerne, slettes Clerk-brugeren ikke. Uden `DATABASE_URL` ligger der ingen skæresedler på serveren, og kun Clerk-brugeren slettes. Browseren, hvor der trykkes slet, rydder også `localStorage`-nøglerne `pladeplan`, `pladeplan-projects`, `pladeplan-sheet-prices` og `pladeplan-own-sheets`.

«Hent mine data (JSON)» er indsigt og udtræk af profil og gemte skæresedler.

Valgfri kontaktmail på privatlivssiden: `PLADEPLAN_CONTACT_EMAIL`. Uden den vises GitHub-projektet som kontakt.

## Stripe

Pro er et rigtigt abonnement via Stripe Checkout og kundeportalen. Der er ingen lokal kasse og ingen priser i koden. Alle nuværende funktioner i skæreplanen, inklusive gemte skæresedler, bliver på gratisplanen. `hasProAccess` i `lib/billing.ts` er server-tjekket til senere Pro-funktioner.

Clerk kan stadig være `pk_test_` i produktion. Stripe-nøglerne følger deres egen tilstand: test med test, live med live. En test-nøgle og et live-pris-id dur ikke sammen.

### Opret produktet

1. I [Stripe Dashboard](https://dashboard.stripe.com/test/products) (brug testtilstand først): opret produktet **Skæreseddel Pro**. Navnet sættes i Dashboard, ikke i koden.
2. Tilføj en tilbagevendende pris, månedlig og/eller årlig, i den valuta du vil tage betaling i (typisk DKK). Kopiér `price_…`.
3. Under **Indstillinger → Fakturering → Kundeportal**: slå portalen til. Tillad opsigelse og skift af betalingskort. Vil du lade kunden skifte mellem måned og år, så tilføj begge priser under abonnementsopdatering.
4. MobilePay egner sig ikke til et tilbagevendende abonnement. Lad Checkout bruge de kort, Stripe har slået til for abonnementer. Slå ikke en engangsmetode til som den eneste metode.

### Nøgler og webhook

Sæt variablerne i `.env.local` og i Vercel (Production og Preview) for det projekt, der hedder `pladeplan`:

| Variabel | Eksempel |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` eller `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` eller `pk_live_…` i samme tilstand |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_…` |
| `STRIPE_PRICE_PRO_YEARLY` | `price_…` |

Mindst én af de to priser skal være sat, sammen med begge nøgler og webhook-hemmeligheden, før knapperne vises. Beløbet hentes fra Stripe ved indlæsning af `/konto` og vises igen i Checkout, før der betales.

Webhook-endpoint:

- Produktion: `https://pladeplan.vercel.app/api/stripe/webhook`
- Lokalt: `stripe listen --forward-to localhost:3000/api/stripe/webhook` — CLI’en udskriver en `whsec_…`, som kun gælder lokalt. Produktionens hemmelighed står på endpointet i Dashboard.

Hændelser, der skal sendes:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Preview-deploymenter har deres egen URL. Et webhook-endpoint peger på én URL, så en preview-URL synkroniserer kun, hvis den har sit eget endpoint og sin egen `STRIPE_WEBHOOK_SECRET`.

### Hvad der gemmes

Checkout opretter en Stripe-kunde med Clerk-`userId` i metadata. Webhooken skriver status til Clerk `publicMetadata` og, når `DATABASE_URL` er sat, til tabellen `pladeplan_billing`. Aktiv, prøveperiode og manglende betaling (`past_due`) tæller som Pro. Opsagt, ubetalt og ufuldstændig gør ikke.

«Administrer abonnement» åbner Stripes kundeportal (opsigelse, kort, kvitteringer). «Slet konto» sletter stadig skæresedlerne og Clerk-brugeren og sletter også Stripe-kunden, når secret-nøglen er sat. Eksporten på kontoen indeholder abonnementsstatus, ikke kortnummer.
