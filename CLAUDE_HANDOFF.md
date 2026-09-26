# Pladeplan — Claude handoff

This package contains the complete current source for the Pladeplan Danish sheet-cutting planner, as published on 26 September 2026. It is a single-page static HTML application.

## Files

- `index.html` — main app: markup, styling, UI behavior, board optimization, local skæresedler, share-via-URL, AI-assisted text import, price comparison, and subscription UI.
- `dist/index.html` — deployed static copy of the app. Keep it identical to `index.html` when changing the app.
- `.openai/hosting.json` — current Sites static-output configuration. Its project ID points to the existing Pladeplan site; preserve it when continuing this deployment.
- `CLAUDE_HANDOFF.md` — product scope, implementation notes, and outstanding production work.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server. The app has no package manager or build step. Skæresedler (projects) are stored in browser `localStorage` on the current device. Share links encode the plan in the URL hash (deflate + base64url) with no backend.

## Important accuracy notes

- The current price table is a manually maintained snapshot, not a live supplier feed. Check each retailer's linked product page and update the price/stock/date before representing prices as current.
- AI import can call `/api/ai-import` if that endpoint exists; otherwise it uses its built-in local text parser. Do not describe the local parser as a production AI model.
- The subscription dialog is an honest "coming soon" preview: all current features are free, Pro is labelled "Kommer snart", and no trial or payment is promised.
- The subscription dialog is a UI preview only. There is no real Stripe checkout, subscription record, webhook, billing portal, login, or server-side Pro access enforcement yet. Do not claim a trial or payment is active. Complete those parts before accepting money.
- MobilePay is not suitable for recurring Stripe subscriptions; use a recurring-capable payment method for subscriptions and offer MobilePay only for an appropriate one-time purchase if configured.

## Handoff goal

Continue from these files and preserve the existing Pladeplan product and Danish language. Before implementing production billing, add authenticated server-side checkout, verified Stripe webhooks, durable customer/subscription storage, customer self-service cancellation/payment updates, and server-enforced access checks. Configure secrets only through the hosting provider's secure environment-variable settings, never in browser code or committed files.

## Changelog — 26 September 2026 (skæreseddel save / delete / share)

- **Gem / slet:** knapper omdøbt til «Gem skæreseddel» og «Slet»; «Mine skæresedler» bibliotek med åbn/omdøb/duplikér/slet. Slet nuværende planen (fra bibliotek hvis gemt, ellers nulstil) med fortryd.
- **Del uden backend:** «Del» åbner dialog med komprimeret share-URL (`#p=` + deflate-raw/base64url), «Kopiér link», Web Share API når tilgængelig, JSON-eksport og genvej til Udskriv/PDF. Link indlæses automatisk ved åbning — ingen konto/server.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`a4cff85`); packing-algoritme uændret. Pro forbliver «Kommer snart». Live: https://pcp183.github.io/pladeplan/

## Changelog — 26 September 2026 (review & fixes)

- **Critical:** every calculation showed a raw JavaScript error ("Cannot read properties of null") because the code referenced removed `#step1-3` elements. Removed those references; editing any field no longer throws either.
- Packing now tries 5 sort orders × 3 guillotine split rules and keeps the plan with the fewest sheets (guillotine = cuttable on a panel saw). Fuzz-tested: 200 random jobs, no overlaps, kerf respected, all parts inside the trimmed area.
- Drawings use one uniform scale (no distortion), truncate long names, mark rotated parts with ↻ and show a tooltip.
- Result is marked as outdated when inputs change after a calculation; clearer Danish error messages (e.g. which part is too big and the usable sheet size).
- Smart import parser rewritten: handles "2 stk. …", "(4 stk)", "4 x 600 x 400", thickness as 3rd number, cm units, decimal commas and dimensions before a full stop. Endpoint responses are validated/escaped. Review step now offers "Tilføj til listen" or "Erstat listen" (previously "Tilføj" silently replaced everything).
- Price comparison: best offer is chosen by total cost for the actual plan and rows are sorted by it; stock notes made non-volatile; footer states prices are a manual snapshot. Spot-checked 26.09.2026: Silvan, XL-BYG, 10-4, Davidsen, BAUHAUS and Bygma match; jem & fix, STARK and Johannes Fog could not be verified automatically.
- Projects: "Slet" (delete) added; save handles storage errors; "Nyt projekt" no longer reloads the page.
- CSV: Danish decimal commas, quoted fields, file named after the project.
- Subscription dialog: removed false claims (14-day trial, "Mest valgt", payment methods, AI claim); unenforced free-plan limits removed from the feature list.
- Mobile: fixed horizontal overflow (header buttons, price rows) and header hiding the wrong element.
- Accessibility: labels bound to inputs, `type="button"` on all buttons, `aria-pressed` on billing tabs.

## Changelog — 26 September 2026 (UI/UX polish)

- **Stale-plan UX:** yellow banner with “Opdater plan”, calculate button becomes “Opdater skæreplan”, CSV/Udskriv disabled until recalculated; faded stats while outdated.
- **Failed calc:** error stays visible (`role="alert"`); previous drawing marked “Tegningen er ikke opdateret”; export blocked until a valid plan exists again.
- **Empty emner:** friendly empty state with “Tilføj første emne” when the list is cleared.
- **Accessibility/keyboard:** aria-labels on icon-only header buttons (mobile), Enter in inputs runs beregning, dialogs focus close control, focus ring on rotation switch.
- **Copy/clarity:** mm in column headers, clearer empty-result text, “Kladde gemt lokalt” / “Plan beregnet · kladde gemt”, price summary updates when material ≠ 19 mm MDF.
- **Mobile:** denser padding, tighter table/stats, stale bar wraps.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`b6c9406`); Vercel production proxies/refreshes to that commit via jsDelivr. Live: https://pladeplan.vercel.app/ and https://pcp183.github.io/pladeplan/

