/**
 * Bygma viser gæsteprisen pr. plade som NetPrice × Factor, når enheden er PL.
 * Handelsvilkårene siger at priser på Bygma.dk er inkl. moms. Bygmaster-prisen bruges ikke.
 */

import { classifySheet, dedupeOffers, readSheetSize, type ParsedSheet, type SheetOffer } from './sheet-match.ts';

export const BYGMA_SHOP = 'Bygma';
export const BYGMA_ORIGIN = 'https://www.bygma.dk';
export const BYGMA_TERMS_URL = `${BYGMA_ORIGIN}/kundeservice/handelsvilkar-for-kob-pa-bygma.dk/`;

export const BYGMA_SEARCH_URLS = [
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/mdf-plader/search`,
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/osb-plader/search`,
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/spanplader/search`,
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/melaminplader/search`,
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/trafiberplader/search`,
  `${BYGMA_ORIGIN}/byggematerialer/byggeplader/krydsfinerplader/search`,
] as const;

const VAT_MARK = 'Alle priser er inkl. moms';
const SHEET_UNIT = /^(?:PL|STK)$/i;

export function bygmaTermsIncludeVat(html: string): boolean {
  return html.includes(VAT_MARK);
}

export function bygmaSheetUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const products = (payload as { Products?: unknown }).Products;
  if (!Array.isArray(products)) return [];
  const urls: string[] = [];
  for (const product of products) {
    if (!product || typeof product !== 'object') continue;
    const record = product as { Title?: unknown; ProductUrl?: unknown };
    if (typeof record.Title !== 'string' || typeof record.ProductUrl !== 'string') continue;
    if (!/\d+(?:[.,]\d+)?\s*[x×]\s*\d+/i.test(record.Title)) continue;
    if (/bundt/i.test(record.Title) || !classifySheet(record.Title)) continue;
    const url = absoluteBygmaUrl(record.ProductUrl);
    if (url) urls.push(url);
  }
  return urls;
}

export function bygmaParsed(html: string, pricesIncludeVat: boolean): ParsedSheet[] {
  if (!pricesIncludeVat) return [];
  if (!/data-is-bygmaster="false"/i.test(html)) return [];
  if (!/data-unit-of-measure-over-unit-price="False"/i.test(html)) return [];
  const data = attrJson(html, 'data-item-m3-data') ?? attrJson(html, 'data-m3-data');
  if (!data || typeof data !== 'object') return [];
  const prices = (data as { Prices?: unknown }).Prices;
  if (!Array.isArray(prices)) return [];
  const amount = guestSheetPrice(prices);
  if (amount == null) return [];
  const productName = productTitle(html);
  const url = canonicalUrl(html);
  const skuMatch = html.match(/data-product-code="([^"]+)"/);
  const classified = productName ? classifySheet(productName) : null;
  const dims = productName ? readSheetSize(productName) : null;
  if (!productName || !url || !classified || !dims || /bundt/i.test(productName)) return [];
  return [
    {
      shop: BYGMA_SHOP,
      kind: classified.kind,
      thick: dims.thick,
      w: dims.w,
      h: dims.h,
      price: amount,
      productName,
      sku: skuMatch?.[1] ?? '',
      url,
      penalty: classified.penalty,
    },
  ];
}

export function offersFromBygmaHtml(html: string, pricesIncludeVat: boolean): SheetOffer[] {
  return dedupeOffers(bygmaParsed(html, pricesIncludeVat));
}

function guestSheetPrice(prices: unknown[]): number | null {
  const rows = prices
    .map((row) => (row && typeof row === 'object' ? (row as Record<string, unknown>) : null))
    .filter((row): row is Record<string, unknown> => !!row)
    .filter((row) => row.Pristype === 0)
    .filter((row) => typeof row.LowestQuantityLimitBasicUm === 'number' && row.LowestQuantityLimitBasicUm <= 1)
    .filter((row) => typeof row.NetPrice === 'number' && typeof row.Factor === 'number')
    .filter((row) => typeof row.SalesPriceUnitOfMeasure === 'string' && SHEET_UNIT.test(row.SalesPriceUnitOfMeasure.trim()));
  if (!rows.length) return null;
  rows.sort((a, b) => (a.NetPrice as number) - (b.NetPrice as number));
  const chosen = rows[0];
  const net = chosen.NetPrice as number;
  const factor = chosen.Factor as number;
  if (!(net > 0) || !(factor > 0)) return null;
  const sheet = factor === 1 ? net : net * factor;
  const price = Math.round((sheet + 1e-8) * 100) / 100;
  return price > 0 && price < 100000 ? price : null;
}

function productTitle(html: string): string | null {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (!h1) return null;
  const name = decodeHtml(h1[1]).replace(/\s+/g, ' ').trim();
  return name && name.length <= 140 ? name : null;
}

function canonicalUrl(html: string): string | null {
  const match = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!match) return null;
  return absoluteBygmaUrl(decodeHtml(match[1]));
}

function absoluteBygmaUrl(value: string): string | null {
  if (value.startsWith(`${BYGMA_ORIGIN}/`)) return value;
  if (value.startsWith('/')) return `${BYGMA_ORIGIN}${value}`;
  return null;
}

function attrJson(html: string, attr: string): unknown | null {
  const match = html.match(new RegExp(`${attr}="([^"]*)"`));
  if (!match) return null;
  try {
    return JSON.parse(decodeHtml(match[1])) as unknown;
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aelig;/gi, 'æ')
    .replace(/&oslash;/gi, 'ø')
    .replace(/&aring;/gi, 'å')
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)));
}
