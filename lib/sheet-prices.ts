/**
 * Pladepriser fra offentlige danske butikssider.
 * Her ligger ingen priser. Beløb kommer kun fra svaret, og kun når
 * vare, mål, enhed og moms kan læses entydigt.
 */

import { dedupeOffers, findSheetOffer, kindFromName, SHEET_KINDS, type ParsedSheet, type SheetKind, type SheetOffer } from './sheet-match.ts';
import { offersFromSilvanHtml, SILVAN_LIST_URL, SILVAN_SHOP, silvanParsed } from './silvan-prices.ts';
import { offersFromXlHtml, XL_CATEGORY_URLS, XL_SHOP, xlParsed, xlProductUrl, xlSheetSlugs } from './xlbyg-prices.ts';
import { FOG_LIST_URLS, FOG_SHOP, fogParsed, offersFromFogHtml } from './fog-prices.ts';
import { offersFromStarkPayload, STARK_CATEGORY_PATHS, STARK_SHOP, starkCategoryUrl, starkParsed } from './stark-prices.ts';

export { findSheetOffer, kindFromName, SHEET_KINDS };
export type { SheetKind, SheetOffer };
export { offersFromSilvanHtml, offersFromXlHtml, offersFromFogHtml, offersFromStarkPayload, XL_CATEGORY_URLS, FOG_LIST_URLS, STARK_CATEGORY_PATHS };

export const TENFOUR_CATEGORY_IDS = [63, 62, 64, 66, 58, 59, 61] as const;

export const SHEET_SHOPS = [
  { name: '10-4.dk', url: 'https://www.10-4.dk' },
  { name: SILVAN_SHOP, url: 'https://www.silvan.dk' },
  { name: XL_SHOP, url: 'https://www.xl-byg.dk' },
  { name: STARK_SHOP, url: 'https://www.stark.dk' },
  { name: FOG_SHOP, url: 'https://www.johannesfog.dk' },
] as const;

export const SHEET_PRICE_NOTE =
  'Priserne er hentet hos butikkerne og kan være forældede. Kontrollér varen, før du køber.';

const TENFOUR_ORIGIN = 'https://www.10-4.dk';
const PRODUCTS_URL = 'https://d1fn9evouep5ml.cloudfront.net/backend/api/shop/products';
const USER_AGENT = 'Skaereseddel/1.0 (sheet price lookup; +https://github.com/pcp183/pladeplan)';
const TTL_MS = 6 * 60 * 60 * 1000;
const FAIL_TTL_MS = 45 * 1000;
const XL_FAMILY_PAGES = 10;
const XL_VARIANT_PAGES = 14;

export type SheetShop = { name: string; url: string };

