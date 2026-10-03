/**
 * STARK viser gæsteprisen som StandardPriceInVat pr. plade (Unit PL/STK).
 * Beløbene ligger i øre. Kampagnetype 5 og 6 er den pris, gæsten ser.
 */

import { classifySheet, dedupeOffers, sheetDims, type ParsedSheet, type SheetOffer } from './sheet-match.ts';

export const STARK_SHOP = 'STARK';
export const STARK_ORIGIN = 'https://www.stark.dk';

/** Katalogstier fra kategoriens startcategorypath. Ingen priser. */
export const STARK_CATEGORY_PATHS = [
  '/23529-23602/23529-23616/23529-23686',
  '/23529-23602/23529-23616/23529-32323',
  '/23529-23602/23529-23616/23529-23685',
  '/23529-23602/23529-23616/23529-23687',
  '/23529-23602/23529-23616/23529-32864',
] as const;

export function starkCategoryUrl(path: string): string {
  return `${STARK_ORIGIN}/api/ns/search/GetFullSearchReplyGl?Path=${encodeURIComponent(path)}&SearchType=3&RowsToFetch=120&GroupLimit=80`;
}

export function starkParsed(payload: unknown): ParsedSheet[] {
  const parsed: ParsedSheet[] = [];
  for (const variant of starkVariants(payload)) {
    const sheet = parseStarkVariant(variant);
    if (sheet) parsed.push(sheet);
  }
  return parsed;
}

export function offersFromStarkPayload(payload: unknown): SheetOffer[] {
  return dedupeOffers(starkParsed(payload));
}

function starkVariants(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];
  const products = (payload as Record<string, unknown>).Products;
  if (!Array.isArray(products)) return [];
  const variants: Record<string, unknown>[] = [];
  for (const product of products) {
    if (!product || typeof product !== 'object') continue;
    const rows = (product as Record<string, unknown>).Variants;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row && typeof row === 'object') variants.push(row as Record<string, unknown>);
    }
  }
  return variants;
}

function parseStarkVariant(variant: Record<string, unknown>): ParsedSheet | null {
  const unit = typeof variant.Unit === 'string' ? variant.Unit.trim() : '';
  if (!/^(pl|stk)\.?$/i.test(unit)) return null;
  const productName = starkName(variant);
  if (!productName) return null;
  const kindText = starkKindText(variant, productName);
  const classified = classifySheet(kindText);
  if (!classified) return null;
  const dims = sheetDims(kindText);
  if (!dims) return null;
  const money = starkShownPrice(variant);
  if (!money) return null;
  const url = starkUrl(variant.ProductUrl);
  if (!url) return null;
  const sku = starkSku(variant.Sku, variant.ProductUrl);
  if (!sku) return null;
  return {
    shop: STARK_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price: money,
    productName,
    sku,
    url,
    penalty: classified.penalty,
  };
}

function starkKindText(variant: Record<string, unknown>, productName: string): string {
  const type = typeof variant.Type === 'string' ? variant.Type.trim() : '';
  return `${type} ${productName}`.replace(/\s+/g, ' ').trim();
}

function starkName(variant: Record<string, unknown>): string | null {
  const product = typeof variant.ProductName === 'string' ? variant.ProductName : '';
  const display = typeof variant.DisplayName === 'string' ? variant.DisplayName : '';
  const name = `${product} ${display}`.replace(/\s+/g, ' ').trim();
  if (!name || name.length > 180) return null;
  return name;
}

function starkShownPrice(variant: Record<string, unknown>): number | null {
  const campaignType = asNumber(variant.CampaignType);
  const campaign = campaignType === 5 || campaignType === 6;
  const incl = oreToKroner(campaign ? variant.CampaignPriceInVat : variant.StandardPriceInVat);
  const excl = oreToKroner(campaign ? variant.CampaignPriceExVat : variant.StandardPriceExVat);
  if (incl == null || excl == null || !includesDanishVat(incl, excl)) return null;
  return Math.round(incl * 100) / 100;
}

function starkUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('//') || value.includes(' ')) return null;
  if (!/^\/[a-z0-9/?=&.+%_-]+$/i.test(value)) return null;
  return `${STARK_ORIGIN}${value}`;
}

function starkSku(sku: unknown, path: unknown): string | null {
  const fromSku = typeof sku === 'string' ? sku.trim() : '';
  const fromPath = typeof path === 'string' ? (path.match(/[?&]id=([a-z0-9-]+)/i)?.[1] ?? '') : '';
  const chosen = (fromPath || fromSku).replace('#', '-');
  if (!/^[A-Za-z0-9-]{3,40}$/.test(chosen)) return null;
  return chosen;
}

function oreToKroner(value: unknown): number | null {
  const amount = asNumber(value);
  if (amount == null || !(amount > 0)) return null;
  const kroner = Number.isInteger(amount) ? amount / 100 : amount;
  if (!(kroner > 0) || kroner >= 100000) return null;
  return kroner;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

function includesDanishVat(gross: number, net: number): boolean {
  return gross > 0 && net > 0 && Math.abs(gross - net * 1.25) <= 0.02;
}
