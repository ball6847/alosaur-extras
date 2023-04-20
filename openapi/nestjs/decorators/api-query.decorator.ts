// deno-lint-ignore-file ban-types no-explicit-any
import { omit } from "https://esm.sh/v115/midash@0.8.2";
import {
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "../interfaces/open-api-spec.interface.ts";
import { Type } from "../interfaces/type.interface.ts";
import { SwaggerEnumType } from "../types/swagger-enum.type.ts";
import {
  addEnumArraySchema,
  addEnumSchema,
  isEnumArray,
  isEnumDefined,
} from "../utils/enum.utils.ts";
import { createParamDecorator, getTypeIsArrayTuple } from "./helpers.ts";

type ParameterOptions = Omit<ParameterObject, "in" | "schema" | "name">;

interface ApiQueryMetadata extends ParameterOptions {
  name?: string;
  type?: Type<unknown> | Function | [Function] | string;
  isArray?: boolean;
  enum?: SwaggerEnumType;
  enumName?: string;
}

interface ApiQuerySchemaHost extends ParameterOptions {
  name?: string;
  schema: SchemaObject | ReferenceObject;
}

export type ApiQueryOptions = ApiQueryMetadata | ApiQuerySchemaHost;

const defaultQueryOptions: ApiQueryOptions = {
  name: "",
  required: true,
};

export function ApiQuery(options: ApiQueryOptions): MethodDecorator {
  const apiQueryMetadata = options as ApiQueryMetadata;
  const [type, isArray] = getTypeIsArrayTuple(
    apiQueryMetadata.type,
    apiQueryMetadata.isArray as any,
  );
  const param: ApiQueryMetadata & Record<string, any> = {
    name: options.name == null ? defaultQueryOptions.name : options.name,
    in: "query",
    ...omit(options, ["enum"]),
    type,
  };

  if (isEnumArray(options)) {
    addEnumArraySchema(param, options);
  } else if (isEnumDefined(options)) {
    addEnumSchema(param, options);
  }

  if (isArray) {
    param.isArray = isArray;
  }

  return createParamDecorator(param, defaultQueryOptions);
}
