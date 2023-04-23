import { ClassConstructor, omitBy, plainToInstance, validate } from "./deps.ts";
import { ServiceError } from "./error/service_error.ts";
import { reduceError } from "./validation.ts";

type TransformFactoryOption = {
  validate: boolean;
};

/**
 * transform function shortcut to
 *
 * plainToInstance(cls, plain, { excludeExtraneousValues: true, enableImplicitConversion: true });
 *
 * so we don't have to keep passing the same options every time
 *
 * @param cls
 * @param plain
 */
export function transform<T, V>(cls: ClassConstructor<T>, plain: V[]): T[];
export function transform<T, V>(cls: ClassConstructor<T>, plain: V): T;
export function transform<T, V>(cls: ClassConstructor<T>, plain: V): T {
  return plainToInstance(cls, plain, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
}

export function bodyClassTransformer(
  opt: TransformFactoryOption = { validate: true }
) {
  return async (cls: ClassConstructor<unknown>, body: unknown) => {
    // deno-lint-ignore no-explicit-any
    let instance: any = transform(cls, body);
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
