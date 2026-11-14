/**
 * The environment, read once.
 *
 * Every module that needs a secret or a URL imports it from here rather than
 * reaching into process.env itself, so there is exactly one place where the
 * application is told how it is configured.
 */

/**
 * The signing secret has to exist. The server refuses to start without it
 * rather than falling back to a default, because a default secret is a secret
 * anyone can read: it would let anyone sign a token for any user id.
 *
 * The only exception is the test suite, which sets NODE_ENV=test and needs
 * the module to import without a .env file.
 */
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && process.env.NODE_ENV !== 'test') {
  throw new Error(
    'JWT_SECRET is not set. Copy .env.example to .env and fill it in.',
  );
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: jwtSecret ?? 'test-secret-this-never-reaches-production',
  databaseUrl: process.env.DATABASE_URL ?? '',
  /** True in development, where any origin is allowed. */
  corsOrigin: process.env.CORS_ORIGIN || true,
  /** How long a session token lasts. */
  tokenExpiresIn: '7d',
  /** How long a password hash takes to compute. */
  bcryptRounds: 10,
} as const;
