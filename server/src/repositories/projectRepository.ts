/**
 * The project repository.
 *
 * Two read paths, and the difference between them is the access rule:
 *
 *   listAll     every project. Used for admins.
 *   listForUser the projects a member is allowed to see: the ones they created,
 *              and the ones they have a task assigned in. A member who was
 *              handed a task in somebody else's project has to be able to open
 *              that project, or the assignment is invisible.
 *
 * The rule lives in the SQL rather than in the service layer so it is applied
 * in one place and cannot drift between two code paths.
 */
import pool from '../db/index.js';
import type { Project } from '../types.js';

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_name: string;
  task_count: number;
  created_at: Date | string;
}

/**
 * A timestamp becomes an ISO string whichever shape the driver hands back.
 *
 * The node-postgres driver parses a timestamp into a Date. The in-memory
 * driver used by the test suite hands back the string it stored. The API
 * promises a string either way, so the conversion happens here rather than
 * in every call site.
 */
const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  taskCount: Number(row.task_count),
  createdAt: toIso(row.created_at),
});

/**
 * The project and its task count, in one query.
 *
 * The count is a LEFT JOIN and a GROUP BY rather than a correlated subquery
 * in the select list. Postgres accepts both. The in-memory Postgres the test
 * suite uses does not: it cannot resolve an outer column from inside a
 * subquery, and the whole statement fails to plan.
 *
 * The creator's name comes from a derived table rather than from users
 * directly. The in-memory driver keys the output of a grouped query by the
 * name of the column it came from rather than by the alias it was given, so
 * a query that selects p.name and u.name returns one "name" and the other
 * wins. Renaming the column inside the derived table keeps the two apart.
 * Postgres handles the original form correctly, but the alias costs nothing
 * and makes the two drivers agree.
 *
 * The query is still the same one the app runs in production, which is the
 * point of the in-memory driver being an actual Postgres rather than a
 * lookalike.
 */
const SELECT_PROJECT = `
  SELECT p.id AS id,
         p.name AS name,
         p.description AS description,
         p.created_by AS created_by,
         u.creator_name AS created_by_name,
         p.created_at AS created_at,
         count(t.id) AS task_count
  FROM projects p
  JOIN (SELECT id, name AS creator_name FROM users) u ON u.id = p.created_by
  LEFT JOIN tasks t ON t.project_id = p.id
`;

const GROUP_PROJECT = `
  GROUP BY p.id, p.name, p.description, p.created_by, u.creator_name, p.created_at
`;

const ORDER_PROJECT = ' ORDER BY p.created_at DESC, p.id DESC';

export async function listAll(): Promise<Project[]> {
  const { rows } = await pool.query<ProjectRow>(
    `${SELECT_PROJECT}${GROUP_PROJECT}${ORDER_PROJECT}`,
  );
  return rows.map(toProject);
}

export async function listForUser(userId: number): Promise<Project[]> {
  const { rows } = await pool.query<ProjectRow>(
    `${SELECT_PROJECT}
     WHERE p.created_by = $1
        OR p.id IN (SELECT project_id FROM tasks WHERE assignee_id = $1)
     ${GROUP_PROJECT}${ORDER_PROJECT}`,
    [userId],
  );
  return rows.map(toProject);
}

export async function findById(id: number): Promise<Project | null> {
  const { rows } = await pool.query<ProjectRow>(
    `${SELECT_PROJECT} WHERE p.id = $1 ${GROUP_PROJECT}`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return toProject(row);
}

export async function createProject(input: {
  name: string;
  description: string;
  createdBy: number;
}): Promise<Project> {
  const { rows } = await pool.query<ProjectRow>(
    `INSERT INTO projects (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_by, created_at`,
    [input.name, input.description, input.createdBy],
  );
  const row = rows[0]!;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdByName: '',
    taskCount: 0,
    createdAt: toIso(row.created_at),
  };
}

export async function updateProject(
  id: number,
  patch: { name?: string; description?: string },
): Promise<Project | null> {
  const { rows } = await pool.query<ProjectRow>(
    `UPDATE projects
     SET name = COALESCE($2, name),
         description = COALESCE($3, description)
     WHERE id = $1
     RETURNING id, name, description, created_by, created_at`,
    [id, patch.name ?? null, patch.description ?? null],
  );
  const row = rows[0];
  if (!row) return null;
  return findById(row.id);
}

export async function removeProject(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

/** True when the user created the project. */
export async function isCreator(projectId: number, userId: number): Promise<boolean> {
  const { rows } = await pool.query<{ created_by: number }>(
    'SELECT created_by FROM projects WHERE id = $1',
    [projectId],
  );
  return rows[0]?.created_by === userId;
}

/** True when the user has a task assigned in the project. */
export async function hasAssignedTask(projectId: number, userId: number): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM tasks WHERE project_id = $1 AND assignee_id = $2 LIMIT 1',
    [projectId, userId],
  );
  return rows.length > 0;
}
