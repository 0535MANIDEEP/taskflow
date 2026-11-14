import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { findById } from '../repositories/userRepository.js';
import { loginSchema, registerSchema } from '../schemas.js';
import { login, register } from '../services/authService.js';

const router = Router();

/**
 * Creates an account.
 *
 * The role is decided by the server. See the service for why.
 */
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const user = await register(req.body);
  res.status(201).json({ user });
});

/**
 * Exchanges credentials for a session token.
 */
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const result = await login(req.body);
  res.json(result);
});

/**
 * The signed-in user, read from the token rather than from the client.
 */
router.get('/me', authenticate, async (req, res) => {
  const user = await findById(req.userId!);
  res.json({ user });
});

export default router;
