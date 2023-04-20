// deno-lint-ignore-file no-explicit-any ban-types
import {
  ResponseObject,
  SchemaObject,
} from "https://deno.land/x/alosaur@v0.38.0/openapi/builder/openapi-models.ts";
import { RouteMetadata } from "https://deno.land/x/alosaur@v0.38.0/src/metadata/route.ts";
import { merge, omit } from "https://esm.sh/v115/midash@0.8.2";
import { DECORATORS } from "./nestjs/constants.ts";
import { Reflect } from "./nestjs/reflect.ts";

// metadata explorer, read metadata from class and return openapi object

type ApiPropertyMetadata = {
  type: string | Function;
  required?: boolean;
  isArray?: boolean;
  items?: SchemaObject;
  properties?: SchemaObject["properties"];
};

export function exploreClassTags(route: RouteMetadata): string[] {
  return Reflect.getMetadata(DECORATORS.API_TAGS, route.target.constructor) ??
    [];
}

export function explorePropertyTags(route: RouteMetadata): string[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    route.actionMetadata.object,
    route.action,
  );
  if (!descriptor) {
    return [];
  }
  return Reflect.getMetadata(DECORATORS.API_TAGS, descriptor.value) ?? [];
}

export function exploreResponses(route: RouteMetadata) {
  // controller
  const classResponses =
    Reflect.getMetadata(DECORATORS.API_RESPONSE, route.target.constructor) ??
      {};
  // action
  const descriptor = Object.getOwnPropertyDescriptor(
    route.actionMetadata.object,
    route.action,
  );
  const propertyResponses = descriptor
    ? Reflect.getMetadata(DECORATORS.API_RESPONSE, descriptor.value) ?? {}
    : {};
  const metadata = merge(classResponses, propertyResponses);
  const responses: Record<string, ResponseObject> = {};
  Object.keys(metadata).forEach((code: string) => {
    responses[code] = {
      description: metadata[code].description,
      content: {
        "application/json": {
          schema: buildSchemaObject(metadata[code].type),
        },
      },
    };
  });
  // return responses;
  return responses;
}

export function buildSchemaObject(ctor: Function) {
  // @ts-ignore allow Function to be called as constructor
  const instance = new ctor();
  const properties: string[] =
    Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, instance) ?? [];
  if (!properties.length) {
    return {
      type: "object",
      properties: {},
    };
  }
  const schema: SchemaObject = {
    type: "object",
    properties: properties.reduce<SchemaObject>((acc, prop) => {
      const key = prop.substring(1);
      const property = buildSchemaProperty(instance, key);
      if (property) {
        acc[key] = property;
      }
      return acc;
    }, {}),
  };
  return schema;
}

function buildSchemaProperty(
  instance: any,
  property: string,
): SchemaObject | undefined {
  let prop: ApiPropertyMetadata = Reflect.getMetadata(
    DECORATORS.API_MODEL_PROPERTIES,
    instance,
    property,
  );
  if (!prop) {
    return undefined;
  }
  if (!prop.isArray && prop.type === Array) {
    return {
      type: "array",
      items: {},
    };
  }
  // class with non-primitive type, aka class-transformer
  if (
    !prop.isArray && typeof prop.type === "function" &&
    !isPrimitiveType(prop.type)
  ) {
    return buildSchemaObject(prop.type);
  }
  // array
  if (prop.isArray) {
    prop = omit(prop, ["isArray"]);
    if (typeof prop.type === "function" && !isPrimitiveType(prop.type)) {
      const schema = buildSchemaObject(prop.type);
      if (schema) {
        prop.items = schema;
      } else {
        prop.items = {
          type: "object",
          properties: {},
        };
      }
    } else {
      prop.items = {
        type: getPropertyType(prop.type),
      };
    }
    // remove complex type
    prop.type = "array";
    return prop as SchemaObject;
  }
  // for primitive type
  prop.type = getPropertyType(prop.type);
  if (!prop.required) {
    prop = omit(prop, ["required"]);
  }
  if (!prop.isArray) {
    prop = omit(prop, ["isArray"]);
  }
  return prop as SchemaObject;
}

function isPrimitiveType(type: unknown) {
  return type === String || type === Number || type === Boolean;
}

function getPropertyType(type: unknown) {
  switch (type) {
    case String:
      return "string";
    case Number:
      return "number";
    case Boolean:
      return "boolean";
    case "string":
    case "number":
    case "boolean":
      return type;
    default:
      return "string";
  }
}
