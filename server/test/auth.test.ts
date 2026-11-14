import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app, PASSWORD, registerOnly, resetDatabase, signUp } from './helpers.js';

describe('accounts', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('makes the first account the admin and every later one a member', async () => {
    const first = await registerOnly('Avery Admin', 'admin@taskflow.test');
    const second = await registerOnly('Rowan Member', 'member@taskflow.test');

    expect(first.role).toBe('admin');
    expect(second.role).toBe('member');
  });

  it('refuses a second account with the same email', async () => {
    await registerOnly('Avery Admin', 'admin@taskflow.test');

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Impostor', email: 'admin@taskflow.test', password: PASSWORD });

    expect(response.status).toBe(409);
  });

  it('refuses a weak password and says which field was wrong', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Password', email: 'short@taskflow.test', password: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body.fields.password).toMatch(/8 characters/);
  });

  it('refuses an address that is not an address', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.fields.email).toBeTruthy();
  });

  it('signs in with the right password and hands back a token', async () => {
    await registerOnly('Avery Admin', 'admin@taskflow.test');

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@taskflow.test', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.role).toBe('admin');
  });

  it('gives the same answer for a wrong password and for an unknown account', async () => {
    await registerOnly('Avery Admin', 'admin@taskflow.test');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@taskflow.test', password: 'not-the-password' });

    const unknownAccount = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@taskflow.test', password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    // Two different messages here would tell an attacker which addresses have
    // accounts, which is half of what they need.
    expect(wrongPassword.body.error).toBe(unknownAccount.body.error);
  });

  it('reads the signed-in user from the token', async () => {
    const session = await signUp('Avery Admin', 'admin@taskflow.test');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('admin@taskflow.test');
  });

  it('refuses a request with no token and one with a tampered token', async () => {
    const session = await signUp('Avery Admin', 'admin@taskflow.test');

    const noToken = await request(app).get('/api/auth/me');
    const tampered = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.token.slice(0, -3)}xyz`);

    expect(noToken.status).toBe(401);
    expect(tampered.status).toBe(401);
  });
});
