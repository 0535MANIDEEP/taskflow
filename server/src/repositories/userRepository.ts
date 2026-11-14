/**
 * The user repository.
 *
 * The only place that writes SQL about users. Nothing above this layer knows
 * what a column is called, which is what makes the service layer testable
 * without a database and the database swappable without the service layer.
 */
import pool from '../db/index.js';
import type { Role, User, UserWithPassword } from '../types.js';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: Date | string;
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

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  createdAt: toIso(row.created_at),
});

export async function findByEmail(email: string): Promise<UserWithPassword | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  const row = rows[0];
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export async function findById(id: number): Promise<User | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  const row = rows[0];
  if (!row) return null;
  return toUser(row);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
}): Promise<User> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email.toLowerCase(), input.passwordHash, input.name, input.role],
  );
  return toUser(rows[0]!);
}

export async function listUsers(): Promise<User[]> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users ORDER BY id');
  return rows.map(toUser);
}
