import { describe, expect, it } from 'vitest';

import { fieldErrors, projectSchema, signUpSchema } from '../lib/validation';

describe('the form rules', () => {
  it('catches a name that is too short', () => {
    const parsed = projectSchema.safeParse({ name: 'ab', description: '' });

    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error!).name).toMatch(/3 characters/);
  });

  it('catches an address that is not an address', () => {
    const parsed = signUpSchema.safeParse({ name: 'A Name', email: 'nope', password: 'password123' });

    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error!).email).toBeTruthy();
  });

  it('catches a password that is too short', () => {
    const parsed = signUpSchema.safeParse({ name: 'A Name', email: 'a@b.co', password: 'short' });

    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error!).password).toMatch(/8 characters/);
  });

  it('accepts a good signup', () => {
    const parsed = signUpSchema.safeParse({
      name: 'A Name',
      email: 'a@b.co',
      password: 'password123',
    });

    expect(parsed.success).toBe(true);
  });

  it('keeps the first message for a field that has two', () => {
    const parsed = signUpSchema.safeParse({ name: 'A', email: 'nope', password: 'x' });
    const errors = fieldErrors(parsed.error!);

    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
  });
});
