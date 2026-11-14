/**
 * Errors that carry an HTTP status.
 *
 * The services throw these and the error handler turns them into responses.
 * A route handler never has to know a status code, and a service never has to
 * know anything about HTTP.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, message);

export const unauthorized = (message: string): HttpError => new HttpError(401, message);

export const forbidden = (message: string): HttpError => new HttpError(403, message);

export const notFound = (message: string): HttpError => new HttpError(404, message);

export const conflict = (message: string): HttpError => new HttpError(409, message);
