/**
 * XL-BYG viser forbrugerprisen på den private side.
 * Beløbet bruges kun, når siden er i privat tilstand, prisen er mærket inkl. moms,
 * enheden er pr. plade, og beløbet er i DKK.
 */

import {
  classifySheet,
  dedupeOffers,
  sameDims,
  sheetDims,
  type ParsedSheet,
  type SheetOffer,
  type SheetSize,
} from './sheet-match.ts';

export const XL_SHOP = 'XL-BYG';
export const XL_CATEGORY_URLS = [
  'https://www.xl-byg.dk/kategori/byg/trae-plader/byggeplader/mdf-plader',
  'https://www.xl-byg.dk/kategori/byg/trae-plader/byggeplader/osb-plader',
  'https://www.xl-byg.dk/kategori/byg/trae-plader/byggeplader/spaanplader',
  'https://www.xl-byg.dk/kategori/byg/trae-plader/byggeplader/krydsfinerplader',
] as const;

const SHEET_UNIT = /^(?:pl|stk)\.?$/i;
const DROP_SLUG = /tagkrydsfiner|gulvspaan|filmbelagt|profileret|reglar|flise|flamingo|briket|hoevlet|spaer|akustik|stoeb|trailer|facade/;
const KEEP_SLUG = /(?:^|-)(?:mdf|osb|spaanplade|spanplade|krydsfiner|melamin|masonit|hdf|traefiber)(?:-|$)/;

type LdOffer = { price: number; url: string | null; name: string };

export function offersFromXlHtml(html: string): SheetOffer[] {
  return dedupeOffers(xlParsed(html));
}

export function xlParsed(html: string): ParsedSheet[] {
  if (!xlConsumerVat(html)) return [];
  const plain = xlPlain(html);
  const listed = ldBySku(html);
  const parsed = [...cardOffers(plain, listed), ...productOffers(plain, listed)];
  return parsed;
}

export function xlSheetSlugs(html: string): string[] {
  const plain = xlPlain(html);
  const found = new Set<string>();
  for (const match of plain.matchAll(/xl-byg-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4,}/g)) {
    const slug = match[0];
    if (!KEEP_SLUG.test(slug) || DROP_SLUG.test(slug)) continue;
    found.add(slug);
  }
  return [...found].sort((a, b) => rankSlug(a) - rankSlug(b) || a.localeCompare(b));
}

export function xlProductUrl(slug: string): string | null {
  if (!/^xl-byg-[a-z0-9-]+$/.test(slug)) return null;
  return `https://www.xl-byg.dk/produkt/${slug}`;
}

function xlConsumerVat(html: string): boolean {
  const privateMode =
    html.includes('data-theme="private"') ||
    html.includes('"appMode":"private"') ||
    html.includes('\\"appMode\\":\\"private\\"');
  return privateMode && html.includes('inkl. moms');
}

function xlPlain(html: string): string {
  const parts = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g)];
  if (!parts.length) return html;
  const decoded = parts.map((part) => {
    try {
      const value = JSON.parse(`"${part[1]}"`) as unknown;
      return typeof value === 'string' ? value : part[1];
    } catch {
      return part[1];
    }
  });
  return `${decoded.join('\n')}\n${html}`;
}

function cardOffers(plain: string, listed: Map<string, LdOffer>): ParsedSheet[] {
  const parsed: ParsedSheet[] = [];
  const re = /"salesUnit":"(pl\.|stk\.)","price":\{"centAmount":(\d+),"currencyCode":"DKK"\}/g;
  for (const match of plain.matchAll(re)) {
    const start = match.index ?? 0;
    const before = plain.slice(Math.max(0, start - 900), start);
    const sku = lastMatch(before, /"sku":"([A-Za-z0-9-]{3,40})"/);
    const slug = lastMatch(before, /"slug":"(xl-byg-[a-z0-9-]+)"/);
    const name = namedIn(before) ?? lastMatch(before, /"name":"([^"]{8,120})"/);
    const sheet = buildOffer({
      name,
      sku,
      slug,
      unit: match[1],
      cents: match[2],
      dims: sheetDims(name),
      listed,
      confirmed: false,
    });
    if (sheet) parsed.push(sheet);
  }
  return parsed;
}

