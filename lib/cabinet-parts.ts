/**
 * Rent skab → emneliste. Ingen AI og ingen priser.
 *
 * Korpus med sider i fuld højde. Top og bund sidder mellem siderne.
 * Ryggen er samme pladetykkelse og ligger bagpå, så den indgår i den ydre dybde.
 * Mellemstykker deler skabet i fag. Hylder sidder i hvert fag og er ikke top eller bund.
 * Låger står ved siden af hinanden og dækker forsiden, med 2 mm luft imellem.
 * Skuffefronter ligger nederst i fuld bredde. Når der både er låger og skuffer,
 * deles højden ligeligt mellem lågebåndet og hver skuffe, stadig med 2 mm luft.
 * Mål rundes til 0,1 mm.
 */

export const DEFAULT_THICKNESS_MM = 18;
export const FRONT_GAP_MM = 2;

const WIDTH_RANGE = [200, 6000] as const;
const HEIGHT_RANGE = [200, 3000] as const;
const DEPTH_RANGE = [80, 1200] as const;
const THICKNESS_RANGE = [3, 40] as const;
const SECTION_RANGE = [1, 8] as const;
const SHELF_RANGE = [0, 10] as const;
const DOOR_RANGE = [0, 8] as const;
const DRAWER_RANGE = [0, 8] as const;

export type CabinetSpec = {
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  sections: number;
  shelvesPerSection: number;
  doors: number;
  drawers: number;
};

export type CutPart = {
  name: string;
  widthMm: number;
  lengthMm: number;
  qty: number;
};

export type CabinetPartsResult = { ok: true; parts: CutPart[] } | { ok: false; error: string };

export function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function readNumber(raw: string): number {
  return Number(String(raw).trim().replace(/\s/g, '').replace(',', '.'));
}

