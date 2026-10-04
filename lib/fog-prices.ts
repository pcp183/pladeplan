/**
 * Johannes Fog viser pladeprisen inkl. moms, når markedet har pricesIncludeTax
 * og enheden er plade eller stk. Mål læses af navnet, når felterne mangler.
 */

import {
  classifySheet,
  dedupeOffers,
  sheetDims,
  type ParsedSheet,
  type SheetOffer,
  type SheetSize,
} from './sheet-match.ts';

export const FOG_SHOP = 'Johannes Fog';
export const FOG_ORIGIN = 'https://www.johannesfog.dk';

export const FOG_LIST_URLS = [
  `${FOG_ORIGIN}/byggematerialer/byggeplader/traeplader/mdf`,
  `${FOG_ORIGIN}/byggematerialer/byggeplader/traeplader/krydsfiner`,
  `${FOG_ORIGIN}/byggematerialer/byggeplader/traeplader/spaanplader`,
  `${FOG_ORIGIN}/byggematerialer/byggeplader/traeplader/traefiberplader`,
  `${FOG_ORIGIN}/byggematerialer/byggeplader/traeplader/tag-og-gulvplader`,
] as const;

export function fogParsed(html: string): ParsedSheet[] {
  const queries = fogQueries(html);
  if (!fogIncludesVat(queries)) return [];
  const parsed: ParsedSheet[] = [];
  for (const item of fogItems(queries)) {
    const sheet = parseFogItem(item);
    if (sheet) parsed.push(sheet);
  }
  return parsed;
}

export function offersFromFogHtml(html: string): SheetOffer[] {
  return dedupeOffers(fogParsed(html));
}

function fogQueries(html: string): unknown[] {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]) as { props?: { pageProps?: { dehydratedState?: { queries?: unknown } } } };
    const queries = data.props?.pageProps?.dehydratedState?.queries;
    return Array.isArray(queries) ? queries : [];
  } catch {
    return [];
  }
}

function fogIncludesVat(queries: unknown[]): boolean {
  for (const query of queries) {
    if (!query || typeof query !== 'object') continue;
    const record = query as Record<string, unknown>;
    const key = record.queryKey;
    if (!Array.isArray(key) || key[0] !== 'frame') continue;
    const state = record.state;
    if (!state || typeof state !== 'object') return false;
    const data = (state as Record<string, unknown>).data;
    if (!data || typeof data !== 'object') return false;
    const market = (data as Record<string, unknown>).market;
    if (!market || typeof market !== 'object') return false;
    return (market as Record<string, unknown>).pricesIncludeTax === true;
  }
  return false;
}

function fogItems(queries: unknown[]): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  for (const query of queries) {
    if (!query || typeof query !== 'object') continue;
    const record = query as Record<string, unknown>;
    const key = record.queryKey;
    if (!Array.isArray(key) || key[0] !== 'filterEntities') continue;
    const state = record.state;
    if (!state || typeof state !== 'object') continue;
    const data = (state as Record<string, unknown>).data;
    if (!data || typeof data !== 'object') continue;
    const results = (data as Record<string, unknown>).results;
    if (!results || typeof results !== 'object') continue;
    const rows = (results as Record<string, unknown>).items;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row && typeof row === 'object') items.push(row as Record<string, unknown>);
    }
  }
  return items;
}

function parseFogItem(item: Record<string, unknown>): ParsedSheet | null {
  const attrs = fogAttrs(item.attributes);
  const unit = (attrs.SalesUnit ?? '').trim().toLowerCase();
  if (!/^plade$|^stk\.?$|^pl\.?$/.test(unit)) return null;
  const name = fogName(attrs.ItemName, attrs.ItemName2);
  if (!name) return null;
  const classified = classifySheet(name);
  if (!classified) return null;
  const dims = fogDims(name, attrs.ItemThicknessMm);
  if (!dims) return null;
  const price = fogPrice(attrs.PriceInclVat, attrs.PriceExclVat);
  if (price == null) return null;
  const url = fogUrl(attrs.ItemUrl);
  if (!url) return null;
  const sku = fogSku(attrs.SKU, item.id);
  if (!sku) return null;
  return {
    shop: FOG_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price,
    productName: name,
    sku,
    url,
    penalty: classified.penalty,
  };
}

