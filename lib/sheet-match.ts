/**
 * Fælles regler for pladepriser. Her ligger ingen beløb.
 * En pris bruges kun, når type, tykkelse, mål og enhed kan læses entydigt.
 */

export const SHEET_KINDS = ['mdf', 'span', 'melamin', 'birk', 'fyr', 'osb', 'hdf', 'lim'] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export type SheetOffer = {
  shop: string;
  kind: SheetKind;
  thick: number;
  w: number;
  h: number;
  price: number;
  productName: string;
  sku: string;
  url: string;
};

export type ParsedSheet = SheetOffer & { penalty: number };

export type SheetSize = { thick: number; w: number; h: number };

export function foldDanish(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function kindFromName(name: string): SheetKind | null {
  const text = foldDanish(name);
  if (text.includes('melamin')) return 'melamin';
  if (text.includes('masonit') || text.includes('hdf') || (text.includes('haard') && text.includes('traefiber'))) return 'hdf';
  if (/\bosb\b/.test(text)) return 'osb';
  if (text.includes('mdf')) return 'mdf';
  if (text.includes('krydsfiner') && text.includes('birk')) return 'birk';
  if (text.includes('krydsfiner') && /(fyr|pine|radiata)/.test(text) && !text.includes('gran')) return 'fyr';
  if ((text.includes('limtrae') || text.includes('limtrae')) && text.includes('plade')) return 'lim';
  if (text.includes('spaanplade') || text.includes('spanplade')) return 'span';
  return null;
}

export function classifySheet(name: string): { kind: SheetKind; penalty: number } | null {
  const kind = kindFromName(name);
  if (!kind || rejected(kind, name)) return null;
  return { kind, penalty: penaltyFor(kind, name) };
}

function rejected(kind: SheetKind, name: string): boolean {
  const text = foldDanish(name);
  if (/tagkrydsfiner|filmbelagt|profileret|trailer|stoeb|akustik|facade/.test(text)) return true;
  if (kind === 'mdf' && /sort|grundmalet|finer|vandfast/.test(text)) return true;
  if (kind === 'span' && /melamin|gulv|thermo|vaadrum|fer/.test(text)) return true;
  if (kind === 'melamin' && !text.includes('hvid')) return true;
  if (kind === 'lim' && text.includes('bjaelke')) return true;
  if (kind === 'fyr' && text.includes('gran')) return true;
  if (kind === 'birk' && text.includes('gran')) return true;
  return false;
}

function penaltyFor(kind: SheetKind, name: string): number {
  const text = foldDanish(name);
  if (kind === 'osb' && /tg2|tg4|gulv|fer/.test(text)) return 5;
  return 0;
}

export function sheetDims(text: string | null | undefined): SheetSize | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const thick = Number(match[1].replace(',', '.'));
  const w = Math.round(Number(match[2].replace(',', '.')));
  const h = Math.round(Number(match[3].replace(',', '.')));
  if (!Number.isFinite(thick) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (!(thick > 0) || thick > 80 || w < 100 || h < 100 || w > 6000 || h > 6000) return null;
  return { thick: Math.round(thick * 10) / 10, w, h };
}

export function sameDims(a: SheetSize, b: SheetSize): boolean {
  return Math.abs(a.thick - b.thick) < 0.2 && a.w === b.w && a.h === b.h;
}

export function parseDanishMoney(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '');
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(trimmed)) return null;
  const number = Number(trimmed.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(number) || !(number > 0) || number >= 100000) return null;
  return Math.round(number * 100) / 100;
}

export function dedupeOffers(sheets: readonly ParsedSheet[]): SheetOffer[] {
  const best = new Map<string, ParsedSheet>();
  for (const sheet of sheets) {
    const key = slotKey(sheet);
    const current = best.get(key);
    if (
      !current ||
      sheet.penalty < current.penalty ||
      (sheet.penalty === current.penalty && sheet.price < current.price)
    ) {
      best.set(key, sheet);
    }
  }
  return [...best.values()]
    .map(({ penalty: _penalty, ...offer }) => offer)
    .sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.thick - b.thick ||
        a.w - b.w ||
        a.h - b.h ||
        a.shop.localeCompare(b.shop, 'da'),
    );
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
  hits.sort((a, b) => a.price - b.price || a.shop.localeCompare(b.shop, 'da'));
  return hits[0] ?? null;
}

function slotKey(sheet: SheetOffer): string {
  const a = Math.min(sheet.w, sheet.h);
  const b = Math.max(sheet.w, sheet.h);
  return `${sheet.shop}|${sheet.kind}|${Math.round(sheet.thick * 10)}|${a}|${b}`;
}