function inRange(value: number, range: readonly [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

function parseSpan(raw: string, label: string, range: readonly [number, number]): number | string {
  const value = readNumber(raw);
  if (!Number.isFinite(value)) return `Skriv ${label} i mm.`;
  const rounded = roundMm(value);
  if (!inRange(rounded, range)) return `${label} skal være mellem ${range[0]} og ${range[1]} mm.`;
  return rounded;
}

function parseCount(raw: string, label: string, range: readonly [number, number]): number | string {
  const value = readNumber(raw);
  if (!Number.isInteger(value)) return `${label} skal være et helt tal.`;
  if (!inRange(value, range)) return `${label} skal være mellem ${range[0]} og ${range[1]}.`;
  return value;
}

export function cabinetFromFields(fields: {
  name?: string;
  widthMm: string;
  heightMm: string;
  depthMm: string;
  thicknessMm: string;
  sections: string;
  shelvesPerSection: string;
  doors: string;
  drawers: string;
}): { ok: true; spec: CabinetSpec } | { ok: false; error: string } {
  const widthMm = parseSpan(fields.widthMm, 'Bredden', WIDTH_RANGE);
  if (typeof widthMm === 'string') return fail(widthMm);
  const heightMm = parseSpan(fields.heightMm, 'Højden', HEIGHT_RANGE);
  if (typeof heightMm === 'string') return fail(heightMm);
  const depthMm = parseSpan(fields.depthMm, 'Dybden', DEPTH_RANGE);
  if (typeof depthMm === 'string') return fail(depthMm);
  const thicknessMm = parseSpan(fields.thicknessMm, 'Tykkelsen', THICKNESS_RANGE);
  if (typeof thicknessMm === 'string') return fail(thicknessMm);
  const sections = parseCount(fields.sections, 'Antal fag', SECTION_RANGE);
  if (typeof sections === 'string') return fail(sections);
  const shelvesPerSection = parseCount(fields.shelvesPerSection, 'Hylder pr. fag', SHELF_RANGE);
  if (typeof shelvesPerSection === 'string') return fail(shelvesPerSection);
  const doors = parseCount(fields.doors, 'Antal låger', DOOR_RANGE);
  if (typeof doors === 'string') return fail(doors);
  const drawers = parseCount(fields.drawers, 'Antal skuffer', DRAWER_RANGE);
  if (typeof drawers === 'string') return fail(drawers);
  const name = String(fields.name ?? '').trim().slice(0, 60) || 'Skab';
  return {
    ok: true,
    spec: { name, widthMm, heightMm, depthMm, thicknessMm, sections, shelvesPerSection, doors, drawers },
  };
}

export function parseKnownMeasures(input: { widthMm: unknown; heightMm: unknown }):
  | { ok: true; widthMm: number; heightMm: number | null }
  | { ok: false; error: string } {
  const width = typeof input.widthMm === 'number' ? input.widthMm : readNumber(String(input.widthMm ?? ''));
  if (!Number.isFinite(width)) return fail('Skriv væggens bredde i mm.');
  const widthMm = roundMm(width);
  if (!inRange(widthMm, WIDTH_RANGE)) return fail(`Bredden skal være mellem ${WIDTH_RANGE[0]} og ${WIDTH_RANGE[1]} mm.`);
  if (input.heightMm == null || input.heightMm === '') return { ok: true, widthMm, heightMm: null };
  const height = typeof input.heightMm === 'number' ? input.heightMm : readNumber(String(input.heightMm));
  if (!Number.isFinite(height)) return fail('Højden skal være i mm, eller udelades.');
  const heightMm = roundMm(height);
  if (!inRange(heightMm, HEIGHT_RANGE)) return fail(`Højden skal være mellem ${HEIGHT_RANGE[0]} og ${HEIGHT_RANGE[1]} mm.`);
  return { ok: true, widthMm, heightMm };
}

export function applyKnownMeasures(
  spec: Omit<CabinetSpec, 'widthMm'> & { widthMm?: number },
  known: { widthMm: number; heightMm: number | null },
): CabinetSpec {
  return {
    name: spec.name.trim().slice(0, 60) || 'Skab',
    widthMm: known.widthMm,
    heightMm: known.heightMm ?? spec.heightMm,
    depthMm: roundMm(spec.depthMm),
    thicknessMm: roundMm(spec.thicknessMm) || DEFAULT_THICKNESS_MM,
    sections: spec.sections,
    shelvesPerSection: spec.shelvesPerSection,
    doors: spec.doors,
    drawers: spec.drawers,
  };
}

/** Lokalt eksempel, når foto-modellen ikke kaldes. Bruges ikke som erstatning for et rigtigt forslag. */
export function demoCabinet(widthMm: number, heightMm: number | null): CabinetSpec {
  const wide = widthMm >= 1600;
  const mid = widthMm >= 900;
  return {
    name: 'Skab',
    widthMm,
    heightMm: heightMm ?? 720,
    depthMm: 560,
    thicknessMm: DEFAULT_THICKNESS_MM,
    sections: wide ? 3 : mid ? 2 : 1,
    shelvesPerSection: 1,
    doors: wide ? 3 : mid ? 2 : 1,
    drawers: 0,
  };
}

function pushPart(parts: CutPart[], name: string, widthMm: number, lengthMm: number, qty: number): string | null {
  const width = roundMm(widthMm);
  const length = roundMm(lengthMm);
  if (!(width > 0) || !(length > 0) || !Number.isInteger(qty) || qty < 1) return `${name} fik et ugyldigt mål.`;
  parts.push({ name, widthMm: width, lengthMm: length, qty });
  return null;
}

export function cabinetToParts(spec: CabinetSpec): CabinetPartsResult {
  const parsed = cabinetFromFields({
    name: spec.name,
    widthMm: String(spec.widthMm),
    heightMm: String(spec.heightMm),
    depthMm: String(spec.depthMm),
    thicknessMm: String(spec.thicknessMm),
    sections: String(spec.sections),
    shelvesPerSection: String(spec.shelvesPerSection),
    doors: String(spec.doors),
    drawers: String(spec.drawers),
  });
  if (!parsed.ok) return parsed;
  const cabinet = parsed.spec;
  const { widthMm: width, heightMm: height, depthMm: depth, thicknessMm: thickness } = cabinet;
  const carcassDepth = depth - thickness;
  if (carcassDepth <= 0) return fail('Dybden skal være større end tykkelsen, fordi ryggen ligger bagpå.');
  const betweenSides = width - 2 * thickness;
  if (betweenSides <= 0) return fail('Bredden er for lille til siderne.');
  const betweenTopAndBottom = height - 2 * thickness;
  if (betweenTopAndBottom <= 0) return fail('Højden er for lille til top og bund.');
  const bayWidth = (betweenSides - (cabinet.sections - 1) * thickness) / cabinet.sections;
  if (!(bayWidth > 0)) return fail('Der er ikke plads til så mange fag.');

  const parts: CutPart[] = [];
  const sideError = pushPart(parts, 'Side', carcassDepth, height, 2);
  if (sideError) return fail(sideError);
  const topError = pushPart(parts, 'Top', carcassDepth, betweenSides, 1);
  if (topError) return fail(topError);
  const bottomError = pushPart(parts, 'Bund', carcassDepth, betweenSides, 1);
  if (bottomError) return fail(bottomError);
  if (cabinet.sections > 1) {
    const dividerError = pushPart(parts, 'Mellemstykke', carcassDepth, betweenTopAndBottom, cabinet.sections - 1);
    if (dividerError) return fail(dividerError);
  }
  if (cabinet.shelvesPerSection > 0) {
    const shelfError = pushPart(parts, 'Hylde', carcassDepth, bayWidth, cabinet.shelvesPerSection * cabinet.sections);
    if (shelfError) return fail(shelfError);
  }
  const backError = pushPart(parts, 'Ryg', width, height, 1);
  if (backError) return fail(backError);

  const frontError = pushFronts(parts, cabinet);
  if (frontError) return fail(frontError);
  return { ok: true, parts };
}

function pushFronts(parts: CutPart[], cabinet: CabinetSpec): string | null {
  const { widthMm: width, heightMm: height, doors, drawers } = cabinet;
  if (doors === 0 && drawers === 0) return null;
  if (drawers === 0) {
    const doorWidth = (width - FRONT_GAP_MM * (doors - 1)) / doors;
    return pushPart(parts, 'Låge', doorWidth, height, doors);
  }
  if (doors === 0) {
    const drawerHeight = (height - FRONT_GAP_MM * (drawers - 1)) / drawers;
    return pushPart(parts, 'Skuffefront', width, drawerHeight, drawers);
  }
  const bands = drawers + 1;
  const frontHeight = (height - FRONT_GAP_MM * drawers) / bands;
  const doorWidth = (width - FRONT_GAP_MM * (doors - 1)) / doors;
  const doorError = pushPart(parts, 'Låge', doorWidth, frontHeight, doors);
  if (doorError) return doorError;
  return pushPart(parts, 'Skuffefront', width, frontHeight, drawers);
}
