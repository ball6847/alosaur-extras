// deno-lint-ignore-file no-explicit-any ban-types no-unused-vars
import { pickBy } from "https://esm.sh/v115/midash@0.8.2";
import { DECORATORS } from "../constants.ts";
import { Reflect } from "../reflect.ts";

export const METADATA_FACTORY_NAME = "_OPENAPI_METADATA_FACTORY";

export function createMethodDecorator<T = any>(
  metakey: string,
  metadata: T,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(metakey, metadata, descriptor.value);
    return descriptor;
  };
}

export function createClassDecorator<T extends Array<any> = any>(
  metakey: string,
  metadata: T = [] as any as T,
): ClassDecorator {
  return (target) => {
    const prevValue = Reflect.getMetadata(metakey, target) || [];
    Reflect.defineMetadata(metakey, [...prevValue, ...metadata], target);
    return target;
  };
}

export function createPropertyDecorator<T extends Record<string, any> = any>(
  metakey: string,
  metadata: T,
  overrideExisting = true,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const propKey = String(propertyKey);
    const properties =
      Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, target) || [];

    const key = `:${propKey}`;
    if (!properties.includes(key)) {
      Reflect.defineMetadata(
        DECORATORS.API_MODEL_PROPERTIES_ARRAY,
        [...properties, `:${propKey}`],
        target,
      );
    }
    const existingMetadata = Reflect.getMetadata(metakey, target, propKey);
    if (existingMetadata) {
      const newMetadata = pickBy(metadata, (v) => v !== undefined);
      const metadataToSave = overrideExisting
        ? {
          ...existingMetadata,
          ...newMetadata,
        }
        : {
          ...newMetadata,
          ...existingMetadata,
        };

      Reflect.defineMetadata(metakey, metadataToSave, target, propKey);
    } else {
      // @ts-ignore as this is very denymic
      const type =
        target?.constructor?.[METADATA_FACTORY_NAME]?.()[propKey]?.type ??
          Reflect.getMetadata("design:type", target, propKey);

      Reflect.defineMetadata(
        metakey,
        {
          type,
          ...pickBy(metadata, (v) => v !== undefined),
        },
        target,
        propKey,
      );
    }
  };
}

export function createMixedDecorator<T = any>(
  metakey: string,
  metadata: T,
): MethodDecorator & ClassDecorator {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    if (descriptor) {
      let metadatas: any;
      if (Array.isArray(metadata)) {
        const previousMetadata =
          Reflect.getMetadata(metakey, descriptor.value) || [];
        metadatas = [...previousMetadata, ...metadata];
      } else {
        const previousMetadata =
          Reflect.getMetadata(metakey, descriptor.value) || {};
        metadatas = { ...previousMetadata, ...metadata };
      }
      Reflect.defineMetadata(metakey, metadatas, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metakey, metadata, target);
    return target;
  };
}

export function createParamDecorator<T extends Record<string, any> = any>(
  metadata: T,
  initial: Partial<T>,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const parameters =
      Reflect.getMetadata(DECORATORS.API_PARAMETERS, descriptor.value) || [];
    Reflect.defineMetadata(
      DECORATORS.API_PARAMETERS,
      [
        ...parameters,
        {
          ...initial,
          ...pickBy(metadata, (v) => v !== undefined),
        },
      ],
      descriptor.value,
    );
    return descriptor;
  };
}

export function getTypeIsArrayTuple(
  input: Function | [Function] | undefined | string | Record<string, any>,
  isArrayFlag: boolean,
): [Function | undefined, boolean] {
  if (!input) {
    return [input as undefined, isArrayFlag];
  }
  if (isArrayFlag) {
    return [input as Function, isArrayFlag];
  }
  const isInputArray = Array.isArray(input);
  const type = isInputArray ? input[0] : input;
  return [type as Function, isInputArray];
}
