// deno-lint-ignore-file ban-types no-explicit-any
import { omit } from "https://esm.sh/v115/midash@0.8.2";
import {
  ParameterObject,
  SchemaObject,
} from "../interfaces/open-api-spec.interface.ts";
import { Type } from "../interfaces/type.interface.ts";
import { SwaggerEnumType } from "../types/swagger-enum.type.ts";
import { getEnumType, getEnumValues } from "../utils/enum.utils.ts";
import { createParamDecorator } from "./helpers.ts";

type ParameterOptions = Omit<ParameterObject, "in" | "schema">;

interface ApiParamMetadata extends ParameterOptions {
  type?: Type<unknown> | Function | [Function] | string;
  format?: string;
  enum?: SwaggerEnumType;
  enumName?: string;
}

interface ApiParamSchemaHost extends ParameterOptions {
  schema: SchemaObject;
}

export type ApiParamOptions = ApiParamMetadata | ApiParamSchemaHost;

const defaultParamOptions: ApiParamOptions = {
  name: "",
  required: true,
};

export function ApiParam(options: ApiParamOptions): MethodDecorator {
  const param: Record<string, any> = {
    name: options.name == null ? defaultParamOptions.name : options.name,
    in: "path",
    ...omit(options, ["enum"]),
  };

  const apiParamMetadata = options as ApiParamMetadata;
  if (apiParamMetadata.enum) {
    param.schema = param.schema || ({} as SchemaObject);

    const paramSchema = param.schema as SchemaObject;
    const enumValues = getEnumValues(apiParamMetadata.enum);
    paramSchema.type = getEnumType(enumValues);
    paramSchema.enum = enumValues;

    if (apiParamMetadata.enumName) {
      param.enumName = apiParamMetadata.enumName;
    }
  }

  return createParamDecorator(param, defaultParamOptions);
}
