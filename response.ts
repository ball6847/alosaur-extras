import { Content, humanizeString } from "./deps.ts";

const humanize = (str: string) => {
  const newStr = humanizeString(str)
    .toLowerCase()
    .replace(/[\-_]+/g, " ")
    .trim();
  return newStr.charAt(0).toUpperCase() + newStr.slice(1);
};

/**
 * ActionResult for 400
 */
export function BadRequest(code = "BAD_REQUEST", message?: string) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 400);
}

/**
 * ActionResult for 401
 */
export function Unauthorized(code = "UNAUTHORIZED", message?: string) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 401);
}

/**
 * ActionResult for 403
 */
export function Forbidden(code = "FORBIDDEN", message?: string) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 403);
}

/**
 * ActionResult for 404
 */
export function NotFound(code = "NOT_FOUND", message?: string) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 404);
}

/**
 * ActionResult for 409
 */
export function Conflict(code = "CONFLICT", message?: string) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 409);
}

/**
 * ActionResult for 500
 */
export function InternalServerError(
  code = "INTERNAL_SERVER_ERROR",
  message?: string,
) {
  const error = { code, message: message || humanize(code) };
  return Content({ error }, 500);
}

/**
 * ActionResult for 200
 */
export function Ok(data?: unknown, extra: Record<string, unknown> = {}) {
  return Content({ data, ...extra }, 200);
}

/**
 * ActionResult for 201
 */
export function Created(data?: unknown) {
  return Content({ data }, 201);
}