export type SheetPriceResponse = {
  ok: boolean;
  stale: boolean;
  fetchedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  shops: SheetShop[];
  note: string;
  offers: SheetOffer[];
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type ShopLoad = { ok: boolean; shop: SheetShop; offers: SheetOffer[] };

const cache: { expires: number; book: SheetPriceResponse } = { expires: 0, book: emptyBook() };

function emptyBook(): SheetPriceResponse {
  return {
    ok: false,
    stale: false,
    fetchedAt: null,
    sourceName: joinNames(SHEET_SHOPS.map((shop) => shop.name)),
    sourceUrl: SHEET_SHOPS[0].url,
    shops: [],
    note: 'Pladeprisen kunne ikke hentes hos butikkerne.',
    offers: [],
  };
}

export function clearSheetPriceCache(): void {
  cache.expires = 0;
  cache.book = emptyBook();
}

export function offersFromProducts(products: unknown[]): SheetOffer[] {
  const parsed: ParsedSheet[] = [];
  for (const product of products) {
    const sheet = parseTenfour(product);
    if (sheet) parsed.push(sheet);
  }
  return dedupeOffers(parsed);
}

export async function loadSheetPrices(
  fetchImpl: FetchLike = fetch,
  now = Date.now(),
): Promise<SheetPriceResponse> {
  if (cache.expires > now) return cache.book;
  const previous = cache.book.ok ? cache.book : null;
  const loads = await Promise.all([
    loadTenfour(fetchImpl),
    loadSilvan(fetchImpl),
    loadXl(fetchImpl),
    loadStark(fetchImpl),
    loadFog(fetchImpl),
  ]);
  const ready = loads.filter((load) => load.ok);
  if (!ready.length) {
    if (previous) {
      const stale = { ...previous, stale: true };
      cache.book = stale;
      cache.expires = now + FAIL_TTL_MS;
      return stale;
    }
    const failed = emptyBook();
    cache.book = failed;
    cache.expires = now + FAIL_TTL_MS;
    return failed;
  }
  const shops = ready.map((load) => load.shop);
  const book: SheetPriceResponse = {
    ok: true,
    stale: false,
    fetchedAt: new Date(now).toISOString(),
    sourceName: joinNames(shops.map((shop) => shop.name)),
    sourceUrl: shops[0]?.url ?? SHEET_SHOPS[0].url,
    shops,
    note: SHEET_PRICE_NOTE,
    offers: dedupeOffers(ready.flatMap((load) => load.offers.map((offer) => ({ ...offer, penalty: 0 })))),
  };
  cache.expires = now + TTL_MS;
  cache.book = book;
  return book;
}

async function loadTenfour(fetchImpl: FetchLike): Promise<ShopLoad> {
  const shop = { name: '10-4.dk', url: 'https://www.10-4.dk' };
  try {
    const lists = await Promise.all(TENFOUR_CATEGORY_IDS.map((id) => fetchCategory(id, fetchImpl)));
    return { ok: true, shop, offers: offersFromProducts(lists.flat()) };
  } catch {
    return { ok: false, shop, offers: [] };
  }
}

async function loadSilvan(fetchImpl: FetchLike): Promise<ShopLoad> {
  const shop = { name: SILVAN_SHOP, url: 'https://www.silvan.dk' };
  try {
    const html = await fetchText(SILVAN_LIST_URL, fetchImpl);
    if (html == null) return { ok: false, shop, offers: [] };
    return { ok: true, shop, offers: dedupeOffers(silvanParsed(html)) };
  } catch {
    return { ok: false, shop, offers: [] };
  }
}

async function loadStark(fetchImpl: FetchLike): Promise<ShopLoad> {
  const shop = { name: STARK_SHOP, url: 'https://www.stark.dk' };
  try {
    const payloads: unknown[] = [];
    await mapPool([...STARK_CATEGORY_PATHS], 4, async (path) => {
      const payload = await fetchJson(starkCategoryUrl(path), fetchImpl);
      if (payload != null) payloads.push(payload);
    });
    if (!payloads.length) return { ok: false, shop, offers: [] };
    return { ok: true, shop, offers: dedupeOffers(payloads.flatMap((payload) => starkParsed(payload))) };
  } catch {
    return { ok: false, shop, offers: [] };
  }
}

async function loadFog(fetchImpl: FetchLike): Promise<ShopLoad> {
  const shop = { name: FOG_SHOP, url: 'https://www.johannesfog.dk' };
  try {
    const pages: string[] = [];
    await mapPool([...FOG_LIST_URLS], 4, async (url) => {
      const html = await fetchText(url, fetchImpl);
      if (html != null) pages.push(html);
    });
    if (!pages.length) return { ok: false, shop, offers: [] };
    return { ok: true, shop, offers: dedupeOffers(pages.flatMap((html) => fogParsed(html))) };
  } catch {
    return { ok: false, shop, offers: [] };
  }
}

async function loadXl(fetchImpl: FetchLike): Promise<ShopLoad> {
  const shop = { name: XL_SHOP, url: 'https://www.xl-byg.dk' };
  try {
    const pages: string[] = [];
    await mapPool([...XL_CATEGORY_URLS], 4, async (url) => {
      const html = await fetchText(url, fetchImpl);
      if (html != null) pages.push(html);
    });
    if (!pages.length) return { ok: false, shop, offers: [] };
    const seen = new Set<string>();
    const first = xlSheetSlugs(pages.join('\n')).filter((slug) => !seen.has(slug));
    first.forEach((slug) => seen.add(slug));
    const family: string[] = [];
    await mapPool(first.slice(0, XL_FAMILY_PAGES), 4, async (slug) => {
      const url = xlProductUrl(slug);
      if (!url) return;
      const html = await fetchText(url, fetchImpl);
      if (html != null) family.push(html);
    });
    const variants = xlSheetSlugs(family.join('\n')).filter((slug) => !seen.has(slug));
    variants.forEach((slug) => seen.add(slug));
    const extra: string[] = [];
    await mapPool(variants.slice(0, XL_VARIANT_PAGES), 4, async (slug) => {
      const url = xlProductUrl(slug);
      if (!url) return;
      const html = await fetchText(url, fetchImpl);
      if (html != null) extra.push(html);
    });
    return {
      ok: true,
      shop,
      offers: dedupeOffers([...pages, ...family, ...extra].flatMap((html) => xlParsed(html))),
    };
  } catch {
    return { ok: false, shop, offers: [] };
  }
}

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<unknown | null> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchText(url: string, fetchImpl: FetchLike): Promise<string | null> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  return response.text();
}

