import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodType } from 'zod';

/**
 * Turns a Zod failure into a `{ field: message }` map, so the form on the
 * other end of the request can put the message next to the input that caused
 * it rather than showing one list of everything that went wrong.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in fields)) {
      fields[field] = issue.message;
    }
  }
  return fields;
}

/**
 * Validates the body against a schema and replaces it with the parsed value.
 *
 * The parsed value is what the handler sees, so a handler never reads a
 * string where a number was promised. Validation runs before the handler, not
 * inside it, so no route can forget it.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'That request is not valid',
        fields: fieldErrors(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * The same, for the parameters in the address.
 *
 * The parsed value is written back onto the request, so a handler reads a
 * number where the address had a string. The id in the address is always a
 * string and always is; the handler never has to remember to convert it.
 */
export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'That address is not valid',
        fields: fieldErrors(result.error),
      });
      return;
    }
    req.params = result.data as unknown as typeof req.params;
    next();
  };
}
