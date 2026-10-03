/**
 * Pladepriser fra 10-4.dk's offentlige produkt-API.
 * Her ligger ingen priser. Beløb kommer kun fra svaret, og kun når
 * mål, enhed og moms kan læses entydigt.
 */

export const SHEET_KINDS = ['mdf', 'span', 'melamin', 'birk', 'fyr', 'osb', 'hdf', 'lim'] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export const TENFOUR_CATEGORY_IDS = [63, 62, 64, 66, 58, 59, 61] as const;

export const SHEET_PRICE_SOURCE = {
  name: '10-4.dk',
  url: 'https://www.10-4.dk',
} as const;

export const SHEET_PRICE_NOTE =
  'Prisen er hentet fra 10-4.dk og kan være forældet. Kontrollér varen, før du køber.';

const SOURCE_ORIGIN = 'https://www.10-4.dk';
const PRODUCTS_URL = 'https://d1fn9evouep5ml.cloudfront.net/backend/api/shop/products';
const TTL_MS = 6 * 60 * 60 * 1000;
const FAIL_TTL_MS = 45 * 1000;

export type SheetOffer = {
  kind: SheetKind;
  thick: number;
  w: number;
  h: number;
  price: number;
  productName: string;
  sku: string;
  url: string;
};

export type SheetPriceResponse = {
  ok: boolean;
  stale: boolean;
  fetchedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  note: string;
  offers: SheetOffer[];
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ParsedSheet = SheetOffer & { penalty: number };

const cache: { expires: number; book: SheetPriceResponse } = { expires: 0, book: emptyBook() };

function emptyBook(): SheetPriceResponse {
  return {
    ok: false,
    stale: false,
    fetchedAt: null,
    sourceName: SHEET_PRICE_SOURCE.name,
    sourceUrl: SHEET_PRICE_SOURCE.url,
    note: 'Pladeprisen kunne ikke hentes fra 10-4.dk.',
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
    const sheet = parseProduct(product);
    if (sheet) parsed.push(sheet);
  }
  const best = new Map<string, ParsedSheet>();
  for (const sheet of parsed) {
    const key = slotKey(sheet);
    const current = best.get(key);
    if (!current || sheet.penalty < current.penalty || (sheet.penalty === current.penalty && sheet.price < current.price)) {
      best.set(key, sheet);
    }
  }
  return [...best.values()]
    .map(({ penalty: _penalty, ...offer }) => offer)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.thick - b.thick || a.w - b.w || a.h - b.h);
}

export function findSheetOffer(
  offers: readonly SheetOffer[],
  kind: string,
  thick: number,
  w: number,
  h: number,
): SheetOffer | null {
  if (!SHEET_KINDS.includes(kind as SheetKind)) return null;
  if (!Number.isFinite(thick) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  const width = Math.round(w);
  const height = Math.round(h);
  if (!(thick > 0) || !(width > 0) || !(height > 0)) return null;
  const hits = offers.filter(
    (offer) =>
      offer.kind === kind &&
      Math.abs(offer.thick - thick) < 0.05 &&
      ((offer.w === width && offer.h === height) || (offer.w === height && offer.h === width)),
  );
  return hits.length === 1 ? hits[0] : null;
}

export async function loadSheetPrices(
  fetchImpl: FetchLike = fetch,
  now = Date.now(),
): Promise<SheetPriceResponse> {
  if (cache.expires > now) return cache.book;
  const previous = cache.book.ok ? cache.book : null;
  try {
    const lists = await Promise.all(TENFOUR_CATEGORY_IDS.map((id) => fetchCategory(id, fetchImpl)));
    const book: SheetPriceResponse = {
      ok: true,
      stale: false,
      fetchedAt: new Date(now).toISOString(),
      sourceName: SHEET_PRICE_SOURCE.name,
      sourceUrl: SHEET_PRICE_SOURCE.url,
      note: SHEET_PRICE_NOTE,
      offers: offersFromProducts(lists.flat()),
    };
    cache.expires = now + TTL_MS;
    cache.book = book;
    return book;
  } catch {
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
}

async function fetchCategory(id: number, fetchImpl: FetchLike): Promise<unknown[]> {
  const all: unknown[] = [];
  let expected = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= 4 && all.length < expected; page += 1) {
    const url = `${PRODUCTS_URL}?categoryIds=${id}&limit=80&page=${page}`;
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Skaereseddel/1.0 (sheet price lookup; +https://github.com/pcp183/pladeplan)',
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

function parseProduct(product: unknown): ParsedSheet | null {
  if (!product || typeof product !== 'object') return null;
  const record = product as Record<string, unknown>;
  if (typeof record.name !== 'string') return null;
  const productName = record.name.replace(/\s+/g, ' ').trim();
  if (!productName || productName.length > 120) return null;
  const kind = kindFromName(productName);
  if (!kind || rejected(kind, productName)) return null;
  const price = publicGross(record.prices);
  if (price == null) return null;
  const unit = customField(record.custom_fields, 'salgsenhed');
  if (!unit || !/^pl\.?$/i.test(unit.trim())) return null;
  const sku = (customField(record.custom_fields, 'varenummer') ?? '').trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(sku)) return null;
  const path = routePath(record.static_routes);
  const url = path ? productUrl(path) : null;
  if (!url) return null;
  const dims = dimensions(record.variants, customField(record.custom_fields, 'varetekst2'));
  if (!dims) return null;
  return {
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

export function kindFromName(name: string): SheetKind | null {
  const text = name.toLowerCase();
  if (text.includes('melamin')) return 'melamin';
  if (text.includes('masonit') || text.includes('hdf')) return 'hdf';
  if (/\bosb\b/.test(text)) return 'osb';
  if (text.includes('mdf')) return 'mdf';
  if (text.includes('krydsfiner') && text.includes('birk')) return 'birk';
  if (text.includes('krydsfiner') && /(fyr|pine|radiata)/.test(text) && !text.includes('gran')) return 'fyr';
  if ((text.includes('limtræ') || text.includes('limtrae')) && text.includes('plade')) return 'lim';
  if (text.includes('spånplade') || text.includes('spaanplade')) return 'span';
  return null;
}

function rejected(kind: SheetKind, name: string): boolean {
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

function productUrl(path: string): string | null {
  if (!/^\/[a-z0-9/-]+$/i.test(path) || path.includes('//')) return null;
  return `${SOURCE_ORIGIN}/varer${path}`;
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

function slotKey(sheet: ParsedSheet): string {
  const a = Math.min(sheet.w, sheet.h);
  const b = Math.max(sheet.w, sheet.h);
  return `${sheet.kind}|${Math.round(sheet.thick * 10)}|${a}|${b}`;
}
