/**
 * Silvan viser forbrugerprisen i kategoriens Nuxt-data.
 * Beløbet bruges kun, når siden selv siger, at produktprisen er inkl. moms,
 * og enheden er STK.
 */

import {
  classifySheet,
  dedupeOffers,
  parseDanishMoney,
  sheetDims,
  type ParsedSheet,
  type SheetOffer,
} from './sheet-match.ts';

export const SILVAN_LIST_URL = 'https://www.silvan.dk/produkter/byggematerialer/trae-plader/traeplader';
export const SILVAN_SHOP = 'Silvan';

const VAT_MARK = 'aktuelle produktpris, som er inkl. moms';

export function offersFromSilvanHtml(html: string): SheetOffer[] {
  return dedupeOffers(silvanParsed(html));
}

export function silvanParsed(html: string): ParsedSheet[] {
  if (!html.includes(VAT_MARK)) return [];
  const data = nuxtData(html);
  if (!data) return [];
  const parsed: ParsedSheet[] = [];
  for (const row of data) {
    const sheet = card(data, row);
    if (sheet) parsed.push(sheet);
  }
  return parsed;
}

function nuxtData(html: string): unknown[] | null {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]) as unknown;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function card(data: unknown[], row: unknown): ParsedSheet | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const record = row as Record<string, unknown>;
  if (!('displayName' in record) || !('salesPrice' in record) || !('url' in record) || !('unit' in record)) return null;
  const productName = nuxtString(data, record.displayName);
  const priceText = nuxtString(data, record.salesPrice);
  const unit = nuxtString(data, record.unit);
  const url = nuxtString(data, record.url);
  if (!productName || !priceText || !unit || !url) return null;
  if (!/^stk$/i.test(unit.trim())) return null;
  if (!url.startsWith('https://www.silvan.dk/produkt/')) return null;
  const classified = classifySheet(productName);
  if (!classified) return null;
  const dims = sheetDims(productName);
  if (!dims) return null;
  const price = parseDanishMoney(priceText);
  if (price == null) return null;
  const sku = url.split('/').pop() ?? '';
  if (!/^[a-z0-9-]{3,80}$/i.test(sku)) return null;
  return {
    shop: SILVAN_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price,
    productName: productName.replace(/\s+/g, ' ').trim(),
    sku,
    url,
    penalty: classified.penalty,
  };
}

function nuxtString(data: unknown[], ref: unknown): string | null {
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'number' && ref >= 0 && ref < data.length && typeof data[ref] === 'string') return data[ref];
  return null;
}
