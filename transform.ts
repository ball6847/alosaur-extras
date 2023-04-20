import { ClassConstructor, omitBy, plainToInstance, validate } from "./deps.ts";
import { ServiceError } from "./error/service_error.ts";
import { reduceError } from "./validation.ts";

type TransformFactoryOption = {
  validate: boolean;
};

export function bodyClassTransformer(
  opt: TransformFactoryOption = { validate: true }
) {
  return async (transform: ClassConstructor<unknown>, body: unknown) => {
    // deno-lint-ignore no-explicit-any
    let instance: any = plainToInstance(transform, body, {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    });
    if (opt.validate) {
      const errors = await validate(instance);
      if (errors.length > 0) {
        throw new ServiceError({
          code: "VALIDATION_ERROR",
          message: "Validation error",
          details: reduceError(errors),
          httpCode: 400,
        });
      }
    }
    // remove undefined values
    instance = omitBy(instance, (v) => v === undefined);
    return instance;
  };
}
