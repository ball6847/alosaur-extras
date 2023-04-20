import { DECORATORS } from "../constants.ts";
import { createMethodDecorator } from "./helpers.ts";

export function ApiExcludeEndpoint(disable = true): MethodDecorator {
  return createMethodDecorator(DECORATORS.API_EXCLUDE_ENDPOINT, {
    disable,
  });
}
