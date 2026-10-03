export const MAX_PROJECTS = 100;
export const MAX_PART_ROWS = 400;

export type StoredProject = {
  id: string;
  n: string;
  m: number;
  /** Stabilt pladetype-id. Udelades på ældre skæresedler, så indeks 0–4 kan mappes. */
  mid?: string;
  w: string;
  h: string;
  k: string;
  t: string;
  r: boolean;
  /** Ældre felt: pris brugeren selv skrev. Nye skæresedler udelader det. */
  pr?: string;
  /** Ældre felt: priser pr. pladetype, som brugeren selv skrev. */
  px?: Record<string, string>;
  p: string[][];
  updatedAt: string;
};

function parsePriceMap(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= 40) break;
    if (!/^[\w.-]{1,80}$/.test(key)) continue;
    const raw = clip(value, 24).trim();
    if (!/^[\d\s.,]{1,24}$/.test(raw)) continue;
    out[key] = raw;
  }
  return Object.keys(out).length ? out : undefined;
}

function clip(value: unknown, max: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

export function parseProject(input: unknown): StoredProject | null {
  if (!input || typeof input !== 'object') return null;
  const source = input as Record<string, unknown>;
  const id = clip(source.id, 80).trim();
  if (!/^[\w.-]{1,80}$/.test(id)) return null;
  const name = clip(source.n, 80).trim() || 'Skæreseddel';
  const rawParts = Array.isArray(source.p) ? source.p.slice(0, MAX_PART_ROWS) : [];
  const parts: string[][] = [];
  for (const row of rawParts) {
    if (!Array.isArray(row)) return null;
    parts.push([
      clip(row[0], 80),
      clip(row[1], 24),
      clip(row[2], 24),
      clip(row[3], 8) || '1',
    ]);
  }
  let material = Number(source.m);
  if (!Number.isInteger(material) || material < 0 || material > 80) material = 0;
  const midRaw = clip(source.mid, 80).trim();
  const mid = /^[\w.-]{1,80}$/.test(midRaw) ? midRaw : '';
  const priceRaw = clip(source.pr, 24).trim();
  const pr = /^[\d\s.,]{1,24}$/.test(priceRaw) ? priceRaw : '';
  let updatedAt = clip(source.updatedAt, 40);
  if (Number.isNaN(Date.parse(updatedAt))) updatedAt = new Date().toISOString();
  const project: StoredProject = {
    id,
    n: name,
    m: material,
    w: clip(source.w, 24) || '1220',
    h: clip(source.h, 24) || '2440',
    k: clip(source.k, 24) || '3.2',
    t: clip(source.t, 24) || '10',
    r: source.r !== false,
    p: parts,
    updatedAt,
  };
  if (mid) project.mid = mid;
  if (pr) project.pr = pr;
  const px = parsePriceMap(source.px);
  if (px) project.px = px;
  return project;
}

export function parseProjectList(input: unknown): { projects: StoredProject[] } | { error: string } {
  if (!input || typeof input !== 'object' || !Array.isArray((input as { projects?: unknown }).projects)) {
    return { error: 'Ugyldig liste.' };
  }
  const raw = (input as { projects: unknown[] }).projects;
  if (raw.length > MAX_PROJECTS) return { error: 'Højst 100 skæresedler.' };
  const byId = new Map<string, StoredProject>();
  for (const item of raw) {
    const project = parseProject(item);
    if (!project) return { error: 'En skæreseddel kunne ikke læses.' };
    byId.set(project.id, project);
  }
  const projects = [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  return { projects };
}
