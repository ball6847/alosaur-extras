import { ApiSecurity } from "./api-security.decorator.ts";

export function ApiBasicAuth(name = "basic") {
  return ApiSecurity(name);
}
