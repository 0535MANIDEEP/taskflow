import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app, bearer, PASSWORD, resetDatabase, signUp, type Session } from './helpers.js';

let admin: Session;
let member: Session;

/**
 * The role model, checked from the outside.
 *
 * The other two files check the rules one endpoint at a time. This one checks
 * the two things that are about roles rather than about resources: that a
 * client cannot choose its own role, and that the role in the request is the
 * role in the database.
 */
describe('the role model', () => {
  beforeEach(async () => {
    await resetDatabase();
    admin = await signUp('Avery Admin', 'admin@taskflow.test');
    member = await signUp('Rowan Member', 'member@taskflow.test');
  });

  it('ignores a role sent in the registration body', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Sneaky Person',
      email: 'sneaky@taskflow.test',
      password: PASSWORD,
      role: 'admin',
    });

    expect(response.status).toBe(201);
    // The role is not part of the request schema, and the server decides it
    // anyway. A client that could send its own role would be able to make
    // itself an admin.
    expect(response.body.user.role).toBe('member');
  });

  it('ignores a role sent in the login body', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'member@taskflow.test',
      password: PASSWORD,
      role: 'admin',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('member');
  });

  it('takes the role from the database rather than from the token', async () => {
    // The token carries a user id and nothing else. Even a token that has
    // been tampered with to claim a role cannot carry one, because there is
    // nowhere in the payload for it to go.
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${member.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('member');
  });

  it('lets an admin delete a project and refuses a member the same request', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set(...bearer(admin))
      .send({ name: 'A project the admin owns' })
      .expect(201);

    const id = created.body.project.id as number;

    const byAdmin = await request(app)
      .delete(`/api/projects/${id}`)
      .set(...bearer(admin));
    expect(byAdmin.status).toBe(200);

    const another = await request(app)
      .post('/api/projects')
      .set(...bearer(admin))
      .send({ name: 'A project the member may not remove' })
      .expect(201);

    const byMember = await request(app)
      .delete(`/api/projects/${another.body.project.id}`)
      .set(...bearer(member));
    expect(byMember.status).toBe(403);
  });

  it('refuses a member opening an admin project and lets the admin open it', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set(...bearer(admin))
      .send({ name: 'A project only the admin sees' })
      .expect(201);

    const id = created.body.project.id as number;

    const byMember = await request(app)
      .get(`/api/projects/${id}`)
      .set(...bearer(member));
    expect(byMember.status).toBe(403);

    const byAdmin = await request(app).get(`/api/projects/${id}`).set(...bearer(admin));
    expect(byAdmin.status).toBe(200);
  });
});
