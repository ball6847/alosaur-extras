import { ActionResult, Content, HttpContext, pick } from "./deps.ts";
import { InternalServerError } from "./response.ts";

type ServiceErrorLike = {
  code: string;
  message: string;
  httpCode: number;
};

// deno-lint-ignore no-explicit-any
function isServiceErrorLike(error: any): error is ServiceErrorLike {
  return !!error.code && !!error.message && !!error.httpCode;
}

export function globalErrorHandler(
  context: HttpContext,
  error: Error | ServiceErrorLike | ActionResult
) {
  if (isServiceErrorLike(error)) {
    context.response.result = Content(
      { error: pick(error, ["code", "message", "details"]) },
      error.httpCode
    );
  } else if (!(error instanceof Error) && error.__isActionResult) {
    context.response.result = error;
  } else {
    context.response.result = InternalServerError();
  }
  context.response.setImmediately();
}
