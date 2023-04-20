// deno-lint-ignore-file no-unused-vars ban-types no-explicit-any
import { DECORATORS } from "../constants.ts";
import { SecurityRequirementObject } from "../interfaces/open-api-spec.interface.ts";
import { Reflect } from "../reflect.ts";
import { extendMetadata } from "../utils/extend-metadata.util.ts";

export function ApiSecurity(
  name: string | SecurityRequirementObject,
  requirements: string[] = [],
): ClassDecorator & MethodDecorator {
  let metadata: SecurityRequirementObject[];

  if (typeof name === "string") {
    metadata = [{ [name]: requirements }];
  } else {
    metadata = [name];
  }

  return (
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    if (descriptor) {
      metadata = extendMetadata(
        metadata,
        DECORATORS.API_SECURITY,
        descriptor.value,
      );
      Reflect.defineMetadata(
        DECORATORS.API_SECURITY,
        metadata,
        descriptor.value,
      );
      return descriptor;
    }
    metadata = extendMetadata(metadata, DECORATORS.API_SECURITY, target);
    Reflect.defineMetadata(DECORATORS.API_SECURITY, metadata, target);
    return target;
  };
}
