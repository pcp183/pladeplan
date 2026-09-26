import { DatabaseNotConfiguredError, ensureSchema, getSql } from './db';
import { parseProject, type StoredProject } from './project-record';

export { parseProject, parseProjectList, MAX_PROJECTS, MAX_PART_ROWS } from './project-record';
export type { StoredProject } from './project-record';

function payloadOf(value: unknown): StoredProject | null {
  if (typeof value === 'string') {
    try {
      return parseProject(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return parseProject(value);
}

export async function listProjects(userId: string): Promise<StoredProject[]> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT payload
    FROM pladeplan_projects
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  const projects: StoredProject[] = [];
  for (const row of rows) {
    const project = payloadOf(row.payload);
    if (project) projects.push(project);
  }
  return projects;
}

/** Hard-delete every saved sheet for this user. Throws if any row remains. */
export async function deleteAllProjects(userId: string): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) throw new DatabaseNotConfiguredError();
  const existing = await sql`SELECT id FROM pladeplan_projects WHERE user_id = ${userId}`;
  await sql`DELETE FROM pladeplan_projects WHERE user_id = ${userId}`;
  const left = await sql`SELECT id FROM pladeplan_projects WHERE user_id = ${userId} LIMIT 1`;
  if (left.length > 0) throw new Error('PROJECTS_REMAIN');
  return existing.length;
}

export async function replaceProjects(userId: string, projects: StoredProject[]): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return;
  const queries = projects.map((project) => {
    const payload = JSON.stringify(project);
    return sql`
      INSERT INTO pladeplan_projects (user_id, id, name, payload, updated_at)
      VALUES (
        ${userId},
        ${project.id},
        ${project.n},
        ${payload}::jsonb,
        ${project.updatedAt}::timestamptz
      )
      ON CONFLICT (user_id, id) DO UPDATE
      SET name = EXCLUDED.name,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
    `;
  });
  const ids = projects.map((project) => project.id);
  if (ids.length === 0) {
    queries.push(sql`DELETE FROM pladeplan_projects WHERE user_id = ${userId}`);
  } else {
    queries.push(sql`
      DELETE FROM pladeplan_projects
      WHERE user_id = ${userId}
        AND NOT (id = ANY(${ids}::text[]))
    `);
  }
  await sql.transaction(queries);
}
