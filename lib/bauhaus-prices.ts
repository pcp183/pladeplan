/**
 * Bauhaus viser pladeprisen i varekortet, når Magento sætter visningen til inkl. moms
 * (klassen tax weee og display_cart_subtotal_incl_tax). «Fra» og pris pr. m² bruges ikke.
 */

import { classifySheet, dedupeOffers, readSheetSize, type ParsedSheet, type SheetOffer } from './sheet-match.ts';

export const BAUHAUS_SHOP = 'Bauhaus';
export const BAUHAUS_ORIGIN = 'https://www.bauhaus.dk';

export const BAUHAUS_CATEGORY_URLS = [
  `${BAUHAUS_ORIGIN}/trae-byggematerialer/byggeplader/mdf-plader`,
  `${BAUHAUS_ORIGIN}/trae-byggematerialer/byggeplader/osb-plader`,
  `${BAUHAUS_ORIGIN}/trae-byggematerialer/byggeplader/krydsfinerplader`,
  `${BAUHAUS_ORIGIN}/trae-byggematerialer/byggeplader/spaanplader`,
  `${BAUHAUS_ORIGIN}/trae-byggematerialer/byggeplader/hobbyplader-beklaedning`,
] as const;

export function bauhausParsed(html: string): ParsedSheet[] {
  if (!bauhausIncludesVat(html)) return [];
  const parsed: ParsedSheet[] = [];
  const marker = 'class="card__name">';
  let from = 0;
  while (from < html.length) {
    const at = html.indexOf(marker, from);
    if (at < 0) break;
    const next = html.indexOf(marker, at + marker.length);
    const window = html.slice(at, next < 0 ? at + 4000 : next);
    const sheet = parseBauhausCard(window);
    if (sheet) parsed.push(sheet);
    from = at + marker.length;
  }
  return parsed;
}

export function offersFromBauhausHtml(html: string): SheetOffer[] {
  return dedupeOffers(bauhausParsed(html));
}

function bauhausIncludesVat(html: string): boolean {
  return (
    html.includes('"display_cart_subtotal_incl_tax":1') &&
    html.includes('"display_cart_subtotal_excl_tax":0')
  );
}

function parseBauhausCard(window: string): ParsedSheet | null {
  const nameMatch = window.match(/^class="card__name">([\s\S]*?)<\/div>/);
  if (!nameMatch) return null;
  const productName = cleanText(nameMatch[1]);
  if (!productName || productName.length > 140 || /flere\s+(størrelser|stoerrelser|tykkelser)/i.test(productName)) {
    return null;
  }
  if (/pris\s+pr\.?\s*m|pr\.?\s*m²|pr\.?\s*m2/i.test(productName)) return null;
  if (/>\s*Fra\s*</i.test(window)) return null;
  const priceBox = window.match(/class="([^"]*price-container[^"]*)"[\s\S]{0,500}?data-price-amount="(\d+(?:\.\d+)?)"/);
  if (!priceBox) return null;
  const priceClass = priceBox[1];
  if (!/\btax\b/.test(priceClass) || !/\bweee\b/.test(priceClass) || /excluding/i.test(priceClass)) return null;
  const price = Math.round(Number(priceBox[2]) * 100) / 100;
  if (!(price > 0) || price >= 100000) return null;
  const urlMatch = window.match(/productUrl:\s*'(https:\/\/www\.bauhaus\.dk\/[^']+)'/);
  if (!urlMatch) return null;
  const skuMatch = window.match(/"sku"\s*:\s*"(\d{4,12})"/);
  const classified = classifySheet(productName);
  const dims = readSheetSize(productName);
  if (!classified || !dims) return null;
  return {
    shop: BAUHAUS_SHOP,
    kind: classified.kind,
    thick: dims.thick,
    w: dims.w,
    h: dims.h,
    price,
    productName,
    sku: skuMatch?.[1] ?? '',
    url: urlMatch[1],
    penalty: classified.penalty,
  };
}

function cleanText(value: string): string {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aelig;/gi, 'æ')
    .replace(/&oslash;/gi, 'ø')
    .replace(/&aring;/gi, 'å')
    .replace(/&sup2;/gi, '²')
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)));
}
