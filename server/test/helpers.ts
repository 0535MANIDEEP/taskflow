import request from 'supertest';

import { createApp } from '../src/app.js';
import db from '../src/db/index.js';
import type { Role, User } from '../src/types.js';

/**
 * One app for the whole file.
 *
 * The in-memory Postgres lives in the module graph, and the graph is rebuilt
 * per test file, so this app and the database it talks to are the same pair
 * for every test in the file.
 */
const app = createApp();

export { app };

export interface Session {
  token: string;
  user: User;
}

export const PASSWORD = 'password123';

/**
 * Empties the database.
 *
 * The in-memory Postgres outlives a single test inside a file, so without
 * this a second test that registers the same email gets a 409 from the first
 * one. Every test starts from an empty database instead, which is also what
 * makes the "the first account is the admin" rule mean the same thing in
 * every test.
 */
export async function resetDatabase(): Promise<void> {
  await db.query('DELETE FROM tasks');
  await db.query('DELETE FROM projects');
  await db.query('DELETE FROM users');
}

/**
 * Registers an account and signs in.
 *
 * The first account to exist is the admin and every one after it is a member.
 * That rule lives in the service, so a test that wants an admin simply
 * registers first.
 */
export async function signUp(name: string, email: string): Promise<Session> {
  const registered = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: PASSWORD })
    .expect(201);

  const loggedIn = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  return {
    token: loggedIn.body.token as string,
    user: registered.body.user as User,
  };
}

/**
 * Registers an account without signing in, so a test can count how many
 * accounts exist.
 */
export async function registerOnly(name: string, email: string): Promise<User> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: PASSWORD })
    .expect(201);
  return response.body.user as User;
}

/** The header a request carrying a session token has to send. */
export const bearer = (session: Session): [string, string] => [
  'Authorization',
  `Bearer ${session.token}`,
];

export const roleOf = (user: User): Role => user.role;