async function fetchCategory(id: number, fetchImpl: FetchLike): Promise<unknown[]> {
  const all: unknown[] = [];
  let expected = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= 4 && all.length < expected; page += 1) {
    const url = `${PRODUCTS_URL}?categoryIds=${id}&limit=80&page=${page}`;
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const body = (await response.json()) as { count?: unknown; data?: unknown };
    if (!body || !Array.isArray(body.data)) throw new Error('upstream payload');
    expected = typeof body.count === 'number' && body.count >= 0 ? body.count : body.data.length;
    all.push(...body.data);
    if (body.data.length === 0) break;
  }
  if (all.length < expected) throw new Error('upstream truncated');
  return all;
}

async function mapPool<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  if (!items.length) return;
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await fn(current);
    }
  });
  await Promise.all(workers);
}

function parseTenfour(product: unknown): ParsedSheet | null {
  if (!product || typeof product !== 'object') return null;
  const record = product as Record<string, unknown>;
  if (typeof record.name !== 'string') return null;
  const productName = record.name.replace(/\s+/g, ' ').trim();
  if (!productName || productName.length > 120) return null;
  const kind = kindFromName(productName);
  if (!kind || rejectedTenfour(kind, productName)) return null;
  const price = publicGross(record.prices);
  if (price == null) return null;
  const unit = customField(record.custom_fields, 'salgsenhed');
  if (!unit || !/^pl\.?$/i.test(unit.trim())) return null;
  const sku = (customField(record.custom_fields, 'varenummer') ?? '').trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(sku)) return null;
  const path = routePath(record.static_routes);
  const url = path ? tenfourUrl(path) : null;
  if (!url) return null;
  const dims = dimensions(record.variants, customField(record.custom_fields, 'varetekst2'));
  if (!dims) return null;
  return {
    shop: '10-4.dk',
    kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price,
    productName,
    sku,
    url,
    penalty: penaltyFor(kind, productName),
  };
}

function rejectedTenfour(kind: SheetKind, name: string): boolean {
  const text = name.toLowerCase();
  if (kind === 'mdf' && /sort|grundmalet|finér|finer|vandfast/.test(text)) return true;
  if (kind === 'span' && /melamin|gulv|thermo|vådrum|vaadrum|fer/.test(text)) return true;
  if (kind === 'melamin' && !text.includes('hvid')) return true;
  if (kind === 'lim' && /bjælke|bjaelke/.test(text)) return true;
  if (kind === 'fyr' && text.includes('gran')) return true;
  return false;
}

function penaltyFor(kind: SheetKind, name: string): number {
  const text = name.toLowerCase();
  if (kind === 'osb' && /tg2|tg4|gulv|fer/.test(text)) return 5;
  return 0;
}

