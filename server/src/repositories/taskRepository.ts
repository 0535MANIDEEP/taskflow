/**
 * The task repository.
 *
 * The only place that writes SQL about tasks.
 */
import pool from '../db/index.js';
import type { Task, TaskStatus } from '../types.js';

interface TaskRow {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: number | null;
  assignee_name: string | null;
  created_by: number;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * A timestamp becomes an ISO string whichever shape the driver hands back.
 *
 * The node-postgres driver parses a timestamp into a Date. The in-memory
 * driver used by the test suite hands back the string it stored. The API
 * promises a string either way.
 */
const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  status: row.status,
  assigneeId: row.assignee_id,
  assigneeName: row.assignee_name,
  createdBy: row.created_by,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const SELECT_TASK = `
  SELECT t.id AS id,
         t.project_id AS project_id,
         t.title AS title,
         t.description AS description,
         t.status AS status,
         t.assignee_id AS assignee_id,
         a.name AS assignee_name,
         t.created_by AS created_by,
         t.created_at AS created_at,
         t.updated_at AS updated_at
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assignee_id
`;

export async function listByProject(projectId: number): Promise<Task[]> {
  const { rows } = await pool.query<TaskRow>(
    `${SELECT_TASK} WHERE t.project_id = $1 ORDER BY t.id`,
    [projectId],
  );
  return rows.map(toTask);
}

export async function findById(id: number): Promise<Task | null> {
  const { rows } = await pool.query<TaskRow>(`${SELECT_TASK} WHERE t.id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  return toTask(row);
}

export async function createTask(input: {
  projectId: number;
  title: string;
  description: string;
  assigneeId: number | null;
  createdBy: number;
}): Promise<Task> {
  const { rows } = await pool.query<TaskRow>(
    `INSERT INTO tasks (project_id, title, description, assignee_id, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, project_id, title, description, status, assignee_id,
               created_by, created_at, updated_at`,
    [input.projectId, input.title, input.description, input.assigneeId, input.createdBy],
  );
  const row = rows[0]!;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    assigneeName: null,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function updateTask(
  id: number,
  patch: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeId?: number | null;
  },
): Promise<Task | null> {
  const { rows } = await pool.query<TaskRow>(
    `UPDATE tasks
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         assignee_id = CASE WHEN $5::boolean THEN $6 ELSE assignee_id END,
         updated_at = now()
     WHERE id = $1
     RETURNING id, project_id, title, description, status, assignee_id,
               created_by, created_at, updated_at`,
    [
      id,
      patch.title ?? null,
      patch.description ?? null,
      patch.status ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'assigneeId'),
      patch.assigneeId ?? null,
    ],
  );
  const row = rows[0];
  if (!row) return null;
  return findById(row.id);
}

export async function removeTask(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
