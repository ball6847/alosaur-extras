// deno-lint-ignore-file no-explicit-any
import { DECORATORS } from '../constants.ts';
import { SchemaObjectMetadata } from '../interfaces/schema-object-metadata.interface.ts';
import { SwaggerEnumType } from '../types/swagger-enum.type.ts';
import { getEnumType, getEnumValues } from '../utils/enum.utils.ts';
import { createPropertyDecorator, getTypeIsArrayTuple } from './helpers.ts';

export interface ApiPropertyOptions extends Omit<SchemaObjectMetadata, 'name' | 'enum'> {
  name?: string;
  enum?: any[] | Record<string, any>;
  enumName?: string;
}

const isEnumArray = (obj: ApiPropertyOptions): boolean => (obj.isArray as NonNullable<boolean>) && !!obj.enum;

export function ApiProperty(
  options: ApiPropertyOptions = {},
): PropertyDecorator {
  return createApiPropertyDecorator(options);
}

export function createApiPropertyDecorator(
  options: ApiPropertyOptions = {},
  overrideExisting = true,
): PropertyDecorator {
  const [type, isArray] = getTypeIsArrayTuple(options.type, options.isArray as NonNullable<boolean>);
  options = {
    ...options,
    type,
    isArray,
  };

  if (isEnumArray(options)) {
    options.type = 'array';

    const enumValues = getEnumValues(options.enum as NonNullable<SwaggerEnumType>);
    options.items = {
      type: getEnumType(enumValues),
      enum: enumValues,
    };
    delete options.enum;
  } else if (options.enum) {
    const enumValues = getEnumValues(options.enum);

    options.enum = enumValues;
    options.type = getEnumType(enumValues);
  }

  if (Array.isArray(options.type)) {
    options.type = 'array';
    options.items = {
      type: 'array',
      items: {
        type: options.type[0],
      },
    };
  }

  return createPropertyDecorator(
    DECORATORS.API_MODEL_PROPERTIES,
    options,
    overrideExisting,
  );
}

export function ApiPropertyOptional(
  options: ApiPropertyOptions = {},
): PropertyDecorator {
  return ApiProperty({
    ...options,
    required: false,
  });
}

export function ApiResponseProperty(
  options: Pick<
    ApiPropertyOptions,
    'type' | 'example' | 'format' | 'enum' | 'deprecated'
  > = {},
): PropertyDecorator {
  return ApiProperty({
    readOnly: true,
    ...options,
  });
}
