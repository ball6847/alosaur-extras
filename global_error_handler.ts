// deno-lint-ignore-file no-explicit-any
import { ActionResult, Content, HttpContext, pick } from "./deps.ts";
import { InternalServerError } from "./response.ts";

type ServiceErrorLike = {
  code: string;
  message: string;
  httpCode: number;
};

function isServiceErrorLike(error: any): error is ServiceErrorLike {
  return !!error.code && !!error.message && !!error.httpCode;
}

type Err = Error | ServiceErrorLike | ActionResult;

/**
 * Simple global error handler for alosaur
 *
 * This allow us to
 * - throw `ServiceError` which designed to be used in service layer (this include special `httpCode` so the error can be handled properly)
 * - throw `ActionResult` which allow us to return custom result that not necessarily an error
 * - throw `Error` which will be handled as `500` Internal Server Error
 * - throw anything else which will be handled as `500` Internal Server Error
 *
 * This function will also log error if the result is `5XX`
 *
 * TODO: make logger to be configurable (eg. from context, default alosaur container or through higher order function upon registration)
 *
 * @param context Alosaur HttpContext
 * @param err Error to be handled
 */
export function globalErrorHandler(context: HttpContext, err: Err) {
  if (isServiceErrorLike(err)) {
    const response = {
      error: pick(err, ["code", "message", "details"]),
    };
    context.response.result = Content(response, err.httpCode);
  } else if (!(err instanceof Error) && err.__isActionResult) {
    context.response.result = err;
  } else {
    context.response.result = InternalServerError();
  }
  // log error if result is server error (5XX)
  if (context.response.result.status >= 500) {
    // just use console for now
    console.error(err);
  }
  context.response.setImmediately();
}
