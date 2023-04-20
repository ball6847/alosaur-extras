// deno-lint-ignore-file no-unused-vars no-explicit-any
/* eslint-disable @typescript-eslint/no-empty-function */
export function ApiHideProperty(): PropertyDecorator {
  return (target: Record<string, any>, propertyKey: string | symbol) => {};
}
