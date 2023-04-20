// deno-lint-ignore-file ban-types no-explicit-any
import { SchemaObject } from "./open-api-spec.interface.ts";
import { Type } from "./type.interface.ts";

export interface SchemaObjectMetadata
  extends Omit<SchemaObject, "type" | "required"> {
  type?: Type<unknown> | Function | [Function] | string | Record<string, any>;
  isArray?: boolean;
  required?: boolean;
  name?: string;
  enumName?: string;
}