function publicGross(prices: unknown): number | null {
  if (!Array.isArray(prices)) return null;
  const amounts: number[] = [];
  for (const row of prices) {
    if (!row || typeof row !== 'object') continue;
    const price = row as Record<string, unknown>;
    if (price.display_only === true) continue;
    const gross = asMoney(price.price);
    const net = asMoney(price.price_net);
    if (gross == null || net == null || !includesDanishVat(gross, net)) continue;
    amounts.push(Math.round(gross * 100) / 100);
  }
  const unique = [...new Set(amounts)];
  return unique.length === 1 ? unique[0] : null;
}

function includesDanishVat(gross: number, net: number): boolean {
  if (!(gross > 0) || !(net > 0) || gross > 100000) return false;
  return Math.abs(gross - net * 1.25) <= 0.02;
}

function asMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function customField(fields: unknown, key: string): string | null {
  if (!Array.isArray(fields)) return null;
  for (const row of fields) {
    if (!row || typeof row !== 'object') continue;
    const field = row as Record<string, unknown>;
    if (field.key === key && typeof field.value === 'string') return field.value;
  }
  return null;
}

function routePath(routes: unknown): string | null {
  if (!Array.isArray(routes)) return null;
  for (const row of routes) {
    if (!row || typeof row !== 'object') continue;
    const url = (row as Record<string, unknown>).url;
    if (typeof url === 'string' && url.startsWith('/')) return url;
  }
  return null;
}

function tenfourUrl(path: string): string | null {
  if (!/^\/[a-z0-9/-]+$/i.test(path) || path.includes('//')) return null;
  return `${TENFOUR_ORIGIN}/varer${path}`;
}

function dimensions(
  variants: unknown,
  sizeText: string | null,
): { thick: number; w: number; h: number } | null {
  const fromVariants = {
    thick: variantMm(variants, 'Tykkelse'),
    w: variantMm(variants, 'Bredde (mm)'),
    h: variantMm(variants, 'Længde (mm)'),
  };
  const fromText = textDims(sizeText);
  const variantComplete = fromVariants.thick != null && fromVariants.w != null && fromVariants.h != null;
  if (variantComplete && fromText) {
    const same =
      Math.abs(fromVariants.thick! - fromText.thick) < 0.2 &&
      fromVariants.w === fromText.w &&
      fromVariants.h === fromText.h;
    if (!same) return null;
  }
  const chosen = variantComplete
    ? { thick: fromVariants.thick!, w: fromVariants.w!, h: fromVariants.h! }
    : fromText;
  if (!chosen) return null;
  if (!(chosen.thick > 0) || chosen.thick > 80 || chosen.w < 100 || chosen.h < 100) return null;
  return { thick: Math.round(chosen.thick * 10) / 10, w: chosen.w, h: chosen.h };
}

function variantMm(variants: unknown, group: string): number | null {
  if (!Array.isArray(variants)) return null;
  const hits: number[] = [];
  for (const row of variants) {
    if (!row || typeof row !== 'object') continue;
    const variant = row as Record<string, unknown>;
    const variantGroup = variant.variant_group;
    const name =
      variantGroup && typeof variantGroup === 'object'
        ? (variantGroup as Record<string, unknown>).name
        : '';
    if (name !== group) continue;
    const mm = mmLabel(variant.name);
    if (mm != null) hits.push(mm);
  }
  const unique = [...new Set(hits.map((value) => Math.round(value * 10) / 10))];
  return unique.length === 1 ? unique[0] : null;
}

function mmLabel(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*mm$/i);
  if (!match) return null;
  const number = Number(match[1].replace(',', '.'));
  return Number.isFinite(number) && number > 0 && number < 10000 ? number : null;
}

function textDims(value: string | null): { thick: number; w: number; h: number } | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const thick = Number(match[1].replace(',', '.'));
  const w = Math.round(Number(match[2].replace(',', '.')));
  const h = Math.round(Number(match[3].replace(',', '.')));
  if (!Number.isFinite(thick) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { thick, w, h };
}

function joinNames(names: string[]): string {
  if (names.length === 0) return 'butikkerne';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}
