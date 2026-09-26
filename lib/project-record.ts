export const MAX_PROJECTS = 100;
export const MAX_PART_ROWS = 400;

export type StoredProject = {
  id: string;
  n: string;
  m: number;
  w: string;
  h: string;
  k: string;
  t: string;
  r: boolean;
  p: string[][];
  updatedAt: string;
};

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
  if (!Number.isInteger(material) || material < 0 || material > 20) material = 0;
  let updatedAt = clip(source.updatedAt, 40);
  if (Number.isNaN(Date.parse(updatedAt))) updatedAt = new Date().toISOString();
  return {
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
