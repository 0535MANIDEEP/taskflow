import { z } from 'zod';

/**
 * The request schemas.
 *
 * These are the shape of every request the API accepts. The route handlers
 * run them before the handler does, so a handler receives a value it can
 * trust, and the client gets told which field was wrong.
 */

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Your name needs at least 2 characters')
    .max(80, 'Your name needs to be 80 characters or fewer'),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Your password needs at least 8 characters')
    .max(200, 'Your password is too long'),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'The project needs a name of at least 3 characters')
    .max(120, 'The project name needs to be 120 characters or fewer'),
  description: z.string().trim().max(500, 'The description is too long').default(''),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'The project needs a name of at least 3 characters')
    .max(120, 'The project name needs to be 120 characters or fewer')
    .optional(),
  description: z.string().trim().max(500, 'The description is too long').optional(),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'The task needs a title of at least 3 characters')
    .max(200, 'The task title needs to be 200 characters or fewer'),
  description: z.string().trim().max(1000, 'The description is too long').default(''),
  assigneeId: z.number().int().positive().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'The task needs a title of at least 3 characters')
    .max(200, 'The task title needs to be 200 characters or fewer')
    .optional(),
  description: z.string().trim().max(1000, 'The description is too long').optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
