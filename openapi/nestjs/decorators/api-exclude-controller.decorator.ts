import { DECORATORS } from "../constants.ts";
import { createClassDecorator } from "./helpers.ts";

export function ApiExcludeController(disable = true): ClassDecorator {
  return createClassDecorator(DECORATORS.API_EXCLUDE_CONTROLLER, [disable]);
}
