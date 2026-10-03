import assert from 'node:assert/strict';
import { PLANNER_MARKUP } from '../lib/planner-markup.ts';
import {
  TENFOUR_CATEGORY_IDS,
  clearSheetPriceCache,
  findSheetOffer,
  kindFromName,
  loadSheetPrices,
  offersFromProducts,
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
  assert.match(url, /categoryIds=\d+/);
  return new Response(JSON.stringify({ count: 1, data: [product()] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
const first = await loadSheetPrices(mockFetch, 1_000);
assert.equal(first.ok, true);
assert.equal(first.stale, false);
assert.equal(first.offers.length, 1);
assert.equal(first.offers[0]?.price, 306);
assert.equal(calls, TENFOUR_CATEGORY_IDS.length);
const second = await loadSheetPrices(mockFetch, 2_000);
assert.equal(calls, TENFOUR_CATEGORY_IDS.length);
assert.equal(second.fetchedAt, first.fetchedAt);

clearSheetPriceCache();
const failingFetch: typeof fetch = async () => new Response('no', { status: 503 });
const failed = await loadSheetPrices(failingFetch, 5_000);
assert.equal(failed.ok, false);
assert.deepEqual(failed.offers, []);
assert.equal(failed.fetchedAt, null);

assert.equal(PLANNER_MARKUP.includes('id="sheetPrice"'), false);
assert.equal(PLANNER_MARKUP.includes('Din pris'), false);
assert.equal(PLANNER_MARKUP.includes('du skriver selv'), false);
assert.equal(PLANNER_MARKUP.includes('dine priser'), false);

console.log('sheet prices ok');
