// deno-lint-ignore-file no-explicit-any
import { OpenAPIObject } from './open-api-spec.interface.ts';

export type ModuleRoute =
  & Omit<OpenAPIObject, 'openapi' | 'info'>
  & Record<'root', any>;
