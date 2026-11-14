import bcrypt from 'bcryptjs';

import { config } from '../config.js';
import { conflict, unauthorized } from '../lib/httpError.js';
import { signToken } from '../middleware/authenticate.js';
import { createUser, findByEmail, listUsers } from '../repositories/userRepository.js';
import type { User } from '../types.js';

/**
 * Creates an account.
 *
 * The role is not part of the request. A client that could pick its own role
 * would be able to make itself an admin, so the only two things that decide a
 * role are the database and this function:
 *
 *   - the first account to exist is the admin
 *   - every account after that is a member
 *
 * That is the whole of the role model, and it means the endpoint cannot be
 * used to escalate.
 */
export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const existing = await findByEmail(input.email);
  if (existing) {
    throw conflict('An account with that email already exists');
  }

  const users = await listUsers();
  const role = users.length === 0 ? 'admin' : 'member';

  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  return createUser({
    email: input.email,
    passwordHash,
    name: input.name,
    role,
  });
}

/**
 * Checks the credentials and issues a session token.
 *
 * The password is hashed with bcrypt, never stored or compared as plain
 * text. bcrypt is slow on purpose: the cost is what makes a stolen table of
 * hashes expensive to attack.
 */
export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const found = await findByEmail(input.email);

  if (!found) {
    throw unauthorized('That email and password do not match');
  }

  const matches = await bcrypt.compare(input.password, found.passwordHash);
  if (!matches) {
    // The same message as the line above, on purpose. Different messages for
    // "no such email" and "wrong password" tell an attacker which addresses
    // have accounts, which is half of what they need.
    throw unauthorized('That email and password do not match');
  }

  const user: User = {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
    createdAt: found.createdAt,
  };

  return { user, token: signToken(user.id) };
}
