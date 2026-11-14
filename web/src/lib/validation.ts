import { z } from 'zod';

/**
 * The rules the forms apply.
 *
 * They are the same rules the server applies, written out again on this side
 * so a mistake is caught before a request is sent. The server checks them
 * again regardless: a client that validates is a convenience, and a server
 * that validates is the rule.
 */

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
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

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'The project needs a name of at least 3 characters')
    .max(120, 'The project name needs to be 120 characters or fewer'),
  description: z.string().trim().max(500, 'The description is too long').default(''),
});

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'The task needs a title of at least 3 characters')
    .max(200, 'The task title needs to be 200 characters or fewer'),
  description: z.string().trim().max(1000, 'The description is too long').default(''),
});

export type FieldErrors = Record<string, string>;

/**
 * Turns a Zod failure into a `{ field: message }` map.
 */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in fields)) {
      fields[field] = issue.message;
    }
  }
  return fields;
}