function productOffers(plain: string, listed: Map<string, LdOffer>): ParsedSheet[] {
  const parsed: ParsedSheet[] = [];
  const re = /"sku":"([A-Za-z0-9-]{3,40})"/g;
  const seen = new Set<string>();
  for (const match of plain.matchAll(re)) {
    const sku = match[1];
    if (seen.has(sku)) continue;
    const window = plain.slice(match.index ?? 0, (match.index ?? 0) + 12000);
    const unit = window.match(/"salesUnit":"([^"]+)"/)?.[1] ?? '';
    if (!SHEET_UNIT.test(unit.trim())) continue;
    const unitPrice = window.match(/"pricing":\{"unitPrice":\{"centAmount":(\d+),"currencyCode":"DKK"\}/);
    const simple = window.match(/"price":\{"centAmount":(\d+),"currencyCode":"DKK"\}/);
    if (unitPrice && simple && unitPrice[1] !== simple[1]) continue;
    const cents = unitPrice?.[1] ?? simple?.[1];
    if (!cents) continue;
    const slug = window.match(new RegExp(`"(xl-byg-[a-z0-9-]*${sku})"`))?.[1] ?? null;
    const h1 = window.match(/H1Tekst","value":"([^"]+)"/)?.[1] ?? null;
    const name = h1 ?? namedIn(window) ?? listed.get(sku)?.name ?? null;
    const dims = pickDims([
      sheetDims(window.match(/BygDimension","value":"([^"]+)"/)?.[1] ?? null),
      attrDims(window),
      sheetDims(name),
    ]);
    const sheet = buildOffer({ name, sku, slug, unit, cents, dims, listed, confirmed: listed.has(sku) });
    if (!sheet) continue;
    seen.add(sku);
    parsed.push(sheet);
  }
  return parsed;
}

function buildOffer(input: {
  name: string | null;
  sku: string | null;
  slug: string | null;
  unit: string;
  cents: string;
  dims: SheetSize | null;
  listed: Map<string, LdOffer>;
  confirmed: boolean;
}): ParsedSheet | null {
  if (!input.name || !input.sku || !input.dims) return null;
  if (!SHEET_UNIT.test(input.unit.trim())) return null;
  const productName = input.name.replace(/\s+/g, ' ').trim();
  if (!productName || productName.length > 120) return null;
  const classified = classifySheet(productName);
  if (!classified) return null;
  const cents = Number(input.cents);
  if (!Number.isInteger(cents) || cents <= 0 || cents >= 10_000_000) return null;
  const price = Math.round(cents) / 100;
  const listed = input.listed.get(input.sku);
  if (listed && Math.abs(listed.price - price) > 0.02) return null;
  const url = listed?.url && listed.url.startsWith('https://www.xl-byg.dk/produkt/')
    ? listed.url
    : input.slug
      ? xlProductUrl(input.slug)
      : null;
  if (!url) return null;
  return {
    shop: XL_SHOP,
    kind: classified.kind,
    thick: input.dims.thick,
    w: input.dims.w,
    h: input.dims.h,
    price,
    productName,
    sku: input.sku,
    url,
    penalty: classified.penalty + (input.confirmed ? 0 : 1),
  };
}

function namedIn(text: string): string | null {
  const names = [...text.matchAll(/"name":"([^"]{8,120})"/g)].map((match) => match[1]);
  return [...names].reverse().find((name) => classifySheet(name)) ?? null;
}

function attrDims(window: string): SheetSize | null {
  const thick = mmField(window, 'EndeligTykkelseTotalt') ?? mmField(window, 'EndeligTykkelse');
  const w = mmField(window, 'EndeligBredde') ?? mmField(window, 'EndeligBreddeTotalt');
  const h = mmField(window, 'Endeliglaengde') ?? mmField(window, 'EndeligLaengdeTotalt') ?? mmField(window, 'EndeligLaengde');
  if (thick == null || w == null || h == null) return null;
  return sheetDims(`${thick}x${w}x${h}`);
}

function mmField(window: string, key: string): number | null {
  const match = window.match(new RegExp(`${key}","value":"(\\d+(?:[.,]\\d+)?)`));
  if (!match) return null;
  const number = Number(match[1].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function pickDims(parts: Array<SheetSize | null>): SheetSize | null {
  const present = parts.filter((part): part is SheetSize => part != null);
  if (!present.length) return null;
  const first = present[0];
  if (present.some((part) => !sameDims(part, first))) return null;
  return first;
}

function lastMatch(text: string, re: RegExp): string | null {
  const all = [...text.matchAll(new RegExp(re.source, 'g'))];
  return all.length ? all[all.length - 1][1] : null;
}

function rankSlug(slug: string): number {
  if (slug.includes('-mdf-')) return 0;
  if (slug.includes('-osb')) return 1;
  if (slug.includes('spaan') || slug.includes('span')) return 2;
  if (slug.includes('melamin')) return 3;
  if (slug.includes('masonit') || slug.includes('hdf') || slug.includes('traefiber')) return 4;
  return 5;
}

function ldBySku(html: string): Map<string, LdOffer> {
  const found = new Map<string, LdOffer>();
  for (const block of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(block[1]);
    } catch {
      continue;
    }
    for (const node of nodes(data)) {
      if (!node || typeof node !== 'object') continue;
      const record = node as Record<string, unknown>;
      const type = record['@type'];
      if (type !== 'Product' && !(Array.isArray(type) && type.includes('Product'))) continue;
      const sku = typeof record.sku === 'string' ? record.sku : '';
      const name = typeof record.name === 'string' ? record.name : '';
      const offer = record.offers;
      if (!sku || !offer || typeof offer !== 'object') continue;
      const row = offer as Record<string, unknown>;
      if (row.priceCurrency !== 'DKK') continue;
      const price = typeof row.price === 'number' ? row.price : Number(row.price);
      if (!Number.isFinite(price)) continue;
      const url = typeof row.url === 'string' && row.url.startsWith('https://www.xl-byg.dk/') ? row.url : null;
      found.set(sku, { price, url, name });
    }
  }
  return found;
}

function nodes(data: unknown): unknown[] {
  if (Array.isArray(data)) return data.flatMap(nodes);
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record['@graph'])) return [data, ...nodes(record['@graph'])];
  return [data];
}
