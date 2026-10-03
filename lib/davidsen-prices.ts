/**
 * Davidsen skriver prisen pr. plade i produktlisten og at afhentningspriser er inkl. moms.
 * Enhedsprisen pr. m² bruges ikke.
 */

import {
  classifySheet,
  dedupeOffers,
  parseDanishMoney,
  readSheetSize,
  type ParsedSheet,
  type SheetOffer,
} from './sheet-match.ts';

export const DAVIDSEN_SHOP = 'Davidsen';
export const DAVIDSEN_ORIGIN = 'https://www.davidsen.dk';

export const DAVIDSEN_CATEGORY_URLS = [
  `${DAVIDSEN_ORIGIN}/mdf-plader-c-id525412`,
  `${DAVIDSEN_ORIGIN}/osb-plader-c-id525407`,
  `${DAVIDSEN_ORIGIN}/krydsfiner-c-id525409`,
  `${DAVIDSEN_ORIGIN}/spaanplader-c-id525447`,
  `${DAVIDSEN_ORIGIN}/traefiberplader-c-id525449`,
  `${DAVIDSEN_ORIGIN}/melaminplader-c-id525454`,
] as const;

const VAT_MARK = 'Priserne er afhentningspriser, inkl. moms.';

export function davidsenParsed(html: string): ParsedSheet[] {
  if (!html.includes(VAT_MARK)) return [];
  const parsed: ParsedSheet[] = [];
  for (const product of jsonArrays(html, '"products":')) {
    if (!product || typeof product !== 'object') continue;
    const variants = (product as { variants?: unknown }).variants;
    if (!Array.isArray(variants)) continue;
    for (const variant of variants) {
      const sheet = parseDavidsenVariant(variant);
      if (sheet) parsed.push(sheet);
    }
  }
  return parsed;
}

export function offersFromDavidsenHtml(html: string): SheetOffer[] {
  return dedupeOffers(davidsenParsed(html));
}

function parseDavidsenVariant(variant: unknown): ParsedSheet | null {
  if (!variant || typeof variant !== 'object') return null;
  const record = variant as Record<string, unknown>;
  if (typeof record.name !== 'string' || typeof record.url !== 'string') return null;
  const productName = record.name.replace(/\s+/g, ' ').trim();
  if (!productName || productName.length > 140 || !record.url.startsWith('/')) return null;
  const info = record.priceInformation;
  if (!info || typeof info !== 'object') return null;
  const priceInfo = info as Record<string, unknown>;
  if (priceInfo.showPrice !== true) return null;
  const unit = typeof priceInfo.priceUnitSingular === 'string' ? priceInfo.priceUnitSingular.trim().toLowerCase() : '';
  if (unit !== 'plade' && unit !== 'stk.' && unit !== 'stk') return null;
  const description = typeof priceInfo.priceDescription === 'string' ? priceInfo.priceDescription : '';
  if (!/^kr\.\/(?:plade|stk\.?)$/i.test(description.trim())) return null;
  const priceRow = priceInfo.price;
  const raw = priceRow && typeof priceRow === 'object' ? (priceRow as { value?: unknown }).value : null;
  const price = typeof raw === 'string' ? parseDanishMoney(raw) : null;
  if (price == null) return null;
  const classified = classifySheet(productName);
  const dims = readSheetSize(productName);
  if (!classified || !dims) return null;
  const sku = typeof record.productVariantId === 'string' ? record.productVariantId : '';
  return {
    shop: DAVIDSEN_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price,
    productName,
    sku,
    url: `${DAVIDSEN_ORIGIN}${record.url}`,
    penalty: classified.penalty,
  };
}

function jsonArrays(html: string, marker: string): unknown[] {
  const found: unknown[] = [];
  let from = 0;
  while (from < html.length) {
    const at = html.indexOf(marker, from);
    if (at < 0) break;
    const bracket = html.indexOf('[', at);
    if (bracket < 0 || bracket - at > marker.length + 8) {
      from = at + marker.length;
      continue;
    }
    const slice = sliceJson(html, bracket);
    from = bracket + Math.max(slice.length, 1);
    if (!slice) continue;
    try {
      const value = JSON.parse(slice) as unknown;
      if (Array.isArray(value)) found.push(...value);
    } catch {
      /* næste forekomst */
    }
  }
  return found;
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
