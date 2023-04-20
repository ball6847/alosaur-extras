// deno-lint-ignore-file ban-types no-explicit-any
import { pickBy } from 'https://esm.sh/v115/midash@0.8.2';
import { DECORATORS } from '../constants.ts';
import { ParameterLocation, ParameterObject } from '../interfaces/open-api-spec.interface.ts';
import { SwaggerEnumType } from '../types/swagger-enum.type.ts';
import { getEnumType, getEnumValues } from '../utils/enum.utils.ts';
import { createClassDecorator, createParamDecorator } from './helpers.ts';

export interface ApiHeaderOptions extends Omit<ParameterObject, 'in'> {
  enum?: SwaggerEnumType;
}

const defaultHeaderOptions = { name: '' } satisfies ApiHeaderOptions;

export function ApiHeader(
  options: ApiHeaderOptions,
): MethodDecorator & ClassDecorator {
  type OPT = ApiHeaderOptions & { in: ParameterLocation };
  type K_OPT = keyof OPT;
  const param = pickBy<OPT[K_OPT]>(
    {
      name: options.name == null ? defaultHeaderOptions.name : options.name,
      in: 'header',
      description: options.description,
      required: options.required,
      schema: {
        ...(options.schema || {}),
        type: 'string',
      },
    },
    (v) => v !== undefined,
  ) as OPT;

  if (options.enum) {
    const enumValues = getEnumValues(options.enum);
    param.schema = {
      enum: enumValues,
      type: getEnumType(enumValues),
    };
  }

  return (
    target: object | Function,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    if (descriptor) {
      return createParamDecorator(param, defaultHeaderOptions)(target, key as any, descriptor);
    }
    return createClassDecorator(DECORATORS.API_HEADERS, [param])(
      target as Function,
    );
  };
}

export const ApiHeaders = (
  headers: ApiHeaderOptions[],
): MethodDecorator & ClassDecorator => {
  return (
    target: object | Function,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    headers.forEach((options) => {
      if (key && descriptor) {
        ApiHeader(options)(target, key, descriptor);
      } else {
        ApiHeader(options)(target as Function);
      }
    });
  };
};
