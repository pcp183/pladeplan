/**
 * Jem & Fix skriver priceInclVat og enhed stk. på kategorisidens produktdata.
 * Kun den momspligtige stykpris bruges.
 */

import {
  classifySheet,
  dedupeOffers,
  parseDanishMoney,
  readSheetSize,
  type ParsedSheet,
  type SheetOffer,
} from './sheet-match.ts';

export const JEM_SHOP = 'Jem & Fix';
export const JEM_ORIGIN = 'https://www.jemogfix.dk';

export const JEM_CATEGORY_URLS = [
  `${JEM_ORIGIN}/mdf-plader/140206/`,
  `${JEM_ORIGIN}/osb-spaanplader/140201/`,
  `${JEM_ORIGIN}/krydsfiner/140202/`,
  `${JEM_ORIGIN}/traefiberplader/140204/`,
] as const;

export function jemParsed(html: string): ParsedSheet[] {
  const parsed: ParsedSheet[] = [];
  for (const product of jsonArray(html, '"searchResultsSSR":')) {
    const sheet = parseJemProduct(product);
    if (sheet) parsed.push(sheet);
  }
  return parsed;
}

export function offersFromJemHtml(html: string): SheetOffer[] {
  return dedupeOffers(jemParsed(html));
}

function parseJemProduct(product: unknown): ParsedSheet | null {
  if (!product || typeof product !== 'object') return null;
  const record = product as Record<string, unknown>;
  if (typeof record.title !== 'string' || typeof record.url !== 'string') return null;
  const productName = record.title.replace(/\s+/g, ' ').trim();
  if (!productName || productName.length > 140 || !record.url.startsWith('/')) return null;
  const price = record.price;
  if (!price || typeof price !== 'object') return null;
  const row = price as Record<string, unknown>;
  if (row.multiPricesShow === true) return null;
  const unit = typeof row.priceUnitText === 'string' ? row.priceUnitText.trim().toLowerCase() : '';
  if (unit !== 'stk.' && unit !== 'stk' && unit !== 'plade' && unit !== 'pl.') return null;
  const incl = typeof row.unitPriceInclVat === 'number' ? row.unitPriceInclVat : null;
  const formatted = typeof row.priceInclVatFormatted === 'string' ? parseDanishMoney(row.priceInclVatFormatted) : null;
  if (incl == null || formatted == null || Math.abs(incl - formatted) > 0.02) return null;
  if (typeof row.handlingPriceInclVat === 'number' && Math.abs(row.handlingPriceInclVat - incl) > 0.02) return null;
  const amount = Math.round(incl * 100) / 100;
  if (!(amount > 0) || amount >= 100000) return null;
  const classified = classifySheet(productName);
  const dims = readSheetSize(productName);
  if (!classified || !dims) return null;
  const sku = typeof record.erpItemNo === 'string' ? record.erpItemNo : '';
  return {
    shop: JEM_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price: amount,
    productName,
    sku,
    url: `${JEM_ORIGIN}${record.url}`,
    penalty: classified.penalty,
  };
}

function jsonArray(html: string, marker: string): unknown[] {
  const at = html.indexOf(marker);
  if (at < 0) return [];
  const bracket = html.indexOf('[', at);
  if (bracket < 0 || bracket - at > marker.length + 8) return [];
  const slice = sliceJson(html, bracket);
  if (!slice) return [];
  try {
    const value = JSON.parse(slice) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function sliceJson(text: string, start: number): string {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}
