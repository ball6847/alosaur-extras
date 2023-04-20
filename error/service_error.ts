// deno-lint-ignore-file no-explicit-any
/**
 * Base class for all service errors
 *
 * This error is designed to be thrown by service layer
 * and should describe the error in a way that is understandable in different context, for example in worker, cli or http
 *
 * error.code should be alphanumeric and underscore (snake case), all in uppercases without any space
 * error.message should be human readable, and must be in English, this is not suppoesed to be read by end-user (use error.code as translate key instead)
 * error.httpCode should be a valid http status code, so this can be caught by http controller or global error handler to return correct error to client
 */
export class ServiceError extends Error {
  code: string;
  httpCode: number;
  details?: any;

  constructor(
    err: { code: string; message: string; httpCode: number; details?: any },
  ) {
    super(err.message);
    this.code = err.code;
    this.message = err.message;
    this.httpCode = err.httpCode;
    if (err.details) {
      this.details = err.details;
    }
  }
}
