// deno-lint-ignore-file ban-types no-explicit-any
import { omit } from "https://esm.sh/v115/midash@0.8.2";
import {
  ExamplesObject,
  ReferenceObject,
  RequestBodyObject,
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

type RequestBodyOptions = Omit<RequestBodyObject, "content">;

interface ApiBodyMetadata extends RequestBodyOptions {
  type?: Type<unknown> | Function | [Function] | string;
  isArray?: boolean;
  enum?: SwaggerEnumType;
}

interface ApiBodySchemaHost extends RequestBodyOptions {
  schema: SchemaObject | ReferenceObject;
  examples?: ExamplesObject;
}

export type ApiBodyOptions = ApiBodyMetadata | ApiBodySchemaHost;

const defaultBodyMetadata: ApiBodyMetadata = {
  type: String,
  required: true,
};

export function ApiBody(options: ApiBodyOptions): MethodDecorator {
  const [type, isArray] = getTypeIsArrayTuple(
    (options as ApiBodyMetadata).type,
    (options as ApiBodyMetadata).isArray as any
  );
  const param: ApiBodyMetadata & Record<string, any> = {
    in: "body",
    ...omit(options, ["enum"]),
    type,
    isArray,
  };

  if (isEnumArray(options)) {
    addEnumArraySchema(param, options);
  } else if (isEnumDefined(options)) {
    addEnumSchema(param, options);
  }
  return createParamDecorator(param, defaultBodyMetadata);
}
