import assert from 'node:assert/strict';
import { PLANNER_MARKUP } from '../lib/planner-markup.ts';
import {
  TENFOUR_CATEGORY_IDS,
  XL_CATEGORY_URLS,
  clearSheetPriceCache,
  findSheetOffer,
  kindFromName,
  loadSheetPrices,
  offersFromProducts,
  FOG_LIST_URLS,
  STARK_CATEGORY_PATHS,
  offersFromBauhausHtml,
  offersFromBygmaHtml,
  offersFromDavidsenHtml,
  offersFromFogHtml,
  offersFromJemHtml,
  offersFromSilvanHtml,
  offersFromStarkPayload,
  offersFromXlHtml,
  BAUHAUS_CATEGORY_URLS,
  DAVIDSEN_CATEGORY_URLS,
  JEM_CATEGORY_URLS,
  BYGMA_SEARCH_URLS,
  BYGMA_TERMS_URL,
  type SheetOffer,
} from '../lib/sheet-prices.ts';

function product(overrides: Record<string, unknown> = {}) {
  return {
    name: 'DLH MDF E1 plade',
    prices: [{ price: '306.00', price_net: 244.8, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '19x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2100703' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/mdf-plader/dlh-mdf-e1-plade-2100703' }],
    variants: [
      { name: '19 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
    ...overrides,
  };
}

const offers = offersFromProducts([
  product(),
  product({
    name: 'DLH MDF E1 plade',
    prices: [{ price: '258.00', price_net: 206.4, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '16x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2100702' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/mdf-plader/dlh-mdf-e1-plade-2100702' }],
    variants: [
      { name: '16 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'MDF sort E1 plade',
    prices: [{ price: '799.00', price_net: 639.2, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '19x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '1798534' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/mdf-plader/mdf-sort-e1-plade-1798534' }],
  }),
  product({
    name: 'DLH MDF E1 plade',
    prices: [{ price: '100.00', price_net: 50, display_only: false }],
  }),
  product({
    name: 'DLH MDF E1 plade',
    prices: [{ price: '306.00', price_net: 244.8, display_only: true }],
    custom_fields: [
      { key: 'varetekst2', value: '22x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2100705' },
    ],
  }),
  product({
    name: 'DLH spånplade LD',
    prices: [{ price: '218.00', price_net: 174.4, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '16x1220x2500mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '1845580' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/spanplader/dlh-spaanplade-ld-1845580' }],
    variants: [
      { name: '16 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2500 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'DLH melaminplade hvid',
    prices: [{ price: '469.00', price_net: 375.2, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '16x1220x2500mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '1845594' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/spanplader/dlh-melaminplade-hvid-1845594' }],
    variants: [
      { name: '16 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2500 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'DLH hård masonitplade',
    prices: [{ price: '86.00', price_net: 68.8, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '3x1220x2440mm træfiberplade' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2093783' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/masoniteplader/dlh-haard-masonitplade-2093783' }],
    variants: [
      { name: '3 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'NPI OSB/3 gulv/tag TG2',
    prices: [{ price: '272.00', price_net: 217.6, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '15x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '1879403' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/osb-plader/npi-osb-3-gulv-tag-tg2-1879403' }],
    variants: [
      { name: '15 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'NPI OSB/3 byggeplade S/E',
    prices: [{ price: '310.00', price_net: 248, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '15x1220x2440mm retkantet' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '1951031' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/osb-plader/npi-osb-3-byggeplade-s-e-1951031' }],
    variants: [
      { name: '15 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'DLH Radiata Pine krydsfiner AC',
    prices: [{ price: '539.00', price_net: 431.2, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '18x1220x2440mm' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2108733' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/krydsfiner-uden-fer-og-not/dlh-radiata-pine-kryds-ac-2108733' }],
    variants: [
      { name: '18 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'DLH tagkrydsfiner finsk gran',
    prices: [{ price: '409.00', price_net: 327.2, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '18x1220x2440mm III/III' },
      { key: 'salgsenhed', value: 'pl' },
      { key: 'varenummer', value: '2162473' },
    ],
    static_routes: [{ url: '/byggematerialer/byggeplader/tagkrydsfiner/dlh-tagkrydsfiner-2162473' }],
    variants: [
      { name: '18 mm', variant_group: { name: 'Tykkelse' } },
      { name: '1220 mm', variant_group: { name: 'Bredde (mm)' } },
      { name: '2440 mm', variant_group: { name: 'Længde (mm)' } },
    ],
  }),
  product({
    name: 'DLH MDF E1 plade',
    prices: [{ price: '189.00', price_net: 151.2, display_only: false }],
    custom_fields: [
      { key: 'varetekst2', value: '12x2440x1220mm' },
      { key: 'salgsenhed', value: 'm2' },
      { key: 'varenummer', value: '2100701' },
    ],
  }),
  { name: 'uden pris' },
]);

assert.equal(offersFromProducts([]).length, 0);
assert.equal(offersFromProducts([{ name: 'DLH MDF E1 plade' }]).length, 0);

const mdf19 = findSheetOffer(offers, 'mdf', 19, 1220, 2440);
assert.ok(mdf19);
assert.equal(mdf19.price, 306);
assert.equal(mdf19.shop, '10-4.dk');
assert.equal(mdf19.sku, '2100703');
assert.equal(mdf19.url, 'https://www.10-4.dk/varer/byggematerialer/byggeplader/mdf-plader/dlh-mdf-e1-plade-2100703');
assert.equal(findSheetOffer(offers, 'mdf', 19, 2440, 1220)?.sku, '2100703');
assert.equal(findSheetOffer(offers, 'mdf', 18, 1220, 2440), null);
assert.equal(findSheetOffer(offers, 'mdf', 10, 1220, 2440), null);
assert.equal(findSheetOffer(offers, 'span', 16, 1220, 2440), null);
assert.equal(findSheetOffer(offers, 'span', 16, 1220, 2500)?.price, 218);
assert.equal(findSheetOffer(offers, 'melamin', 16, 1220, 2500)?.price, 469);
assert.equal(findSheetOffer(offers, 'hdf', 3, 1220, 2440)?.productName, 'DLH hård masonitplade');
assert.equal(findSheetOffer(offers, 'osb', 15, 1220, 2440)?.sku, '1951031');
assert.equal(findSheetOffer(offers, 'osb', 15, 1220, 2440)?.price, 310);
assert.equal(findSheetOffer(offers, 'fyr', 18, 1220, 2440)?.price, 539);
assert.equal(findSheetOffer(offers, 'fyr', 18, 1250, 2500), null);
assert.equal(findSheetOffer(offers, 'birk', 18, 1220, 2440), null);
assert.equal(kindFromName('DLH tagkrydsfiner finsk gran'), null);
assert.equal(kindFromName('DLH melaminplade hvid'), 'melamin');
assert.equal(kindFromName('DLH, Krydsfinér, Radiata Pine, 12x1220x2440 mm'), 'fyr');
assert.equal(kindFromName('DLH, Hård træfiberplade, 3x1220x2440 mm'), 'hdf');

const silvanVat = 'Ud for hvert enkelt produkt finder du den aktuelle produktpris, som er inkl. moms, men uden fragt.';
function silvanPage(cards: { name: string; price: string; url: string; unit: string }[], vat = silvanVat) {
  const data: unknown[] = ['pad'];
  for (const card of cards) {
    const name = data.length;
    data.push(card.name);
    const price = data.length;
    data.push(card.price);
    const url = data.length;
    data.push(card.url);
    const unit = data.length;
    data.push(card.unit);
    data.push({ displayName: name, salesPrice: price, url, unit });
  }
  return `<html>${vat}<script id="__NUXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
}

const silvanOffers = offersFromSilvanHtml(
  silvanPage([
    {
      name: 'DLH, MDF-plade, 19x1220x2440 mm',
      price: '275,00',
      url: 'https://www.silvan.dk/produkt/dlh-mdf-plade-19x1220x2440-mm-4220-2052823',
      unit: 'STK',
    },
    {
      name: 'DLH, Krydsfinérplade, birk, 15x1250x2500 mm',
      price: '1.099,95',
      url: 'https://www.silvan.dk/produkt/dlh-krydsfinerplade-birk-15x1250x2500-mm-3200-2351865',
      unit: 'STK',
    },
    {
      name: 'DLH, MDF-plade, 19x1220x2440 mm',
      price: '400,00',
      url: 'https://www.silvan.dk/produkt/dlh-mdf-plade-sort-19x1220x2440-mm-4220-1',
      unit: 'M2',
    },
    {
      name: 'DLH, Trailerplade, filmbelagt, 12x1250x2500 mm',
      price: '599,00',
      url: 'https://www.silvan.dk/produkt/dlh-trailerplade-filmbelagt-12x1250x2500-mm-3200-2514287',
      unit: 'STK',
    },
  ]),
);
assert.equal(findSheetOffer(silvanOffers, 'mdf', 19, 1220, 2440)?.price, 275);
assert.equal(findSheetOffer(silvanOffers, 'mdf', 19, 1220, 2440)?.shop, 'Silvan');
assert.equal(findSheetOffer(silvanOffers, 'birk', 15, 1250, 2500)?.price, 1099.95);
assert.equal(silvanOffers.some((offer) => offer.productName.includes('Trailer')), false);
assert.equal(offersFromSilvanHtml(silvanPage([{ name: 'DLH, MDF-plade, 19x1220x2440 mm', price: '275,00', url: 'https://www.silvan.dk/produkt/dlh-mdf-19', unit: 'STK' }], 'uden moms-sætning')).length, 0);

function xlPage(body: string, extras = '') {
  const encoded = JSON.stringify(body).slice(1, -1);
  return `<html><body data-theme="private">${extras}<p>inkl. moms</p><script>self.__next_f.push([1,"${encoded}"])</script></body></html>`;
}
const xlOffers = offersFromXlHtml(
  xlPage(
    '{"sku":"9253490","name":"XL-BYG MDF 19 X 1220 X 2440 MM","slug":"xl-byg-mdf-19-x-1220-x-2440-mm-9253490","salesUnit":"pl.","pricing":{"unitPrice":{"centAmount":29900,"currencyCode":"DKK"}},"H1Tekst","value":"XL-BYG MDF 19 x 1220 x 2440 mm","BygDimension","value":"19 x 1220 x 2440 mm"}',
    '<script type="application/ld+json">{"@type":"Product","name":"XL-BYG MDF 19 X 1220 X 2440 MM","sku":"9253490","offers":{"@type":"Offer","price":299,"priceCurrency":"DKK","url":"https://www.xl-byg.dk/produkt/xl-byg-mdf-19-x-1220-x-2440-mm-9253490"}}</script>',
  ),
);
assert.equal(xlOffers.length, 1);
assert.equal(xlOffers[0]?.shop, 'XL-BYG');
assert.equal(xlOffers[0]?.price, 299);
assert.equal(xlOffers[0]?.url, 'https://www.xl-byg.dk/produkt/xl-byg-mdf-19-x-1220-x-2440-mm-9253490');
assert.equal(
  offersFromXlHtml(
    xlPage('{"sku":"1","name":"XL-BYG MDF 19 X 1220 X 2440 MM","slug":"xl-byg-mdf-19-x-1220-x-2440-mm-1","salesUnit":"m2","pricing":{"unitPrice":{"centAmount":9900,"currencyCode":"DKK"}}}'),
  ).length,
  0,
);
assert.equal(offersFromXlHtml('<html><body>{"sku":"9253490","salesUnit":"pl.","pricing":{"unitPrice":{"centAmount":29900,"currencyCode":"DKK"}}}</body></html>').length, 0);
assert.equal(
  offersFromXlHtml(
    xlPage(
      '{"sku":"9253490","name":"XL-BYG MDF 19 X 1220 X 2440 MM","slug":"xl-byg-mdf-19-x-1220-x-2440-mm-9253490","salesUnit":"pl.","pricing":{"unitPrice":{"centAmount":29900,"currencyCode":"DKK"}}}',
      '<script type="application/ld+json">{"@type":"Product","sku":"9253490","name":"XL-BYG MDF 19 X 1220 X 2440 MM","offers":{"price":100,"priceCurrency":"DKK"}}</script>',
    ),
  ).length,
  0,
);

function starkVariant(overrides: Record<string, unknown> = {}) {
  return {
    DisplayName: '9583465 - 19 mm x 1220 mm x 2440 mm',
    ProductName: 'RAW Standard MDF Plade',
    Unit: 'PL',
    SalesUnit: 'M2, m²',
    StandardPriceExVat: '45009',
    StandardPriceInVat: '56261',
    CampaignType: 4,
    CampaignPriceExVat: 40508,
    CampaignPriceInVat: 50635,
    ProductUrl: '/raw-standard-mdf-plade-19-mm-1220-mm-2440-mm?id=4220-9583465',
    Sku: '4220#9583465',
    ...overrides,
  };
}
const starkOffers = offersFromStarkPayload({
  Products: [
    {
      Variants: [
        starkVariant(),
        starkVariant({
          DisplayName: '9648332 - 15 mm x 1220 mm x 2440 mm',
          ProductName: 'RAW OSB3 Gulv/Tag TG2',
          StandardPriceExVat: '40484',
          StandardPriceInVat: '50605',
          ProductUrl: '/raw-osb3-gulv-tag-tg2-15?id=4220-9646009',
          Sku: '4220#9646009',
        }),
        starkVariant({
          DisplayName: '9648332 - 15 mm x 1220 mm x 2440 mm',
          ProductName: 'RAW OSB3 SQ Plade',
          StandardPriceExVat: '42390',
          StandardPriceInVat: '52988',
          ProductUrl: '/raw-osb3-sq-plade-15?id=4220-9648332',
          Sku: '4220#9648332',
        }),
        starkVariant({
          DisplayName: '9757300 - 18 mm x 1250 mm x 2500 mm',
          ProductName: 'Film/Film WBP Birkekrydsfiner',
          StandardPriceExVat: '156000',
          StandardPriceInVat: '195000',
          ProductUrl: '/film-birk?id=4220-9757300',
          Sku: '4220#9757300',
        }),
        starkVariant({
          DisplayName: '9526569 - 12 mm x 1220 mm x 2440 mm',
          ProductName: 'RAW Sporplade Radiata Pine Krydsfiner',
          Type: 'Profileret krydsfinér',
          StandardPriceExVat: '50487',
          StandardPriceInVat: '63109',
          ProductUrl: '/raw-sporplade?id=4220-9526569',
          Sku: '4220#9526569',
        }),
      ],
    },
  ],
});
assert.equal(findSheetOffer(starkOffers, 'mdf', 19, 1220, 2440)?.price, 562.61);
assert.equal(findSheetOffer(starkOffers, 'mdf', 19, 1220, 2440)?.shop, 'STARK');
assert.equal(findSheetOffer(starkOffers, 'mdf', 19, 1220, 2440)?.url, 'https://www.stark.dk/raw-standard-mdf-plade-19-mm-1220-mm-2440-mm?id=4220-9583465');
assert.equal(findSheetOffer(starkOffers, 'osb', 15, 1220, 2440)?.sku, '4220-9648332');
assert.equal(findSheetOffer(starkOffers, 'osb', 15, 1220, 2440)?.price, 529.88);
assert.equal(starkOffers.some((offer) => offer.productName.includes('Film')), false);
assert.equal(starkOffers.some((offer) => offer.productName.includes('Sporplade')), false);
assert.equal(offersFromStarkPayload({ Products: [{ Variants: [starkVariant({ Unit: 'M2' })] }] }).length, 0);
assert.equal(
  offersFromStarkPayload({
    Products: [{ Variants: [starkVariant({ StandardPriceInVat: '10000', StandardPriceExVat: '45009' })] }],
  }).length,
  0,
);
assert.equal(
  offersFromStarkPayload({
    Products: [
      {
        Variants: [
          starkVariant({
            CampaignType: 5,
            CampaignPriceExVat: 40000,
            CampaignPriceInVat: 50000,
            StandardPriceExVat: '45009',
            StandardPriceInVat: '56261',
          }),
        ],
      },
    ],
  })[0]?.price,
  500,
);

function fogPage(items: Record<string, unknown>[], tax = true) {
  const data = {
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            { queryKey: ['frame', 'da-dk', '/'], state: { data: { market: { pricesIncludeTax: tax } } } },
            { queryKey: ['filterEntities', {}], state: { data: { results: { items } } } },
          ],
        },
      },
    },
  };
  return `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
}
function fogItem(fields: Record<string, string | number | null>) {
  return {
    id: fields.SKU ?? '1',
    attributes: Object.entries(fields).map(([name, value]) => ({ name, values: value == null ? [] : [value] })),
  };
}
const fogOffers = offersFromFogHtml(
  fogPage([
    fogItem({
      ItemName: '12MM MDF E1 INDVENDIG',
      ItemName2: '1220X2440MM',
      SalesUnit: 'plade',
      PriceInclVat: 413.775,
      PriceExclVat: 331.02,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/mdf/12mm-mdf',
      SKU: '2631001',
    }),
    fogItem({
      ItemName: 'OSB3 SE BYGGEPLADE 11MM',
      ItemName2: '2440X1220MM',
      SalesUnit: 'plade',
      PriceInclVat: 198.9875,
      PriceExclVat: 159.19,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/spaanplader/osb3-se-11mm',
      SKU: '2442684',
    }),
    fogItem({
      ItemName: 'OSB 3 TAG/GULV TG2 11MM',
      ItemName2: '1220X2440MM',
      SalesUnit: 'plade',
      PriceInclVat: 150,
      PriceExclVat: 120,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/tag-og-gulvplader/osb-tg2-11',
      SKU: '2442690',
    }),
    fogItem({
      ItemName: 'TRÆFIBER HÅRD 3X1220X2440MM',
      ItemName2: '',
      SalesUnit: 'plade',
      PriceInclVat: 163.575,
      PriceExclVat: 130.86,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/traefiberplader/traefiber-hard-3',
      SKU: '1695001',
    }),
    fogItem({
      ItemName: 'TRÆFIBER HÅRD OLIEHÆRDET 3MM',
      ItemName2: '1220X2440MM',
      SalesUnit: 'plade',
      PriceInclVat: 100,
      PriceExclVat: 80,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/traefiberplader/olie',
      SKU: '1695002',
    }),
    fogItem({
      ItemName: 'NPI MDF E-1 16MM',
      ItemName2: '800X1200MM',
      SalesUnit: 'plade',
      PriceInclVat: 199,
      PriceExclVat: 159.2,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/mdf/npi-mdf-16',
      SKU: '1958471',
      ItemThicknessMm: 16,
    }),
    fogItem({
      ItemName: 'SPÅNPLADE LD 19MM',
      ItemName2: '2500X1220MM',
      SalesUnit: 'm²',
      PriceInclVat: 545.95,
      PriceExclVat: 436.76,
      ItemUrl: '/byggematerialer/byggeplader/traeplader/spaanplader/span-19',
      SKU: '1845581',
    }),
  ]),
);
assert.equal(findSheetOffer(fogOffers, 'mdf', 12, 1220, 2440)?.shop, 'Johannes Fog');
assert.equal(findSheetOffer(fogOffers, 'mdf', 12, 1220, 2440)?.price, 413.78);
assert.equal(findSheetOffer(fogOffers, 'osb', 11, 2440, 1220)?.price, 198.99);
assert.equal(findSheetOffer(fogOffers, 'osb', 11, 1220, 2440)?.sku, '2442684');
assert.equal(findSheetOffer(fogOffers, 'hdf', 3, 1220, 2440)?.price, 163.58);
assert.equal(fogOffers.some((offer) => offer.productName.includes('OLIE')), false);
assert.equal(findSheetOffer(fogOffers, 'mdf', 16, 800, 1200)?.price, 199);
assert.equal(fogOffers.some((offer) => offer.kind === 'span'), false);
assert.equal(offersFromFogHtml(fogPage([fogItem({ ItemName: '12MM MDF E1 INDVENDIG', ItemName2: '1220X2440MM', SalesUnit: 'plade', PriceInclVat: 413.775, PriceExclVat: 331.02, ItemUrl: '/mdf', SKU: '2631001' })], false)).length, 0);
assert.equal(
  offersFromFogHtml(
    fogPage([
      fogItem({
        ItemName: '12MM MDF E1 INDVENDIG',
        ItemName2: '1220X2440MM',
        SalesUnit: 'plade',
        PriceInclVat: 100,
        PriceExclVat: 331.02,
        ItemUrl: '/mdf',
        SKU: '2631001',
      }),
    ]),
  ).length,
  0,
);

const bauhausVat = '"display_cart_subtotal_incl_tax":1,"display_cart_subtotal_excl_tax":0';
function bauhausCard(name: string, price: string, url: string, sku: string, extras = '') {
  return `<div class="card__name">${name}</div>${extras}<span class="price-container amount-default price-indexed_price tax weee"><span data-price-amount="${price}" data-price-type="finalPrice"></span></span><script>productUrl: '${url}'</script>,"sku":"${sku}"`;
}
const bauhausOffers = offersFromBauhausHtml(
  `<html><script>${bauhausVat}</script>${bauhausCard(
    'Keflico OSB-3 konstruktionsplade retkantet 11x2440x1220 mm',
    '199.95',
    'https://www.bauhaus.dk/keflico-osb-3-konstruktionsplade-retkantet-11x2440x1220-mm',
    '1001',
  )}${bauhausCard(
    'Keflico OSB-3 konstruktionsplade retkantet 15x2440x1220 mm',
    '80.00',
    'https://www.bauhaus.dk/keflico-osb-15',
    '1005',
  )}${bauhausCard(
    'Keflico OSB-3 konstruktionsplade fer &amp; not 15x2440x1220 mm',
    '50.00',
    'https://www.bauhaus.dk/keflico-osb-fer',
    '1002',
  )}${bauhausCard(
    'DLH MDF-plade 19 mm savværk pris pr. m²',
    '259.95',
    'https://www.bauhaus.dk/dlh-mdf-plade-19-mm-savvaerk-pris-pr-m',
    '1003',
  )}${bauhausCard(
    'MDF-plade 2440x1220 mm - flere tykkelser',
    '164.95',
    'https://www.bauhaus.dk/mdf-flere',
    '1004',
    '<span class="price-label">Fra</span>',
  )}</html>`,
);
assert.equal(findSheetOffer(bauhausOffers, 'osb', 11, 1220, 2440)?.price, 199.95);
assert.equal(findSheetOffer(bauhausOffers, 'osb', 11, 1220, 2440)?.shop, 'Bauhaus');
assert.equal(findSheetOffer(bauhausOffers, 'osb', 15, 1220, 2440)?.price, 80);
assert.equal(bauhausOffers.some((offer) => offer.sku === '1003' || offer.sku === '1004'), false);
assert.equal(offersFromBauhausHtml(bauhausCard('Keflico OSB-3 retkantet 11x2440x1220 mm', '199.95', 'https://www.bauhaus.dk/osb', '1')).length, 0);

const davidsenVat = 'Priserne er afhentningspriser, inkl. moms.';
function davidsenPage(variants: { name: string; price: string; unit: string; url: string; sku: string }[]) {
  const products = [
    {
      variants: variants.map((variant) => ({
        name: variant.name,
        url: variant.url,
        productVariantId: variant.sku,
        priceInformation: {
          showPrice: true,
          priceUnitSingular: variant.unit,
          priceDescription: variant.unit === 'plade' ? 'kr./plade' : 'kr./stk.',
          price: { value: variant.price },
        },
      })),
    },
  ];
  return `<html>${davidsenVat}<script>"products":${JSON.stringify(products)}</script></html>`;
}
const davidsenOffers = offersFromDavidsenHtml(
  davidsenPage([
    {
      name: 'Keflico MDF E1 standard 19 mm 122x244 cm',
      price: '431,64',
      unit: 'plade',
      url: '/keflico-mdf-e1-standard-19-mm-122x244-cm-c-id525412-p-38101961125',
      sku: '38101961125',
    },
    {
      name: 'NPI OSB-3 Kronospan 11x1220x2440 mm',
      price: '95,00',
      unit: 'm²',
      url: '/osb-m2',
      sku: 'm2',
    },
  ]),
);
assert.equal(findSheetOffer(davidsenOffers, 'mdf', 19, 1220, 2440)?.price, 431.64);
assert.equal(findSheetOffer(davidsenOffers, 'mdf', 19, 1220, 2440)?.shop, 'Davidsen');
assert.equal(davidsenOffers.some((offer) => offer.kind === 'osb'), false);
assert.equal(
  offersFromDavidsenHtml(
    davidsenPage([
      {
        name: 'Keflico MDF E1 standard 19 mm 122x244 cm',
        price: '431,64',
        unit: 'plade',
        url: '/mdf',
        sku: '1',
      },
    ]).replace(davidsenVat, 'uden moms'),
  ).length,
  0,
);

function jemProduct(name: string, price: string, amount: number, url: string, sku: string) {
  return {
    title: name,
    url,
    erpItemNo: sku,
    price: {
      priceUnitText: 'stk.',
      priceInclVatFormatted: price,
      unitPriceInclVat: amount,
      handlingPriceInclVat: amount,
      multiPricesShow: false,
    },
  };
}
const jemOffers = offersFromJemHtml(
  `<html>"searchResultsSSR":${JSON.stringify([
    jemProduct('MDF plade 19 mm - 80 x 120 cm', '279,00', 279, '/mdf-plade-19-mm-80-x-120-cm/4138/9018806/', '9018806'),
    jemProduct('Krydsfiner nåletræ 12 mm - 122 x 244 cm', '289,00', 289, '/krydsfiner-naaletrae/4131/9054770/', '9054770'),
    jemProduct('OSB-3 plade SE 10 mm - 1197 x 2390 mm', '199,00', 180, '/osb/1/', '1'),
  ])}</html>`,
);
assert.equal(findSheetOffer(jemOffers, 'mdf', 19, 800, 1200)?.price, 279);
assert.equal(findSheetOffer(jemOffers, 'mdf', 19, 800, 1200)?.shop, 'Jem & Fix');
assert.equal(findSheetOffer(jemOffers, 'fyr', 12, 1220, 2440), null);
assert.equal(jemOffers.some((offer) => offer.sku === '1'), false);

function bygmaPage(prices: unknown[], name: string) {
  const data = JSON.stringify({ Prices: prices }).replace(/"/g, '&quot;');
  return `<html><div data-is-bygmaster="false" data-unit-of-measure-over-unit-price="False" data-product-code="100p102414" data-m3-data="${data}"><h1>${name}</h1></div><link rel="canonical" href="https://www.bygma.dk/byggematerialer/byggeplader/mdf-plader/mdf-19/"></html>`;
}
const bygmaPrice = {
  Factor: 2.9768,
  Pristype: 0,
  NetPrice: 162.95,
  LowestQuantityLimitBasicUm: 1,
  SalesPriceUnitOfMeasure: 'PL',
};
const bygmaOffers = offersFromBygmaHtml(
  bygmaPage(
    [
      bygmaPrice,
      { ...bygmaPrice, Pristype: 2, NetPrice: 100 },
    ],
    'MDF plader 19mm - 122x244cm - Klasse E1',
  ),
  true,
);
assert.equal(findSheetOffer(bygmaOffers, 'mdf', 19, 1220, 2440)?.price, 485.07);
assert.equal(findSheetOffer(bygmaOffers, 'mdf', 19, 1220, 2440)?.shop, 'Bygma');
assert.equal(
  offersFromBygmaHtml(bygmaPage([bygmaPrice], 'MDF plader 19mm - 122x244cm - Klasse E1'), false).length,
  0,
);
assert.equal(
  offersFromBygmaHtml(
    bygmaPage([{ ...bygmaPrice, SalesPriceUnitOfMeasure: 'M2', Factor: 1 }], 'MDF plader 19mm - 122x244cm'),
    true,
  ).length,
  0,
);

const compared = findSheetOffer(
  [
    ...(findSheetOffer(offers, 'mdf', 19, 1220, 2440) ? [findSheetOffer(offers, 'mdf', 19, 1220, 2440)!] : []),
    ...silvanOffers.filter((offer) => offer.kind === 'mdf'),
    ...xlOffers,
  ],
  'mdf',
  19,
  1220,
  2440,
);
assert.equal(compared?.shop, 'Silvan');
assert.equal(compared?.price, 275);

const prices = offers.map((offer: SheetOffer) => offer.price);
assert.ok(prices.every((price) => price > 0));
assert.equal(offers.some((offer) => offer.sku === '1798534'), false);
assert.equal(offers.some((offer) => offer.sku === '2100705'), false);
assert.equal(offers.some((offer) => offer.sku === '2100701'), false);

clearSheetPriceCache();
let calls = 0;
const mockFetch: typeof fetch = async (input) => {
  calls += 1;
  const url = String(input);
  if (url.includes('categoryIds=')) {
    return new Response(JSON.stringify({ count: 1, data: [product()] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (url.startsWith('https://www.silvan.dk/') || url.startsWith('https://www.xl-byg.dk/')) {
    return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  }
  return new Response('no', { status: 404 });
};
const first = await loadSheetPrices(mockFetch, 1_000);
assert.equal(first.ok, true);
assert.equal(first.stale, false);
assert.equal(first.offers.length, 1);
assert.equal(first.offers[0]?.price, 306);
assert.equal(first.shops.map((shop) => shop.name).sort().join(','), '10-4.dk,Silvan,XL-BYG');
const shopFetches =
  TENFOUR_CATEGORY_IDS.length +
  1 +
  XL_CATEGORY_URLS.length +
  STARK_CATEGORY_PATHS.length +
  FOG_LIST_URLS.length +
  BAUHAUS_CATEGORY_URLS.length +
  DAVIDSEN_CATEGORY_URLS.length +
  JEM_CATEGORY_URLS.length +
  BYGMA_SEARCH_URLS.length +
  1;
assert.equal(BYGMA_TERMS_URL.startsWith('https://www.bygma.dk/'), true);
assert.equal(calls, shopFetches);
const second = await loadSheetPrices(mockFetch, 2_000);
assert.equal(calls, shopFetches);
assert.equal(second.fetchedAt, first.fetchedAt);

clearSheetPriceCache();
const failingFetch: typeof fetch = async () => new Response('no', { status: 503 });
const failed = await loadSheetPrices(failingFetch, 5_000);
assert.equal(failed.ok, false);
assert.deepEqual(failed.offers, []);
assert.equal(failed.fetchedAt, null);

clearSheetPriceCache();
let partialCalls = 0;
const partialFetch: typeof fetch = async (input) => {
  partialCalls += 1;
  const url = String(input);
  if (url.includes('categoryIds=')) return new Response('no', { status: 503 });
  if (url.startsWith('https://www.silvan.dk/')) {
    return new Response(
      silvanPage([
        {
          name: 'DLH, MDF-plade, 19x1220x2440 mm',
          price: '275,00',
          url: 'https://www.silvan.dk/produkt/dlh-mdf-plade-19x1220x2440-mm-4220-2052823',
          unit: 'STK',
        },
      ]),
      { status: 200, headers: { 'content-type': 'text/html' } },
    );
  }
  if (url.startsWith('https://www.xl-byg.dk/kategori/')) {
    return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  }
  return new Response('no', { status: 404 });
};
const partial = await loadSheetPrices(partialFetch, 9_000);
assert.equal(partial.ok, true);
assert.equal(partial.offers.length, 1);
assert.equal(partial.offers[0]?.shop, 'Silvan');
assert.equal(partial.shops.some((shop) => shop.name === '10-4.dk'), false);
assert.ok(partialCalls > 0);

assert.equal(PLANNER_MARKUP.includes('id="sheetPrice"'), false);
assert.equal(PLANNER_MARKUP.includes('Silvan'), true);
assert.equal(PLANNER_MARKUP.includes('XL-BYG'), true);
assert.equal(PLANNER_MARKUP.includes('STARK'), true);
assert.equal(PLANNER_MARKUP.includes('Johannes Fog'), true);
assert.equal(PLANNER_MARKUP.includes('Bauhaus'), true);
assert.equal(PLANNER_MARKUP.includes('Davidsen'), true);
assert.equal(PLANNER_MARKUP.includes('Jem &amp; Fix'), true);
assert.equal(PLANNER_MARKUP.includes('Bygma'), true);
assert.equal(PLANNER_MARKUP.includes('Din pris'), false);
assert.equal(PLANNER_MARKUP.includes('du skriver selv'), false);
assert.equal(PLANNER_MARKUP.includes('dine priser'), false);

console.log('sheet prices ok');