function fogAttrs(value: unknown): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!Array.isArray(value)) return attrs;
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const attribute = row as Record<string, unknown>;
    if (typeof attribute.name !== 'string' || !Array.isArray(attribute.values) || !attribute.values.length) continue;
    const first = attribute.values[0];
    if (typeof first === 'string' || typeof first === 'number') attrs[attribute.name] = String(first);
  }
  return attrs;
}

function fogName(itemName: string | undefined, itemName2: string | undefined): string | null {
  const name = `${itemName ?? ''} ${itemName2 ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!name || name.length > 180) return null;
  return name;
}

function fogDims(name: string, thickness: string | undefined): SheetSize | null {
  const triple = sheetDims(name);
  const pair = sizePair(name);
  const thicks = thicknessMarks(name);
  const attr = thicknessNumber(thickness);
  if (attr != null) thicks.push(attr);
  if (triple) thicks.push(triple.thick);
  const unique = uniqueNumbers(thicks);
  if (unique.length !== 1) return null;
  const thick = Math.round(unique[0] * 10) / 10;
  if (!(thick > 0) || thick > 80) return null;
  if (triple) {
    if (Math.abs(triple.thick - thick) >= 0.2) return null;
    if (pair && !samePair(pair, triple)) return null;
    return { thick, w: triple.w, h: triple.h };
  }
  if (!pair) return null;
  return { thick, w: pair.w, h: pair.h };
}

function sizePair(text: string): { w: number; h: number } | null {
  const pairs: { w: number; h: number }[] = [];
  for (const match of text.matchAll(/(\d{3,4})\s*[x×]\s*(\d{3,4})/gi)) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w >= 100 && h >= 100 && w <= 6000 && h <= 6000) pairs.push({ w, h });
  }
  if (!pairs.length) return null;
  const key = (pair: { w: number; h: number }) => `${Math.min(pair.w, pair.h)}x${Math.max(pair.w, pair.h)}`;
  const distinct = new Set(pairs.map(key));
  if (distinct.size !== 1) return null;
  return pairs[0];
}

function samePair(pair: { w: number; h: number }, dims: SheetSize): boolean {
  return (
    (pair.w === dims.w && pair.h === dims.h) || (pair.w === dims.h && pair.h === dims.w)
  );
}

function thicknessMarks(text: string): number[] {
  const found: number[] = [];
  for (const match of text.matchAll(/(\d+(?:[.,]\d+)?)\s*mm\b/gi)) {
    const number = Number(match[1].replace(',', '.'));
    if (number > 0 && number <= 80) found.push(number);
  }
  return found;
}

function thicknessNumber(value: string | undefined): number | null {
  if (!value) return null;
  const number = Number(value.replace(',', '.'));
  if (!Number.isFinite(number) || !(number > 0) || number > 80) return null;
  return number;
}

function uniqueNumbers(values: number[]): number[] {
  const unique: number[] = [];
  for (const value of values) {
    if (!unique.some((current) => Math.abs(current - value) < 0.2)) unique.push(value);
  }
  return unique;
}

function fogPrice(inclText: string | undefined, exclText: string | undefined): number | null {
  const incl = money(inclText);
  const excl = money(exclText);
  if (incl == null || excl == null) return null;
  if (Math.abs(incl - excl * 1.25) > 0.02) return null;
  return Math.round((incl + 1e-8) * 100) / 100;
}

function money(value: string | undefined): number | null {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0) || number >= 100000) return null;
  return number;
}

function fogUrl(path: string | undefined): string | null {
  if (!path || !path.startsWith('/') || path.includes('//') || path.includes(' ')) return null;
  if (!/^\/[a-z0-9/?=&.+%_-]+$/i.test(path)) return null;
  return `${FOG_ORIGIN}${path}`;
}

function fogSku(sku: string | undefined, id: unknown): string | null {
  const chosen = (sku || (typeof id === 'string' || typeof id === 'number' ? String(id) : '')).trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(chosen)) return null;
  return chosen;
}
