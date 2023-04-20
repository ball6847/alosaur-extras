import {
  OpenAPIObject,
  OperationObject,
  ResponsesObject,
} from "./open-api-spec.interface.ts";

export interface DenormalizedDoc extends Partial<OpenAPIObject> {
  root?: {
    method: string;
    path: string;
  } & OperationObject;
  responses?: ResponsesObject;
}
