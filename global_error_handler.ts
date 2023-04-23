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
    // TODO: properly use logger from somewhere else, eg. context or default alosaur container
    console.error(err);
  }
  context.response.setImmediately();
}
