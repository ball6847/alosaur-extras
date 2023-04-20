import { ApiSecurity } from "./api-security.decorator.ts";

export function ApiCookieAuth(name = "cookie") {
  return ApiSecurity(name);
}