## Changelog — 26 September 2026 (2nd UI/UX polish)

- **Beregn busy state:** knappen viser “Beregner…” med spinner og blokerer dobbeltklik, mens planen beregnes.
- **Emnerækker:** kopiér-knap pr. række; rød valideringsramme ved ugyldige felter (blur + efter fejlbehæftet beregning); “Ryd liste” med bekræftelse.
- **Første gang / vejledning:** korte tip under Plade og Emner; tydeligere tom-tilstand (trin 1–2–3); tom emneliste med genvej til Smart import.
- **Materiale:** tip ved “Egne mål” + fokus på bredde; print-header med projektnavn, plader, udnyttelse (priser skjules ved udskrift).
- **Smart import:** antal fundne typer/stk., lokal vs. tjeneste-fortolkning; bekræft før “Erstat listen”.
- **A11y:** skip-link, aria-live på toast/fejl, Ctrl/Cmd+Enter beregner.
- **Deploy:** `index.html` = `dist/index.html`; packing-algoritme uændret.

## Changelog — 26 September 2026 (3rd UI/UX polish)

- **Fortryd:** toast med “Fortryd” efter slet emne, ryd liste og slet projekt (ca. 6 sek.).
- **Emnerækkefølge:** ↑/↓-knapper til at flytte emner op/ned.
- **Hurtige formater:** chip-presets 1220×2440, 1250×2500, 1220×2745, 1525×3050 under plademål; synkroniseres med materiale.
- **Snitliste:** farvelagt snitliste ved hver pladetegning (navn, mål, rotation).
- **Materialehukommelse:** sidst valgte materiale huskes til “Nyt projekt” / første besøg.
- **Visuel polish:** toast-layout, snitliste/board-grid, smaller presets på mobil; print viser snitliste.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`8682210`); packing-algoritme uændret. Live: https://pcp183.github.io/pladeplan/

## Changelog — 26 September 2026 (6th UI/UX polish)

- **Kopiér snitliste:** ny «Kopiér»-knap ved CSV/Udskriv kopierer en dansk snitliste til udklipsholderen (klar til note/WhatsApp); samme stale/CSV-gate som eksport.
- **Savhukommelse:** savsnit, kantfraskær og rotation huskes til «Nyt projekt» / første besøg (samme mønster som materialehukommelse).
- **Pasform-advarsel:** emner der ikke kan være på det brugbare plademål markeres (gult) før beregning; tæller + undertekst under Beregn forklarer hvad der skal rettes.
- **Byt om:** knap bytter pladens bredde/længde; emne-areal (m²) vises i emnetælleren.
- **Flere plader:** «Hop til»-genveje til plade 1…N; klik på emne i tegningen scroller snitlisten.
- **Mobil/a11y:** toast flyttes op over sticky Beregn; skjult aria-live ved færdig plan.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`074ead4`); packing-algoritme uændret. Pro forbliver «Kommer snart». Live: https://pcp183.github.io/pladeplan/

## Changelog — 26 September 2026 (5th UI/UX polish — brugervenlighed)

- **Onboarding:** dismissible “Kom godt i gang”-banner (3 trin) + synlig flow-bjælke (Plade → Emner → Beregn) med statushint; eksempel-tip når standardemnerne Side/Bund/Hylde er aktive.
- **Sprog:** tydeligere labels (Savsnit = klingebredde, Kantfraskær = alle 4 kanter); avanceret-panel omdøbt til “Savsnit, kant & rotation”; “Rest” → “Spild”; kortere tom-tilstande og tips.
- **Primær handling:** sticky “Beregn skæreplan” på mobil; tydeligere CTA + undertekst; success-bjælke + toast med pladeantal/udnyttelse; kort flash på statistik.
- **Fejlgenopretning:** berigede fejl med tip/genvej (åbn rotation/kant, tilføj emne); fokus på første ugyldige felt.
- **Clutter:** kort tagline under projektnavn (skjules når plan findes); Pro forbliver “Kommer snart”.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`5f70e50`); packing-algoritme uændret. Pro forbliver “Kommer snart”. Live: https://pcp183.github.io/pladeplan/

## Changelog — 26 September 2026 (4th UI/UX polish)

- **Projekter:** Duplikér og Omdøb i “Mine projekter” (dobbeltklik på navn omdøber inline); tydeligere tom bibliotek-tilstand.
- **Tegning:** Zoom − / Tilpas / + pr. plade; snitliste ↔ emne highlight ved hover.
- **Savsnit/kant:** Tip under avanceret med live brugbart areal (efter kantfraskær); mm uden tusindtalsseparator for klarhed.
- **CSV/print:** CSV med metadata (projekt, dato, plade, savsnit, kant, udnyttelse) + toast; print viser dato og savsnit/kant.
- **Visuel polish:** Tydeligere boardhead/kontrast, bedre disabled-titler på CSV/Udskriv, forbedret fejlramme.
- **Deploy:** `index.html` = `dist/index.html`; pushed to `pcp183/pladeplan` (`ecc7048`); packing-algoritme uændret. Pro forbliver “Kommer snart”. Live: https://pcp183.github.io/pladeplan/

