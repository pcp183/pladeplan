# Pladeplan

Dansk skæreplanlægger. Next.js-app med den eksisterende planlægger, Clerk-login og skæresedler gemt på kontoen.

Planlæggeren kan bruges uden login. Gemte skæresedler på serveren og kontosiden kræver login. Pro er **ikke** til salg: status er «Gratis», og Pro står som «Kommer snart». Der er intet Stripe-kasseforløb og ingen betaling.

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
| `DATABASE_URL` | Neon / Vercel Postgres | Skæresedler pr. Clerk-`userId` |
| `POSTGRES_URL` | valgfri alias | Bruges kun hvis `DATABASE_URL` ikke er sat |

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
3. Environment Variables for Production (og Preview): Clerk-nøglerne og `DATABASE_URL`.
4. Clerk-domæne: `https://pladeplan.vercel.app`.
5. Deploy:

```bash
vercel link --project pladeplan
vercel env pull .env.local
vercel --prod
```

GitHub Pages kan ikke køre Clerk eller API-ruterne. Den tidligere statiske `index.html` / `dist/` er fjernet, så der kun er én app. Sæt det offentlige site til Vercel-deploymenten.

## Adfærd

- **Uden login:** beregn, del via link, CSV, udskrift og lokale skæresedler som før.
- **Med login:** «Gem», omdøb, duplikér og slet skriver til kontoen. En kladde, der ikke er gemt, bliver i browseren.
- **Første login:** hvis enheden har lokale skæresedler, kan de flyttes til kontoen.
- **Konto** (`/konto`): profil, log ud, plan «Gratis», Pro «Kommer snart», hent data og slet konto.
- **Privatliv** (`/privatliv`): hvad der gemmes, formål, retsgrundlag, opbevaring og rettigheder. Link i sidefoden og på kontoen.

## GDPR og sletning

«Slet konto» kræver, at brugeren skriver sin e-mail. Serveren:

1. Sletter alle rækker i `pladeplan_projects` for Clerk-`userId` og tjekker, at ingen række er tilbage.
2. Sletter derefter Clerk-brugeren med `users.deleteUser`.

Der laves ingen arkivkopi, papirkurv eller soft-delete. Mislykkes sletningen af skæresedlerne, slettes Clerk-brugeren ikke. Uden `DATABASE_URL` ligger der ingen skæresedler på serveren, og kun Clerk-brugeren slettes. Browseren, hvor der trykkes slet, rydder også `localStorage`-nøglerne `pladeplan` og `pladeplan-projects`.

«Hent mine data (JSON)» er indsigt og udtræk af profil og gemte skæresedler.

Valgfri kontaktmail på privatlivssiden: `PLADEPLAN_CONTACT_EMAIL`. Uden den vises GitHub-projektet som kontakt.

## Stripe

Rigtig abonnementsbetaling er fremtidigt arbejde. Før der må tages imod penge, skal der være autentificeret Stripe Checkout, verificerede webhooks, lagring af kunde og abonnement, selvbetjening til opsigelse og betalingskort, og server-tjek af Pro-adgang. MobilePay egner sig ikke til et tilbagevendende Stripe-abonnement.
