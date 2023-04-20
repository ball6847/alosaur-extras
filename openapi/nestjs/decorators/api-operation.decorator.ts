import { pickBy } from "https://esm.sh/v115/midash@0.8.2";
import { DECORATORS } from "../constants.ts";
import { OperationObject } from "../interfaces/open-api-spec.interface.ts";
import { createMethodDecorator } from "./helpers.ts";

export type ApiOperationOptions = Partial<OperationObject>;

const defaultOperationOptions: ApiOperationOptions = {
  summary: "",
};

export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return createMethodDecorator(
    DECORATORS.API_OPERATION,
    pickBy(
      {
        ...defaultOperationOptions,
        ...options,
      } as ApiOperationOptions,
      (v: unknown) => v !== undefined,
    ),
  );
}
